export const Config = {
  stripe: {
    secretKey: () => {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error("Stripe secret key is not set");
      }
      return process.env.STRIPE_SECRET_KEY as string;
    },
    publishableKey: () => {
      const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        throw new Error("Stripe publish key is not set");
      }
      return process.env.STRIPE_PUBLISHABLE_KEY as string;
    },
    webhookKey: () => {
      const webhookKey = process.env.STRIPE_WEBHOOK_KEY;
      if (!webhookKey) {
        throw new Error("Stripe webhook key is not set");
      }
      return process.env.STRIPE_WEBHOOK_KEY as string;
    },
  },
};
