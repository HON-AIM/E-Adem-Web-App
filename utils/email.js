const nodemailer = require('nodemailer');

// Create a transporter using environment variables or a default service
// For production, you should use environment variables for security.
// For this example/dev, we can use a Gmail account or a testing service like Ethereal.
// Since the user might not have env vars set up yet, we will wrap in try-catch or use a fallback.

const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to 'smtp.example.com' if using a custom domain
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS
  }
});

// Function to send a welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not found in environment variables. Email sending skipped.');
      return;
  }

  const mailOptions = {
    from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Welcome to E-Adem Global!',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #0044cc;">Welcome to E-Adem!</h1>
        </div>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>Thank you for joining E-Adem Global Company Limited. We are thrilled to have you on board!</p>
        <p>Your account has been successfully created. You now have access to our dashboard where you can explore our services:</p>
        <ul>
          <li>Loans</li>
          <li>Investments</li>
          <li>Forex Trading Education</li>
        </ul>
        <p>If you have any questions, feel free to reply to this email or contact our support team.</p>
        <br>
        <p>Best Regards,</p>
        <p><strong>The E-Adem Team</strong></p>
        <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
          <p>&copy; ${new Date().getFullYear()} E-Adem Global Company Limited. All rights reserved.</p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Determine if we should throw or just log. Since email is non-critical for signup flow completion, we log.
    return null;
  }
};

// Function to send email verification link
const sendVerificationEmail = async (userEmail, userName, verificationToken, host) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not found. Verification email skipped.');
        return;
    }

    const verificationUrl = `http://${host}/api/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Please Verify Your Email - E-Adem Global',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="color: #0044cc;">Verify Your Email Address</h2>
                </div>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Thank you for registering with E-Adem Global Company Limited.</p>
                <p>To secure your account and access all features, please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #0044cc; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
                </div>
                <p>Or manually copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #555;">${verificationUrl}</p>
                <p>If you did not create an account using this email address, please ignore this email.</p>
                <br>
                <p>Best Regards,</p>
                <p><strong>The E-Adem Team</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
        return null;
    }
};

// Function to send password reset email
const sendPasswordResetEmail = async (userEmail, resetToken, host) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not found. Password reset email skipped.');
        return;
    }

    const resetUrl = `http://${host}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
        from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Password Reset Request',
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #0044cc;">Password Reset Request</h2>
                <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                <p><a href="${resetUrl}" style="background-color: #0044cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
                <p>or copy and paste this link:</p>
                <p>${resetUrl}</p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
                <br>
                <p>Best Regards,</p>
                <p><strong>The E-Adem Team</strong></p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return null;
    }
};

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail
};
