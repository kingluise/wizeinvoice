// ========================================
// WIZE INVOICE - AUTHENTICATION
// Login, Register, Logout handlers
// ========================================

// ✅ Constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPTS_KEY = 'wize_login_attempts';
const LOGIN_LOCKOUT_KEY  = 'wize_login_lockout';
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes in ms

document.addEventListener('DOMContentLoaded', function() {
    // ✅ Check token expiry on every page load
    checkTokenExpiry();

    const loginForm = document.getElementById('login-form');
    if (loginForm) setupLoginForm(loginForm);

    const registerForm = document.getElementById('register-form');
    if (registerForm) setupRegisterForm(registerForm);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) setupForgotForm(forgotForm);

    const resetForm = document.getElementById('reset-form');
    if (resetForm) setupResetForm(resetForm);

    updateAuthUI();
});

// ✅ Check if JWT token is expired and redirect to login
function checkTokenExpiry() {
    const token = getAuthToken();
    if (!token) return;

    try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // convert to ms
        const now = Date.now();

        if (now >= expiryTime) {
            // Token expired — clear and redirect
            clearAuthData();
            const currentPage = window.location.pathname;
            const publicPages = ['/login.html', '/register.html',
                                 '/forgot-password.html', '/reset-password.html',
                                 '/index.html', '/'];
            if (!publicPages.includes(currentPage)) {
                showAlert('Your session has expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = '/login.html?expired=true';
                }, 1500);
            }
            return;
        }

        // ✅ Set a timer to auto-logout when token expires
        const msUntilExpiry = expiryTime - now;
        setTimeout(() => {
            clearAuthData();
            const currentPage = window.location.pathname;
            const publicPages = ['/login.html', '/register.html',
                                 '/forgot-password.html', '/reset-password.html',
                                 '/index.html', '/'];
            if (!publicPages.includes(currentPage)) {
                showAlert('Your session has expired. Please log in again.', 'warning');
                setTimeout(() => {
                    window.location.href = '/login.html?expired=true';
                }, 1500);
            }
        }, msUntilExpiry);

    } catch (e) {
        // Invalid token format — clear it
        clearAuthData();
    }
}

// ✅ Client-side rate limiting helpers
function getLoginAttempts() {
    return parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || '0');
}

function incrementLoginAttempts() {
    const attempts = getLoginAttempts() + 1;
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, attempts.toString());
    return attempts;
}

function resetLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem(LOGIN_LOCKOUT_KEY);
}

function getLockoutEndTime() {
    const val = localStorage.getItem(LOGIN_LOCKOUT_KEY);
    return val ? parseInt(val) : null;
}

function setLockout() {
    const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOGIN_LOCKOUT_KEY, lockoutEnd.toString());
}

function isLockedOut() {
    const lockoutEnd = getLockoutEndTime();
    if (!lockoutEnd) return false;
    if (Date.now() < lockoutEnd) return true;
    // Lockout expired — clear it
    resetLoginAttempts();
    return false;
}

function getLockoutMinutesRemaining() {
    const lockoutEnd = getLockoutEndTime();
    if (!lockoutEnd) return 0;
    return Math.ceil((lockoutEnd - Date.now()) / 60000);
}

// ✅ Show attempts remaining indicator on login form
function updateAttemptsUI(attemptsLeft) {
    let indicator = document.getElementById('attempts-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'attempts-indicator';
        indicator.style.cssText = `
            margin-top: 8px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.78rem;
            font-weight: 500;
            text-align: center;
        `;
        const form = document.getElementById('login-form');
        if (form) form.appendChild(indicator);
    }

    if (attemptsLeft <= 2) {
        indicator.style.background = '#fee2e2';
        indicator.style.color = '#dc2626';
        indicator.style.border = '1px solid #fca5a5';
    } else {
        indicator.style.background = '#fef3c7';
        indicator.style.color = '#d97706';
        indicator.style.border = '1px solid #fde68a';
    }

    indicator.textContent = `⚠️ ${attemptsLeft} login attempt(s) remaining before lockout`;
    indicator.style.display = 'block';
}

