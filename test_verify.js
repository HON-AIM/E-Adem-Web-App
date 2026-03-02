const mongoose = require('mongoose');
const User = require('./models/User'); 
const http = require('http');

mongoose.connect('mongodb://localhost:27017/e-adem')
  .then(async () => {
    // Just grab ANY user that has a token
    const user = await User.findOne({ emailVerificationToken: { $exists: true } });
    if (!user) {
        console.log("TEST FAILURE: No unverified users found in DB.");
        process.exit(1);
    }
    
    console.log("Found User. Email:", user.email);
    console.log("Is Email Verified?:", user.isEmailVerified);
    console.log("Token:", user.emailVerificationToken);

    // Hit the verify endpoint
    http.get(`http://localhost:3000/api/verify-email?token=${user.emailVerificationToken}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', async () => {
             console.log("Verification Response Status:", res.statusCode);
             
             // Check DB again
             const updatedUser = await User.findById(user._id);
             console.log("Re-fetched User. Is Email Verified?:", updatedUser.isEmailVerified);
             console.log("Token removed?:", updatedUser.emailVerificationToken === undefined);
             process.exit(0);
        });
    });

  })
  .catch(err => {
      console.error(err);
      process.exit(1);
  });
