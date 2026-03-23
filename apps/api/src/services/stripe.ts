/**
 * Stripe integration service
 * Handles: customer management, invoice creation, payment links, webhook verification
 */
import Stripe from "stripe";

export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: "2025-01-27.acacia" as any });
}

export async function getOrCreateCustomer(
  stripe: Stripe,
  email: string,
  name: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) return existing.data[0]!;
  return stripe.customers.create({ email, name, metadata });
}

export async function createStripeInvoice(
  stripe: Stripe,
  customerId: string,
  lineItems: Array<{ description: string; amount: number; currency: string }>,
  dueDate?: Date
): Promise<Stripe.Invoice> {
  // Create invoice
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: dueDate
      ? Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / 86400000))
      : 30,
    auto_advance: false,
  });

  // Add line items
  for (const item of lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      description: item.description,
      amount: Math.round(item.amount * 100), // cents
      currency: item.currency.toLowerCase(),
    });
  }

  return stripe.invoices.retrieve(invoice.id);
}

export async function finalizeAndSendStripeInvoice(
  stripe: Stripe,
  stripeInvoiceId: string
): Promise<Stripe.Invoice> {
  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoiceId);
  return stripe.invoices.sendInvoice(finalized.id);
}

export async function createPaymentLink(
  stripe: Stripe,
  stripeInvoiceId: string
): Promise<string | null> {
  const invoice = await stripe.invoices.retrieve(stripeInvoiceId);
  return invoice.hosted_invoice_url ?? null;
}

export async function listStripeInvoices(
  stripe: Stripe,
  customerId: string
): Promise<Stripe.Invoice[]> {
  const result = await stripe.invoices.list({ customer: customerId, limit: 100 });
  return result.data;
}

export function constructStripeWebhookEvent(
  stripe: Stripe,
  payload: Buffer | string,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

export async function createStripeSubscription(
  stripe: Stripe,
  customerId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  });
}
