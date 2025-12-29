import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Flexible Transporter Configuration
// If EMAIL_HOST is provided, use SMTP (Brevo/SendGrid etc)
// Otherwise fallback to Gmail service
const transporter = process.env.EMAIL_HOST
  ? nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  })
  : nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password for Gmail
    },
  });

export const sendOTP = async (email: string, otp: string) => {
  const mailOptions = {
    from: `"Matrimony App" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #4A90E2;">Matrimony App Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #333;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
        <hr/>
        <p style="font-size: 12px; color: #888;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email} | MsgID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Log specifics to help user debug
    if (process.env.EMAIL_HOST) {
      console.error(`Debug: Using Host: ${process.env.EMAIL_HOST}, User: ${process.env.EMAIL_USER}`);
    }
    throw error; // Re-throw so controller handles it
  }
};