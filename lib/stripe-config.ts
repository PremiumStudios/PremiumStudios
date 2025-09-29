import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  defaultAppFeePercent: parseFloat(process.env.DEFAULT_APP_FEE_PERCENT || '0.12'),
  pilotCities: JSON.parse(process.env.PILOT_CITIES || '["Baton Rouge", "New Orleans"]'),
  zeroFeeUntil: new Date(process.env.ZERO_FEE_UNTIL || '2025-12-31'),
};

export const calculateBookingFees = (
  roomRateCents: number,
  engineerRateCents: number = 0,
  hours: number,
  isPilotCity: boolean = false,
  appFeePercent: number = STRIPE_CONFIG.defaultAppFeePercent
) => {
  const roomCost = roomRateCents * hours;
  const engineerCost = engineerRateCents * hours;
  const subtotal = roomCost + engineerCost;
  
  // Check if pilot city and within zero fee period
  const effectiveAppFeePercent = isPilotCity && new Date() <= STRIPE_CONFIG.zeroFeeUntil ? 0 : appFeePercent;
  const appFee = Math.floor(subtotal * effectiveAppFeePercent);
  
  // Proportional fee split
  const roomFeeShare = roomCost > 0 ? Math.floor(appFee * (roomCost / subtotal)) : 0;
  const engineerFeeShare = engineerCost > 0 ? appFee - roomFeeShare : 0;
  
  return {
    roomCost,
    engineerCost,
    subtotal,
    appFee,
    effectiveAppFeePercent,
    studioPayout: roomCost - roomFeeShare,
    engineerPayout: engineerCost - engineerFeeShare,
    stripeFee: Math.floor(subtotal * 0.029) + 30, // Stripe's fee estimate
    total: subtotal + appFee,
  };
};

export const createConnectAccount = async (
  email: string,
  type: 'studio' | 'engineer',
  businessProfile?: {
    name?: string;
    url?: string;
    mcc?: string;
  }
) => {
  const account = await stripe.accounts.create({
    type: 'standard',
    email,
    business_profile: {
      name: businessProfile?.name,
      url: businessProfile?.url,
      mcc: businessProfile?.mcc || (type === 'studio' ? '7929' : '7299'), // Band/Orchestra vs Entertainment Services
    },
    capabilities: {
      transfers: { requested: true },
    },
  });

  return account;
};

export const createConnectAccountLink = async (accountId: string, refreshUrl: string, returnUrl: string) => {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink;
};

export const createPaymentIntent = async (
  amount: number,
  applicationFeeAmount: number,
  transferData: {
    destination: string;
    amount: number;
  }[],
  metadata: Record<string, string>
) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    application_fee_amount: applicationFeeAmount,
    transfer_data: transferData.length === 1 ? {
      destination: transferData[0].destination,
      amount: transferData[0].amount,
    } : undefined,
    metadata,
    capture_method: 'manual', // Hold funds until session starts
  });

  return paymentIntent;
};

export const capturePaymentIntent = async (paymentIntentId: string) => {
  const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
  return paymentIntent;
};

export const createTransfers = async (
  transfers: {
    amount: number;
    destination: string;
    metadata?: Record<string, string>;
  }[]
) => {
  const transferPromises = transfers.map(transfer =>
    stripe.transfers.create({
      amount: transfer.amount,
      currency: 'usd',
      destination: transfer.destination,
      metadata: transfer.metadata,
    })
  );

  return Promise.all(transferPromises);
};