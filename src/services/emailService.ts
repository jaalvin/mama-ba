import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface SendVerificationEmailOptions {
  email: string;
  code: string;
}

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    return transporter;
  }

  // Fallback to ethereal test transporter if no credentials provided
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('[EmailService] Created Ethereal test mail transporter');
    return transporter;
  } catch (err) {
    console.warn('[EmailService] Could not create Ethereal SMTP transporter:', err);
    return null;
  }
}

/** Send 8-digit OTP verification email to recipient */
export async function sendVerificationEmail({ email, code }: SendVerificationEmailOptions): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  let emailDelivered = false;

  // 1. Send email via Nodemailer SMTP
  try {
    const mailer = await getTransporter();
    if (mailer) {
      const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Mama Ba Health Companion" <no-reply@mamaba.app>';
      const info = await mailer.sendMail({
        from,
        to: cleanEmail,
        subject: `Mama Ba — Your Verification Code is ${code}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; rounded-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #2d6a4f; margin: 0; font-size: 24px;">Mama Ba 🇬🇭</h2>
              <p style="color: #555555; font-size: 14px; margin-top: 4px;">Your Guided Maternal & Pregnancy Companion</p>
            </div>

            <div style="background-color: #f4f9f5; border: 1px solid #c8e6c9; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #333333; font-weight: bold;">
                Your 8-Digit Email Verification Code / Wo Nkraedĩ Krado Code:
              </p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1b4332; font-family: monospace; padding: 12px; background: #ffffff; border-radius: 8px; border: 1px solid #a3b18a; display: inline-block;">
                ${code}
              </div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #666666;">
                This code expires in 15 minutes. Do not share this code with anyone.
              </p>
            </div>

            <p style="font-size: 13px; color: #555555; line-height: 1.5;">
              Enter this 8-digit verification code in your Mama Ba app to complete registration and activate your account.
            </p>

            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="font-size: 11px; color: #888888; text-align: center;">
              Mama Ba Health & Pregnancy Companion • Supporting Mothers Across Ghana
            </p>
          </div>
        `,
        text: `Your Mama Ba verification code is: ${code}. Enter this code in your app to activate your account.`,
      });

      console.log(`[EmailService] Verification email sent to ${cleanEmail}. Message ID: ${info.messageId}`);
      if (nodemailer.getTestMessageUrl(info)) {
        console.log(`[EmailService] Ethereal Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      emailDelivered = true;
    }
  } catch (err: any) {
    console.warn(`[EmailService] SMTP email dispatch failed for ${cleanEmail}:`, err?.message || err);
  }

  // 2. Also dispatch email OTP via Supabase Auth Admin if connected
  try {
    if (supabaseAdmin && supabaseAdmin.auth) {
      await supabaseAdmin.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true
        }
      });
      console.log(`[EmailService] Triggered Supabase Auth email dispatch to ${cleanEmail}`);
      emailDelivered = true;
    }
  } catch (err: any) {
    console.warn(`[EmailService] Supabase Auth email dispatch notice for ${cleanEmail}:`, err?.message || err);
  }

  return emailDelivered;
}
