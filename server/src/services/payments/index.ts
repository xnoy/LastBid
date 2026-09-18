import { env } from '../../config/env';

/**
 * Payment boundary.
 *
 * The default provider does NOT charge anyone. It records an intent and lets
 * the order move to ORDER_CONFIRMED so the delivery flow is demonstrable.
 * Every response carries `charged: false` and the checkout screen says plainly
 * that no money moved. Replace with Razorpay / Stripe by implementing
 * `PaymentProvider` and returning it from `paymentProvider`.
 */
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: 'INR';
  status: 'requires_confirmation' | 'succeeded';
  charged: boolean;
  provider: string;
  message: string;
}

export interface PaymentProvider {
  readonly name: string;
  createIntent(params: { orderId: string; amount: number }): Promise<PaymentIntent>;
  confirm(intentId: string): Promise<PaymentIntent>;
}

class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createIntent(params: { orderId: string; amount: number }): Promise<PaymentIntent> {
    return {
      id: `mock_intent_${params.orderId}`,
      amount: params.amount,
      currency: 'INR',
      status: 'requires_confirmation',
      charged: false,
      provider: this.name,
      message: 'No payment provider is connected. Confirming will not charge a card.',
    };
  }

  async confirm(intentId: string): Promise<PaymentIntent> {
    return {
      id: intentId,
      amount: 0,
      currency: 'INR',
      status: 'succeeded',
      charged: false,
      provider: this.name,
      message: 'Order confirmed without a real payment.',
    };
  }
}

export const paymentProvider: PaymentProvider = (() => {
  if (env.PAYMENT_PROVIDER === 'external') {
    throw new Error(
      'PAYMENT_PROVIDER=external but no gateway is implemented. ' +
        'Add one in server/src/services/payments/ and return it here.',
    );
  }
  return new MockPaymentProvider();
})();
