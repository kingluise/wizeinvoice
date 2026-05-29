// ========================================
// WIZE INVOICE - SUBSCRIBE
// Country detection, dynamic pricing, Paystack flow
// ========================================

const BACKEND_URL = 'https://wizeinvoice-001-site1.ntempurl.com';

document.addEventListener('DOMContentLoaded', async function () {
    if (!requireAuth()) return;

    updateAuthUI();

    const user = getCurrentUser();
    if (user) {
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) userNameSpan.textContent = user.fullName || user.email;
        if (user.isAdmin) document.getElementById('admin-link')?.classList.remove('hidden');
    }

    // Run these in parallel for speed
    await Promise.all([
        loadTrialStatus(),
        loadPricing()
    ]);

    setupEventListeners();

    // Check if redirected back from Paystack
    checkPaymentCallback();
});

// ── Detect country via IP ────────────────────────────────────
async function detectCountry() {
    try {
        const res  = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return data.country_code || 'US';
    } catch {
        return 'US';
    }
}

// ── Load dynamic pricing based on detected country ──────────
async function loadPricing() {
    const priceEl  = document.getElementById('premium-price');
    const periodEl = document.getElementById('premium-period');
    const noteEl   = document.getElementById('pricing-note');

    try {
        const country = await detectCountry();
        const token   = getAuthToken();

        const response = await fetch(
            `${BACKEND_URL}/api/billing/pricing?country=${country}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();

        if (data.success) {
            if (priceEl)  priceEl.textContent  = data.displayAmount;
            if (periodEl) periodEl.textContent = `per month`;
            if (noteEl) {
                noteEl.textContent = country === 'NG'
                    ? '🇳🇬 Nigerian pricing — ₦5,000/month'
                    : `🌍 International pricing — $5.00/month`;
            }

            // Store for use when subscribing
            window._selectedCountry  = country;
            window._selectedAmount   = data.amount;
            window._selectedCurrency = data.currency;
            window._displayAmount    = data.displayAmount;
        }
    } catch (err) {
        console.error('Failed to load pricing:', err);
        if (priceEl)  priceEl.textContent  = '₦5,000';
        if (periodEl) periodEl.textContent = 'per month';
        window._selectedCountry  = 'NG';
        window._selectedCurrency = 'NGN';
    }
}

// ── Load trial status card ───────────────────────────────────
async function loadTrialStatus() {
    const card       = document.getElementById('trial-status');
    const subscribeBtn = document.getElementById('subscribe-btn');
    if (!card) return;

    try {
        const response = await api.getTrialInfo();

        if (!response.success || !response.trialInfo) {
            card.innerHTML = `<div class="status-title">Unable to load plan status.</div>`;
            return;
        }

        const t = response.trialInfo;

        if (t.isPaidUser) {
            card.innerHTML = `
                <div class="status-title">🎉 You're on Premium!</div>
                <div class="status-days">Active</div>
                <div class="status-message">
                    Thank you for subscribing to Wize Invoice Premium.
                </div>
            `;
            card.style.background = 'linear-gradient(135deg, #16a34a, #15803d)';

            if (subscribeBtn) {
                subscribeBtn.textContent = '✅ Already Subscribed';
                subscribeBtn.disabled = true;
                subscribeBtn.classList.remove('btn-primary');
                subscribeBtn.classList.add('btn-outline');
            }

            // Hide subscribe nav links
            document.getElementById('subscribe-link')?.classList.add('hidden');
            const mob = document.getElementById('mobile-subscribe');
            if (mob) mob.style.display = 'none';

        } else if (t.isExpired) {
            card.innerHTML = `
                <div class="status-title">⚠️ Trial Expired</div>
                <div class="status-days">0 days left</div>
                <div class="status-message">
                    Your free trial has ended. Subscribe now to continue creating invoices.
                </div>
            `;
            card.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';

        } else {
            // Active trial
            const endDate = new Date(t.trialEndDate).toLocaleDateString('en-NG', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            card.innerHTML = `
                <div class="status-title">📋 Free Trial Active</div>
                <div class="status-days">${t.daysRemaining} day${t.daysRemaining !== 1 ? 's' : ''} remaining</div>
                <div class="status-message">Your trial ends on ${endDate}</div>
            `;
        }
    } catch (error) {
        console.error('Failed to load trial status:', error);
        card.innerHTML = `<div class="status-title">Unable to load plan status.</div>`;
    }
}

// ── Initialize Paystack payment ──────────────────────────────
async function initializeSubscription() {
    const subscribeBtn  = document.getElementById('subscribe-btn');
    const originalText  = subscribeBtn.innerHTML;
    const country       = window._selectedCountry || 'NG';

    subscribeBtn.disabled = true;
    subscribeBtn.innerHTML = '<span class="spinner"></span> Redirecting to Paystack...';

    try {
        const token    = getAuthToken();
        const response = await fetch(
            `${BACKEND_URL}/api/billing/subscribe?country=${country}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const data = await response.json();

        if (data.success && data.authorizationUrl) {
            // ✅ Save reference to localStorage so callback page can verify
            localStorage.setItem('wize_paystack_ref', data.reference);
            // ✅ Redirect to Paystack
            window.location.href = data.authorizationUrl;
        } else {
            showAlert(data.message || 'Failed to initialize payment. Please try again.', 'error');
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

// ── Handle Paystack callback (reference in URL) ──────────────
function checkPaymentCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const reference = urlParams.get('reference')
                   || urlParams.get('trxref')
                   || localStorage.getItem('wize_paystack_ref');

    if (!reference) return;

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);

    verifyPayment(reference);
}

// ── Verify payment with backend ──────────────────────────────
async function verifyPayment(reference) {
    showAlert('Verifying your payment...', 'info');

    const subscribeBtn = document.getElementById('subscribe-btn');
    if (subscribeBtn) {
        subscribeBtn.disabled = true;
        subscribeBtn.innerHTML = '<span class="spinner"></span> Verifying...';
    }

    try {
        const token    = getAuthToken();
        const response = await fetch(
            `${BACKEND_URL}/api/billing/verify?reference=${encodeURIComponent(reference)}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();

        if (data.success) {
            // ✅ Clear stored reference
            localStorage.removeItem('wize_paystack_ref');

            // ✅ Update local user data to premium
            const user = getCurrentUser();
            if (user) {
                user.isPaidUser = true;
                setAuthData(getAuthToken(), user);
            }

            showAlert(
                `🎉 Payment successful! Welcome to Premium. Redirecting...`,
                'success'
            );

            // Reload trial status to show premium state
            await loadTrialStatus();

            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2500);

        } else {
            localStorage.removeItem('wize_paystack_ref');
            showAlert(
                data.message || 'Payment verification failed. Please contact support.',
                'error'
            );
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.innerHTML = 'Subscribe Now';
            }
        }
    } catch (error) {
        console.error('Verification error:', error);
        showAlert('Failed to verify payment. Please contact support.', 'error');
        if (subscribeBtn) {
            subscribeBtn.disabled = false;
            subscribeBtn.innerHTML = 'Subscribe Now';
        }
    }
}

// ── Event listeners ──────────────────────────────────────────
function setupEventListeners() {
    document.getElementById('subscribe-btn')
        ?.addEventListener('click', initializeSubscription);

    document.getElementById('logout-btn')
        ?.addEventListener('click', handleLogout);
}