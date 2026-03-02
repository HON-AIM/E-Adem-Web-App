const mongoose = require('mongoose');
const User = require('./models/User'); 
const http = require('http');

async function runTest() {
  try {
    await mongoose.connect('mongodb://localhost:27017/e-adem');
    
    // 1. Delete Test User
    await User.deleteMany({ email: 'testuser3@example.com' });
    console.log("Deleted old testuser3");

    // 2. Register new Test User
    const data = JSON.stringify({
        fullName: "Test User 3",
        email: "testuser3@example.com",
        password: "password123",
        phone: "08012345678"
    });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/register',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        console.log(`Registration STATUS: ${res.statusCode}`);
        let registerData = '';
        res.on('data', (d) => registerData += d);
        res.on('end', () => {
             console.log("Registration Response:", registerData);

             // Wait 1.5 seconds to ensure DB flush by the server.js instance
             setTimeout(async () => {
                 // 3. Find user and token in DB
                 const user = await User.findOne({ email: 'testuser3@example.com' });
                 if (!user) {
                     console.log("FAILURE: user not in DB after registration");
                     process.exit(1);
                 }
    
                 console.log("User in DB. Verified?:", user.isEmailVerified);
                 console.log("Token:", user.emailVerificationToken);
    
                 // 4. Hit verify endpoint
                 http.get(`http://localhost:3000/api/verify-email?token=${user.emailVerificationToken}`, (verifyRes) => {
                    console.log("Verify Response STATUS:", verifyRes.statusCode);
                    // Check DB again
                    setTimeout(async () => {
                        const updatedUser = await User.findOne({ email: 'testuser3@example.com' });
                        console.log("Re-fetched User. Verified?:", updatedUser.isEmailVerified);
                        if (updatedUser.isEmailVerified && !updatedUser.emailVerificationToken) {
                            console.log("SUCCESS - Flow Completed Perfectly");
                            process.exit(0);
                        } else {
                            console.log("FAILURE: Not verified or token still exists");
                            process.exit(1);
                        }
                    }, 1000);
                 });
             }, 1500);
        });
    });

    req.on('error', (error) => {
        console.error("Request Error:", error);
        process.exit(1);
    });

    req.write(data);
    req.end();

  } catch (err) {
      console.error(err);
      process.exit(1);
  }
}

runTest();
