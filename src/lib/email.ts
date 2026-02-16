/**
 * Email service for sending invoices, reminders, and notifications
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email using the configured SMTP provider
 * In production, configure with nodemailer + SMTP credentials
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string }> {
  // Placeholder for SMTP integration
  console.log(`[Email] Sending to ${options.to}: ${options.subject}`);

  // In production:
  // const transporter = nodemailer.createTransport({
  //   host: process.env.SMTP_HOST,
  //   port: Number(process.env.SMTP_PORT),
  //   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  // });
  // return await transporter.sendMail(options);

  return { success: true, messageId: `msg_${Date.now()}` };
}

/**
 * Email templates
 */
export function getPaymentReminderTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  organizationName: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Reminder: Invoice ${data.invoiceNumber} - ${data.amount}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.organizationName}</h1>
        </div>
        <div style="padding: 32px; background: white;">
          <h2 style="margin-top: 0;">Payment Reminder</h2>
          <p>Dear ${data.customerName},</p>
          <p>This is a friendly reminder that invoice <strong>${data.invoiceNumber}</strong> for <strong>${data.amount}</strong> is due on <strong>${data.dueDate}</strong>.</p>
          <p>Please ensure payment is made by the due date to avoid any late fees.</p>
          <div style="margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px;">
            <p style="margin: 4px 0;"><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p style="margin: 4px 0;"><strong>Amount:</strong> ${data.amount}</p>
            <p style="margin: 4px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
          </div>
          <p>If you have already made this payment, please disregard this email.</p>
          <p>Thank you for your business!</p>
          <p>Best regards,<br/>${data.organizationName}</p>
        </div>
        <div style="padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>This is an automated reminder from ${data.organizationName}</p>
        </div>
      </div>
    `,
  };
}

export function getPaymentReceiptTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  paymentMethod: string;
  paymentDate: string;
  organizationName: string;
}): { subject: string; html: string } {
  return {
    subject: `Payment Receipt: ${data.amount} for Invoice ${data.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.organizationName}</h1>
        </div>
        <div style="padding: 32px; background: white;">
          <h2 style="margin-top: 0; color: #16a34a;">Payment Received</h2>
          <p>Dear ${data.customerName},</p>
          <p>We have received your payment. Thank you!</p>
          <div style="margin: 24px 0; padding: 16px; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
            <p style="margin: 4px 0;"><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p style="margin: 4px 0;"><strong>Amount Paid:</strong> ${data.amount}</p>
            <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
            <p style="margin: 4px 0;"><strong>Date:</strong> ${data.paymentDate}</p>
          </div>
          <p>Thank you for your prompt payment!</p>
          <p>Best regards,<br/>${data.organizationName}</p>
        </div>
      </div>
    `,
  };
}

export function getOverdueNoticeTemplate(data: {
  customerName: string;
  invoiceNumber: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
  organizationName: string;
}): { subject: string; html: string } {
  return {
    subject: `OVERDUE: Invoice ${data.invoiceNumber} - ${data.amount} (${data.daysOverdue} days past due)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${data.organizationName}</h1>
        </div>
        <div style="padding: 32px; background: white;">
          <h2 style="margin-top: 0; color: #dc2626;">Overdue Payment Notice</h2>
          <p>Dear ${data.customerName},</p>
          <p>Our records indicate that invoice <strong>${data.invoiceNumber}</strong> for <strong>${data.amount}</strong> was due on <strong>${data.dueDate}</strong> and is now <strong>${data.daysOverdue} days overdue</strong>.</p>
          <div style="margin: 24px 0; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
            <p style="margin: 4px 0;"><strong>Invoice:</strong> ${data.invoiceNumber}</p>
            <p style="margin: 4px 0;"><strong>Amount Due:</strong> ${data.amount}</p>
            <p style="margin: 4px 0;"><strong>Original Due Date:</strong> ${data.dueDate}</p>
            <p style="margin: 4px 0;"><strong>Days Overdue:</strong> ${data.daysOverdue}</p>
          </div>
          <p>Please arrange payment at your earliest convenience. If you have questions or concerns, please don't hesitate to contact us.</p>
          <p>Best regards,<br/>${data.organizationName}</p>
        </div>
      </div>
    `,
  };
}
