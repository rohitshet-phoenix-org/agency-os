/**
 * Resend email service
 * Used by the email worker to send campaign emails to subscribers.
 */
import { Resend } from "resend";

export function createResendClient(apiKey: string): Resend {
  return new Resend(apiKey);
}

export async function sendCampaignEmail(
  resend: Resend,
  opts: {
    from: string; // e.g. "Agency OS <campaigns@yourdomain.com>"
    to: string;
    subject: string;
    htmlBody: string;
    previewText?: string;
    tags?: Array<{ name: string; value: string }>;
  }
) {
  const { data, error } = await resend.emails.send({
    from: opts.from,
    to: [opts.to],
    subject: opts.subject,
    html: opts.htmlBody,
    tags: opts.tags,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
}

export async function sendBulkCampaign(
  resend: Resend,
  opts: {
    from: string;
    subject: string;
    htmlBody: string;
    previewText?: string;
    recipients: Array<{ email: string; name?: string }>;
    campaignId?: string;
  }
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Resend batch endpoint allows up to 100 per call
  const BATCH = 100;
  for (let i = 0; i < opts.recipients.length; i += BATCH) {
    const chunk = opts.recipients.slice(i, i + BATCH);
    try {
      const { error } = await resend.batch.send(
        chunk.map((r) => ({
          from: opts.from,
          to: [r.email],
          subject: opts.subject,
          html: opts.htmlBody,
          tags: opts.campaignId
            ? [{ name: "campaignId", value: opts.campaignId }]
            : undefined,
        }))
      );
      if (error) {
        failed += chunk.length;
        errors.push(error.message);
      } else {
        sent += chunk.length;
      }
    } catch (err: any) {
      failed += chunk.length;
      errors.push(String(err.message));
    }
  }

  return { sent, failed, errors };
}
