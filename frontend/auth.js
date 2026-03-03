// ==================== AUTH MODULE ====================
let authToken = null;
let currentUser = null;

function fillCredentials(u, p) {
    document.getElementById('login-username').value = u;
    document.getElementById('login-password').value = p;
}

function getAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` };
}

async function handleLogin(e) {
    e.preventDefault();
    const usernameOrEmail = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    const btnText = btn.querySelector('.login-btn-text');
    const btnLoader = btn.querySelector('.login-btn-loader');

    if (!usernameOrEmail || !password) {
        errorEl.textContent = 'Please enter both username/email and password';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';
    errorEl.style.display = 'none';

    try {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameOrEmail, password })
        });
        const data = await res.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            initializeApp();
        } else if (data.forcePasswordChange) {
            // User must change password - redirect to change page
            console.log('Force password change required, redirecting...');
            sessionStorage.setItem('changeToken', data.changeToken);
            sessionStorage.setItem('changeUsername', data.username);
            sessionStorage.setItem('currentPassword', password);
            
            // Hide login page and show change page
            document.getElementById('login-page').style.display = 'none';
            showView('change');
            
            // Initialize validation after a short delay
            setTimeout(() => {
                initChangePasswordValidation();
                // Auto-fill current password
                const currentInput = document.getElementById('change-current');
                if (currentInput) {
                    currentInput.value = password;
                }
            }, 100);
        } else {
            if (data.needsSetup || data.setupRequired) {
                errorEl.innerHTML = 'Password not set. Please check your email for the setup link or contact your agent.';
            } else {
                errorEl.textContent = data.error || 'Login failed';
            }
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorEl.textContent = 'Cannot connect to server. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

function checkSavedSession() {
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        initializeApp();
        return true;
    }
    return false;
}

// View management
function showView(view) {
    ['login-page', 'forgot-page', 'setup-page', 'reset-page', 'change-page'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById(`${view}-page`).style.display = 'flex';
}

// Forgot password handler
async function handleForgotPassword(e) {
    e.preventDefault();
    const username = document.getElementById('forgot-username').value.trim();
    const errorEl = document.getElementById('forgot-error');
    const successEl = document.getElementById('forgot-success');
    const btn = document.getElementById('forgot-btn');

    if (!username) {
        errorEl.textContent = 'Please enter your username';
        errorEl.style.display = 'block';
        successEl.style.display = 'none';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending...';
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    try {
        const res = await fetch(`${BACKEND_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();

        if (data.success) {
            successEl.textContent = 'If your account exists, a password reset link has been sent to your registered email.';
            successEl.style.display = 'block';
            document.getElementById('forgot-username').value = '';
        } else {
            errorEl.textContent = data.error || 'Failed to process request';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Cannot connect to server. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Send Reset Link';
    }
}

