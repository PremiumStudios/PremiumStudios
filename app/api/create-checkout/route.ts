import { NextRequest, NextResponse } from 'next/server';
import { stripe, calculateBookingFees } from '@/lib/stripe-config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { validateBookingSlot } from '@/lib/booking-utils';
import { z } from 'zod';

const createCheckoutSchema = z.object({
  roomId: z.string().uuid(),
  engineerId: z.string().uuid().optional(),
  startAt: z.string(),
  endAt: z.string(),
  slotId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, engineerId, startAt, endAt, slotId } = createCheckoutSchema.parse(body);
    
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate booking slot
    await validateBookingSlot(roomId, engineerId || null, startAt, endAt, user.id);

    // Get room and engineer details
    const { data: room, error: roomError } = await supabase
      .from('studio_rooms')
      .select(`
        *,
        studio_profiles!inner (
          id,
          studio_name,
          stripe_connect_id,
          users!inner (
            city,
            state
          )
        )
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    let engineer = null;
    if (engineerId) {
      const { data: engineerData, error: engineerError } = await supabase
        .from('engineer_profiles')
        .select('*, users!inner (full_name)')
        .eq('id', engineerId)
        .single();

      if (engineerError || !engineerData) {
        return NextResponse.json({ error: 'Engineer not found' }, { status: 404 });
      }
      engineer = engineerData;
    }

    // Check if city is pilot city
    const city = room.studio_profiles.users.city;
    const { data: cityData } = await supabase
      .from('cities')
      .select('is_pilot_city')
      .eq('name', city)
      .single();

    const isPilotCity = cityData?.is_pilot_city || false;

    // Calculate duration in hours
    const startTime = new Date(startAt);
    const endTime = new Date(endAt);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    // Calculate fees
    const fees = calculateBookingFees(
      room.hourly_rate_cents,
      engineer?.hourly_rate_cents || 0,
      hours,
      isPilotCity
    );

    // Create booking record
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        artist_id: user.id,
        studio_id: room.studio_profiles.id,
        room_id: roomId,
        engineer_id: engineerId || null,
        start_at: startAt,
        end_at: endAt,
        status: 'pending',
        subtotal_cents: fees.subtotal,
        app_fee_cents: fees.appFee,
        studio_payout_cents: fees.studioPayout,
        engineer_payout_cents: fees.engineerPayout,
        hold_status: 'none',
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Recording Session at ${room.studio_profiles.studio_name}`,
              description: `${room.name}${engineer ? ` with ${engineer.users.full_name}` : ''} - ${hours} hour${hours !== 1 ? 's' : ''}`,
              images: room.photos?.length > 0 ? [room.photos[0]] : undefined,
            },
            unit_amount: fees.total,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.nextUrl.origin}/booking/${booking.id}/success`,
      cancel_url: `${req.nextUrl.origin}/booking/${booking.id}/cancelled`,
      metadata: {
        booking_id: booking.id,
        user_id: user.id,
        slot_id: slotId,
      },
      payment_intent_data: {
        application_fee_amount: fees.appFee,
        transfer_data: room.studio_profiles.stripe_connect_id ? {
          destination: room.studio_profiles.stripe_connect_id,
        } : undefined,
        metadata: {
          booking_id: booking.id,
          room_id: roomId,
          engineer_id: engineerId || '',
        },
        capture_method: 'manual', // Hold funds until session starts
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      bookingId: booking.id,
    });

  } catch (error) {
    console.error('Create checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}