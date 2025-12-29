import twilio from 'twilio';
import axios from 'axios';

// Initialize Twilio Client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export class NotificationService {
  
  /**
   * Send Email using Brevo HTTP API (Faster than SMTP for high scale)
   */
  static async sendEmailOtp(email: string, otp: string) {
    try {
      const url = 'https://api.brevo.com/v3/smtp/email';
      const data = {
        sender: { name: "Matrimony App", email: process.env.EMAIL_SENDER },
        to: [{ email: email }],
        subject: "Your Verification Code",
        htmlContent: `<html><body><h1>Your OTP is: ${otp}</h1></body></html>`
      };

      await axios.post(url, data, {
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      console.log(`📧 Email OTP sent to ${email}`);
    } catch (error) {
      console.error('Email Failed:', error);
    }
  }

  /**
   * Send SMS using Twilio
   */
  static async sendSmsOtp(phone: string, otp: string) {
    try {
      await twilioClient.messages.create({
        body: `Your verification code is: ${otp}`,
        from: process.env.TWILIO_PHONE_NUMBER, // Your US Trial Number
        to: phone // MUST be verified in Twilio Console during trial
      });
      console.log(`📱 SMS OTP sent to ${phone}`);
    } catch (error) {
      console.error('SMS Failed:', error);
      // In production, you might fallback to WhatsApp or another provider here
    }
  }
}