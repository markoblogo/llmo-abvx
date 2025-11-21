declare module "@stripe/stripe-js" {
  export interface Stripe {
    redirectToCheckout(options: { sessionId: string }): Promise<{ error?: { message?: string } }>
  }
}
