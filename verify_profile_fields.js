const http = require('http');

// Verification for Profile Fields (Address)
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
  email: 'test@example.com', 
  password: 'password123'
});

console.log('1. Logging in...');

const req = http.request(options, (res) => {
  let data = '';
  const cookies = res.headers['set-cookie'];
  
  res.on('data', (chunk) => { data += chunk; });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('Login Successful.');
      if(!cookies) {
          console.error('No session cookies received!');
          return;
      }
      fetchProfile(cookies);
    } else {
        console.log('Login failed (' + res.statusCode + '), registering new user to verify...');
        registerAndVerify();
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(loginPayload);
req.end();

function registerAndVerify() {
    const regPayload = JSON.stringify({
        fullName: 'Profile Bot',
        email: 'profile_' + Date.now() + '@test.com',
        phone: '08000000000',
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
               fetchProfile(cookies);
           } else {
               console.error('Registration failed: ' + res.statusCode);
           }
        });
        res.resume();
    });
    req.write(regPayload);
    req.end();
}

function fetchProfile(cookies) {
    console.log('2. Fetching User Profile...');
    
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
                console.log('--- Profile Verification ---');
                console.log('User:', user.fullName);
                
                // Address Verification
                if (user.address !== undefined) {
                    console.log('PASS: Address field exists:', user.address);
                } else {
                    console.error('FAIL: Address field MISSING in API response.');
                    console.error('Reason: Server likely needs a restart to pick up User.js changes.');
                }
                
                console.log('----------------------------');
            } catch (e) {
                console.error('Error parsing response:', e);
            }
        });
    });
    
    userReq.end();
}
