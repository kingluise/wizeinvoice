// ========================================
// WIZE INVOICE - AUTHENTICATION
// Login, Register, Logout handlers
// ========================================

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Setup login form if on login page
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        setupLoginForm(loginForm);
    }

    // Setup register form if on register page
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        setupRegisterForm(registerForm);
    }

    // Setup logout button if exists
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Setup forgot password form
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        setupForgotForm(forgotForm);
    }

    // Setup reset password form
    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        setupResetForm(resetForm);
    }

    // Check if user is logged in and update UI
    updateAuthUI();
});

// Setup Login Form
function setupLoginForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Validate
        if (!email || !password) {
            showAlert('Please fill in all fields', 'error');
            return;
        }

        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

        try {
            const response = await api.login({ email, password });

            if (response.success) {
                // Save auth data
                setAuthData(response.token, response.user);

                showAlert('Login successful! Redirecting...', 'success');

                // Redirect based on user role
                setTimeout(() => {
                    if (response.user.isAdmin) {
                        window.location.href = '/admin.html';
                    } else {
                        window.location.href = '/dashboard.html';
                    }
                }, 1000);
            } else {
                showAlert(response.message || 'Login failed', 'error');
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

// Setup Register Form
function setupRegisterForm(form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form values
        const fullName = document.getElementById('fullname').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validate
        if (!fullName || !email || !password) {
            showAlert('Please fill in all required fields', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        // Show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

        try {
            const response = await api.register({ fullName, email, phone, password });

            if (response.success) {
                // Save auth data
                setAuthData(response.token, response.user);

                showAlert('Registration successful! Welcome to Wize Invoice!', 'success');

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
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

        if (!email) {
            showAlert('Please enter your email address', 'error');
            return;
        }

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
    // Get token from URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showAlert('Invalid or missing reset token', 'error');
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword.length < 6) {
            showAlert('Password must be at least 6 characters', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('Passwords do not match', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Resetting...';

        try {
            const response = await api.resetPassword({
                token: token,
                newPassword: newPassword,
                confirmPassword: confirmPassword
            });

            if (response.success) {
                showAlert('Password reset successful! Redirecting to login...', 'success');

                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 2000);
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

    // Clear local storage
    clearAuthData();

    showAlert('Logged out successfully', 'success');

    // Redirect to home
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500);
}

// Update UI based on auth state
function updateAuthUI() {
    const loggedIn = isLoggedIn();
    const user = getCurrentUser();

    // Update login/logout buttons in navbar
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');

    if (authButtons && userMenu) {
        if (loggedIn && user) {
            authButtons.classList.add('hidden');
            userMenu.classList.remove('hidden');

            // Update user name display
            const userNameSpan = document.getElementById('user-name');
            if (userNameSpan) {
                userNameSpan.textContent = user.fullName || user.email;
            }
        } else {
            authButtons.classList.remove('hidden');
            userMenu.classList.add('hidden');
        }
    }

    // Update admin link visibility
    if (loggedIn && isAdmin()) {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.classList.remove('hidden');
        }
    }
}

// Change Password (for settings page)
async function changePassword(currentPassword, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
    }

    if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }

    const response = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
    });

    if (!response.success) {
        throw new Error(response.message || 'Failed to change password');
    }

    return response;
}

// ========================================
// NEW FUNCTIONS ADDED BELOW
// ========================================

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        // Toggle eye icon
        const toggleBtn = document.querySelector('.password-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
        }
    }
}

// Social login placeholder (to be implemented later)
function socialLogin(provider) {
    showAlert(`${provider} login coming soon!`, 'info');
}
