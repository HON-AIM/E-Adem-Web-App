require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const User = require('./models/User');
const Application = require('./models/Application'); // Import Application model

const app = express();
const PORT = process.env.PORT || 3000;

// Database Connection
mongoose.connect('mongodb://localhost:27017/eadem_db')
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
  secret: 'eadem_secret_key_change_this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/eadem_db' }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      fullName,
      email,
      password,
      phone
    });

    await user.save();

    // Log user in immediately
    req.session.userId = user._id;

    res.status(201).json({ message: 'User registered successfully', user: { fullName: user.fullName, email: user.email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create session
    req.session.userId = user._id;

    res.json({ message: 'Logged in successfully', user: { fullName: user.fullName, email: user.email, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Application Route
app.post('/api/apply', async (req, res) => {
  try {
    const { fullName, email, phone, type, details } = req.body;
    
    // Check if user is logged in (optional but good for tracking)
    const userId = req.session.userId || null;

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

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out' });
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get Current User
app.get('/api/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
