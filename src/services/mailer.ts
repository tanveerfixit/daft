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

export async function sendInvoiceEmail(to: string, subject: string, invoice: any, company: any, customNote?: string, branch?: any) {
  const branchName = branch?.name || invoice?.branch_name || '';
  const branchAddress = branch?.address || invoice?.branch_address || company?.address || '';
  const branchPhone = branch?.phone || invoice?.branch_phone || company?.phone || '';

  // Filter out developer/system email so customer receipts only show the branch/store email
  const isDevEmail = (emailStr?: string) => {
    if (!emailStr) return true;
    const lower = emailStr.toLowerCase().trim();
    return lower === 'support@techinbox.ie' || lower === 'tanveerfixit@gmail.com';
  };

  let storeEmail = '';
  if (branch?.email && !isDevEmail(branch.email)) {
    storeEmail = branch.email.trim();
  } else if (invoice?.branch_email && !isDevEmail(invoice.branch_email)) {
    storeEmail = invoice.branch_email.trim();
  } else if (company?.email && !isDevEmail(company.email)) {
    storeEmail = company.email.trim();
  }

  const grandTotal = Number(invoice.grand_total) || 0;
  const subtotal = Number(invoice.subtotal) || 0;
  const taxTotal = Number(invoice.tax_total) || 0;
  const discountTotal = Number(invoice.discount_total) || 0;
  const paidAmount = Number(invoice.paid_amount) || (invoice.payments && invoice.payments.length > 0
    ? invoice.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
    : grandTotal);
  const dueAmount = Math.max(0, Number(invoice.due_amount) || (grandTotal - paidAmount));
  const changeDue = Math.max(0, paidAmount - grandTotal);
  const isPaid = (invoice.status === 'paid' || dueAmount <= 0.005);

  const itemsHtml = (invoice.items || []).map((item: any, idx: number) => `
    <tr style="border-bottom: 1px solid #f1f5f9; background: ${idx % 2 === 0 ? '#ffffff' : '#fafafa'};">
      <td style="padding: 12px 10px; font-size: 13px; color: #111827; vertical-align: top;">
        <div style="font-weight: 600; color: #111827; font-size: 13.5px;">${item.product_name || 'Item'}</div>
        ${item.sku_code ? `<div style="font-size: 11px; color: #6b7280; margin-top: 2px;">SKU: ${item.sku_code}</div>` : ''}
        ${item.imei ? `<div style="font-size: 11px; color: #4b5563; font-weight: 500; margin-top: 2px;">IMEI: ${item.imei}</div>` : ''}
        ${item.notes ? `<div style="font-size: 11px; color: #6b7280; font-style: italic; margin-top: 2px;">↳ ${item.notes}</div>` : ''}
      </td>
      <td style="padding: 12px 6px; font-size: 13px; text-align: center; color: #374151; vertical-align: top; white-space: nowrap;">${item.quantity}</td>
      <td style="padding: 12px 8px; font-size: 13px; text-align: right; color: #374151; vertical-align: top; white-space: nowrap;">€${(Number(item.price) || 0).toFixed(2)}</td>
      <td style="padding: 12px 10px; font-size: 13px; text-align: right; font-weight: 700; color: #111827; vertical-align: top; white-space: nowrap;">€${(Number(item.total) || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${subject}</title>
      <style>
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        a {
          color: #374151 !important;
          text-decoration: none !important;
        }
        a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: none !important;
          font-size: inherit !important;
          font-family: inherit !important;
          font-weight: inherit !important;
          line-height: inherit !important;
        }
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 0 !important;
            border-left: none !important;
            border-right: none !important;
          }
          .mobile-padding {
            padding: 16px 12px !important;
          }
          .mobile-stack {
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
            text-align: left !important;
          }
          .mobile-right-align {
            text-align: left !important;
            margin-top: 12px !important;
          }
          .totals-table {
            width: 100% !important;
          }
          .hide-mobile {
            display: none !important;
          }
          .item-table th, .item-table td {
            padding: 10px 6px !important;
            font-size: 12px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 20px 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #111827;">
      <center style="width: 100%; table-layout: fixed; background-color: #f4f5f7;">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); text-align: left;">
          
          <!-- 1. Header (Clean Light Store & Branch Presentation) -->
          <div style="background: #ffffff; padding: 26px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 22px; font-weight: 800; letter-spacing: 0.3px; color: #111827;">
              ${company?.name || 'EPOS'}
            </div>
            ${branchName ? `
              <div style="font-size: 14px; font-weight: 600; color: #4b5563; margin-top: 4px;">
                ${branchName}
              </div>
            ` : ''}
            <div style="margin-top: 6px; font-size: 12.5px; color: #6b7280; line-height: 1.45;">
              ${branchAddress ? `<div>${branchAddress}</div>` : ''}
              <div style="margin-top: 3px;">
                ${branchPhone ? `<span style="color: #6b7280;">Tel: ${branchPhone}</span>` : ''}
                ${branchPhone && storeEmail ? ` <span style="color: #d1d5db;">•</span> ` : ''}
                ${storeEmail ? `<span style="color: #4b5563; font-weight: 500;">${storeEmail}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- 2. Invoice & Customer Meta Section (Clean Light Cards) -->
          <div class="mobile-padding" style="padding: 18px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td class="mobile-stack" style="vertical-align: top; width: 55%;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 3px;">
                    Billed To
                  </div>
                  <div style="font-size: 15px; font-weight: 700; color: #111827;">
                    ${invoice.customer?.name || invoice.customer_name || 'Walk-in Customer'}
                  </div>
                  ${invoice.customer?.phone || invoice.customer_phone ? `
                    <div style="font-size: 12.5px; color: #4b5563; margin-top: 2px;">
                      Tel: ${invoice.customer?.phone || invoice.customer_phone}
                    </div>
                  ` : ''}
                  ${invoice.customer?.email || invoice.customer_email ? `
                    <div style="font-size: 12.5px; color: #4b5563; margin-top: 1px;">
                      ${invoice.customer?.email || invoice.customer_email}
                    </div>
                  ` : ''}
                </td>
                <td class="mobile-stack mobile-right-align" style="vertical-align: top; width: 45%; text-align: right;">
                  <div style="font-size: 15px; font-weight: 800; color: #111827; letter-spacing: 0.2px;">
                    Invoice #${invoice.invoice_number}
                  </div>
                  <div style="font-size: 12.5px; color: #6b7280; margin-top: 2px;">
                    Date: ${new Date(invoice.created_at || Date.now()).toLocaleDateString('en-IE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                  <div style="margin-top: 6px;">
                    <span style="display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; ${isPaid ? 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;'}">
                      ${isPaid ? 'PAID ✓' : 'BALANCE DUE'}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- 3. Optional Custom Message -->
          ${customNote ? `
            <div style="margin: 16px 24px 0 24px; padding: 12px 16px; background: #f8fafc; border-left: 3px solid #64748b; border-radius: 4px; font-size: 13px; color: #334155; line-height: 1.45;">
              ${customNote.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <!-- 4. Items Table (Clean Minimal Table) -->
          <div class="mobile-padding" style="padding: 20px 24px;">
            <table class="item-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
                  <th style="padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; letter-spacing: 0.5px;">Item</th>
                  <th style="padding: 10px 6px; text-align: center; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 45px; letter-spacing: 0.5px;">Qty</th>
                  <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 80px; letter-spacing: 0.5px;">Price</th>
                  <th style="padding: 10px 10px; text-align: right; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; width: 85px; letter-spacing: 0.5px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- 5. Totals & Tax Summary Breakdown -->
            <div style="margin-top: 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="hide-mobile" style="width: 40%; vertical-align: top; padding-right: 12px;">
                    ${invoice.payments && invoice.payments.length > 0 ? `
                      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #6b7280; margin-bottom: 6px;">
                        Payment Summary
                      </div>
                      ${invoice.payments.map((p: any) => `
                        <div style="font-size: 12px; color: #4b5563; margin-bottom: 3px;">
                          • ${p.method ? p.method.charAt(0).toUpperCase() + p.method.slice(1) : 'Payment'}: <strong>€${(Number(p.amount) || 0).toFixed(2)}</strong>
                        </div>
                      `).join('')}
                    ` : ''}
                  </td>
                  <td class="mobile-stack" style="width: 60%; vertical-align: top;">
                    <table class="totals-table" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">Subtotal:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">€${subtotal.toFixed(2)}</td>
                      </tr>
                      ${discountTotal > 0 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #16a34a;">Discount:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">-€${discountTotal.toFixed(2)}</td>
                        </tr>
                      ` : ''}
                      ${taxTotal > 0 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280;">VAT Included:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">€${taxTotal.toFixed(2)}</td>
                        </tr>
                      ` : ''}
                      <tr style="border-top: 1.5px solid #111827; font-size: 15px; font-weight: 800;">
                        <td style="padding: 8px 0; color: #111827;">Grand Total:</td>
                        <td style="padding: 8px 0; text-align: right; color: #111827;">€${grandTotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #6b7280;">Amount Paid:</td>
                        <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #16a34a;">€${paidAmount.toFixed(2)}</td>
                      </tr>
                      ${changeDue > 0.005 ? `
                        <tr>
                          <td style="padding: 4px 0; color: #6b7280;">Change Returned:</td>
                          <td style="padding: 4px 0; text-align: right; font-weight: 600; color: #111827;">€${changeDue.toFixed(2)}</td>
                        </tr>
                      ` : ''}
                      ${dueAmount > 0.005 ? `
                        <tr style="border-top: 1px dashed #f87171;">
                          <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">Balance Due:</td>
                          <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #dc2626;">€${dueAmount.toFixed(2)}</td>
                        </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </div>
          </div>

          <!-- 6. Footer (Clean Light Footer) -->
          <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 18px 24px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.5;">
            <div style="font-weight: 600; color: #111827; margin-bottom: 2px;">
              Thank you for your business!
            </div>
            ${branchName ? `<div>${company?.name || 'EPOS'} — ${branchName}</div>` : ''}
            ${storeEmail ? `
              <div style="margin-top: 4px; color: #6b7280;">
                Questions? Contact us at <span style="color: #374151; font-weight: 500;">${storeEmail}</span>
              </div>
            ` : ''}
          </div>

        </div>
      </center>
    </body>
    </html>
  `;

  await sendMail(to, subject, html);
}

