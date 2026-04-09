require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').MongoStore;
const path = require('path');
const User = require('./models/User');
const Application = require('./models/Application');
const SiteContent = require('./models/SiteContent');
const Transaction = require('./models/Transaction');
const axios = require('axios');
const multer = require('multer');

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Images Only!'));
    }
});

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eadem_db';
const SESSION_SECRET = process.env.SESSION_SECRET;
const SETUP_SECRET = process.env.SETUP_SECRET;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

const fs = require('fs');
const util = require('util');

function logToFile(msg) {
    const time = new Date().toISOString();
    const line = `[${time}] ${util.format(msg)}\n`;
    fs.appendFileSync('server.log', line);
}

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => {
      console.log('MongoDB Connected Successfully');
      logToFile('MongoDB Connected Successfully');
  })
  .catch(err => {
      console.error('MongoDB Connection Error:', err);
      logToFile('MongoDB Connection Error: ' + err);
  });

// Trust Proxy (Required for Render/Heroku SSL)
app.set('trust proxy', 1);

const helmet = require('helmet');
const { limiter, authLimiter } = require('./utils/security.js');

// Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    logToFile(`${req.method} ${req.url}`);
    next();
});

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to avoid breaking inline scripts/styles during dev
}));

// Apply Rate Limiting
app.use('/api/', limiter); // General API limit
app.use('/api/login', authLimiter); // Strict login limit
app.use('/api/register', authLimiter); // Strict register limit

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
// Configure Session with better reliability
app.use(session({
  secret: SESSION_SECRET,
  resave: false,               // Don't save session if unmodified
  saveUninitialized: false,    // Don't create session until something stored
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
    // Secure cookies require HTTPS. If not on HTTPS (localhost), this must be false.
    // We can use a check or default to false for dev/testing unless explicitly 'production'
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' 
  }
 // removed proxy: true as it can cause issues if not behind a proxy
}));

const crypto = require('crypto');
const { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } = require('./utils/email');

// Routes