// Password strength calculator
function calculatePasswordStrength(password) {
    let strength = 0;
    const checks = {
        length: password.length >= 6,
        hasLetter: /[a-zA-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        longEnough: password.length >= 8
    };

    if (checks.length) strength += 1;
    if (checks.hasLetter) strength += 1;
    if (checks.hasNumber) strength += 1;
    if (checks.hasSpecial) strength += 1;
    if (checks.longEnough) strength += 1;

    // Determine strength level
    let level = 'weak';
    if (strength >= 4) level = 'strong';
    else if (strength >= 3) level = 'medium';

    return { level, strength, checks };
}

// Update password strength UI
function updatePasswordStrength(passwordId, strengthId, fillId, textId, reqPrefix) {
    const password = document.getElementById(passwordId).value;
    const strengthEl = document.getElementById(strengthId);
    const fillEl = document.getElementById(fillId);
    const textEl = document.getElementById(textId);

    if (!password) {
        strengthEl.style.display = 'none';
        return;
    }

    strengthEl.style.display = 'block';
    const { level, checks } = calculatePasswordStrength(password);

    // Update strength bar
    fillEl.className = `strength-bar-fill ${level}`;
    
    // Update strength text
    textEl.className = `strength-text ${level}`;
    textEl.textContent = level === 'weak' ? 'Weak password' : 
                         level === 'medium' ? 'Medium strength' : 
                         'Strong password';

    // Update requirements
    const reqLength = document.getElementById(`${reqPrefix}-length`);
    const reqLetter = document.getElementById(`${reqPrefix}-letter`);
    const reqNumber = document.getElementById(`${reqPrefix}-number`);

    if (reqLength) {
        reqLength.className = checks.length ? 'requirement met' : 'requirement';
    }
    if (reqLetter) {
        reqLetter.className = checks.hasLetter ? 'requirement met' : 'requirement';
    }
    if (reqNumber) {
        reqNumber.className = checks.hasNumber ? 'requirement met' : 'requirement';
    }

    return { level, checks };
}

// Update password match UI
function updatePasswordMatch(passwordId, confirmId, matchId) {
    const password = document.getElementById(passwordId).value;
    const confirm = document.getElementById(confirmId).value;
    const matchEl = document.getElementById(matchId);

    if (!confirm) {
        matchEl.style.display = 'none';
        return false;
    }

    matchEl.style.display = 'flex';
    const matches = password === confirm;
    
    matchEl.className = matches ? 'password-match match' : 'password-match no-match';
    matchEl.querySelector('.match-text').textContent = matches ? 'Passwords match' : 'Passwords do not match';

    return matches;
}

// Setup password handler (for new salesperson accounts)
async function handleSetupPassword(e) {
    e.preventDefault();
    const password = document.getElementById('setup-password').value;
    const confirm = document.getElementById('setup-confirm').value;
    const errorEl = document.getElementById('setup-error');
    const successEl = document.getElementById('setup-success');
    const btn = document.getElementById('setup-btn');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!password || !confirm) {
        errorEl.textContent = 'Please fill in both password fields';
        errorEl.style.display = 'block';
        return;
    }

    // Check password strength
    const { level, checks } = calculatePasswordStrength(password);
    
    if (!checks.length || !checks.hasLetter) {
        errorEl.textContent = 'Password must be at least 6 characters and contain a letter';
        errorEl.style.display = 'block';
        return;
    }

    if (level === 'weak') {
        errorEl.textContent = 'Password is too weak. Please add numbers or make it longer for at least medium strength.';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
    }

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('setup');

    if (!token) {
        errorEl.textContent = 'Invalid setup link. Please contact your agent.';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Setting Password...';

    console.log('🔐 Setup Password - Starting request...');
    console.log('📝 Token:', token.substring(0, 20) + '...');
    console.log('📝 Password length:', password.length);
    console.log('📝 Backend URL:', BACKEND_URL);

    try {
        console.log('📡 Sending request to:', `${BACKEND_URL}/auth/setup-password`);
        const res = await fetch(`${BACKEND_URL}/auth/setup-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        
        console.log('📡 Response status:', res.status);
        console.log('📡 Response ok:', res.ok);
        
        const data = await res.json();
        console.log('📡 Response data:', data);

        if (data.success) {
            console.log('✅ Password setup successful!');
            successEl.innerHTML = `✅ Password set successfully!<br><br>Your username is: <strong>${data.username}</strong><br><br>Redirecting to login...`;
            successEl.style.display = 'block';
            document.getElementById('setup-password-form').style.display = 'none';
            
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 3000);
        } else {
            console.error('❌ Setup failed:', data.error);
            errorEl.textContent = data.error || 'Failed to set password';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error('❌ Request error:', err);
        errorEl.textContent = 'Cannot connect to server. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Set Password & Continue';
    }
}

// Reset password handler
async function handleResetPassword(e) {
    e.preventDefault();
    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-confirm').value;
    const errorEl = document.getElementById('reset-error');
    const successEl = document.getElementById('reset-success');
    const btn = document.getElementById('reset-btn');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!password || !confirm) {
        errorEl.textContent = 'Please fill in both password fields';
        errorEl.style.display = 'block';
        return;
    }

    // Check password strength
    const { level, checks } = calculatePasswordStrength(password);
    
    if (!checks.length || !checks.hasLetter) {
        errorEl.textContent = 'Password must be at least 6 characters and contain a letter';
        errorEl.style.display = 'block';
        return;
    }

    if (level === 'weak') {
        errorEl.textContent = 'Password is too weak. Please add numbers or make it longer for at least medium strength.';
        errorEl.style.display = 'block';
        return;
    }

    if (password !== confirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.style.display = 'block';
        return;
    }

    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('reset');

    if (!token) {
        errorEl.textContent = 'Invalid reset link';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Resetting...';

    try {
        const res = await fetch(`${BACKEND_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password })
        });
        const data = await res.json();

        if (data.success) {
            successEl.innerHTML = `✅ Password reset successfully!<br><br>Your username is: <strong>${data.username}</strong><br><br>Redirecting to login...`;
            successEl.style.display = 'block';
            document.getElementById('reset-password-form').style.display = 'none';
            
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname;
            }, 3000);
        } else {
            errorEl.textContent = data.error || 'Failed to reset password';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Cannot connect to server. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Reset Password';
    }
}

