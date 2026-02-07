const http = require('http');

const postData = JSON.stringify({
  fullName: 'API Test User',
  email: `apitest${Date.now()}@test.com`,
  password: 'password123',
  phone: '0987654321'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Sending registration request...');
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('BODY: ' + body);
    if (res.statusCode === 201) {
        console.log('SUCCESS: User registered.');
    } else {
        console.log('FAILURE: Registration failed.');
        process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
  process.exit(1);
});

// Write data to request body
req.write(postData);
req.end();
