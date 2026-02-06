// auth.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Register Form Handling ---
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
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
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
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
        setupDashboardNavigation();
        setupApplicationForm();
        
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

function setupDashboardNavigation() {
    const navDashboard = document.getElementById('nav-dashboard');
    const navApply = document.getElementById('nav-apply');
    const navLoans = document.getElementById('nav-loans');
    
    const viewDashboard = document.getElementById('view-dashboard');
    const viewApply = document.getElementById('view-apply');
    
    function switchView(viewId) {
        // Hide all views
        document.querySelectorAll('.dashboard-view').forEach(el => el.classList.remove('active'));
        // Show target view
        document.getElementById(viewId).classList.add('active');
        
        // Update sidebar active state
        document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    }

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-dashboard');
            navDashboard.classList.add('active');
        });
    }

    if (navApply) {
        navApply.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-apply');
            navApply.classList.add('active');
        });
    }

    // Optional: Link loans to dashboard for now or a specific view later
    if (navLoans) {
        navLoans.addEventListener('click', (e) => {
            e.preventDefault();
            // detailed loans view or just dashboard
            switchView('view-dashboard'); 
            document.getElementById('nav-loans').classList.add('active');
        });
    }
}

function setupApplicationForm() {
    const typeOptions = document.querySelectorAll('.type-option');
    const hiddenTypeInput = document.getElementById('application-type');
    const dynamicFields = document.querySelectorAll('.dynamic-fields');

    if (!typeOptions.length) return;

    // Handle Type Selection
    typeOptions.forEach(option => {
        option.addEventListener('click', () => {
            typeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            
            const selectedType = option.dataset.value;
            hiddenTypeInput.value = selectedType;

            dynamicFields.forEach(field => {
                field.classList.remove('active');
                if (field.id === `fields-${selectedType}`) {
                    field.classList.add('active');
                }
            });
        });
    });

    // Handle Form Submission
    const form = document.getElementById('unified-application-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const details = {};
            if (data.type === 'Loan') {
                details.amount = data.loanAmount;
                details.duration = data.loanDuration;
                details.purpose = data.loanPurpose;
            } else if (data.type === 'Investment') {
                details.amount = data.investAmount;
                details.duration = data.investPlan;
                details.duration = data.investPlan; // reusing field
            } else if (data.type === 'Forex') {
                details.experienceLevel = data.forexExperience;
                details.message = `Preferred Class: ${data.classType}`;
            }

            const payload = {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                type: data.type,
                details: details
            };

            try {
                const response = await fetch('/api/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Application Submitted Successfully!');
                    // Reset form and return to dashboard
                    form.reset();
                    document.getElementById('nav-dashboard').click(); 
                } else {
                    alert(`Error: ${result.message}`);
                }
            } catch (err) {
                console.error('Submission error:', err);
                alert('An error occurred. Please try again.');
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

async function fetchUserData() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            window.location.href = 'login.html';
            return;
        }

        const user = await response.json();
        
        // Update Dashboard UI with User Info
        const sidebarName = document.querySelector('.user-info-mini h4');
        if (sidebarName) sidebarName.textContent = user.fullName;

        const welcomeMsg = document.querySelector('.welcome-text p');
        if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${user.fullName.split(' ')[0]}!`;

        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = user.fullName;

        // Profile Details
        const details = document.querySelectorAll('.detail-value');
        if (details.length >= 2) {
            document.querySelectorAll('.detail-label').forEach(label => {
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
        
        // Update Active Loan display
        const activeLoanAmount = document.getElementById('active-loan-amount');
        const activeLoanStatus = document.getElementById('active-loan-status');
        
        if (activeLoanAmount) {
             if (user.activeLoanAmount > 0) {
                 activeLoanAmount.textContent = '₦' + Number(user.activeLoanAmount).toLocaleString();
                 if (activeLoanStatus) activeLoanStatus.textContent = 'Current Outstanding Balance';
                 if (activeLoanStatus) activeLoanStatus.style.color = 'var(--accent-blue)';
             } else {
                 activeLoanAmount.textContent = '₦0.00';
                 if (activeLoanStatus) activeLoanStatus.textContent = 'No Active Loans';
             }
        }

        // Pre-fill application form
        const appName = document.querySelector('input[name="fullName"]');
        const appEmail = document.querySelector('input[name="email"]');
        const appPhone = document.querySelector('input[name="phone"]');
        
        if (appName) appName.value = user.fullName;
        if (appEmail) appEmail.value = user.email;
        if (appPhone && user.phone) appPhone.value = user.phone;

    } catch (error) {
        console.error('Failed to fetch user data:', error);
    }
}
