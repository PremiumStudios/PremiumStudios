import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export const calculateBookingFees = (
  roomRateCents: number,
  engineerRateCents: number = 0,
  hours: number,
  appFeePercent: number = 0.12
) => {
  const roomCost = roomRateCents * hours;
  const engineerCost = engineerRateCents * hours;
  const subtotal = roomCost + engineerCost;
  const appFee = Math.floor(subtotal * appFeePercent);
  
  // Proportional fee split
  const roomFeeShare = roomCost > 0 ? Math.floor(appFee * (roomCost / subtotal)) : 0;
  const engineerFeeShare = engineerCost > 0 ? appFee - roomFeeShare : 0;
  
  return {
    roomCost,
    engineerCost,
    subtotal,
    appFee,
    studioPayout: roomCost - roomFeeShare,
    engineerPayout: engineerCost - engineerFeeShare,
  };
};