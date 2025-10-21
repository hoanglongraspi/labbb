import AWS from 'aws-sdk';
import { buildActivationLink } from './activationCode';
import { logger } from './logger';

const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const EMAIL_FROM = process.env.NOTIFICATION_EMAIL_FROM;

interface ActivationEmailParams {
  to: string;
  code: string;
  expiresAt: Date;
  patientName?: string;
}

interface PasswordResetEmailParams {
  to: string;
  resetToken: string;
  firstName: string;
}

export const sendActivationEmail = async ({
  to,
  code,
  expiresAt,
  patientName
}: ActivationEmailParams) => {
  if (!EMAIL_FROM) {
    logger.error('NOTIFICATION_EMAIL_FROM is not configured; cannot send activation emails.');
    throw new Error('Notification email sender address is not configured');
  }

  const activationLink = buildActivationLink(code, to);
  const formattedExpiry = expiresAt.toLocaleString('en-US', { timeZone: 'UTC' });
  const greeting = patientName ? `Hello ${patientName},` : 'Hello,';

  const textBody = [
    greeting,
    '',
    'An administrator has invited you to the Patient Portal.',
    '',
    `Activation Code: ${code}`,
    `Expires At (UTC): ${formattedExpiry}`,
    '',
    `Use the link below to finish creating your account. The activation code is filled in for you.`,
    activationLink,
    '',
    'If you did not expect this email, please contact your clinic.',
    '',
    'Thank you,',
    'Patient Portal Team'
  ].join('\n');

  const htmlBody = `
    <p>${greeting}</p>
    <p>An administrator has invited you to the Patient Portal.</p>
    <p style="font-size: 1.1rem; font-weight: bold;">Activation Code: ${code}</p>
    <p>Expires At (UTC): <strong>${formattedExpiry}</strong></p>
    <p>
      Click <a href="${activationLink}" target="_blank" rel="noopener noreferrer">this activation link</a>
      to finish setting up your account. The code will be filled in automatically.
    </p>
    <p>If you did not expect this email, please contact your clinic.</p>
    <p>Thank you,<br/>Patient Portal Team</p>
  `;

  try {
    await ses
      .sendEmail({
        Source: EMAIL_FROM,
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Subject: {
            Data: 'Your Patient Portal Activation Code'
          },
          Body: {
            Text: {
              Data: textBody
            },
            Html: {
              Data: htmlBody
            }
          }
        }
      })
      .promise();
  } catch (error: any) {
    logger.error('Failed to send activation email', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error
    });
    throw new Error(`Failed to send activation email: ${error.message || 'Unknown error'}`);
  }
};

export const sendPasswordResetEmail = async ({
  to,
  resetToken,
  firstName
}: PasswordResetEmailParams) => {
  if (!EMAIL_FROM) {
    logger.error('NOTIFICATION_EMAIL_FROM is not configured; cannot send password reset emails.');
    throw new Error('Notification email sender address is not configured');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

  const textBody = [
    `Hi ${firstName},`,
    '',
    'We received a request to reset your password for your AudioSight account.',
    '',
    'Click the link below to reset your password:',
    resetLink,
    '',
    'This link will expire in 1 hour.',
    '',
    'If you did not request this reset, please ignore this email. Your password will remain unchanged.',
    '',
    'Thank you,',
    'AudioSight Team'
  ].join('\n');

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #2B85FF;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2B85FF;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            margin: 15px 0;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AudioSight</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password for your AudioSight account.</p>
            <p>Click the button below to reset your password:</p>
            <center>
              <a href="${resetLink}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2B85FF;">${resetLink}</p>

            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Your password will remain unchanged</li>
              </ul>
            </div>

            <div class="footer">
              <p>This is an automated email from AudioSight. Please do not reply to this email.</p>
              <p>If you have any questions, please contact our support team.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    await ses
      .sendEmail({
        Source: EMAIL_FROM,
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Subject: {
            Data: 'Reset Your AudioSight Password'
          },
          Body: {
            Text: {
              Data: textBody
            },
            Html: {
              Data: htmlBody
            }
          }
        }
      })
      .promise();

    logger.info(`Password reset email sent to ${to}`);
  } catch (error: any) {
    logger.error('Failed to send password reset email', {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error
    });
    throw new Error(`Failed to send password reset email: ${error.message || 'Unknown error'}`);
  }
};
