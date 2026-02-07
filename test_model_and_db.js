const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eadem_db';

async function testUserAndDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const testEmail = `test${Date.now()}@test.com`;
        const user = new User({
            fullName: 'Test User',
            email: testEmail,
            phone: '1234567890',
            password: 'password123'
        });

        console.log('Saving user...');
        await user.save();
        console.log('User saved successfully');
        console.log('Hashed password:', user.password);

        await mongoose.connection.close();
        console.log('Done');
    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

testUserAndDB();
