import * as Brevo from '@getbrevo/brevo';

/**
 * Email Service using Brevo (formerly Sendinblue)
 * 
 * @description Handles email sending for OTP verification and other transactional emails.
 * Uses Brevo Transactional Email API.
 * 
 * @requires BREVO_API_KEY - API key from Brevo dashboard
 * @requires EMAIL_SENDER - Sender email address (must be verified in Brevo)
 */

/**
 * OTP Email Template
 */
const createOtpEmailHtml = (otp: string): string => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your OTP Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <tr>
            <td style="background: linear-gradient(135deg, #FB6D53 0%, #FFB61D 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Matrimony</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Your journey to finding love</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">
                <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px; font-weight: 600;">Verify Your Email</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                    Thank you for registering! Please use the following OTP to verify your email address. This code is valid for 10 minutes.
                </p>
                <div style="background: linear-gradient(135deg, #FB6D53 0%, #FFB61D 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 30px 0;">
                    <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">Your Verification Code</p>
                    <p style="color: #ffffff; font-size: 36px; font-weight: 700; margin: 0; letter-spacing: 8px;">${otp}</p>
                </div>
                <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 0;">
                    If you didn't request this code, please ignore this email. Your account will remain secure.
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f9f9f9; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} Matrimony. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

/**
 * Get configured Brevo API instance
 */
function getBrevoApi(): Brevo.TransactionalEmailsApi {
    const apiInstance = new Brevo.TransactionalEmailsApi();

    // Set API key using the setApiKey method
    apiInstance.setApiKey(
        Brevo.TransactionalEmailsApiApiKeys.apiKey,
        process.env.BREVO_API_KEY || ''
    );

    return apiInstance;
}

/**
 * Send OTP verification email
 * 
 * @param email - Recipient email address
 * @param otp - 6-digit OTP code
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendOtpEmail(email: string, otp: string): Promise<boolean> {
    try {
        const senderEmail = process.env.EMAIL_SENDER;

        if (!process.env.BREVO_API_KEY) {
            console.error('[EmailService] BREVO_API_KEY not configured');
            return false;
        }

        if (!senderEmail) {
            console.error('[EmailService] EMAIL_SENDER not configured');
            return false;
        }

        const apiInstance = getBrevoApi();

        const sendSmtpEmail = new Brevo.SendSmtpEmail();

        sendSmtpEmail.sender = {
            email: senderEmail,
            name: 'Matrimony'
        };
        sendSmtpEmail.to = [{ email }];
        sendSmtpEmail.subject = 'Your Matrimony Verification Code';
        sendSmtpEmail.htmlContent = createOtpEmailHtml(otp);

        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log(`[EmailService] OTP email sent to ${email}. MessageId: ${response.body.messageId}`);
        return true;

    } catch (error) {
        console.error('[EmailService] Failed to send OTP email:', error);
        return false;
    }
}

/**
 * Email Service class for dependency injection
 */
export class EmailService {
    /**
     * Send OTP verification email
     */
    static sendOtpEmail = sendOtpEmail;
}

export default EmailService;
