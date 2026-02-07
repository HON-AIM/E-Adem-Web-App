require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eadem_db';

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address.');
    console.error('Usage: node create_admin.js <email>');
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to Database...');
        
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save();
        
        console.log(`SUCCESS: User ${user.fullName} (${user.email}) is now an Admin!`);
        console.log('You can now log in and access the Admin Panel.');
        
        mongoose.disconnect();
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
