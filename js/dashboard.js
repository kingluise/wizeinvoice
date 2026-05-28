// ========================================
// WIZE INVOICE - DASHBOARD
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!requireAuth()) return;
    
    // Load dashboard data
    await loadDashboardData();
    
    // Load invoices
    await loadInvoices();
    
    // Load trial info
    await loadTrialInfo();
    
    // Setup event listeners
    setupEventListeners();
});

async function loadDashboardData() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Update welcome message
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = user.fullName || user.email.split('@')[0];
    }
    
    // Update user name in navbar
    const userNameSpan = document.getElementById('user-name');
    if (userNameSpan) {
        userNameSpan.textContent = user.fullName || user.email;
    }
}

async function loadInvoices() {
    const loadingEl = document.getElementById('invoices-loading');
    const emptyEl = document.getElementById('invoices-empty');
    const tableEl = document.getElementById('invoices-table');
    const tbody = document.getElementById('invoices-list');
    
    try {
        const response = await api.getInvoices();
        
        if (response.success && response.invoices && response.invoices.length > 0) {
            // Hide loading, show table
            loadingEl.classList.add('hidden');
            emptyEl.classList.add('hidden');
            tableEl.classList.remove('hidden');
            
            // Clear tbody
            tbody.innerHTML = '';
            
            // Calculate totals
            let totalAmount = 0;
            
            // Populate table
            response.invoices.forEach(invoice => {
                totalAmount += invoice.totalAmount;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${invoice.invoiceNumber}</strong></td>
                    <td>${escapeHtml(invoice.clientName)}</td>
                    <td>${formatDate(invoice.invoiceDate)}</td>
                    <td>${formatDate(invoice.dueDate)}</td>
                    <td>${formatCurrency(invoice.totalAmount)}</td>
                    <td><span class="invoice-status status-unpaid">Unpaid</span></td>
                    <td class="action-buttons">
                        <button class="btn-icon" onclick="viewInvoice(${invoice.id})" title="View">👁️</button>
                        <button class="btn-icon" onclick="downloadInvoice(${invoice.id})" title="Download">📄</button>
                        <button class="btn-icon" onclick="shareInvoice(${invoice.id}, '${invoice.clientName}', '${invoice.invoiceNumber}')" title="Share via WhatsApp">💬</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Update total amount stat
            const totalAmountEl = document.getElementById('total-amount');
            if (totalAmountEl) {
                totalAmountEl.textContent = formatCurrency(totalAmount);
            }
            
            // Update total invoices stat
            const totalInvoicesEl = document.getElementById('total-invoices');
            if (totalInvoicesEl) {
                totalInvoicesEl.textContent = response.invoices.length;
            }
            
        } else {
            // No invoices
            loadingEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
            tableEl.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to load invoices:', error);
        loadingEl.classList.add('hidden');
        showAlert('Failed to load invoices. Please refresh the page.', 'error');
    }
}

async function loadTrialInfo() {
    try {
        const response = await api.getTrialInfo();
        
        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;
            
            // Update trial days stat
            const trialDaysEl = document.getElementById('trial-days');
            if (trialDaysEl) {
                trialDaysEl.textContent = trialInfo.isPaidUser ? '∞' : trialInfo.daysRemaining;
            }
            
            // Update paid status stat
            const paidStatusEl = document.getElementById('paid-status');
            if (paidStatusEl) {
                if (trialInfo.isPaidUser) {
                    paidStatusEl.textContent = 'Premium';
                    paidStatusEl.style.color = 'var(--success)';
                } else if (trialInfo.isTrialActive) {
                    paidStatusEl.textContent = 'Free Trial';
                    paidStatusEl.style.color = 'var(--primary)';
                } else {
                    paidStatusEl.textContent = 'Expired';
                    paidStatusEl.style.color = 'var(--error)';
                }
            }
            
            // Update trial banner
            updateTrialBannerDisplay(trialInfo);
            
            // Show/hide subscribe link
            const subscribeLink = document.getElementById('subscribe-link');
            const subscribeAction = document.getElementById('subscribe-action');
            const mobileSubscribe = document.getElementById('mobile-subscribe');
            
            if (!trialInfo.isPaidUser && trialInfo.isExpired) {
                if (subscribeLink) subscribeLink.classList.remove('hidden');
                if (subscribeAction) subscribeAction.style.display = 'flex';
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else if (!trialInfo.isPaidUser && trialInfo.daysRemaining <= 3) {
                if (subscribeLink) subscribeLink.classList.remove('hidden');
                if (subscribeAction) subscribeAction.style.display = 'flex';
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else {
                if (subscribeLink) subscribeLink.classList.add('hidden');
                if (subscribeAction) subscribeAction.style.display = 'none';
                if (mobileSubscribe) mobileSubscribe.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Failed to load trial info:', error);
    }
}

function updateTrialBannerDisplay(trialInfo) {
    const banner = document.getElementById('trial-banner');
    if (!banner) return;
    
    if (trialInfo.isPaidUser) {
        banner.classList.add('hidden');
        return;
    }
    
    if (trialInfo.isExpired) {
        banner.innerHTML = `
            <div class="alert alert-warning" style="margin: 0; border-radius: 0;">
                ⚠️ Your 14-day free trial has expired! <a href="/subscribe.html">Subscribe now</a> to continue creating invoices.
            </div>
        `;
        banner.classList.remove('hidden');
    } else if (trialInfo.daysRemaining <= 3) {
        banner.innerHTML = `
            <div class="alert alert-warning" style="margin: 0; border-radius: 0;">
                ⏰ Your trial ends in ${trialInfo.daysRemaining} day${trialInfo.daysRemaining !== 1 ? 's' : ''}. <a href="/subscribe.html">Subscribe now</a> to avoid interruption.
            </div>
        `;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

function setupEventListeners() {
    // WhatsApp action button
    const whatsappAction = document.getElementById('whatsapp-action');
    if (whatsappAction) {
        whatsappAction.addEventListener('click', function(e) {
            e.preventDefault();
            showAlert('WhatsApp invoicing feature is coming soon!', 'info');
        });
    }
}

// Global functions for invoice actions
window.viewInvoice = function(invoiceId) {
    window.location.href = `/invoice-view.html?id=${invoiceId}`;
};

window.downloadInvoice = async function(invoiceId) {
    try {
        showAlert('Preparing download...', 'info');
        const response = await api.downloadInvoice(invoiceId);
        if (response.success && response.downloadUrl) {
            window.open(response.downloadUrl, '_blank');
        } else {
            showAlert('Failed to download invoice', 'error');
        }
    } catch (error) {
        showAlert('Failed to download invoice', 'error');
    }
};

window.shareInvoice = function(invoiceId, clientName, invoiceNumber) {
    const shareUrl = `${window.location.origin}/invoice-view.html?id=${invoiceId}`;
    const message = `📄 Invoice ${invoiceNumber} for ${clientName} is ready.\nView here: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}