// Init login listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check for setup or reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const setupToken = urlParams.get('setup');
    const resetToken = urlParams.get('reset');

    // Setup password form - attach listener BEFORE checking tokens
    const setupForm = document.getElementById('setup-password-form');
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetupPassword);
        console.log('✅ Setup form event listener attached');
    }

    // Reset password form - attach listener BEFORE checking tokens
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.addEventListener('submit', handleResetPassword);
        console.log('✅ Reset form event listener attached');
    }

    // Change password form
    const changeForm = document.getElementById('change-password-form');
    if (changeForm) {
        changeForm.addEventListener('submit', handleChangePassword);
        console.log('✅ Change form event listener attached');
    }

    if (setupToken) {
        console.log('🔐 Setup token detected, showing setup page');
        showView('setup');
        // Initialize password validation for setup page
        setTimeout(() => initSetupPasswordValidation(), 100);
        return;
    }

    if (resetToken) {
        console.log('🔄 Reset token detected, showing reset page');
        showView('reset');
        // Initialize password validation for reset page
        setTimeout(() => initResetPasswordValidation(), 100);
        return;
    }

    // Normal login flow
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Login password toggle
    const loginPasswordToggle = document.getElementById('login-password-toggle');
    const loginPasswordInput = document.getElementById('login-password');
    if (loginPasswordToggle && loginPasswordInput) {
        loginPasswordToggle.addEventListener('click', () => {
            const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
            loginPasswordInput.type = type;
            loginPasswordToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }
    
    // Forgot password form
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', handleForgotPassword);
    }

    if (!checkSavedSession()) {
        document.getElementById('login-page').style.display = 'flex';
    }
});