// Register
app.post('/api/register', async (req, res) => {
  const timestamp = Date.now();
  console.log('Register hit', timestamp);
  logToFile('Register hit ' + timestamp);
  
  try {
    const { fullName, email, password, phone } = req.body;
    
    // Basic Validation
    if (!fullName || !email || !password || !phone) {
        console.log('Validation failed: Missing fields');
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Password strength validation
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    // Phone validation (basic)
    const phoneRegex = /^[0-9+\s-]{10,}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(400).json({ message: 'Invalid phone number format' });
    }

    console.log('Checking for existing user...');
    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      console.log('User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    console.log('Creating new user instance...');
    // Create new user
    user = new User({
      fullName,
      email,
      password,
      phone,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: Date.now() + 24 * 3600000 // 24 hours
    });

    console.log('Saving user to database...');
    await user.save();
    console.log('User saved successfully');
    
    // Send Verification Email and Welcome Email (Async - don't block response)
    const host = req.headers.host;
    sendVerificationEmail(user.email, user.fullName, verificationToken, host).catch(err => console.error('Verification Email failed asynchronously', err));
    sendWelcomeEmail(user.email, user.fullName).catch(err => console.error('Welcome Email failed asynchronously', err));

    res.status(201).json({ 
        message: 'Registration successful! Please check your email to verify your account before logging in.', 
        user: { fullName: user.fullName, email: user.email } 
    });

  } catch (error) {
    const msg = 'Server error during registration ' + timestamp;
    console.error('CRITICAL REGISTER ERROR:', error);
    if (error.stack) console.error(error.stack);
    logToFile(msg + ' ' + error.stack);
    res.status(500).json({ message: msg, error: error.message });
  }
});

// Verify Email
app.get('/api/verify-email', async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).send('Invalid verification link.');
        }

        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send(`
                <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                    <h2 style="color: #ef4444;">Verification Failed</h2>
                    <p>The verification link is invalid or has expired.</p>
                    <a href="/login.html" style="color: #3b82f6;">Return to Login</a>
                </div>
            `);
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;

        await user.save();

        res.send(`
            <div style="text-align:center; padding: 50px; font-family: sans-serif;">
                <h2 style="color: #10b981;">Email Verified Successfully!</h2>
                <p>Thank you for verifying your email address.</p>
                <a href="/dashboard.html" style="display:inline-block; margin-top:20px; padding: 10px 20px; background:#3b82f6; color:white; text-decoration:none; border-radius:5px;">Go to Dashboard</a>
            </div>
        `);
    } catch (error) {
        console.error('Email Verification Error:', error);
        res.status(500).send('Server Error during verification.');
    }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify Password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify Email Status
    if (!user.isEmailVerified) {
        return res.status(403).json({ message: 'Please verify your email address before logging in. Check your inbox.' });
    }

    // Update Last Login
    user.lastLogin = Date.now();
    await user.save();

    // Create Session
    req.session.userId = user._id;

    // Explicitly save session before response to avoid race condition
    req.session.save((err) => {
        if (err) {
            console.error('Session Save Error:', err);
            return res.status(500).json({ message: 'Session Error' });
        }
        res.json({ 
            message: 'Logged in successfully', 
            user: { 
                fullName: user.fullName, 
                email: user.email, 
                role: user.role 
            },
            redirect: user.role === 'admin' ? '/admin' : 'dashboard.html'
        });
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get User Data (with active loan amount)
app.get('/api/user', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get active loan amount
        const activeLoan = await Application.findOne({ 
            userId: user._id, 
            type: 'Loan', 
            status: 'Approved' 
        }).sort({ createdAt: -1 });

        const responseData = user.toObject();
        responseData.activeLoanAmount = activeLoan && activeLoan.details && activeLoan.details.amount 
            ? activeLoan.details.amount 
            : (user.activeLoanAmount || 0);

        res.json(responseData);
    } catch (error) {
        console.error('Get User Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update User Profile
app.post('/api/user/update', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const { phone, address, nin } = req.body;
        const user = await User.findById(req.session.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update fields
        if (phone) user.phone = phone;
        if (address) user.address = address;

        // Handle NIN Verification
        if (nin) {
            if (user.isNinVerified && user.nin !== nin) {
                return res.status(400).json({ message: 'NIN is already verified and cannot be changed.' });
            }
            if (!user.isNinVerified) {
                const existingNin = await User.findOne({ nin: nin });
                if (existingNin && existingNin._id.toString() !== user._id.toString()) {
                    return res.status(400).json({ message: 'This NIN is already linked to another account.' });
                }
                user.nin = nin;
                user.isNinVerified = false; // Require Admin Approval
            }
        }

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { ...user.toObject(), password: undefined } });

    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ message: 'Server error updating profile' });
    }
});

// Delete Own Account
app.delete('/api/user/delete', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for active loans
        if (user.activeLoanAmount > 0) {
            return res.status(400).json({ 
                message: `Cannot delete account. Outstanding loan balance: ₦${user.activeLoanAmount.toLocaleString()}` 
            });
        }

        // Delete Applications
        await Application.deleteMany({ userId: user._id });

        // Delete Transactions
        await Transaction.deleteMany({ userId: user._id });

        // Delete User
        await User.findByIdAndDelete(user._id);

        // Destroy Session
        req.session.destroy(err => {
            if (err) return res.status(500).json({ message: 'Account deleted but session clear failed' });
            res.clearCookie('connect.sid');
            res.json({ message: 'Account deleted successfully' });
        });

    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error deleting account' });
    }
});

// Change Password (Logged In)
app.post('/api/user/change-password', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }

        // Password strength validation
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }
        if (!/[A-Z]/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one number' });
        }

        // Prevent using current password as new password
        if (currentPassword === newPassword) {
            return res.status(400).json({ message: 'New password cannot be the same as current password' });
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify Current Password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect current password' });
        }

        // Set New Password
        user.password = newPassword;
        await user.save(); // Pre-save hook hashes it

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ message: 'Server error updating password' });
    }
});

