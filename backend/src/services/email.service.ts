// Dynamic import to avoid crash if nodemailer not installed
interface NodemailerTransporter {
  sendMail(options: Record<string, unknown>): Promise<unknown>;
}

interface NodemailerModule {
  createTransport(config: Record<string, unknown>): NodemailerTransporter;
}

let nodemailer: NodemailerModule | undefined;
try {
  nodemailer = require('nodemailer');
} catch {
  // nodemailer not installed — will use console fallback
}
import { logger } from '../utils/logger';

// ==========================================
// EMAIL SERVICE
// Supports SMTP (Nodemailer) with fallback to console logging
// ==========================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: NodemailerTransporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!nodemailer) {
      logger.warn('nodemailer not installed. Run: npm install nodemailer @types/nodemailer');
      return;
    }

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: parseInt(SMTP_PORT || '587', 10),
          secure: parseInt(SMTP_PORT || '587', 10) === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        });
        this.isConfigured = true;
        logger.info('Email service configured successfully');
      } catch (error) {
        logger.warn('Failed to configure email service, falling back to console logging');
      }
    } else {
      logger.warn('Email service not configured (missing SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will be logged to console.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@science-ai.com';

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"Science AI Assistant" <${fromAddress}>`,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });
        logger.info(`Email sent to ${options.to}: ${options.subject}`);
        return true;
      } catch (error: unknown) {
        logger.error(`Failed to send email to ${options.to}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Fall through to console logging
      }
    }

    // Fallback: log to console (useful for development)
    logger.info(`[EMAIL FALLBACK] To: ${options.to}`);
    logger.info(`[EMAIL FALLBACK] Subject: ${options.subject}`);
    logger.info(`[EMAIL FALLBACK] Body: ${options.text || options.html}`);
    return false;
  }

  // ==========================================
  // TEMPLATE METHODS
  // ==========================================

  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Password Reset Code - Science AI Assistant',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #2d2d44; }
            .logo { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: 700; color: #8B5CF6; }
            h1 { color: #f1f5f9; font-size: 22px; margin-bottom: 16px; }
            .code { background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; font-size: 32px; font-weight: 700; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; }
            .warning { color: #94a3b8; font-size: 14px; margin-top: 24px; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">🔬 Science AI Assistant</div>
              <h1>Password Reset</h1>
              <p>You requested a password reset. Use the code below to reset your password:</p>
              <div class="code">${code}</div>
              <p class="warning">⏰ This code expires in 15 minutes.<br>If you didn't request this reset, please ignore this email.</p>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Science AI Assistant. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your password reset code is: ${code}. This code expires in 15 minutes.`,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Welcome to Science AI Assistant! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #2d2d44; }
            .logo { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: 700; color: #8B5CF6; }
            h1 { color: #f1f5f9; font-size: 22px; margin-bottom: 16px; }
            .features { margin: 20px 0; }
            .feature { display: flex; align-items: center; margin: 12px 0; }
            .feature-icon { margin-right: 12px; font-size: 20px; }
            a.button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">🔬 Science AI Assistant</div>
              <h1>Welcome, ${name}! 🎉</h1>
              <p>Your account has been created successfully. Here's what you can do:</p>
              <div class="features">
                <div class="feature"><span class="feature-icon">📝</span> Generate dissertations and academic papers</div>
                <div class="feature"><span class="feature-icon">📊</span> Create AI-powered presentations</div>
                <div class="feature"><span class="feature-icon">🔍</span> Search scientific articles (arXiv, Semantic Scholar)</div>
                <div class="feature"><span class="feature-icon">🤖</span> Chat with AI research assistant</div>
                <div class="feature"><span class="feature-icon">📋</span> Anti-AI detection optimization</div>
              </div>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Science AI Assistant. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Science AI Assistant, ${name}! Your account has been created successfully.`,
    });
  }

  async sendSubscriptionConfirmation(email: string, planName: string, expiryDate: Date): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: `Subscription Activated: ${planName} Plan - Science AI Assistant`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a1a; color: #e2e8f0; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .card { background: #1a1a2e; border-radius: 16px; padding: 40px; border: 1px solid #2d2d44; }
            .logo { text-align: center; margin-bottom: 30px; font-size: 24px; font-weight: 700; color: #8B5CF6; }
            h1 { color: #f1f5f9; font-size: 22px; margin-bottom: 16px; }
            .plan-badge { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; padding: 8px 20px; border-radius: 20px; font-weight: 600; font-size: 16px; }
            .info { background: #16163a; border-radius: 10px; padding: 16px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .info-label { color: #94a3b8; }
            .info-value { color: #f1f5f9; font-weight: 600; }
            .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">🔬 Science AI Assistant</div>
              <h1>Subscription Activated! ✅</h1>
              <p>Your subscription has been successfully activated:</p>
              <div style="text-align: center; margin: 20px 0;">
                <span class="plan-badge">${planName} Plan</span>
              </div>
              <div class="info">
                <div class="info-row">
                  <span class="info-label">Plan:</span>
                  <span class="info-value">${planName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Valid until:</span>
                  <span class="info-value">${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <div class="footer">
              © ${new Date().getFullYear()} Science AI Assistant. All rights reserved.
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Your ${planName} subscription has been activated! Valid until ${expiryDate.toLocaleDateString()}.`,
    });
  }
}

export const emailService = new EmailService();
