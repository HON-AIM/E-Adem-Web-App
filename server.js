require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').MongoStore;
const path = require('path');
const User = require('./models/User');
const Application = require('./models/Application');
const SiteContent = require('./models/SiteContent');
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
const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback_secret_key';

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
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' 
  }
}));

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

    console.log('Checking for existing user...');
    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      console.log('User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    console.log('Creating new user instance...');
    // Create new user
    user = new User({
      fullName,
      email,
      password,
      phone
    });

    console.log('Saving user to database...');
    await user.save();
    console.log('User saved successfully');
    
    // Log user in immediately
    req.session.userId = user._id;

    res.status(201).json({ message: 'User registered successfully', user: { fullName: user.fullName, email: user.email } });
  } catch (error) {
    const msg = 'Server error during registration ' + timestamp;
    console.error('CRITICAL REGISTER ERROR:', error);
    if (error.stack) console.error(error.stack);
    logToFile(msg + ' ' + error.stack);
    // Ensure we send the timestamp in the response to prove we are running this code
    res.status(500).json({ message: msg, error: error.message });
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

// Get User Data
app.get('/api/user', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        const user = await User.findById(req.session.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
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
        const { fullName, email, phone, address, nin } = req.body;
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
            // But for this demo/user request, we might want to be explicit or just generic
            // Let's use generic success message to mimic real security best practices
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }

        // Simulating email sending
        console.log(`[SIMULATION] Password reset link sent to ${email}`);
        
        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: 'Server error processing request' });
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

// Get Current User
app.get('/api/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.session.userId).select('-password');
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    // Check for active loan
    // We assume 'Approved' means active, and type must be 'Loan'
    // Sort by recent first to get the latest one
    const activeLoan = await Application.findOne({ 
        userId: user._id, 
        type: 'Loan', 
        status: 'Approved' 
    }).sort({ createdAt: -1 });

    const responseData = user.toObject();
    responseData.activeLoanAmount = activeLoan && activeLoan.details && activeLoan.details.amount 
        ? activeLoan.details.amount 
        : 0;

    res.json(responseData);
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// --- ADMIN ROUTES ---

// Middleware to check Admin Role
async function isAdmin(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });
    
    try {
        const user = await User.findById(req.session.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: Admins only' });
        }
        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error checking role' });
    }
}

// Admin Panel (Protected View)
app.get('/admin', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'admin.html'));
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

// Admin: Approve/Reject Loan 
app.post('/api/admin/loan-action', isAdmin, async (req, res) => {
    try {
         const { userId, action, amount } = req.body; // action: 'approve', 'reject'
         
         const user = await User.findById(userId);
         if (!user) return res.status(404).json({ message: 'User not found' });
         
         if (action === 'approve') {
             user.activeLoanAmount = amount || 0;
             // Update Application status and set approvedAt
             await Application.updateMany(
                 { userId: userId, type: 'Loan' }, 
                 { status: 'Approved', approvedAt: Date.now() }
             );
         } else if (action === 'reject') {
             // Logic to reject
             await Application.updateMany({ userId: userId, type: 'Loan' }, { status: 'Rejected' });
             user.activeLoanAmount = 0;
         }
         
         await user.save();
         res.json({ message: `Loan ${action}d successfully` });
    } catch (error) {
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

// Serve frontend for all other routes
app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
