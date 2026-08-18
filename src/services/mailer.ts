import nodemailer from 'nodemailer';
import { queryOne } from '../mysql.js';

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedKey: string = '';

export function invalidateMailTransporter() {
  cachedTransporter = null;
  cachedKey = '';
}

async function getTransporter() {
  const settings = await queryOne('SELECT * FROM smtp_settings WHERE business_id = 1') as any;
  let user = process.env.SMTP_USER || 'noreply@clarelab.com';
  let pass = process.env.SMTP_PASS || 'Tani!!8877';
  let host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  let port = Number(process.env.SMTP_PORT) || 465;
  let secure = process.env.SMTP_SECURE !== 'false';

  if (settings && settings.user && settings.pass) {
    user = settings.user;
    pass = settings.pass;
    host = settings.host || 'smtp.hostinger.com';
    port = Number(settings.port) || 465;
    secure = settings.secure === 1;
  }

  const currentKey = `${host}:${port}:${user}:${secure}`;
  if (cachedTransporter && cachedKey === currentKey) {
    return cachedTransporter;
  }

  cachedKey = currentKey;
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    auth: { user, pass },
  });

  return cachedTransporter;
}

async function getFromAddress() {
  const settings = await queryOne('SELECT * FROM smtp_settings WHERE business_id = 1') as any;
  const name = settings?.from_name || process.env.SMTP_FROM_NAME || 'PhoneLab EPOS';
  const email = settings?.from_email || settings?.user || process.env.SMTP_USER || 'noreply@clarelab.com';
  return `"${name}" <${email}>`;
}

async function sendMail(to: string, subject: string, html: string) {
  const transporter = await getTransporter();
  const from = await getFromAddress();
  await transporter.sendMail({ from, to, subject, html });
}

const baseStyle = `font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:8px;`;
const btnStyle = `display:inline-block;background:#2980b9;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:16px;`;

export async function sendAccountPending(user: { name: string; email: string }) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Hi ${user.name},</h2>
    <p>Your account has been created and is currently <strong>pending approval</strong> by an administrator.</p>
    <p>You will receive an email once your account has been reviewed.</p>
    <p style="color:#7f8c8d;font-size:13px;">If you did not request this account, please ignore this email.</p>
  </div>`;
  await sendMail(user.email, 'Account Pending Approval', html);
}

export async function sendAccountApproved(user: { name: string; email: string }) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#27ae60;">Hi ${user.name}, your account is approved! ✓</h2>
    <p>An administrator has approved your account. You can now log in to the EPOS system.</p>
  </div>`;
  await sendMail(user.email, 'Account Approved ✓', html);
}

export async function sendAccountRejected(user: { name: string; email: string }) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#e74c3c;">Hi ${user.name},</h2>
    <p>Unfortunately, your account registration has been <strong>rejected</strong> by an administrator.</p>
    <p>If you believe this is a mistake, please contact your administrator directly.</p>
  </div>`;
  await sendMail(user.email, 'Account Registration Rejected', html);
}

export async function sendAccountDeactivated(user: { name: string; email: string }) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#e67e22;">Hi ${user.name},</h2>
    <p>Your EPOS account has been <strong>deactivated</strong> by an administrator.</p>
    <p>Please contact your administrator if you have any questions.</p>
  </div>`;
  await sendMail(user.email, 'Account Deactivated', html);
}

export async function sendPasswordReset(user: { name: string; email: string }, resetLink: string) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Password Reset Request</h2>
    <p>Hi ${user.name},</p>
    <p>You requested a password reset. Click the button below:</p>
    <a href="${resetLink}" style="${btnStyle}">Reset My Password</a>
    <p style="margin-top:24px;color:#7f8c8d;font-size:13px;">This link expires in 1 hour. Ignore if you didn't request this.</p>
  </div>`;
  await sendMail(user.email, 'Password Reset Request', html);
}

export async function sendOtpCode(user: { name: string; email: string }, otp: string) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Password Reset OTP</h2>
    <p>Hi ${user.name},</p>
    <p>Use the following code to reset your password. It expires in <strong>10 minutes</strong>.</p>
    <div style="font-size:36px;font-weight:bold;letter-spacing:12px;text-align:center;padding:24px;background:#fff;border:2px solid #2980b9;border-radius:8px;margin:20px 0;color:#2980b9;">${otp}</div>
    <p style="color:#7f8c8d;font-size:13px;">If you did not request this, please ignore this email.</p>
  </div>`;
  await sendMail(user.email, 'Your EPOS Password Reset Code', html);
}