function showLockoutUI(minutesLeft) {
    let indicator = document.getElementById('attempts-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'attempts-indicator';
        const form = document.getElementById('login-form');
        if (form) form.appendChild(indicator);
    }

    indicator.style.cssText = `
        margin-top: 8px;
        padding: 10px 12px;
        border-radius: 6px;
        font-size: 0.78rem;
        font-weight: 500;
        text-align: center;
        background: #fee2e2;
        color: #dc2626;
        border: 1px solid #fca5a5;
        display: block;
    `;

    // Live countdown inside lockout message
    function updateLockoutMessage() {
        const minsLeft = getLockoutMinutesRemaining();
        if (minsLeft <= 0) {
            indicator.style.display = 'none';
            const submitBtn = document.querySelector('#login-form button[type="submit"]');
            if (submitBtn) submitBtn.disabled = false;
            return;
        }
        indicator.textContent = `🔒 Too many failed attempts. Try again in ${minsLeft} minute(s).`;
        setTimeout(updateLockoutMessage, 30000); // update every 30s
    }
    updateLockoutMessage();

    // Disable submit button during lockout
    const submitBtn = document.querySelector('#login-form button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
}

// Setup Login Form
function setupLoginForm(form) {
    // ✅ Check if already locked out on page load
    if (isLockedOut()) {
        showLockoutUI(getLockoutMinutesRemaining());
    }

    // ✅ Show expired session message if redirected
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
        showAlert('Your session has expired. Please log in again.', 'warning');
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // ✅ Block submission if locked out
        if (isLockedOut()) {
            showLockoutUI(getLockoutMinutesRemaining());
            return;
        }

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

        try {
            const response = await api.login({ email, password });

            if (response.success) {
                // ✅ Successful login — clear attempts
                resetLoginAttempts();
                setAuthData(response.token, response.user);
                showAlert('Login successful! Redirecting...', 'success');

                setTimeout(() => {
                    window.location.href = response.user.isAdmin
                        ? '/admin.html'
                        : '/dashboard.html';
                }, 1000);

            } else {
                // ✅ Failed login — track attempts client-side too
                const attempts = incrementLoginAttempts();
                const attemptsLeft = MAX_LOGIN_ATTEMPTS - attempts;

                if (attempts >= MAX_LOGIN_ATTEMPTS) {
                    setLockout();
                    showAlert('Too many failed attempts. Account locked for 15 minutes.', 'error');
                    showLockoutUI(15);
                } else {
                    // Show server message which includes attempts remaining
                    showAlert(response.message || 'Login failed', 'error');
                    if (attemptsLeft <= MAX_LOGIN_ATTEMPTS - 1) {
                        updateAttemptsUI(attemptsLeft);
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
            }
        } catch (error) {
            showAlert(error.message || 'Connection error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Setup Register Form
function setupRegisterForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const fullName        = document.getElementById('fullname').value.trim();
        const email           = document.getElementById('email').value.trim();
        const phone           = document.getElementById('phone').value.trim();
        const password        = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (!fullName || !email || !password) {
            showAlert('Please fill in all required fields', 'error'); return;
        }
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error'); return;
        }
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error'); return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

        try {
            const response = await api.register({ fullName, email, phone, password });

            if (response.success) {
                setAuthData(response.token, response.user);
                showAlert('Registration successful! Welcome to Wize Invoice!', 'success');
                setTimeout(() => { window.location.href = '/dashboard.html'; }, 1500);
            } else {
                showAlert(response.message || 'Registration failed', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showAlert(error.message || 'Connection error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Setup Forgot Password Form
function setupForgotForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        if (!email) { showAlert('Please enter your email address', 'error'); return; }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending...';

        try {
            const response = await api.forgotPassword(email);
            if (response.success) {
                showAlert('If your email is registered, you will receive a password reset link.', 'success');
                form.reset();
            } else {
                showAlert(response.message || 'Failed to send reset link', 'error');
            }
        } catch (error) {
            showAlert('Connection error. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Setup Reset Password Form
function setupResetForm(form) {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) { showAlert('Invalid or missing reset token', 'error'); return; }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword     = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword.length < 6) {
            showAlert('Password must be at least 6 characters', 'error'); return;
        }
        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match', 'error'); return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Resetting...';

        try {
            const response = await api.resetPassword({
                token, newPassword, confirmPassword
            });

            if (response.success) {
                // ✅ Clear any lockout on successful reset
                resetLoginAttempts();
                showAlert('Password reset successful! Redirecting to login...', 'success');
                setTimeout(() => { window.location.href = '/login.html'; }, 2000);
            } else {
                showAlert(response.message || 'Failed to reset password', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (error) {
            showAlert('Connection error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// Handle Logout
async function handleLogout(e) {
    e.preventDefault();
    clearAuthData();
    showAlert('Logged out successfully', 'success');
    setTimeout(() => { window.location.href = '/index.html'; }, 500);
}

// Update UI based on auth state
function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getCurrentUser();

    const authButtons = document.getElementById('auth-buttons');
    const userMenu    = document.getElementById('user-menu');

    if (authButtons && userMenu) {
        if (loggedIn && user) {
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');
            const userNameSpan = document.getElementById('user-name');
            if (userNameSpan) userNameSpan.textContent = user.fullName || user.email;
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }

    if (loggedIn && isAdmin()) {
        document.getElementById('admin-link')?.classList.remove('hidden');
    }
}

// Change Password (settings page)
async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

    const response = await api.changePassword({ currentPassword, newPassword, confirmPassword });
    if (!response.success) throw new Error(response.message || 'Failed to change password');
    return response;
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const toggleBtn = document.querySelector('.password-toggle');
        if (toggleBtn) toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
    }
}

// Social login placeholder
function socialLogin(provider) {
    showAlert(`${provider} login coming soon!`, 'info');
}