// Forgot Password
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Security: Don't reveal if user exists
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Generate Token
        const token = crypto.randomBytes(20).toString('hex');

        // Set token and expiration (1 hour)
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Send Email
        const host = req.headers.host;
        sendPasswordResetEmail(user.email, token, host)
            .catch(err => console.error('Error sending reset email async:', err));
        
        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error processing request' });
    }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        const user = await User.findOne({ 
            resetPasswordToken: token, 
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save(); // Pre-save hook will hash password

        res.json({ message: 'Password has been reset successfully! You can now log in.' });

    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error resetting password' });
    }
});

// Application Route
app.post('/api/apply', async (req, res) => {
  try {
    const { fullName, email, phone, type, details } = req.body;
    
    // Check if user is logged in (optional but good for tracking)
    const userId = req.session.userId || null;

    if (!fullName || !email || !type) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const newApplication = new Application({
      userId,
      fullName,
      email,
      phone,
      type,
      details
    });

    await newApplication.save();

    res.status(201).json({ message: 'Application submitted successfully!' });
  } catch (error) {
    console.error('Application Error:', error);
    res.status(500).json({ message: 'Server error processing application' });
  }
});

// Contact Route
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!email || !message) {
            return res.status(400).json({ message: 'Email and message are required' });
        }

        // In a real app, you might save this to DB or send an email
        console.log('Contact Form Submission:', { name, email, subject, message });

        // For now, just respond success
        res.status(200).json({ message: 'Message sent successfully! We will get back to you soon.' });
    } catch (error) {
        console.error('Contact Form Error:', error);
        res.status(500).json({ message: 'Server error submitting message' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Upload Profile Picture
app.post('/api/upload-profile', upload.single('profilePicture'), async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Save relative path to DB
        const imagePath = `/uploads/${req.file.filename}`;
        user.profilePicture = imagePath;
        await user.save();

        res.json({ message: 'Profile picture updated', filePath: imagePath });

    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: 'Server error updating profile picture' });
    }
});

// --- ADMIN ROUTES ---

// Middleware to check Admin Role
async function isAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Server check error' });
    }
}

// Get Admin Stats for Overview
app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        // Sum total active loans
        const usersWithLoans = await User.find({ activeLoanAmount: { $gt: 0 } });
        const totalActiveLoans = usersWithLoans.reduce((sum, u) => sum + u.activeLoanAmount, 0);
        
        // Applications stats
        const pendingApplications = await Application.countDocuments({ status: 'Pending' });
        
        // Unverified Nin users count for quick action
        const pendingNinVerifications = await User.countDocuments({ nin: { $exists: true, $ne: null }, isNinVerified: false });
        
        // Total successful transactions amount
        const txnAgg = await Transaction.aggregate([
            { $match: { status: 'Success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        res.json({
            totalUsers,
            totalActiveLoans,
            pendingApplications,
            pendingNinVerifications,
            totalTransactions: txnAgg[0]?.total || 0
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Error fetching stats' });
    }
});

// Admin Panel (Protected View)
app.get('/admin', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
});

// SECRET SETUP ROUTE (For Initial Admin Creation)
// Usage: /api/setup-admin?email=YOUR_EMAIL&secret=YOUR_SECRET
app.get('/api/setup-admin', async (req, res) => {
    const { email, secret } = req.query;

    if (!SETUP_SECRET) {
        return res.status(500).json({ message: 'Admin setup secret not configured. Set SETUP_SECRET environment variable.' });
    }

    if (secret !== SETUP_SECRET) {
        return res.status(403).json({ message: 'Invalid setup secret.' });
    }

    if (!email) {
        return res.status(400).json({ message: 'Email query parameter is required.' });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please register first.' });
        }

        user.role = 'admin';
        await user.save();

        res.json({ 
            message: `SUCCESS: User ${user.email} is now an Admin!`, 
            nextStep: 'Please log out and log back in to access /admin panel.' 
        });
    } catch (error) {
        console.error('Setup Admin Error:', error);
        res.status(500).json({ message: 'Server error during setup.' });
    }
});

