// auth.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Toast Notification System ---
    function showToast(message, type = 'info') {
        const existingToast = document.querySelector('.toast-container');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.className = 'toast-container';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        
        const colors = {
            success: { bg: '#10b981', icon: '✓' },
            error: { bg: '#ef4444', icon: '✕' },
            info: { bg: '#3b82f6', icon: 'ℹ' },
            warning: { bg: '#f59e0b', icon: '⚠' }
        };
        
        const color = colors[type] || colors.info;
        toast.innerHTML = `
            <div style="
                background: ${color.bg};
                color: white;
                padding: 14px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 0.95rem;
                animation: slideIn 0.3s ease;
                max-width: 350px;
            ">
                <span style="font-weight: bold; font-size: 1.1rem;">${color.icon}</span>
                <span>${message}</span>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.firstElementChild.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    // Make showToast globally available
    window.showToast = showToast;
    
    // --- Password Visibility Toggle ---
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling.previousElementSibling; // Gets the input field
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                input.classList.add('password-visible');
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                input.classList.remove('password-visible');
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

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
                    showToast(data.message || 'Registration successful! Please check your email to verify your account.', 'success');
                    window.location.href = 'login.html';
                } else {
                    showToast(data.message || 'Registration failed', 'error');
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('Connection Error: ' + error.message, 'error');
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
                    showToast(data.message || 'Login failed', 'error');
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'error');
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
                    showToast(data.message, 'success');
                    forgotPasswordForm.reset();
                } else {
                    showToast(data.message || 'Request failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'error');
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Reset Password Form Handling ---
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (resetPasswordForm) {
        // Get token from URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            showToast('Invalid or missing reset token.', 'error');
            window.location.href = 'login.html';
        }

        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (newPassword !== confirmPassword) {
                showToast('Passwords do not match', 'warning');
                return;
            }

            const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Resetting...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password: newPassword })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast(data.message, 'success');
                    window.location.href = 'login.html';
                } else {
                    showToast(data.message || 'Reset failed', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showToast('An error occurred. Please try again.', 'error');
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
        setupWallet();
        
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
                
                if (!user.isEmailVerified || !isProfileComplete || !user.isNinVerified) {
                    e.stopImmediatePropagation();
                    showToast('Action Required: You must verify your email, complete your profile, and receive NIN approval before applying for services.', 'warning');
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
                    showToast('Application Submitted Successfully!', 'success');
                    // Reset form and return to dashboard
                    form.reset();
                    document.getElementById('nav-dashboard').click(); 
                } else {
                    showToast(`Error: ${result.message}`, 'error');
                }
            } catch (err) {
                console.error('Submission error:', err);
                showToast('An error occurred. Please try again.', 'error');
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
                showToast('Profile picture updated successfully!', 'success');
                uploadBtn.style.display = 'none';
                uploadBtn.textContent = 'Save Photo';
                uploadBtn.disabled = false;
                // Reload user data to confirm
                fetchUserData();
            } else {
                showToast('Upload failed: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Error uploading file', 'error');
            uploadBtn.textContent = 'Save Photo';
            uploadBtn.disabled = false;
        }
    });
}

// --- Copy Account Number Function ---
function copyAccountNum() {
    const num = document.getElementById('account-number').textContent;
    navigator.clipboard.writeText(num).then(() => {
        showToast('Account Number Copied: ' + num, 'success');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy account number', 'error');
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

            // --- STRICT VERIFICATION LOGIC ---
            const isEmailVerified = user.isEmailVerified;
            const isNinVerified = user.isNinVerified;
            const hasPhone = !!user.phone && user.phone.trim() !== '';
            const hasAddress = !!user.address && user.address.trim() !== '' && user.address !== 'Not Provided';
            
            const isFullyVerified = isEmailVerified && isNinVerified && hasPhone && hasAddress;

            // Badges
            const emailBadge = document.getElementById('email-status-badge');
            if (emailBadge) {
                if (isEmailVerified) {
                    emailBadge.className = 'status-badge status-success';
                    emailBadge.textContent = 'Verified';
                } else {
                    emailBadge.className = 'status-badge status-pending';
                    emailBadge.textContent = 'Unverified';
                }
            }

            const ninBadge = document.getElementById('nin-status-badge');
            if (ninBadge) {
                if (isNinVerified) {
                    ninBadge.className = 'status-badge status-success';
                    ninBadge.textContent = 'Verified';
                } else {
                    ninBadge.className = 'status-badge status-pending';
                    ninBadge.textContent = 'Unverified';
                }
            }
            
            // Main Profile Badge
            const mainBadge = document.getElementById('main-verification-badge');
            if (mainBadge) {
                if (isFullyVerified) {
                    mainBadge.className = 'profile-badge';
                    mainBadge.style.background = 'rgba(16, 185, 129, 0.1)';
                    mainBadge.style.color = 'var(--success-green)';
                    mainBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    mainBadge.innerHTML = '<i class="fas fa-check-circle"></i> VERIFIED MEMBER';
                } else {
                    mainBadge.className = 'profile-badge';
                    mainBadge.style.background = 'rgba(239, 68, 68, 0.1)';
                    mainBadge.style.color = '#ef4444';
                    mainBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    mainBadge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> UNVERIFIED';
                }
            }

            // Dashboard Banner Logic
            const banner = document.getElementById('verification-banner');
            const bannerText = document.getElementById('verification-banner-text');
            
            if (banner && !isFullyVerified) {
                banner.style.display = 'flex';
                let missingSteps = [];
                if (!isEmailVerified) missingSteps.push('verify your email address');
                if (!hasPhone || !hasAddress) missingSteps.push('complete your personal details');
                if (!isNinVerified) missingSteps.push('submit your NIN for approval');
                
                bannerText.textContent = `Please ${missingSteps.join(', and ')} to unlock all features.`;
            } else if (banner) {
                banner.style.display = 'none';
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

        // --- Update Total Balance ---
        const totalBalanceContainer = document.querySelector('.dashboard-hero h1');
        const amountSpan = totalBalanceContainer ? totalBalanceContainer.querySelector('.amount') : null;
        
        if (amountSpan) {
             let bal = user.accountBalance || 0;
             
             // Store actual value in data attribute
             amountSpan.dataset.value = Number(bal).toLocaleString(undefined, {minimumFractionDigits: 2});
             
             // Check saved preference for balance visibility
             const balanceVisible = localStorage.getItem('balanceVisible') !== 'false';
             amountSpan.textContent = balanceVisible ? amountSpan.dataset.value : '••••••';
             
             // Setup Toggle
             const toggleBtn = document.getElementById('toggle-balance-btn');
             if (toggleBtn) {
                 // Clone to remove old listeners if any
                 const newBtn = toggleBtn.cloneNode(true);
                 toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
                 
                 // Set initial icon state
                 const icon = newBtn.querySelector('i');
                 icon.className = balanceVisible ? 'fas fa-eye' : 'fas fa-eye-slash';
                 
                 newBtn.addEventListener('click', () => {
                     const isHidden = amountSpan.textContent.includes('••');
                     const icon = newBtn.querySelector('i');
                     
                     if (isHidden) {
                         amountSpan.textContent = amountSpan.dataset.value;
                         icon.className = 'fas fa-eye';
                         localStorage.setItem('balanceVisible', 'true');
                     } else {
                         amountSpan.textContent = '••••••';
                         icon.className = 'fas fa-eye-slash';
                         localStorage.setItem('balanceVisible', 'false');
                     }
                 });
             }
        }

        // --- NEW: Update Account Details Widget ---
        const accNumDisplay = document.getElementById('account-number');
        if (accNumDisplay) {
            accNumDisplay.textContent = user.accountNumber || 'Generating...';
        }

        // --- Populate Transaction Table ---
        const txnList = document.getElementById('transaction-list');
        if (txnList) {
            try {
                const res = await fetch('/api/wallet/transactions');
                if (res.ok) {
                    const txns = await res.json();
                    let html = '';
                    if (txns.length === 0) {
                        html = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 40px;">
                                <div style="color: var(--text-secondary);">
                                    <div style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;">
                                        <i class="fas fa-receipt"></i>
                                    </div>
                                    <p style="font-size: 1rem; margin-bottom: 5px;">No transactions yet</p>
                                    <p style="font-size: 0.85rem; opacity: 0.7;">Your transaction history will appear here</p>
                                </div>
                            </td>
                        </tr>`;
                    } else {
                        txns.forEach(t => {
                            const isCredit = t.type === 'Funding' || t.type === 'Transfer_In';
                            const color = isCredit ? '#10b981' : '#ef4444';
                            const sign = isCredit ? '+' : '-';
                            const badgeClass = t.status === 'Success' ? 'status-success' : (t.status === 'Pending' ? 'status-pending' : 'status-failed');
                            
                            html += `
                            <tr>
                                <td><span style="font-weight:600;">${t.type.replace('_', ' ')}</span></td>
                                <td>${t.description || t.reference}</td>
                                <td>${new Date(t.createdAt).toLocaleDateString()}</td>
                                <td style="color: ${color}; font-weight: 600;">${sign}₦${Math.abs(t.amount).toLocaleString()}</td>
                                <td><span class="status-badge ${badgeClass}">${t.status}</span></td>
                            </tr>
                            `;
                        });
                    }
                    txnList.innerHTML = html;
                }
            } catch(e) {
                txnList.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px;">
                        <div style="color: #ef4444;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                            <p>Failed to load transactions</p>
                            <button onclick="fetchUserData()" class="btn" style="margin-top: 10px; padding: 8px 16px; font-size: 0.85rem;">Retry</button>
                        </div>
                    </td>
                </tr>`;
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
                showToast('Profile updated successfully!', 'success');
                // Refresh data to update UI (lock NIN if newly verified)
                fetchUserData(); 
            } else {
                showToast(data.message || 'Update failed', 'error');
            }
        } catch (error) {
            console.error('Update Error:', error);
            showToast('Failed to update profile. Please try again.', 'error');
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

// --- Settings Logic ---
function setupSettingsLogic() {
    // 1. Password Update
    const passwordForm = document.getElementById('settings-password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = passwordForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Updating...';
            btn.disabled = true;

            const currentPassword = document.getElementById('current-password')?.value;
            const newPassword = document.getElementById('new-password')?.value;

            if (!currentPassword || !newPassword) {
                showToast('Please fill in both password fields', 'error');
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            try {
                const response = await fetch('/api/user/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast('Password updated successfully!', 'success');
                    passwordForm.reset();
                } else {
                    showToast(data.message || 'Update failed', 'error');
                }
            } catch (error) {
                console.error('Update Error:', error);
                showToast('An error occurred. Please try again.', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
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
            
            // Special Handler for Dark Mode
            if (toggle.id === 'settings-theme-toggle') {
                const theme = toggle.checked ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                // Sync topbar theme toggle
                const themeIcon = document.querySelector('.theme-icon');
                if (themeIcon) {
                    themeIcon.textContent = toggle.checked ? '☀️' : '🌙';
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
                showToast('ACTION DENIED: You cannot delete your account while you have an outstanding loan balance of ₦' + user.activeLoanAmount.toLocaleString(), 'error');
                return;
            }
            
            if (confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) {
                // Real Deletion
                deleteBtn.textContent = 'Deleting...';
                deleteBtn.disabled = true;

                fetch('/api/user/delete', { method: 'DELETE' })
                    .then(res => res.json().then(data => ({ status: res.status, body: data })))
                    .then(({ status, body }) => {
                        if (status === 200) {
                            showToast(body.message, 'success');
                            setTimeout(() => {
                                window.location.href = 'index.html';
                            }, 1500);
                        } else {
                            showToast('Deletion Failed: ' + body.message, 'error');
                            deleteBtn.textContent = 'Delete Account';
                            deleteBtn.disabled = false;
                        }
                    })
                    .catch(err => {
                        console.error('Delete Error:', err);
                        showToast('An error occurred while deleting account.', 'error');
                        deleteBtn.textContent = 'Delete Account';
                        deleteBtn.disabled = false;
                    });
            }
        });
    }
}

// --- NEW: Wallet Logic ---
function setupWallet() {
    // 1. Modals Control
    const topupTrigger = document.getElementById('btn-topup-trigger');
    const transferTrigger = document.getElementById('btn-transfer-trigger');
    const originalTextTopup = topupTrigger ? topupTrigger.innerHTML : '';
    const originalTextTransfer = transferTrigger ? transferTrigger.innerHTML : '';

    if (topupTrigger) {
        topupTrigger.addEventListener('click', () => {
             window.showModal ? window.showModal('modal-topup', true) : document.getElementById('modal-topup').style.display = 'flex';
        });
    }

    if (transferTrigger) {
        transferTrigger.addEventListener('click', () => {
             window.showModal ? window.showModal('modal-transfer', true) : document.getElementById('modal-transfer').style.display = 'flex';
        });
    }

    // 2. Handle Top Up Form (Paystack Initialize)
    const formTopup = document.getElementById('form-topup');
    if (formTopup) {
        formTopup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-topup');
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const amount = document.getElementById('topup-amount').value;

            try {
                const res = await fetch('/api/wallet/initialize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: Number(amount) })
                });
                const data = await res.json();

                if (res.ok && data.url) {
                    window.location.href = data.url; // Redirect to Paystack
                } else {
                    showToast('Funding Failed: ' + (data.message || 'Payment Gateway error'), 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // 3. Handle Initial Redirect Verify (If coming back from Paystack)
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    
    if (paymentStatus === 'success' || reference) {
         // Auto Verify
         if (topupTrigger) {
             topupTrigger.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
         }
         
         fetch('/api/wallet/verify', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ reference })
         })
         .then(res => res.json())
          .then(data => {
              if (data.isSuccess) {
                  showToast('Payment Verified! Your wallet has been credited.', 'success');
                  // Strip params
                  window.history.replaceState({}, document.title, window.location.pathname);
                  fetchUserData(); // Reload balances
              } else {
                  showToast('Payment Verification Failed: ' + data.message, 'error');
              }
          })
         .catch(err => console.error('Verify error:', err))
         .finally(() => {
             if (topupTrigger) topupTrigger.innerHTML = originalTextTopup;
         });
    }

    // 4. Handle Transfer Form
    const formTransfer = document.getElementById('form-transfer');
    if (formTransfer) {
        formTransfer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-transfer');
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const recipientEmail = document.getElementById('transfer-email').value;
            const amount = document.getElementById('transfer-amount').value;

            try {
                const res = await fetch('/api/wallet/transfer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipientEmail, amount: Number(amount) })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast('Transfer Successful!', 'success');
                    window.showModal ? window.showModal('modal-transfer', false) : document.getElementById('modal-transfer').style.display = 'none';
                    formTransfer.reset();
                    fetchUserData(); // Reload balances and history
                } else {
                    showToast('Transfer Failed: ' + data.message, 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Connection error', 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
}
// End of script
