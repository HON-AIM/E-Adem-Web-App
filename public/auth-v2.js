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
                // Alert the specific error to help debugging
                alert('Connection Error: ' + error.message + '\n\nPlease ensure you are accessing via http://localhost:3000');
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
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    } else if (data.user && data.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
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

    // --- Forgot Password Form Handling ---
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            const email = document.getElementById('email').value;

            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const data = await response.json();

                if (response.ok) {
                    alert(data.message);
                    forgotPasswordForm.reset();
                } else {
                    alert(data.message || 'Request failed');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            } finally {
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
        setupProfileUpload();
        setupProfileSaving();
        setupSettingsLogic();
        
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
    const navProfile = document.getElementById('nav-profile');
    const navLoans = document.getElementById('nav-loans');
    const navInvestments = document.getElementById('nav-investments');
    const navForex = document.getElementById('nav-forex');
    
    const navSettings = document.getElementById('nav-settings');
    
    // Switch View Helper
    function switchView(viewId) {
        document.querySelectorAll('.dashboard-view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));
    }
    
    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-dashboard');
            navDashboard.classList.add('active');
        });
    }

    if (navProfile) {
        navProfile.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-profile');
            navProfile.classList.add('active');
        });
    }
    
    // navApply logic removed as it links externally now
    /* 
    if (navApply) { ... } 
    */

    if (navLoans) {
        navLoans.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-loans');
            navLoans.classList.add('active');
            updateLoansView(window.currentUser);
        });
    }

    if (navInvestments) {
        navInvestments.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-investments');
            navInvestments.classList.add('active');
            updateInvestmentsView(window.currentUser);
        });
    }

    if (navForex) {
        navForex.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-forex');
            navForex.classList.add('active');
        });
    }

    if (navSettings) {
        navSettings.addEventListener('click', (e) => {
             e.preventDefault();
             switchView('view-settings');
             navSettings.classList.add('active');
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

            // --- LOAN GUARD CHECK ---
            if (window.currentUser) {
                const user = window.currentUser;
                const isProfileComplete = user.phone && user.address && user.address !== 'Not Provided';
                
                if (!isProfileComplete || !user.isNinVerified) {
                    e.stopImmediatePropagation(); // Ensure it stops
                    alert('Action Required: You must complete your profile (Phone & Address) and verify your NIN before applying for a loan.');
                    // Optionally redirect to profile
                    document.getElementById('nav-profile').click();
                    return false;
                }
            }
            
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
                details.nin = data.nin;
                details.guarantor = {
                    name: data.guarantorName,
                    phone: data.guarantorPhone,
                    email: data.guarantorEmail,
                    relationship: data.guarantorRelationship,
                    address: data.guarantorAddress
                };
            } else if (data.type === 'Investment') {
                details.amount = data.investAmount;
                details.duration = data.investPlan;
                details.nok = {
                    name: data.nokName,
                    phone: data.nokPhone,
                    relationship: data.nokRelationship
                };
            } else if (data.type === 'Forex') {
                details.experienceLevel = data.forexExperience;
                details.message = `Preferred Class: ${data.classType}`;
                details.goals = data.forexGoals;
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

function setupProfileUpload() {
    const fileInput = document.getElementById('profile-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const previewImg = document.getElementById('profile-image-preview');

    if (!fileInput || !uploadBtn) return;

    // Show preview when file selected
    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                uploadBtn.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle Upload
    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('profilePicture', file);

        uploadBtn.textContent = 'Saving...';
        uploadBtn.disabled = true;

        try {
            const response = await fetch('/api/upload-profile', {
                method: 'POST',
                body: formData // No Content-Type header needed, let browser set it
            });

            const result = await response.json();

            if (response.ok) {
                alert('Profile picture updated successfully!');
                uploadBtn.style.display = 'none';
                uploadBtn.textContent = 'Save Photo';
                uploadBtn.disabled = false;
                // Reload user data to confirm
                fetchUserData();
            } else {
                alert('Upload failed: ' + result.message);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading file');
            uploadBtn.textContent = 'Save Photo';
            uploadBtn.disabled = false;
        }
    });
}

// --- NEW: Copy Function ---
function copyAccountNum() {
    const num = document.getElementById('account-number').textContent;
    navigator.clipboard.writeText(num).then(() => {
        alert('Account Number Copied: ' + num);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback
        alert('Account Number: ' + num);
    });
}

// --- NEW: Copy Function ---
function copyAccountNum() {
    const num = document.getElementById('account-number').textContent;
    navigator.clipboard.writeText(num).then(() => {
        alert('Account Number Copied: ' + num);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
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

        if (welcomeMsg) welcomeMsg.textContent = `Welcome back, ${user.fullName.split(' ')[0]}!`;

        const profileName = document.querySelector('.profile-name');
        if (profileName) profileName.textContent = user.fullName;

        // Update Profile Pictures
        const smallAvatar = document.querySelector('.user-avatar-small');
        const largeAvatar = document.querySelector('.profile-avatar-large');
        
        // Use uploaded image or default to "images/default-avatar.png"
        // Note: The /images/default-avatar.png should be a fallback if user.profilePicture is empty
        const imgSrc = user.profilePicture ? user.profilePicture : 'images/default-avatar.png';

        if (smallAvatar) smallAvatar.src = imgSrc;
        if (largeAvatar) largeAvatar.src = imgSrc;

        // Profile Details (Populate Inputs)
        const profileEmail = document.getElementById('profile-email');
        if (profileEmail) {
            profileEmail.value = user.email || '';
            
            // Populate editable fields
            const phoneInput = document.getElementById('profile-phone');
            const addressInput = document.getElementById('profile-address');
            const ninInput = document.getElementById('profile-nin');
            
            if(phoneInput) phoneInput.value = user.phone || '';
            if(addressInput) addressInput.value = user.address || 'Not Provided';
            
            if(ninInput) {
                ninInput.value = user.nin || '';
                if (user.isNinVerified) {
                    ninInput.disabled = true;
                    ninInput.title = "NIN is verified and cannot be changed";
                    ninInput.style.background = "var(--light-gray)";
                    ninInput.style.cursor = "not-allowed";
                }
            }

            // Status Badge
            const ninBadge = document.getElementById('nin-status-badge');
            if (ninBadge) {
                if (user.isNinVerified) {
                    ninBadge.className = 'status-badge status-success';
                    ninBadge.textContent = 'Verified';
                } else {
                    ninBadge.className = 'status-badge status-pending';
                    ninBadge.textContent = 'Unverified';
                }
            }

            document.querySelectorAll('.profile-date').forEach(el => el.textContent = new Date(user.createdAt).toLocaleDateString());
            document.querySelectorAll('.profile-id').forEach(el => el.textContent = user._id.substring(0, 8).toUpperCase());
            
            // Store user data globally for checks
            window.currentUser = user;
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

        // --- NEW: Update Total Balance (Mock for now or from DB if available) ---
        const totalBalanceContainer = document.querySelector('.dashboard-hero h1');
        const amountSpan = totalBalanceContainer ? totalBalanceContainer.querySelector('.amount') : null;
        
        if (amountSpan) {
             let bal = user.accountBalance || 0;
             if(bal === 0) bal = 250450.00; // Mock starting balance
             
             // Store actual value in data attribute
             amountSpan.dataset.value = Number(bal).toLocaleString(undefined, {minimumFractionDigits: 2});
             amountSpan.textContent = amountSpan.dataset.value;
             
             // Setup Toggle
             const toggleBtn = document.getElementById('toggle-balance-btn');
             if (toggleBtn) {
                 // Clone to remove old listeners if any (simple way for re-runs)
                 const newBtn = toggleBtn.cloneNode(true);
                 toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
                 
                 newBtn.addEventListener('click', () => {
                     const isHidden = amountSpan.textContent.includes('****');
                     const icon = newBtn.querySelector('i');
                     
                     if (isHidden) {
                         amountSpan.textContent = amountSpan.dataset.value;
                         icon.className = 'fas fa-eye';
                     } else {
                         amountSpan.textContent = '****';
                         icon.className = 'fas fa-eye-slash';
                     }
                 });
             }
        }

        // --- NEW: Update Account Details Widget ---
        const accNumDisplay = document.getElementById('account-number');
        if (accNumDisplay) {
            accNumDisplay.textContent = user.accountNumber || 'Generating...';
        }

        // --- NEW: Populate Transaction Table (Mock Data) ---
        const txnList = document.getElementById('transaction-list');
        if (txnList) {
            const txns = [
                { type: 'Credit', desc: 'Deposit via Bank Transfer', date: new Date().toLocaleDateString(), amount: 50000, status: 'Success' },
                { type: 'Debit', desc: 'Airtime Purchase', date: new Date(Date.now() - 86400000).toLocaleDateString(), amount: -1000, status: 'Success' },
                { type: 'Credit', desc: 'Loan Disbursement', date: new Date(Date.now() - 172800000).toLocaleDateString(), amount: 200000, status: 'Success' },
                { type: 'Debit', desc: 'Netflix Subscription', date: new Date(Date.now() - 259200000).toLocaleDateString(), amount: -4500, status: 'Pending' }
            ];

            let html = '';
            txns.forEach(t => {
                const color = t.amount > 0 ? '#10b981' : '#ef4444';
                const sign = t.amount > 0 ? '+' : '';
                const badgeClass = t.status === 'Success' ? 'status-success' : (t.status === 'Pending' ? 'status-pending' : 'status-failed');
                
                html += `
                <tr>
                    <td><span style="font-weight:600;">${t.type}</span></td>
                    <td>${t.desc}</td>
                    <td>${t.date}</td>
                    <td style="color: ${color}; font-weight: 600;">${sign}₦${Math.abs(t.amount).toLocaleString()}</td>
                    <td><span class="status-badge ${badgeClass}">${t.status}</span></td>
                </tr>
                `;
            });
            txnList.innerHTML = html;
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

function setupProfileSaving() {
    const saveBtn = document.getElementById('save-profile-btn');
    if (!saveBtn) return;

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveBtn.disabled = true;

        const phone = document.getElementById('profile-phone').value;
        const address = document.getElementById('profile-address').value;
        const nin = document.getElementById('profile-nin').value;

        try {
            const response = await fetch('/api/user/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, address, nin })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Profile updated successfully!');
                // Refresh data to update UI (lock NIN if newly verified)
                fetchUserData(); 
            } else {
                alert(data.message || 'Update failed');
            }
        } catch (error) {
            console.error('Update Error:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });
}

// --- Helper Functions for Data Population ---

function updateLoansView(user) {
    if(!user) return;
    
    const amountEl = document.getElementById('loans-page-amount');
    const statusEl = document.getElementById('loans-page-status');
    const progressEl = document.getElementById('loans-page-progress');
    
    if (amountEl) {
        if (user.activeLoanAmount > 0) {
            amountEl.textContent = '₦' + Number(user.activeLoanAmount).toLocaleString();
            if (statusEl) {
                statusEl.textContent = 'Active Repayment';
                statusEl.className = 'status-badge status-pending';
            }
            if(progressEl) progressEl.style.width = '20%'; // Mock progress
        } else {
            amountEl.textContent = '₦0.00';
             if (statusEl) {
                statusEl.textContent = 'No Active Loans';
                statusEl.className = 'status-badge status-success';
            }
            if(progressEl) progressEl.style.width = '0%';
        }
    }
}

function updateInvestmentsView(user) {
    // Mock for now, would fetch from API in real implementation
    console.log('Updating investments for', user.fullName);
}

// --- NEW: Settings Logic ---
function setupSettingsLogic() {
    // 1. Password Update
    const passwordForm = document.getElementById('settings-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Mock API Call
            const btn = passwordForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Updating...';
            btn.disabled = true;
            
            setTimeout(() => {
                alert('Password updated successfully!');
                passwordForm.reset();
                btn.textContent = originalText;
                btn.disabled = false;
            }, 1000);
        });
    }

    // 2. Toggles (Persistence via LocalStorage)
    const toggles = document.querySelectorAll('.switch input[type="checkbox"]');
    toggles.forEach((toggle, index) => {
        // Load saved state
        const savedState = localStorage.getItem(`setting_toggle_${index}`);
        if (savedState !== null) {
            toggle.checked = savedState === 'true';
        }
        
        // Save state on change
        toggle.addEventListener('change', () => {
            localStorage.setItem(`setting_toggle_${index}`, toggle.checked);
            
            // Special Handler for Dark Mode (assuming last toggle is theme)
            // Ideally we should use ID, but user didn't add IDs to all.
            // Let's use the ID we added: settings-theme-toggle
            if (toggle.id === 'settings-theme-toggle') {
                document.body.classList.toggle('dark-mode', toggle.checked);
                // Also trigger existing theme toggle if available to keep sync
                const existingThemeBtn = document.querySelector('.theme-toggle');
                if(existingThemeBtn) {
                     // Just visual sync or re-trigger logic? 
                     // Simple class toggle on body should suffice for now as standard dark mode impl.
                }
            }
        });
    });

    // 3. Delete Account (Loan Guard)
    const deleteBtn = document.querySelector('.card[style*="border: 1px solid #fee2e2"] button');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const user = window.currentUser;
            
            if (user && user.activeLoanAmount > 0) {
                alert('ACTION DENIED: You cannot delete your account while you have an outstanding loan balance of ₦' + user.activeLoanAmount.toLocaleString());
                return;
            }
            
            if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
                // Mock Deletion
                alert('Account deleted successfully. Goodbye.');
                window.location.href = 'index.html';
            }
        });
    }
}