export async function sendGeneratedPassword(user: { name: string; email: string }, password: string) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2c3e50;">Your EPOS Account Password</h2>
    <p>Hi ${user.name},</p>
    <p>An administrator has set a new password for your EPOS account:</p>
    <div style="font-size:22px;font-weight:bold;text-align:center;padding:16px;background:#fff;border:2px solid #27ae60;border-radius:8px;margin:20px 0;color:#27ae60;font-family:monospace;">${password}</div>
    <p>Please log in and change your password immediately.</p>
    <p style="color:#7f8c8d;font-size:13px;">If you did not expect this email, contact your administrator.</p>
  </div>`;
  await sendMail(user.email, 'Your EPOS Account Password', html);
}

export async function sendTestEmail(toEmail: string) {
  const html = `<div style="${baseStyle}">
    <h2 style="color:#2980b9;">✓ SMTP Test Successful</h2>
    <p>Your Hostinger SMTP email settings are configured correctly and working.</p>
    <p style="color:#7f8c8d;font-size:13px;">Sent from your EPOS Admin Portal.</p>
  </div>`;
  await sendMail(toEmail, 'EPOS SMTP Test Email', html);
}

export async function sendInvoiceEmail(to: string, subject: string, invoice: any, company: any, customNote?: string) {
  const itemsHtml = (invoice.items || []).map((item: any) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px 8px; font-size: 13px; color: #1f2937;">
        <strong>${item.product_name || 'Item'}</strong>
        ${item.notes ? `<div style="font-size: 11px; color: #6b7280; font-style: italic;">Note: ${item.notes}</div>` : ''}
        ${item.imei ? `<div style="font-size: 11px; color: #3b82f6;">IMEI: ${item.imei}</div>` : ''}
      </td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: center; color: #4b5563;">${item.quantity}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right; color: #4b5563;">€${(Number(item.price) || 0).toFixed(2)}</td>
      <td style="padding: 10px 8px; font-size: 13px; text-align: right; font-weight: bold; color: #111827;">€${(Number(item.total) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background: #1e293b; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">${company?.name || 'INVOICE'}</h1>
        <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">${company?.address ? `${company.address}, ` : ''}${company?.city || ''} ${company?.phone ? `• Tel: ${company.phone}` : ''}</p>
      </div>

      <!-- Invoice Info -->
      <div style="padding: 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; display: block;">Billed To</span>
              <strong style="font-size: 15px; color: #0f172a;">${invoice.customer?.name || invoice.customer_name || 'Valued Customer'}</strong>
              ${invoice.customer?.phone ? `<div style="font-size: 13px; color: #475569;">${invoice.customer.phone}</div>` : ''}
              ${invoice.customer?.email ? `<div style="font-size: 13px; color: #475569;">${invoice.customer.email}</div>` : ''}
            </td>
            <td style="vertical-align: top; text-align: right;">
              <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">${invoice.invoice_number}</div>
              <div style="font-size: 13px; color: #64748b;">Date: ${new Date(invoice.created_at).toLocaleDateString('en-GB')}</div>
              <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 4px; color: ${invoice.status === 'paid' ? '#16a34a' : '#ea580c'};">
                Status: ${invoice.status || 'Paid'}
              </div>
            </td>
          </tr>
        </table>
      </div>

      ${customNote ? `
        <div style="padding: 16px 24px; background: #eff6ff; border-left: 4px solid #3b82f6; margin: 16px 24px; font-size: 13px; color: #1e40af;">
          ${customNote.replace(/\n/g, '<br/>')}
        </div>
      ` : ''}

      <!-- Items Table -->
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #475569;">Item</th>
              <th style="padding: 10px 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #475569; width: 60px;">Qty</th>
              <th style="padding: 10px 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569; width: 90px;">Price</th>
              <th style="padding: 10px 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #475569; width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Subtotal:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #1e293b;">€${(Number(invoice.subtotal) || 0).toFixed(2)}</td>
                </tr>
                ${Number(invoice.discount_total) > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; color: #16a34a;">Discount:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #16a34a;">-€${(Number(invoice.discount_total) || 0).toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e2e8f0; font-size: 16px; font-weight: bold;">
                  <td style="padding: 10px 0; color: #0f172a;">Grand Total:</td>
                  <td style="padding: 10px 0; text-align: right; color: #0f172a;">€${(Number(invoice.grand_total) || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
                  <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #16a34a;">€${(Number(invoice.paid_amount) || Number(invoice.grand_total) || 0).toFixed(2)}</td>
                </tr>
                ${Number(invoice.due_amount) > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; color: #dc2626; font-weight: bold;">Balance Due:</td>
                    <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #dc2626;">€${(Number(invoice.due_amount) || 0).toFixed(2)}</td>
                  </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">Thank you for your business!</p>
        ${company?.email ? `<p style="margin: 4px 0 0 0;">Questions? Contact us at <a href="mailto:${company.email}" style="color: #2563eb; text-decoration: none;">${company.email}</a></p>` : ''}
      </div>
    </div>
  `;

  await sendMail(to, subject, html);
}

