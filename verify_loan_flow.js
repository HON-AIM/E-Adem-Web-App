const mongoose = require('mongoose');
const Application = require('./models/Application');
const User = require('./models/User');
// const axios = require('axios'); // Removed dependency
const http = require('http');

// Simple http wrapper to handle cookies
let cookie = null;

function request(options, data) {
    return new Promise((resolve, reject) => {
        if (cookie) {
            if (!options.headers) options.headers = {};
            options.headers['Cookie'] = cookie;
        }
        
        const req = http.request(options, (res) => {
            if (res.headers['set-cookie']) {
                cookie = res.headers['set-cookie'][0].split(';')[0];
            }
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, body: body ? JSON.parse(body) : {} });
            });
        });
        
        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function verifyFlow() {
    try {
        console.log('1. Registering/Logging in User...');
        const email = `loantest${Date.now()}@test.com`;
        
        await request({
            hostname: 'localhost', port: 3000, path: '/api/register', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: 'Loan Tester',
            email: email,
            password: 'password123',
            phone: '5551234'
        });

        console.log('2. Checking Initial User Data...');
        const userRes = await request({ hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET' });
        console.log('Active Loan Amount (Expect 0/undefined):', userRes.body.activeLoanAmount);

        console.log('3. Submitting Loan Application...');
        const applyRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/apply', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            fullName: 'Loan Tester',
            email: email,
            phone: '5551234',
            type: 'Loan',
            details: { amount: 50000, duration: '1 Month', purpose: 'Test Loan' }
        });
        console.log('Apply Result:', applyRes.statusCode);

        console.log('4. Approving Loan manually in DB...');
        // Connect to DB directly to approve
        await mongoose.connect('mongodb://localhost:27017/eadem_db');
        const user = await User.findOne({ email });
        const app = await Application.findOne({ userId: user._id, type: 'Loan' }).sort({ createdAt: -1 });
        
        if (app) {
            app.status = 'Approved';
            await app.save();
            console.log('Loan Approved.');
        } else {
            console.error('Application not found in DB!');
        }
        await mongoose.connection.close();

        console.log('5. Verifying Active Loan Amount...');
        const userRes2 = await request({ hostname: 'localhost', port: 3000, path: '/api/user', method: 'GET' });
        console.log('Active Loan Amount (Expect 50000):', userRes2.body.activeLoanAmount);

        if (userRes2.body.activeLoanAmount == 50000) {
            console.log('SUCCESS: Active loan amount updated correctly.');
        } else {
            console.error('FAILURE: Active loan amount incorrect.');
            process.exit(1);
        }

    } catch (e) {
        console.error('Test Failed:', e);
        process.exit(1);
    }
}

verifyFlow();
