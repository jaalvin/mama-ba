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
      const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Mama Ba" <mama.ba.app@gmail.com>';
      const info = await mailer.sendMail({
        from,
        to: cleanEmail,
        subject: `Mama Ba — Your Verification Code is ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 16px; background-color: #ffffff;">
            <h2 style="color: #2D2422; text-align: center;">Welcome to Mama Ba 🇬🇭</h2>
            <p style="color: #555; font-size: 14px; text-align: center;">
              Enter this 8-digit verification code in your app:
            </p>
            
            <div style="background-color: #F8F5F1; padding: 14px; text-align: center; border-radius: 12px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #8B3A2B;">
                ${code}
              </span>
            </div>

            <p style="color: #555; font-size: 14px; text-align: center;">— OR —</p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="https://mamaba.app/confirm?code=${code}" 
                 style="background-color: #8B3A2B; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">
                Confirm Email Directly
              </a>
            </div>

            <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
              If you did not request this account, you can safely ignore this email.
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
