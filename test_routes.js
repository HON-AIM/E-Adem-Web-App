const http = require('http');

function postRequest(path, data) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                     resolve({ status: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
}

async function runTests() {
    console.log('--- Starting API Tests ---\n');

    // 1. Test Registration
    const testUser = {
        fullName: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        phone: '1234567890'
    };

    try {
        console.log(`Testing Registration with email: ${testUser.email}...`);
        const regRes = await postRequest('/api/register', testUser);
        console.log('Status:', regRes.status);
        console.log('Response:', regRes.body);
        if (regRes.status !== 201) throw new Error('Registration failed');
        console.log('✅ Registration Passed\n');

        // 2. Test Login
        console.log('Testing Login...');
        const loginRes = await postRequest('/api/login', {
            email: testUser.email,
            password: testUser.password
        });
        console.log('Status:', loginRes.status);
        console.log('Response:', loginRes.body);
        if (loginRes.status !== 200) throw new Error('Login failed');
        console.log('✅ Login Passed\n');

        // 3. Test Contact Form
        console.log('Testing Contact Form...');
        const contactRes = await postRequest('/api/contact', {
            name: 'Contact Tester',
            email: 'contact@example.com',
            subject: 'Test Subject',
            message: 'Hello World'
        });
        console.log('Status:', contactRes.status);
        if (contactRes.status !== 200) throw new Error('Contact failed');
        console.log('✅ Contact Form Passed\n');
        
        console.log('🎉 All Tests Passed!');
    } catch (error) {
        console.error('❌ Test Failed:', error);
    }
}

// Check if server is likely running by trying to connect
const req = http.get('http://localhost:3000', (res) => {
    // Server is up
    runTests();
}).on('error', (e) => {
    console.error('SERVER NOT RUNNING. Please start the server manually with "npm start" before running tests.');
});
