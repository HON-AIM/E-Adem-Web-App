const mongoose = require('mongoose');
const User = require('./models/User'); 

async function runTest() {
  try {
    await mongoose.connect('mongodb://localhost:27017/e-adem');
    
    // Find our main testuser ("testuser@example.com") and manually verify them to ensure the UI updates
    const user = await User.findOneAndUpdate(
        { email: 'testuser@example.com' },
        { 
            isEmailVerified: true, 
            isNinVerified: true, 
            phone: '08123456789', 
            address: '123 Test Street' 
        },
        { new: true }
    );
    
    if (user) {
        console.log("SUCCESS: User 'testuser@example.com' successfully fully verified.");
    } else {
        console.log("WARNING: testuser@example.com not found. If this is a new DB this is expected.");
    }

    process.exit(0);
  } catch (err) {
      console.error(err);
      process.exit(1);
  }
}

runTest();
