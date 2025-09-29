import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe-config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.metadata?.booking_id) {
          // Update booking status to pending after successful payment
          await supabase
            .from('bookings')
            .update({
              status: 'pending',
              stripe_payment_intent_id: session.payment_intent as string,
              hold_status: 'held',
              updated_at: new Date().toISOString(),
            })
            .eq('id', session.metadata.booking_id);

          // Release the booking slot
          await supabase
            .from('booking_slots')
            .delete()
            .eq('locked_by_user', session.metadata.user_id);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        if (paymentIntent.metadata?.booking_id) {
          await supabase
            .from('bookings')
            .update({
              hold_status: 'captured',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_payment_intent_id', paymentIntent.id);
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;
        
        if (transfer.metadata?.booking_id) {
          // Update booking with transfer information
          const { data: booking } = await supabase
            .from('bookings')
            .select('stripe_transfer_ids')
            .eq('id', transfer.metadata.booking_id)
            .single();

          if (booking) {
            const transferIds = booking.stripe_transfer_ids || {};
            transferIds[transfer.metadata.recipient_type || 'unknown'] = transfer.id;

            await supabase
              .from('bookings')
              .update({
                stripe_transfer_ids: transferIds,
                updated_at: new Date().toISOString(),
              })
              .eq('id', transfer.metadata.booking_id);
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        
        // Update studio or engineer profile with verification status
        if (account.metadata?.user_id && account.metadata?.user_type) {
          const table = account.metadata.user_type === 'studio' ? 'studio_profiles' : 'engineer_profiles';
          
          await supabase
            .from(table)
            .update({
              stripe_connect_id: account.id,
              is_verified: account.details_submitted && account.charges_enabled,
              updated_at: new Date().toISOString(),
            })
            .eq('id', account.metadata.user_id);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}