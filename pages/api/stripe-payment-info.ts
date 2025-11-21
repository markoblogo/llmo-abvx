import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { stripe } from "@/lib/stripeClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { customerId } = req.body as { customerId: string };

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID required" });
    }

    // Fetch customer from Stripe
    const customer = await stripe.customers.retrieve(customerId);

    if (typeof customer === "string" || customer.deleted) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Get default payment method
    let paymentMethod = null;
    if (customer.invoice_settings?.default_payment_method) {
      const pmId =
        typeof customer.invoice_settings.default_payment_method === "string"
          ? customer.invoice_settings.default_payment_method
          : customer.invoice_settings.default_payment_method.id;

      paymentMethod = await stripe.paymentMethods.retrieve(pmId);
    }

    // Get last invoice
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 1,
    });

    const paymentData: any = {
      hasPaymentMethod: !!paymentMethod,
    };

    if (paymentMethod && paymentMethod.card) {
      paymentData.last4 = paymentMethod.card.last4;
      paymentData.brand = paymentMethod.card.brand;
      paymentData.expiryMonth = paymentMethod.card.exp_month;
      paymentData.expiryYear = paymentMethod.card.exp_year;
    }

    if (invoices.data.length > 0) {
      const lastInvoice = invoices.data[0];
      paymentData.lastPaymentDate = lastInvoice.status_transitions?.paid_at
        ? new Date(lastInvoice.status_transitions.paid_at * 1000).toISOString()
        : null;
      paymentData.lastPaymentAmount = lastInvoice.amount_paid;
    }

    res.status(200).json(paymentData);
  } catch (error: any) {
    console.error("Stripe payment info error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch payment info" });
  }
}

