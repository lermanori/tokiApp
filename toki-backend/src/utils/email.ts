import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter (for now, using a mock transporter)
// In production, you would use a real email service like SendGrid, AWS SES, etc.
const createTransporter = () => {
  // For development, we'll use a mock transporter
  // In production, replace with real email service configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send email function
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER || 'noreply@toki.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error) {
    console.error('📧 Email sending failed:', error);
    return false;
  }
};

// Generate email verification template
export const generateVerificationEmail = (name: string, verificationToken: string): EmailOptions => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  return {
    to: '', // Will be set by caller
    subject: 'Welcome to Toki! Please verify your email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Toki! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Thank you for joining Toki! To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours for security reasons.</p>
        
        <p>If you didn't create an account with Toki, you can safely ignore this email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Toki. If you have any questions, please contact our support team.
        </p>
      </div>
    `
  };
};

// Generate password reset email template
export const generatePasswordResetEmail = (name: string, resetToken: string): EmailOptions => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  return {
    to: '', // Will be set by caller
    subject: 'Reset your Toki password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password 🔐</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for your Toki account. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        
        <p>This link will expire in 1 hour for security reasons.</p>
        
        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          This email was sent by Toki. If you have any questions, please contact our support team.
        </p>
      </div>
    `
  };
};

// Generate welcome email template
export const generateWelcomeEmail = (name: string): EmailOptions => {
  return {
    to: '', // Will be set by caller
    subject: 'Welcome to Toki! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Toki! 🎉</h2>
        <p>Hi ${name},</p>
        <p>Welcome to Toki! Your account has been successfully verified and you're now ready to start discovering amazing local activities.</p>
        
        <h3 style="color: #333;">What you can do now:</h3>
        <ul>
          <li>🎯 Discover nearby activities and events</li>
          <li>📱 Create your own Tokis and invite others</li>
          <li>🤝 Connect with people in your area</li>
          <li>💬 Join group chats for activities</li>
        </ul>
        
        <p>Ready to get started? Open the Toki app and explore what's happening around you!</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">
          Thank you for choosing Toki! If you have any questions, feel free to reach out to our support team.
        </p>
      </div>
    `
  };
}; 