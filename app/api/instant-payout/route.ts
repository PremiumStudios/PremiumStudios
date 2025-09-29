import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe-config';
import { z } from 'zod';

const instantPayoutSchema = z.object({
  amountCents: z.number().min(100), // Minimum $1.00
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amountCents } = instantPayoutSchema.parse(body);
    
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile and Stripe Connect ID
    const { data: profile } = await supabase
      .from('users')
      .select(`
        *,
        studio_profiles (stripe_connect_id, instant_payout_enabled),
        engineer_profiles (stripe_connect_id, instant_payout_enabled)
      `)
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let stripeConnectId = null;
    let instantPayoutEnabled = false;

    if (profile.role === 'studio_owner' && profile.studio_profiles) {
      stripeConnectId = profile.studio_profiles.stripe_connect_id;
      instantPayoutEnabled = profile.studio_profiles.instant_payout_enabled;
    } else if (profile.role === 'engineer' && profile.engineer_profiles) {
      stripeConnectId = profile.engineer_profiles.stripe_connect_id;
      instantPayoutEnabled = profile.engineer_profiles.instant_payout_enabled;
    }

    if (!stripeConnectId) {
      return NextResponse.json(
        { error: 'Stripe Connect account not found. Please complete your payout setup.' },
        { status: 400 }
      );
    }

    if (!instantPayoutEnabled) {
      return NextResponse.json(
        { error: 'Instant payouts not enabled for your account.' },
        { status: 400 }
      );
    }

    // Check Stripe Connect account balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeConnectId,
    });

    const availableBalance = balance.available.reduce((sum, bal) => sum + bal.amount, 0);

    if (amountCents > availableBalance) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance for instant payout',
          availableBalance: availableBalance
        },
        { status: 400 }
      );
    }

    // Create instant payout
    const payout = await stripe.payouts.create(
      {
        amount: amountCents,
        currency: 'usd',
        method: 'instant',
        metadata: {
          user_id: user.id,
          payout_type: 'instant'
        }
      },
      {
        stripeAccount: stripeConnectId,
      }
    );

    // Log the payout in our database
    const { data: payoutRecord } = await supabase
      .from('instant_payouts')
      .insert({
        user_id: user.id,
        stripe_payout_id: payout.id,
        amount_cents: amountCents,
        status: payout.status,
        arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        metadata: {
          stripe_account: stripeConnectId,
          method: 'instant'
        }
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: amountCents,
        status: payout.status,
        arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
        fee: payout.fee || 0
      },
      newBalance: availableBalance - amountCents
    });

  } catch (error) {
    console.error('Instant payout error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Handle Stripe errors
    if (error.type === 'StripeCardError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's payout history
    const { data: payouts } = await supabase
      .from('instant_payouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get current Stripe balance if connected
    const { data: profile } = await supabase
      .from('users')
      .select(`
        role,
        studio_profiles (stripe_connect_id),
        engineer_profiles (stripe_connect_id)
      `)
      .eq('id', user.id)
      .single();

    let currentBalance = 0;
    let stripeConnectId = null;

    if (profile?.role === 'studio_owner' && profile.studio_profiles?.stripe_connect_id) {
      stripeConnectId = profile.studio_profiles.stripe_connect_id;
    } else if (profile?.role === 'engineer' && profile.engineer_profiles?.stripe_connect_id) {
      stripeConnectId = profile.engineer_profiles.stripe_connect_id;
    }

    if (stripeConnectId) {
      try {
        const balance = await stripe.balance.retrieve({
          stripeAccount: stripeConnectId,
        });
        currentBalance = balance.available.reduce((sum, bal) => sum + bal.amount, 0);
      } catch (error) {
        console.error('Error fetching Stripe balance:', error);
      }
    }

    return NextResponse.json({
      payouts: payouts || [],
      currentBalance,
      hasStripeAccount: !!stripeConnectId
    });

  } catch (error) {
    console.error('Get instant payouts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}