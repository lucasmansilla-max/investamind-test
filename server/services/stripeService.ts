import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16'
});

export const PRICING_PLANS = {
  premium_monthly: {
    amount: 6499, // $64.99 in cents
    interval: 'month',
    stripePriceId: process.env.STRIPE_MONTHLY_PRICE_ID || 'price_monthly'
  },
  premium_yearly: {
    amount: 59999, // $599.99 in cents
    interval: 'year',
    stripePriceId: process.env.STRIPE_YEARLY_PRICE_ID || 'price_yearly'
  }
};

export async function createCustomer(email: string, name: string) {
  return await stripe.customers.create({
    email,
    name,
    metadata: { source: 'investamind' }
  });
}

export async function createPaymentIntent(customerId: string, planType: 'premium_monthly' | 'premium_yearly', founderDiscount = false) {
  const plan = PRICING_PLANS[planType];
  let amount = plan.amount;
  
  if (founderDiscount) {
    amount = Math.round(amount * 0.5); // 50% founder discount
  }
  
  return await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    metadata: { planType, founderDiscount: founderDiscount.toString() }
  });
}

export async function createSubscription(customerId: string, priceId: string, trialDays = 7) {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    metadata: { source: 'investamind' }
  });
}

export async function cancelSubscription(subscriptionId: string, immediately = false) {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
  }
}

export async function updateSubscription(subscriptionId: string, newPriceId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscription.items.data[0].id,
      price: newPriceId,
    }],
    proration_behavior: 'always_invoice'
  });
}

export async function getCustomer(customerId: string) {
  return await stripe.customers.retrieve(customerId);
}

export async function getSubscription(subscriptionId: string) {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

export async function getPaymentHistory(customerId: string) {
  return await stripe.paymentIntents.list({
    customer: customerId,
    limit: 100
  });
}

export { stripe };