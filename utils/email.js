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

module.exports = {
  sendWelcomeEmail
};
