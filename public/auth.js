// auth.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Register Form Handling ---
    const registerForm = document.querySelector('form[action="dashboard.html"]'); // Identifying by the old action
    if (registerForm && document.title.includes('Register')) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Registering...';
            submitBtn.disabled = true;

            const fullName = document.getElementById('fullname').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullName, email, phone, password })
                });

                const data = await response.json();

                if (response.ok) {
                    alert('Registration successful! Redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Registration failed');
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Login Form Handling ---
    // The login form also had action="dashboard.html" in the previous step
    const loginForm = document.querySelector('form[action="dashboard.html"]');
    if (loginForm && document.title.includes('Login')) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Signing In...';
            submitBtn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.href = 'dashboard.html';
                } else {
                    alert(data.message || 'Login failed');
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Dashboard Logic ---
    if (document.title.includes('Dashboard')) {
        fetchUserData();
        
        // Logout handler
        const logoutBtn = document.querySelector('.btn-outline'); // The logout button in sidebar
        if (logoutBtn && logoutBtn.textContent.includes('Logout')) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await fetch('/api/logout', { method: 'POST' });
                    window.location.href = 'login.html';
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            });
        }
    }
});

async function fetchUserData() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            // Not authenticated, redirect to login
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();
        
        // Update Dashboard UI with User Info
        
        // Sidebar Name
        const sidebarName = document.querySelector('.user-info-mini h4');
        if (sidebarName) sidebarName.textContent = user.fullName;

        // Welcome Message
        const welcomeMsg = document.querySelector('.welcome-text p');
        if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${user.fullName.split(' ')[0]}!`;

        // Profile Card Name
        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = user.fullName;

        // Profile Details
        const details = document.querySelectorAll('.detail-value');
        if (details.length >= 2) {
            // We can search for the labels to be more precise, but based on my template:
            // 0: Account ID (Keep static or gen random?)
            // 1: Email
            // 2: Phone
            // 3: Member Since
            
            // Let's iterate to find the right elements
            const labels = document.querySelectorAll('.detail-label');
            labels.forEach(label => {
                const valueSpan = label.nextElementSibling;
                if (label.textContent.includes('Email')) valueSpan.textContent = user.email;
                if (label.textContent.includes('Phone')) valueSpan.textContent = user.phone || 'N/A';
                if (label.textContent.includes('Member Since')) {
                    const date = new Date(user.createdAt);
                    valueSpan.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                }
                if (label.textContent.includes('Account ID')) {
                    valueSpan.textContent = 'EAD-' + user._id.slice(-8).toUpperCase();
                }
            });
        }

    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }
}
