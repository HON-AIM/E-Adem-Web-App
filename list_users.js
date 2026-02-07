require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/eadem_db';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected. Fetching users...');
        const users = await User.find({});
        console.log(`Found ${users.length} users:`);
        users.forEach(u => console.log(`- ${u.fullName} (${u.email}) [Role: ${u.role}]`));
        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