// Setup password strength and validation for setup page
function initSetupPasswordValidation() {
    const passwordInput = document.getElementById('setup-password');
    const confirmInput = document.getElementById('setup-confirm');
    const submitBtn = document.getElementById('setup-btn');
    const passwordToggle = document.getElementById('setup-password-toggle');
    const confirmToggle = document.getElementById('setup-confirm-toggle');

    if (!passwordInput || !confirmInput) return;

    // Password strength checking
    passwordInput.addEventListener('input', () => {
        const result = updatePasswordStrength(
            'setup-password',
            'setup-password-strength',
            'setup-strength-fill',
            'setup-strength-text',
            'req'
        );
        validateSetupForm();
    });

    // Password match checking
    confirmInput.addEventListener('input', () => {
        updatePasswordMatch('setup-password', 'setup-confirm', 'setup-match');
        validateSetupForm();
    });

    // Password visibility toggle
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            passwordToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    if (confirmToggle) {
        confirmToggle.addEventListener('click', () => {
            const type = confirmInput.type === 'password' ? 'text' : 'password';
            confirmInput.type = type;
            confirmToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    function validateSetupForm() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (!password || !confirm) {
            submitBtn.disabled = true;
            return;
        }

        const { level, checks } = calculatePasswordStrength(password);
        const matches = password === confirm;
        
        // Enable button only if password is at least medium strength and passwords match
        const isValid = (level === 'medium' || level === 'strong') && 
                       checks.length && 
                       checks.hasLetter && 
                       matches;
        
        submitBtn.disabled = !isValid;
    }
}

// Setup password strength and validation for reset page
function initResetPasswordValidation() {
    const passwordInput = document.getElementById('reset-password');
    const confirmInput = document.getElementById('reset-confirm');
    const submitBtn = document.getElementById('reset-btn');
    const passwordToggle = document.getElementById('reset-password-toggle');
    const confirmToggle = document.getElementById('reset-confirm-toggle');

    if (!passwordInput || !confirmInput) return;

    // Password strength checking
    passwordInput.addEventListener('input', () => {
        const result = updatePasswordStrength(
            'reset-password',
            'reset-password-strength',
            'reset-strength-fill',
            'reset-strength-text',
            'reset-req'
        );
        validateResetForm();
    });

    // Password match checking
    confirmInput.addEventListener('input', () => {
        updatePasswordMatch('reset-password', 'reset-confirm', 'reset-match');
        validateResetForm();
    });

    // Password visibility toggle
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            passwordToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    if (confirmToggle) {
        confirmToggle.addEventListener('click', () => {
            const type = confirmInput.type === 'password' ? 'text' : 'password';
            confirmInput.type = type;
            confirmToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    function validateResetForm() {
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (!password || !confirm) {
            submitBtn.disabled = true;
            return;
        }

        const { level, checks } = calculatePasswordStrength(password);
        const matches = password === confirm;
        
        // Enable button only if password is at least medium strength and passwords match
        const isValid = (level === 'medium' || level === 'strong') && 
                       checks.length && 
                       checks.hasLetter && 
                       matches;
        
        submitBtn.disabled = !isValid;
    }
}


// Change password handler (for forced password change)
async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('change-current').value;
    const newPassword = document.getElementById('change-password').value;
    const confirm = document.getElementById('change-confirm').value;
    const errorEl = document.getElementById('change-error');
    const successEl = document.getElementById('change-success');
    const btn = document.getElementById('change-btn');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!currentPassword || !newPassword || !confirm) {
        errorEl.textContent = 'Please fill in all password fields';
        errorEl.style.display = 'block';
        return;
    }

    // Check password strength
    const { level, checks } = calculatePasswordStrength(newPassword);
    
    if (!checks.length || !checks.hasLetter) {
        errorEl.textContent = 'New password must be at least 6 characters and contain a letter';
        errorEl.style.display = 'block';
        return;
    }

    if (level === 'weak') {
        errorEl.textContent = 'New password is too weak. Please add numbers or make it longer for at least medium strength.';
        errorEl.style.display = 'block';
        return;
    }

    if (newPassword !== confirm) {
        errorEl.textContent = 'New passwords do not match';
        errorEl.style.display = 'block';
        return;
    }

    if (newPassword === currentPassword) {
        errorEl.textContent = 'New password must be different from current password';
        errorEl.style.display = 'block';
        return;
    }

    // Get token from session
    const token = sessionStorage.getItem('changeToken');

    if (!token) {
        errorEl.textContent = 'Invalid change password session. Please login again.';
        errorEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Changing Password...';

    try {
        const res = await fetch(`${BACKEND_URL}/auth/change-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, oldPassword: currentPassword, newPassword })
        });
        const data = await res.json();

        if (data.success) {
            successEl.innerHTML = `✅ Password changed successfully!<br><br>Your username is: <strong>${data.username}</strong><br><br>Redirecting to login...`;
            successEl.style.display = 'block';
            document.getElementById('change-password-form').style.display = 'none';
            
            // Clear session storage
            sessionStorage.removeItem('changeToken');
            sessionStorage.removeItem('changeUsername');
            sessionStorage.removeItem('currentPassword');
            
            setTimeout(() => {
                // Reset form and show login page
                document.getElementById('change-password-form').style.display = 'block';
                document.getElementById('change-password-form').reset();
                document.getElementById('change-page').style.display = 'none';
                document.getElementById('login-page').style.display = 'flex';
                successEl.style.display = 'none';
                
                // Clear login form
                document.getElementById('login-username').value = '';
                document.getElementById('login-password').value = '';
            }, 3000);
        } else {
            errorEl.textContent = data.error || 'Failed to change password';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        console.error('Change password error:', err);
        errorEl.textContent = 'Cannot connect to server. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
    }
}

// Setup password strength and validation for change password page
function initChangePasswordValidation() {
    const currentInput = document.getElementById('change-current');
    const passwordInput = document.getElementById('change-password');
    const confirmInput = document.getElementById('change-confirm');
    const submitBtn = document.getElementById('change-btn');
    const currentToggle = document.getElementById('change-current-toggle');
    const passwordToggle = document.getElementById('change-password-toggle');
    const confirmToggle = document.getElementById('change-confirm-toggle');

    if (!passwordInput || !confirmInput || !currentInput) return;

    // Auto-fill current password if available
    const savedPassword = sessionStorage.getItem('currentPassword');
    if (savedPassword) {
        currentInput.value = savedPassword;
    }

    // Password strength checking
    passwordInput.addEventListener('input', () => {
        const result = updatePasswordStrength(
            'change-password',
            'change-password-strength',
            'change-strength-fill',
            'change-strength-text',
            'change-req'
        );
        
        // Check if different from current
        const current = currentInput.value;
        const newPass = passwordInput.value;
        const diffReq = document.getElementById('change-req-different');
        if (diffReq) {
            diffReq.className = (newPass && current && newPass !== current) ? 'requirement met' : 'requirement';
        }
        
        validateChangeForm();
    });

    // Current password input
    currentInput.addEventListener('input', () => {
        const current = currentInput.value;
        const newPass = passwordInput.value;
        const diffReq = document.getElementById('change-req-different');
        if (diffReq) {
            diffReq.className = (newPass && current && newPass !== current) ? 'requirement met' : 'requirement';
        }
        validateChangeForm();
    });

    // Password match checking
    confirmInput.addEventListener('input', () => {
        updatePasswordMatch('change-password', 'change-confirm', 'change-match');
        validateChangeForm();
    });

    // Password visibility toggles
    if (currentToggle) {
        currentToggle.addEventListener('click', () => {
            const type = currentInput.type === 'password' ? 'text' : 'password';
            currentInput.type = type;
            currentToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            passwordToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    if (confirmToggle) {
        confirmToggle.addEventListener('click', () => {
            const type = confirmInput.type === 'password' ? 'text' : 'password';
            confirmInput.type = type;
            confirmToggle.querySelector('.toggle-icon').textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    function validateChangeForm() {
        const current = currentInput.value;
        const password = passwordInput.value;
        const confirm = confirmInput.value;
        
        if (!current || !password || !confirm) {
            submitBtn.disabled = true;
            return;
        }

        const { level, checks } = calculatePasswordStrength(password);
        const matches = password === confirm;
        const different = password !== current;
        
        // Enable button only if password is at least medium strength, passwords match, and different from current
        const isValid = (level === 'medium' || level === 'strong') && 
                       checks.length && 
                       checks.hasLetter && 
                       matches &&
                       different;
        
        submitBtn.disabled = !isValid;
    }
}
