const { Resend } = require('resend');
const { generateReceiptEmail } = require('../../email-template');
require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API;

let resend;
if (!RESEND_API_KEY) {
  console.warn('⚠️ WARNING: RESEND_API key not found in environment variables. Email functionality will not work.');
  console.warn('⚠️ Please add RESEND_API=your_api_key to your .env file');
} else {
  resend = new Resend(RESEND_API_KEY);
  console.log('✅ Resend initialized successfully.');
}

async function sendReceiptEmail(email, transaction) {
  if (!email || !transaction) return false;
  if (!RESEND_API_KEY || !resend) {
    console.warn('⚠️ Cannot send receipt email: RESEND_API_KEY not configured');
    return false;
  }

  try {
    const html = generateReceiptEmail(transaction);
    const result = await resend.emails.send({
      from: 'TAP & PAY <tap-to-pay@aloys.work>',
      to: [email],
      subject: `TAP & PAY Receipt - ${transaction.receiptId}`,
      html: html
    });
    console.log(`✅ Receipt sent to ${email} for transaction ${transaction.receiptId}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send receipt email:', error.message);
    return false;
  }
}

async function sendSetupEmail(email, fullName, username, setupUrl) {
  if (!RESEND_API_KEY || !resend) {
    console.warn('⚠️ Cannot send setup email: RESEND_API_KEY not configured');
    return false;
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
          .logo { font-size: 32px; font-weight: 800; color: white; margin: 0; letter-spacing: -0.5px; }
          .tagline { color: rgba(255,255,255,0.9); font-size: 14px; margin: 8px 0 0 0; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 16px 0; }
          .message { font-size: 16px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px 0; }
          .info-box { background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; padding: 16px; border-radius: 8px; margin: 24px 0; }
          .info-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 4px 0; }
          .info-value { font-size: 16px; color: #f1f5f9; font-weight: 600; margin: 0; font-family: monospace; }
          .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
          .footer { background: #0f172a; padding: 24px 30px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1); }
          .footer-text { font-size: 13px; color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">TAP & PAY</h1>
            <p class="tagline">Secure RFID Payment System</p>
          </div>
          <div class="content">
            <h2 class="greeting">Welcome, ${fullName}! 👋</h2>
            <p class="message">Your TAP & PAY account has been created. Please complete your setup.</p>
            <div class="info-box">
              <p class="info-label">Your Username</p>
              <p class="info-value">${username}</p>
            </div>
            <center>
              <a href="${setupUrl}" class="button">Complete Account Setup →</a>
            </center>
          </div>
          <div class="footer">
            <p class="footer-text">© 2026 TAP & PAY. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const result = await resend.emails.send({
      from: 'TAP & PAY <tap-to-pay@aloys.work>',
      to: [email],
      subject: 'Welcome to TAP & PAY - Complete Your Account Setup',
      html: html
    });
    console.log(`✅ Setup email sent to ${email}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send setup email:', error.message);
    return false;
  }
}

async function sendResetEmail(email, fullName, username, resetUrl) {
  if (!RESEND_API_KEY || !resend) {
    console.warn('⚠️ Cannot send reset email: RESEND_API_KEY not configured');
    return false;
  }
  
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
          .logo { font-size: 32px; font-weight: 800; color: white; margin: 0; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 16px 0; }
          .message { font-size: 16px; line-height: 1.6; color: #cbd5e1; margin: 0 0 24px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
          .footer { background: #0f172a; padding: 24px 30px; text-align: center; }
          .footer-text { font-size: 13px; color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">TAP & PAY</h1>
          </div>
          <div class="content">
            <h2 class="greeting">Password Reset Request 🔑</h2>
            <p class="message">Hello ${fullName},</p>
            <p class="message">We received a request to reset the password for username <strong>${username}</strong>.</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password →</a>
            </center>
          </div>
          <div class="footer">
            <p class="footer-text">© 2026 TAP & PAY. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const result = await resend.emails.send({
      from: 'TAP & PAY <tap-to-pay@aloys.work>',
      to: [email],
      subject: 'TAP & PAY - Password Reset Request',
      html: html
    });
    console.log(`✅ Password reset email sent to ${email}`);
    return result;
  } catch (error) {
    console.error('❌ Failed to send reset email:', error.message);
    return false;
  }
}

async function sendTestEmail(email) {
  if (!RESEND_API_KEY || !resend) {
    throw new Error('Resend API key not configured');
  }

  try {
    const result = await resend.emails.send({
      from: 'TAP & PAY <tap-to-pay@aloys.work>',
      to: [email],
      subject: 'TAP & PAY - Test Email',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
            h1 { color: #6366f1; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Test Successful!</h1>
            <p>This is a test email from TAP & PAY system.</p>
            <p>If you received this, your Resend integration is working correctly.</p>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `
    });
    console.log(`✅ Test email sent to ${email}`);
    return result;
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    throw error;
  }
}

module.exports = {
  sendReceiptEmail,
  sendSetupEmail,
  sendResetEmail,
  sendTestEmail
};
