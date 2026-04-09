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
      console.warn('Email credentials not found. Email sending skipped.');
      return;
  }

  const mailOptions = {
    from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Welcome to E-Adem Global!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">E-Adem Global</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">Microfinance Company Limited</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                  <h2 style="color: #0f172a; margin: 0 0 20px; font-size: 22px;">Welcome Aboard, ${userName}!</h2>
                  <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">Thank you for joining E-Adem Global Company Limited. We're thrilled to have you on board!</p>
                  <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">Your account has been successfully created. You now have access to our dashboard where you can explore our services:</p>
                  
                  <!-- Services -->
                  <div style="margin: 20px 0;">
                      <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center;">
                          <div style="width: 40px; height: 40px; background: #dcfce7; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                              <span style="color: #16a34a; font-size: 20px;">💰</span>
                          </div>
                          <div>
                              <strong style="color: #0f172a;">Loans</strong>
                              <p style="color: #64748b; margin: 0; font-size: 13px;">Up to ₦500,000 with flexible repayment</p>
                          </div>
                      </div>
                      <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center;">
                          <div style="width: 40px; height: 40px; background: #dbeafe; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                              <span style="color: #2563eb; font-size: 20px;">📈</span>
                          </div>
                          <div>
                              <strong style="color: #0f172a;">Investments</strong>
                              <p style="color: #64748b; margin: 0; font-size: 13px;">Up to 25% ROI with guaranteed returns</p>
                          </div>
                      </div>
                      <div style="background: #f8fafc; border-radius: 8px; padding: 15px; display: flex; align-items: center;">
                          <div style="width: 40px; height: 40px; background: #fae8ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                              <span style="color: #a855f7; font-size: 20px;">📚</span>
                          </div>
                          <div>
                              <strong style="color: #0f172a;">Forex Education</strong>
                              <p style="color: #64748b; margin: 0; font-size: 13px;">Expert-led trading classes</p>
                          </div>
                      </div>
                  </div>
                  
                  <p style="color: #64748b; line-height: 1.6; margin: 20px 0 0; font-size: 14px;">If you have any questions, feel free to contact our support team. We're here to help!</p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                  <p style="color: #94a3b8; margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} E-Adem Global Company Limited. All rights reserved.</p>
                  <p style="color: #94a3b8; margin: 10px 0 0; font-size: 12px;">Barika Junction, opposite UI second gate, Ibadan, Nigeria</p>
              </div>
          </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return null;
  }
};

// Function to send email verification link
const sendVerificationEmail = async (userEmail, userName, verificationToken, host) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('Email credentials not found. Verification email skipped.');
        return;
    }

    // Determine protocol based on environment
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const verificationUrl = `${protocol}://${host}/api/verify-email?token=${verificationToken}`;

    const mailOptions = {
        from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Please Verify Your Email - E-Adem Global',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">E-Adem Global</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">Microfinance Company Limited</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #0f172a; margin: 0 0 20px; font-size: 22px;">Verify Your Email Address</h2>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">Hello <strong style="color: #0f172a;">${userName}</strong>,</p>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">Thank you for registering with E-Adem Global Company Limited. To secure your account and access all features, please verify your email address by clicking the button below:</p>
                        
                        <!-- Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(59,130,246,0.4);">Verify Email Address</a>
                        </div>
                        
                        <!-- Fallback Link -->
                        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="color: #64748b; margin: 0 0 10px; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px; word-break: break-all;">${verificationUrl}</p>
                        </div>
                        
                        <p style="color: #64748b; line-height: 1.6; margin: 20px 0 0; font-size: 14px;">If you did not create an account with this email address, please ignore this email.</p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} E-Adem Global Company Limited. All rights reserved.</p>
                        <p style="color: #94a3b8; margin: 10px 0 0; font-size: 12px;">Barika Junction, opposite UI second gate, Ibadan, Nigeria</p>
                    </div>
                </div>
            </body>
            </html>
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

    // Determine protocol based on environment
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const resetUrl = `${protocol}://${host}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
        from: `"E-Adem Global" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Password Reset Request - E-Adem Global',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">E-Adem Global</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">Microfinance Company Limited</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #0f172a; margin: 0 0 20px; font-size: 22px;">Reset Your Password</h2>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">You are receiving this email because you (or someone else) has requested to reset the password for your account.</p>
                        <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px;">Click the button below to reset your password. This link will expire in <strong style="color: #0f172a;">1 hour</strong>.</p>
                        
                        <!-- Button -->
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(59,130,246,0.4);">Reset Password</a>
                        </div>
                        
                        <!-- Fallback Link -->
                        <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <p style="color: #64748b; margin: 0 0 10px; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
                            <p style="color: #3b82f6; margin: 0; font-size: 12px; word-break: break-all;">${resetUrl}</p>
                        </div>
                        
                        <!-- Security Notice -->
                        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                            <p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #94a3b8; margin: 0; font-size: 12px;">&copy; ${new Date().getFullYear()} E-Adem Global Company Limited. All rights reserved.</p>
                        <p style="color: #94a3b8; margin: 10px 0 0; font-size: 12px;">Barika Junction, opposite UI second gate, Ibadan, Nigeria</p>
                    </div>
                </div>
            </body>
            </html>
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
