const http = require('http');

// Simple verification script for Dashboard API Fields
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const loginPayload = JSON.stringify({
  email: 'test@example.com', // Using a known test user or we can create one if needed. 
                             // For now assuming the user from previous tests exists.
  password: 'password123'
});

console.log('1. Attempting Login to get Session...');

const req = http.request(options, (res) => {
  let data = '';
  
  // Get cookies
  const cookies = res.headers['set-cookie'];
  
  res.on('data', (chunk) => { data += chunk; });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Login Successful.');
      if(!cookies) {
          console.error('No session cookies received!');
          return;
      }
      
      verifyDashboardData(cookies);
    } else {
        // If login fails, try registering a temp user
        console.log('Login failed (' + res.statusCode + '), trying to register new verification user...');
        registerAndVerify();
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(loginPayload);
req.end();

function verifyDashboardData(cookies) {
    console.log('2. Fetching User Data from /api/user...');
    
    const userOpts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/user',
        method: 'GET',
        headers: {
            'Cookie': cookies
        }
    };

    const userReq = http.request(userOpts, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            try {
                const user = JSON.parse(body);
                console.log('--- User Data Verification ---');
                console.log('User ID:', user._id);
                console.log('Name:', user.fullName);
                
                // Account Number Verification
                if (user.accountNumber) {
                    console.log('PASS: Account Number exists:', user.accountNumber);
                } else {
                    console.error('FAIL: Account Number missing (Server restart might be needed)');
                }

                // Balance Verification
                if (user.accountBalance !== undefined) {
                    console.log('PASS: Account Balance exists:', user.accountBalance);
                } else {
                    console.error('FAIL: Account Balance missing');
                }
                
                // Profile Picture Verification
                if (user.profilePicture !== undefined) {
                     console.log('PASS: Profile Picture field exists:', user.profilePicture || '(empty)');
                } else {
                     console.error('FAIL: Profile Picture field missing');
                }
                
                console.log('------------------------------');
                
            } catch (e) {
                console.error('Error parsing response:', e);
                console.log('Raw Body:', body);
            }
        });
    });
    
    userReq.end();
}

function registerAndVerify() {
    // Helper to register if login fails
    const regPayload = JSON.stringify({
        fullName: 'Verify Bot',
        email: 'verify_' + Date.now() + '@test.com',
        phone: '08012345678',
        password: 'password123'
    });
    
    const regOpts = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };
    
    const req = http.request(regOpts, (res) => {
        let cookies = res.headers['set-cookie'];
        res.on('end', () => {
           if(res.statusCode === 201) {
               console.log('Registration Successful.');
               verifyDashboardData(cookies);
           } else {
               console.error('Registration failed.');
           }
        });
        res.resume();
    });
    req.write(regPayload);
    req.end();
}