// Get All Site Content (Public allowed? Or Admin only? Usually public needs to read it too)
app.get('/api/content', async (req, res) => {
    try {
        const content = await SiteContent.find({});
        // Convert to simple object { key: value } for easier frontend use
        const contentMap = {};
        content.forEach(item => {
            contentMap[item.key] = item.value;
        });
        res.json(contentMap);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching content' });
    }
});

// Update Site Content (Admin Only)
app.post('/api/content', isAdmin, async (req, res) => {
    try {
        const { updates } = req.body; // Expect array of { key, value } or object keys
        
        if (!updates) return res.status(400).json({ message: 'No updates provided' });

        // Handle object format { key: value }
        const promises = Object.keys(updates).map(async (key) => {
            return SiteContent.findOneAndUpdate(
                { key: key },
                { value: updates[key], lastUpdated: Date.now() },
                { upsert: true, new: true }
            );
        });

        await Promise.all(promises);
        res.json({ message: 'Content updated successfully' });
    } catch (error) {
        console.error('Update Content Error:', error);
        res.status(500).json({ message: 'Server error updating content' });
    }
});

// Admin: Get All Users with enriched data
app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        
        // Enrich with Loan Data
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            const userObj = user.toObject();
            
            if (user.activeLoanAmount > 0) {
                const loan = await Application.findOne({ 
                    userId: user._id, 
                    type: 'Loan', 
                    status: 'Approved' 
                }).sort({ approvedAt: -1, createdAt: -1 });
                
                if (loan) {
                    userObj.loanApprovedAt = loan.approvedAt || loan.createdAt;
                    userObj.loanDuration = loan.details ? loan.details.duration : 'Unknown';
                }
            }
            return userObj;
        }));

        res.json(enrichedUsers);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Admin: Delete User
app.delete('/api/admin/user/:id', isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Prevent deleting self (current logged in admin)
        if (userId === req.session.userId) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Cleanup related data
        await Application.deleteMany({ userId: userId });
        
        res.json({ message: 'User and all related data deleted successfully.' });
    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ message: 'Server error deleting user' });
    }
});

// Admin: Approve/Reject specific Loan Application
app.post('/api/admin/loan-action', async (req, res) => {
    try {
         const { applicationId, userId, action, amount } = req.body;
         
         if (!applicationId && !userId) {
             return res.status(400).json({ message: 'Either applicationId or userId is required' });
         }
         
         const user = await User.findById(userId);
         if (!user) return res.status(404).json({ message: 'User not found' });
         
         if (action === 'approve') {
             // Check for existing pending loan applications
             const pendingLoan = await Application.findOne({ 
                 userId: userId, 
                 type: 'Loan',
                 status: 'Pending'
             });
             
             if (!pendingLoan && !applicationId) {
                 return res.status(400).json({ message: 'No pending loan application found for this user' });
             }
             
             user.activeLoanAmount = amount || 0;
             // Update the specific application
             if (applicationId) {
                 await Application.findByIdAndUpdate(applicationId, { 
                     status: 'Approved', 
                     approvedAt: Date.now() 
                 });
             } else if (pendingLoan) {
                 pendingLoan.status = 'Approved';
                 pendingLoan.approvedAt = Date.now();
                 await pendingLoan.save();
             }
         } else if (action === 'reject') {
             // Reject specific application
             if (applicationId) {
                 await Application.findByIdAndUpdate(applicationId, { status: 'Rejected' });
             } else {
                 await Application.updateMany({ 
                     userId: userId, 
                     type: 'Loan',
                     status: 'Pending'
                 }, { status: 'Rejected' });
             }
             user.activeLoanAmount = 0;
         }
         
         await user.save();
         res.json({ message: `Loan ${action}d successfully` });
    } catch (error) {
        console.error('Loan Action Error:', error);
        res.status(500).json({ message: 'Error processing loan action' });
    }
});

// Admin: Verify NIN
app.post('/api/admin/verify-nin', isAdmin, async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({message: 'User not found'});
        
        user.isNinVerified = true;
        await user.save();
        
        res.json({ message: 'NIN Verified Successfully' });
    } catch(err) {
        res.status(500).json({ message: 'Error verifying NIN' });
    }
});

