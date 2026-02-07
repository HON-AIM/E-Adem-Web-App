const http = require('http');

function checkUrl(path) {
    return new Promise((resolve) => {
        const req = http.get({
            hostname: 'localhost',
            port: 3000,
            path: path
        }, (res) => {
            console.log(`GET ${path} -> Status: ${res.statusCode}`);
            if (res.statusCode === 200) {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (data.length > 0) {
                        console.log(`  Content Length: ${data.length} bytes`);
                        if (data.includes('Connection Error')) {
                             console.log('  Content Check: Contains error alerting code.');
                        }
                        resolve(true); 
                    } else {
                        console.log('  Content Empty!');
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        });
        req.on('error', (e) => {
            console.error(`  Error: ${e.message}`);
            resolve(false);
        });
    });
}

async function verify() {
    console.log('Verifying static files...');
    await checkUrl('/register.html');
    await checkUrl('/auth-v2.js');
}

verify();
