// ========================================
// WIZE INVOICE - SUBSCRIBE
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!requireAuth()) return;
    
    // Load trial info
    await loadTrialInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update user name in navbar
    const user = getCurrentUser();
    if (user) {
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) {
            userNameSpan.textContent = user.fullName || user.email;
        }
    }
});

async function loadTrialInfo() {
    const trialStatusDiv = document.getElementById('trial-status');
    const subscribeBtn = document.getElementById('subscribe-btn');
    
    try {
        const response = await api.getTrialInfo();
        
        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;
            
            if (trialInfo.isPaidUser) {
                // User is already premium
                if (trialStatusDiv) {
                    trialStatusDiv.innerHTML = `
                        <div class="status-title">🎉 You are a Premium Member!</div>
                        <div class="status-message">Thank you for supporting Wize Invoice. Enjoy unlimited invoicing.</div>
                    `;
                }
                if (subscribeBtn) {
                    subscribeBtn.textContent = 'Already Subscribed';
                    subscribeBtn.disabled = true;
                }
                // Hide upgrade buttons in navbar
                const subscribeLink = document.getElementById('subscribe-link');
                const mobileSubscribe = document.getElementById('mobile-subscribe');
                if (subscribeLink) subscribeLink.classList.add('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'none';
                
            } else if (trialInfo.isTrialActive) {
                // User is on active trial
                if (trialStatusDiv) {
                    trialStatusDiv.innerHTML = `
                        <div class="status-title">📋 Your Free Trial Status</div>
                        <div class="status-days">${trialInfo.daysRemaining} days remaining</div>
                        <div class="status-message">Your trial ends on ${formatDate(trialInfo.trialEndDate, 'long')}</div>
                    `;
                }
                
            } else {
                // Trial expired
                if (trialStatusDiv) {
                    trialStatusDiv.innerHTML = `
                        <div class="status-title">⚠️ Your Trial Has Expired</div>
                        <div class="status-message">Subscribe now to continue creating invoices</div>
                    `;
                }
            }
        }
    } catch (error) {
        console.error('Failed to load trial info:', error);
    }
}

async function initializeSubscription() {
    const subscribeBtn = document.getElementById('subscribe-btn');
    const originalText = subscribeBtn.innerHTML;
    
    // Show loading state
    subscribeBtn.disabled = true;
    subscribeBtn.innerHTML = '<span class="spinner"></span> Redirecting to Paystack...';
    
    try {
        const response = await api.subscribe();
        
        if (response.success && response.authorizationUrl) {
            // Redirect to Paystack payment page
            window.location.href = response.authorizationUrl;
        } else {
            showAlert(response.message || 'Failed to initialize subscription', 'error');
            subscribeBtn.disabled = false;
            subscribeBtn.innerHTML = originalText;
        }
    } catch (error) {
        console.error('Subscription error:', error);
        showAlert('Connection error. Please try again.', 'error');
        subscribeBtn.disabled = false;
        subscribeBtn.innerHTML = originalText;
    }
}

// Check for payment callback (when redirected back from Paystack)
function checkPaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference');
    const success = urlParams.get('success');
    
    if (reference && success === 'true') {
        verifyPayment(reference);
    } else if (reference && success === 'false') {
        showAlert('Payment was cancelled or failed. Please try again.', 'warning');
    }
}

async function verifyPayment(reference) {
    showAlert('Verifying your payment...', 'info');
    
    try {
        const response = await api.verifySubscription(reference);
        
        if (response.success) {
            showAlert('Subscription activated successfully! Redirecting to dashboard...', 'success');
            
            // Update local user data
            const user = getCurrentUser();
            if (user) {
                user.isPaidUser = true;
                setAuthData(localStorage.getItem('wize_token'), user);
            }
            
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
        } else {
            showAlert(response.message || 'Payment verification failed', 'error');
        }
    } catch (error) {
        console.error('Verification error:', error);
        showAlert('Failed to verify payment. Please contact support.', 'error');
    }
}

function setupEventListeners() {
    // Subscribe button
    const subscribeBtn = document.getElementById('subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.addEventListener('click', initializeSubscription);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Check for payment callback on page load
    checkPaymentCallback();
}

// Format date helper (if not already in utils)
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
    }
    return date.toLocaleDateString();
}