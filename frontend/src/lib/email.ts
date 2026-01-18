/**
 * Email notification utility
 * Supports Gmail SMTP (via Nodemailer) or Resend API
 * Sends notifications to area administrators when new reports are created
 */

import nodemailer from 'nodemailer';
import type { Report, AdminArea } from './types';
import { CATEGORY_LABELS, SEVERITY_COLORS } from './types';

// Gmail SMTP configuration (preferred - free, no third-party service)
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

// Resend configuration (fallback option)
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Communify <notifications@resend.dev>';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Email provider type
type EmailProvider = 'gmail' | 'resend' | 'none';

/**
 * Determine which email provider is configured
 */
function getEmailProvider(): EmailProvider {
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    return 'gmail';
  }
  if (RESEND_API_KEY) {
    return 'resend';
  }
  return 'none';
}

/**
 * Check if email sending is configured
 */
export function isEmailConfigured(): boolean {
  const provider = getEmailProvider();
  const configured = provider !== 'none';

  // Log configuration status for debugging
  console.log(`Email configuration check: provider=${provider}, configured=${configured}`);
  if (!configured) {
    console.warn(
      'Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD, or RESEND_API_KEY environment variables.'
    );
    // Log which variables are missing (without values)
    if (!GMAIL_USER) console.warn('  - GMAIL_USER is not set');
    if (!GMAIL_APP_PASSWORD) console.warn('  - GMAIL_APP_PASSWORD is not set');
    if (!RESEND_API_KEY) console.warn('  - RESEND_API_KEY is not set');
  }

  return configured;
}

/**
 * Create Gmail SMTP transporter
 */
function createGmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Send email using Gmail SMTP
 */
async function sendEmailViaGmail(to: string[], subject: string, html: string): Promise<boolean> {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured');
    return false;
  }

  try {
    const transporter = createGmailTransporter();

    const mailOptions = {
      from: `Communify <${GMAIL_USER}>`,
      to: to.join(', '),
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent via Gmail to ${to.join(', ')} - Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Failed to send email via Gmail:', error);
    return false;
  }
}

/**
 * Send email using Resend API
 */
async function sendEmailViaResend(to: string[], subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    console.log(`Email sent via Resend to ${to.join(', ')}`);
    return true;
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return false;
  }
}

/**
 * Send email using the configured provider
 */
async function sendEmail(to: string[], subject: string, html: string): Promise<boolean> {
  const provider = getEmailProvider();

  switch (provider) {
    case 'gmail':
      return sendEmailViaGmail(to, subject, html);
    case 'resend':
      return sendEmailViaResend(to, subject, html);
    default:
      console.warn('No email provider configured, skipping email');
      return false;
  }
}

/**
 * Get severity badge HTML
 */
function getSeverityBadge(severity: string): string {
  const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || '#6b7280';
  return `<span style="
    display: inline-block;
    padding: 4px 12px;
    background-color: ${color}20;
    color: ${color};
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  ">${severity}</span>`;
}

/**
 * Generate email HTML for new report notification
 */
function generateReportEmailHtml(report: Report, area: AdminArea): string {
  const categoryLabel = CATEGORY_LABELS[report.content.category as keyof typeof CATEGORY_LABELS] || report.content.category;
  const googleMapsUrl = `https://www.google.com/maps?q=${report.coordinates.lat},${report.coordinates.lng}`;
  const adminUrl = `${APP_URL}/admin`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Accessibility Barrier Report</title>
</head>
<body style="
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
">
  <div style="
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
  ">
    <!-- Header -->
    <div style="
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      border-radius: 12px 12px 0 0;
      padding: 30px;
      text-align: center;
    ">
      <h1 style="
        margin: 0;
        color: white;
        font-size: 24px;
        font-weight: 600;
      ">New Accessibility Report</h1>
      <p style="
        margin: 10px 0 0;
        color: rgba(255,255,255,0.9);
        font-size: 14px;
      ">A new barrier has been reported in your area</p>
    </div>

    <!-- Content -->
    <div style="
      background: white;
      padding: 30px;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <!-- Area Badge -->
      <div style="
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 20px;
      ">
        <p style="margin: 0; font-size: 12px; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">Area</p>
        <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #0c4a6e;">${area.name}</p>
      </div>

      <!-- Report Title & Severity -->
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px; font-size: 20px; color: #1f2937;">${report.content.title}</h2>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${getSeverityBadge(report.content.severity)}
          <span style="
            display: inline-block;
            padding: 4px 12px;
            background-color: #f3f4f6;
            color: #4b5563;
            border-radius: 9999px;
            font-size: 12px;
          ">${categoryLabel}</span>
        </div>
      </div>

      <!-- Image Preview -->
      ${report.thumbnailUrl || report.mediaUrl ? `
      <div style="margin-bottom: 20px;">
        <img
          src="${report.thumbnailUrl || report.mediaUrl}"
          alt="Report image"
          style="
            width: 100%;
            max-height: 300px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
          "
        />
      </div>
      ` : ''}

      <!-- Description -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Description</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${report.content.description}</p>
      </div>

      <!-- Suggested Fix -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Suggested Fix</h3>
        <p style="margin: 0; color: #374151; line-height: 1.6;">${report.content.suggestedFix}</p>
      </div>

      <!-- Location -->
      <div style="
        background: #f9fafb;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 24px;
      ">
        <h3 style="margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Location</h3>
        <p style="margin: 0 0 12px; color: #374151; font-family: monospace; font-size: 13px;">
          ${report.coordinates.lat.toFixed(6)}, ${report.coordinates.lng.toFixed(6)}
        </p>
        <a href="${googleMapsUrl}" target="_blank" style="
          display: inline-block;
          padding: 8px 16px;
          background: #10b981;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        ">View on Google Maps</a>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center;">
        <a href="${adminUrl}" style="
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
        ">View in Admin Dashboard</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-size: 12px;
    ">
      <p style="margin: 0;">This notification was sent by Communify</p>
      <p style="margin: 8px 0 0;">You are receiving this because you are registered for notifications in "${area.name}"</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send notification emails for a new report to all registered emails in matching areas
 */
export async function sendReportNotifications(
  report: Report,
  matchingAreas: AdminArea[]
): Promise<{ sent: number; failed: number }> {
  console.log('sendReportNotifications called', {
    reportId: report.id,
    matchingAreasCount: matchingAreas.length,
    areasWithEmails: matchingAreas.map(a => ({
      name: a.name,
      emailCount: a.notificationEmails?.length || 0
    }))
  });

  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping notifications');
    return { sent: 0, failed: 0 };
  }

  const provider = getEmailProvider();
  console.log(`Sending email notifications via ${provider}`);

  let sent = 0;
  let failed = 0;

  for (const area of matchingAreas) {
    const emails = area.notificationEmails || [];
    if (emails.length === 0) {
      continue;
    }

    const subject = `[Communify] New ${report.content.severity} severity report in ${area.name}`;
    const html = generateReportEmailHtml(report, area);

    const success = await sendEmail(emails, subject, html);
    if (success) {
      sent += emails.length;
    } else {
      failed += emails.length;
    }
  }

  console.log(`Email notifications: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate array of emails
 */
export function validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const email of emails) {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed)) {
      valid.push(trimmed);
    } else if (trimmed) {
      invalid.push(trimmed);
    }
  }

  return { valid, invalid };
}
