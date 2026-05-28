// ========================================
// WIZE INVOICE - UTILITIES
// Shared functions for all pages
// ========================================

// API Configuration
const API_BASE_URL = 'https://localhost:7010/api';

// Get stored auth token
function getAuthToken() {
    return localStorage.getItem('wize_token');
}

// Get current user from storage
function getCurrentUser() {
    const userStr = localStorage.getItem('wize_user');
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        return null;
    }
}

// Save auth data after login/register
function setAuthData(token, user) {
    localStorage.setItem('wize_token', token);
    localStorage.setItem('wize_user', JSON.stringify(user));
}

// Clear auth data on logout
function clearAuthData() {
    localStorage.removeItem('wize_token');
    localStorage.removeItem('wize_user');
}

// Check if user is logged in
function isLoggedIn() {
    const token = getAuthToken();
    const user = getCurrentUser();
    return !!(token && user);
}

// Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.isAdmin === true;
}

// Check if trial is active
function isTrialActive() {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.isPaidUser) return true;

    const trialEnd = new Date(user.trialEndDate);
    const now = new Date();
    return now < trialEnd;
}

// Get days remaining in trial
function getTrialDaysRemaining() {
    const user = getCurrentUser();
    if (!user) return 0;
    if (user.isPaidUser) return -1; // Unlimited

    const trialEnd = new Date(user.trialEndDate);
    const now = new Date();
    const diffTime = trialEnd - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

// Currency symbol mapping
const currencySymbols = {
    'NGN': '₦',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'GHS': '₵',
    'KES': 'KSh',
    'ZAR': 'R'
};

// Format currency with support for multiple currencies
function formatCurrency(amount, currency = 'NGN') {
    const symbol = currencySymbols[currency] || '₦';
    const formattedAmount = amount.toLocaleString(undefined, { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    return `${symbol}${formattedAmount}`;
}

// Format date
function formatDate(dateString, format = 'short') {
    const date = new Date(dateString);
    if (format === 'short') {
        return date.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } else if (format === 'long') {
        return date.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (format === 'full') {
        return date.toLocaleDateString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return date.toLocaleDateString();
}

// Format invoice number
function formatInvoiceNumber(invoiceNumber) {
    return invoiceNumber;
}

// API Request Helper
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            // Handle session expiry
            if (response.status === 401) {
                // Token expired or invalid
                if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
                    clearAuthData();
                    if (window.location.pathname !== '/login.html' &&
                        window.location.pathname !== '/register.html') {
                        window.location.href = '/login.html';
                    }
                }
            }
            throw new Error(data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Specific API methods
const api = {
    // Auth
    register: (data) => apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    login: (data) => apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    forgotPassword: (email) => apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
    }),

    resetPassword: (data) => apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    changePassword: (data) => apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    // User Profile
    getProfile: () => apiRequest('/user/profile'),

    updateProfile: (data) => apiRequest('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
    }),

    uploadLogo: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthToken();
        return fetch(`${API_BASE_URL}/user/upload-logo`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then(res => res.json());
    },

    uploadSignature: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthToken();
        return fetch(`${API_BASE_URL}/user/upload-signature`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then(res => res.json());
    },

    removeLogo: () => apiRequest('/user/remove-logo', {
        method: 'DELETE'
    }),

    removeSignature: () => apiRequest('/user/remove-signature', {
        method: 'DELETE'
    }),

    // Invoices - FIXED URLs to match backend controller (InvoiceController)
    createInvoice: (data) => apiRequest('/invoice/create', {
        method: 'POST',
        body: JSON.stringify(data)
    }),

    getInvoices: () => apiRequest('/invoice/list'),

    getInvoice: (id) => apiRequest(`/invoice/${id}`),

    downloadInvoice: (id) => apiRequest(`/invoice/download/${id}`),

    // Billing
    subscribe: () => apiRequest('/billing/subscribe', {
        method: 'POST'
    }),

    getTrialInfo: () => apiRequest('/billing/trial-info'),

    verifySubscription: (reference) => apiRequest(`/billing/verify?reference=${reference}`),

    // Admin
    getAdminStats: () => apiRequest('/admin/stats'),

    getAdminUsers: (page = 1, search = '') => {
        let url = `/admin/users?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return apiRequest(url);
    },

    getAdminInvoices: (page = 1, search = '') => {
        let url = `/admin/invoices?page=${page}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        return apiRequest(url);
    },

    getActivityLogs: (page = 1, userId = null, action = null) => {
        let url = `/admin/activity-logs?page=${page}`;
        if (userId) url += `&userId=${userId}`;
        if (action) url += `&action=${encodeURIComponent(action)}`;
        return apiRequest(url);
    },

    extendUserTrial: (userId, additionalDays) => apiRequest(`/admin/users/${userId}/extend-trial`, {
        method: 'PUT',
        body: JSON.stringify({ additionalDays })
    }),

    toggleUserStatus: (userId) => apiRequest(`/admin/users/${userId}/toggle-status`, {
        method: 'PUT'
    }),

    toggleUserPaid: (userId) => apiRequest(`/admin/users/${userId}/toggle-paid`, {
        method: 'PUT'
    }),

    deleteUser: (userId) => apiRequest(`/admin/users/${userId}`, {
        method: 'DELETE'
    }),

    deleteInvoice: (invoiceId) => apiRequest(`/admin/invoices/${invoiceId}`, {
        method: 'DELETE'
    })
};

// Show alert message
function showAlert(message, type = 'info', containerId = 'alert-container') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('Alert container not found:', containerId);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${message}</span>
        <button type="button" style="float: right; background: none; border: none; cursor: pointer;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Show loading state
function showLoading(elementId, show = true) {
    const element = document.getElementById(elementId);
    if (!element) return;

    if (show) {
        element.disabled = true;
        element.classList.add('loading');
        const originalText = element.innerHTML;
        element.setAttribute('data-original-text', originalText);
        element.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        element.disabled = false;
        element.classList.remove('loading');
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.innerHTML = originalText;
        }
    }
}

// Validate form inputs
function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return true;

    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');

            // Add error message if not exists
            let errorMsg = field.parentElement.querySelector('.form-error');
            if (!errorMsg) {
                errorMsg = document.createElement('span');
                errorMsg.className = 'form-error';
                field.parentElement.appendChild(errorMsg);
            }
            errorMsg.textContent = 'This field is required';
        } else {
            field.classList.remove('error');
            const errorMsg = field.parentElement.querySelector('.form-error');
            if (errorMsg) errorMsg.remove();
        }
    });

    return isValid;
}

// Redirect if not logged in
function requireAuth() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Redirect if not admin
function requireAdmin() {
    if (!requireAuth()) return false;
    if (!isAdmin()) {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

// Redirect if already logged in
function requireGuest() {
    if (isLoggedIn()) {
        window.location.href = '/dashboard.html';
        return false;
    }
    return true;
}

// Update trial banner on dashboard
function updateTrialBanner() {
    const banner = document.getElementById('trial-banner');
    if (!banner) return;

    const user = getCurrentUser();
    if (!user) return;

    if (user.isPaidUser) {
        banner.style.display = 'none';
        return;
    }

    const daysLeft = getTrialDaysRemaining();

    if (daysLeft <= 0) {
        banner.innerHTML = `
            <div class="alert alert-warning" style="margin: 0;">
                ⚠️ Your trial has expired! <a href="/subscribe.html">Subscribe now</a> to continue creating invoices.
            </div>
        `;
        banner.style.display = 'block';
    } else if (daysLeft <= 3) {
        banner.innerHTML = `
            <div class="alert alert-warning" style="margin: 0;">
                ⏰ Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. <a href="/subscribe.html">Subscribe now</a> to avoid interruption.
            </div>
        `;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}