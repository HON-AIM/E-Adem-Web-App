require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/eadem_db')
  .then(() => {
    console.log('MongoDB Connected for Seeding');
    seedUser();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

async function seedUser() {
  try {
    const email = 'john.doe@example.com';
    let user = await User.findOne({ email });
    
    if (user) {
      console.log('User John Doe already exists.');
    } else {
      user = new User({
        fullName: 'John Doe',
        email: email,
        password: 'password123',
        phone: '+234 800 123 4567',
        role: 'user'
      });
      await user.save();
      console.log('User John Doe created successfully.');
      console.log('Credentials: john.doe@example.com / password123');
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.connection.close();
  }
}
