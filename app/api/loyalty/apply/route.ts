import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const applyCreditsSchema = z.object({
  bookingId: z.string().uuid(),
  amountCents: z.number().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bookingId, amountCents } = applyCreditsSchema.parse(body);
    
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's current loyalty balance
    const { data: userData } = await supabase
      .from('users')
      .select('loyalty_balance_cents')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const availableBalance = userData.loyalty_balance_cents || 0;

    if (amountCents > availableBalance) {
      return NextResponse.json(
        { error: 'Insufficient loyalty credits' },
        { status: 400 }
      );
    }

    // Verify booking belongs to user
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, artist_id, subtotal_cents')
      .eq('id', bookingId)
      .eq('artist_id', user.id)
      .single();

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Don't allow credits to exceed booking total
    const maxCredits = Math.min(amountCents, booking.subtotal_cents);

    // Create debit transaction
    const { error: debitError } = await supabase
      .from('loyalty_credits')
      .insert({
        user_id: user.id,
        transaction_type: 'debit',
        amount_cents: maxCredits,
        source: 'loyalty',
        description: `Applied to booking ${bookingId}`,
        booking_id: bookingId
      });

    if (debitError) {
      throw debitError;
    }

    // Update booking with credit applied
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({
        subtotal_cents: booking.subtotal_cents - maxCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (bookingError) {
      throw bookingError;
    }

    // Get updated balance
    const { data: updatedUser } = await supabase
      .from('users')
      .select('loyalty_balance_cents')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      appliedAmount: maxCredits,
      newBalance: updatedUser?.loyalty_balance_cents || 0,
      newBookingTotal: booking.subtotal_cents - maxCredits
    });

  } catch (error) {
    console.error('Apply loyalty credits error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}