// Admin: Fetch All Applications
app.get('/api/admin/applications', isAdmin, async (req, res) => {
    try {
        const applications = await Application.find({})
            .populate('userId', 'fullName email phone')
            .sort({ createdAt: -1 });
        res.json(applications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching applications' });
    }
});

// Admin: Application Action (Approve/Reject)
app.post('/api/admin/application-action', isAdmin, async (req, res) => {
    try {
        const { applicationId, action } = req.body;
        // action: 'approve' | 'reject'

        const application = await Application.findById(applicationId);
        if (!application) return res.status(404).json({ message: 'Application not found' });

        if (action === 'approve') {
            application.status = 'Approved';
            application.approvedAt = Date.now();
            
            // If it's a Loan, update user balance
            if (application.type === 'Loan' && application.details && application.details.amount) {
                const user = await User.findById(application.userId);
                if (user) {
                    user.activeLoanAmount = (user.activeLoanAmount || 0) + application.details.amount;
                    await user.save();
                }
            }
        } else if (action === 'reject') {
            application.status = 'Rejected';
        } else {
            return res.status(400).json({ message: 'Invalid action' });
        }

        await application.save();
        res.json({ message: `Application ${action}d successfully` });

    } catch (error) {
        console.error('App Action Error:', error);
        res.status(500).json({ message: 'Error processing application' });
    }
});

// Admin: Delete Application
app.delete('/api/admin/application/:id', isAdmin, async (req, res) => {
    try {
        const appId = req.params.id;
        const app = await Application.findByIdAndDelete(appId);
        if (!app) return res.status(404).json({ message: 'Application not found' });
        
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
         res.status(500).json({ message: 'Error deleting application' });
    }
});

// Admin: Get Enhanced Stats
app.get('/api/admin/dashboard-stats', isAdmin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        
        // Total active loans
        const usersWithLoans = await User.find({ activeLoanAmount: { $gt: 0 } });
        const totalActiveLoans = usersWithLoans.reduce((sum, u) => sum + u.activeLoanAmount, 0);
        const loansCount = usersWithLoans.length;
        
        // Applications stats
        const pendingApplications = await Application.countDocuments({ status: 'Pending' });
        const pendingNinVerifications = await User.countDocuments({ nin: { $exists: true, $ne: null }, isNinVerified: false });
        
        // Transaction stats
        const totalTransactions = await Transaction.aggregate([
            { $match: { status: 'Success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        res.json({
            totalUsers,
            totalActiveLoans,
            loansCount,
            pendingApplications,
            pendingNinVerifications,
            totalTransactions: totalTransactions[0]?.total || 0
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Admin: Get All Transactions
app.get('/api/admin/all-transactions', isAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find({})
            .populate('userId', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(500);
        res.json(transactions);
    } catch (error) {
        console.error('Transactions error:', error);
        res.status(500).json({ message: 'Error fetching transactions' });
    }
});

// Admin: Wallet Adjustment (Credit/Debit)
app.post('/api/admin/wallet-adjustment', isAdmin, async (req, res) => {
    try {
        const { userEmail, action, amount, note } = req.body;
        
        if (!userEmail || !action || !amount) {
            return res.status(400).json({ message: 'Email, action, and amount are required' });
        }
        
        const user = await User.findOne({ email: userEmail.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found with this email' });
        }
        
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }
        
        if (action === 'debit' && user.accountBalance < numAmount) {
            return res.status(400).json({ message: 'Insufficient balance for debit' });
        }
        
        // Update balance
        const adjustment = action === 'credit' ? numAmount : -numAmount;
        user.accountBalance = (user.accountBalance || 0) + adjustment;
        await user.save();
        
        // Log the transaction
        await Transaction.create({
            userId: user._id,
            type: action === 'credit' ? 'Admin_Credit' : 'Admin_Debit',
            amount: numAmount,
            reference: `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: 'Success',
            description: note || `Admin ${action}: ${action === 'credit' ? 'Added' : 'Removed'} ₦${numAmount.toLocaleString()}`
        });
        
        res.json({ 
            message: `Wallet ${action === 'credit' ? 'credited' : 'debited'} successfully. New balance: ₦${user.accountBalance.toLocaleString()}`,
            newBalance: user.accountBalance
        });
    } catch (error) {
        console.error('Wallet adjustment error:', error);
        res.status(500).json({ message: 'Error adjusting wallet' });
    }
});

// Admin: Update User Role
app.post('/api/admin/update-role', isAdmin, async (req, res) => {
    try {
        const { userId, role } = req.body;
        
        if (userId === req.session.userId) {
            return res.status(400).json({ message: 'Cannot modify your own role' });
        }
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.role = role;
        await user.save();
        
        res.json({ message: `User role updated to ${role}` });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Error updating user role' });
    }
});

// Admin: Create User Manually
app.post('/api/admin/create-user', isAdmin, async (req, res) => {
    try {
        const { fullName, email, phone, password } = req.body;
        
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Full name, email, and password are required' });
        }
        
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        
        const user = new User({
            fullName,
            email: email.toLowerCase(),
            phone,
            password,
            isEmailVerified: true, // Admin-created accounts are pre-verified
            emailVerificationToken: undefined
        });
        
        await user.save();
        
        res.status(201).json({ 
            message: 'User created successfully',
            user: { fullName: user.fullName, email: user.email }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Admin: Get Audit Logs (placeholder for future implementation)
app.get('/api/admin/audit-logs', isAdmin, async (req, res) => {
    try {
        // For now, return recent admin actions from applications
        const logs = await Application.find({})
            .sort({ createdAt: -1 })
            .limit(100)
            .select('type status createdAt approvedAt');
        
        res.json(logs.map(log => ({
            action: `${log.type} ${log.status}`,
            timestamp: log.status === 'Approved' ? log.approvedAt : log.createdAt,
            type: 'application'
        })));
    } catch (error) {
        res.status(500).json({ message: 'Error fetching audit logs' });
    }
});
});

// --- WALLET / PAYMENT ROUTES ---

// Initialize Paystack Funding
app.post('/api/wallet/initialize', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

        const user = await User.findById(req.session.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Call Paystack
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) return res.status(500).json({ message: 'Payment gateway not configured' });

        // Paystack uses kobo
        const amountInKobo = Math.round(amount * 100);
        
        // Dynamic callback URL based on environment
        const isProduction = process.env.NODE_ENV === 'production';
        const callbackUrl = isProduction 
            ? `https://${req.headers.host}/dashboard.html?payment=success`
            : `http://${req.headers.host}/dashboard.html?payment=success`;

        const response = await axios.post('https://api.paystack.co/transaction/initialize', {
            email: user.email,
            amount: amountInKobo,
            callback_url: callbackUrl
        }, {
            headers: {
                Authorization: `Bearer ${paystackSecret}`,
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;
        if (!data.status) {
            return res.status(400).json({ message: 'Failed to initialize payment' });
        }

        // Create Pending Transaction Object
        await Transaction.create({
            userId: user._id,
            type: 'Funding',
            amount: amount,
            reference: data.data.reference,
            status: 'Pending',
            description: `Wallet Funding via Paystack`
        });

        res.json({
            url: data.data.authorization_url,
            reference: data.data.reference
        });

    } catch (error) {
        console.error('Paystack Init Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error establishing connection with payment gateway.' });
    }
});

// Verify Paystack Payment
app.post('/api/wallet/verify', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const { reference } = req.body;
        if (!reference) return res.status(400).json({ message: 'Reference required' });

        // Find the pending transaction
        const transaction = await Transaction.findOne({ reference, userId: req.session.userId });
        if (!transaction) return res.status(404).json({ message: 'Transaction record not found' });

        if (transaction.status === 'Success') {
            return res.json({ message: 'Payment already verified.', isSuccess: true });
        }

        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackSecret) return res.status(500).json({ message: 'Payment gateway not configured' });

        const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: {
                Authorization: `Bearer ${paystackSecret}`
            }
        });

        const data = response.data;
        if (data.status && data.data.status === 'success') {
            // Success - update DB atomically
            transaction.status = 'Success';
            await transaction.save();

            const amountInNaira = data.data.amount / 100;
            await User.updateOne(
                { _id: req.session.userId },
                { $inc: { accountBalance: amountInNaira } }
            );

            return res.json({ message: 'Payment successful! Wallet funded.', isSuccess: true });
        } else {
            transaction.status = 'Failed';
            await transaction.save();
            return res.status(400).json({ message: 'Payment verification failed or not successful.', isSuccess: false });
        }

    } catch (error) {
        console.error('Paystack Verify Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Verification error' });
    }
});

// Internal Transfer
app.post('/api/wallet/transfer', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const { recipientEmail, amount } = req.body;
        if (!recipientEmail || !amount || amount <= 0) return res.status(400).json({ message: 'Invalid recipient or amount' });
        
        // Maximum transfer limit
        const MAX_TRANSFER_AMOUNT = 10000000; // 10 million naira
        if (amount > MAX_TRANSFER_AMOUNT) {
            return res.status(400).json({ message: `Transfer amount exceeds maximum limit of ₦${MAX_TRANSFER_AMOUNT.toLocaleString()}` });
        }

        const sender = await User.findById(req.session.userId);
        if (!sender) return res.status(404).json({ message: 'Sender not found' });

        if (sender.email.toLowerCase() === recipientEmail.toLowerCase()) {
             return res.status(400).json({ message: 'Cannot transfer to yourself' });
        }

        if (sender.accountBalance < amount) {
             return res.status(400).json({ message: 'Insufficient balance' });
        }

        const recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
        if (!recipient) {
             return res.status(404).json({ message: 'Recipient not found' });
        }

        // Deduct from sender
        await User.updateOne({ _id: sender._id }, { $inc: { accountBalance: -amount } });
        
        // Add to receiver
        await User.updateOne({ _id: recipient._id }, { $inc: { accountBalance: amount } });

        // Log sender transaction
        await Transaction.create({
            userId: sender._id,
            type: 'Transfer_Out',
            amount: amount,
            reference: 'TRX-' + Date.now() + '-' + Math.round(Math.random() * 1000),
            status: 'Success',
            description: `Transfer to ${recipientEmail}`
        });

        // Log recipient transaction
        await Transaction.create({
            userId: recipient._id,
            type: 'Transfer_In',
            amount: amount,
            reference: 'TRX-' + Date.now() + '-' + Math.round(Math.random() * 1000),
            status: 'Success',
            description: `Transfer from ${sender.email}`
        });

        res.json({ message: 'Transfer successful' });

    } catch (error) {
         console.error('Transfer Error:', error);
         res.status(500).json({ message: 'Transfer failed due to a server error' });
    }
});

// Fetch Transactions
app.get('/api/wallet/transactions', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

    try {
        const transactions = await Transaction.find({ userId: req.session.userId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch custom transaction history' });
    }
});

// Paystack Webhook (for handling payment events)
app.post('/api/webhook/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!PAYSTACK_WEBHOOK_SECRET) {
        console.error('Paystack webhook secret not configured');
        return res.status(500).json({ message: 'Webhook not configured' });
    }

    try {
        const signature = req.headers['x-paystack-signature'];
        
        // Verify webhook signature (in production)
        // const crypto = require('crypto');
        // const hash = crypto.createHmac('sha512', PAYSTACK_WEBHOOK_SECRET).update(req.body).digest('hex');
        // if (hash !== signature) return res.status(401).json({ message: 'Invalid signature' });

        const event = JSON.parse(req.body);
        
        if (event.event === 'charge.success') {
            const reference = event.data.reference;
            const amount = event.data.amount / 100; // Convert from kobo
            
            // Find and update the transaction
            const transaction = await Transaction.findOne({ reference });
            if (transaction && transaction.status !== 'Success') {
                transaction.status = 'Success';
                await transaction.save();
                
                await User.updateOne(
                    { _id: transaction.userId },
                    { $inc: { accountBalance: amount } }
                );
                
                console.log(`Webhook: Successfully credited ₦${amount} to user ${transaction.userId}`);
            }
        }
        
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).json({ message: 'Webhook processing error' });
    }
});

// Serve frontend for all other routes
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
