// ========================================
// WIZE INVOICE - DASHBOARD
// ========================================

document.addEventListener('DOMContentLoaded', async function() {
    if (!requireAuth()) return;

    await loadDashboardData();
    await loadInvoices();
    await loadTrialInfo();
    setupEventListeners();
});

async function loadDashboardData() {
    const user = getCurrentUser();
    if (!user) return;

    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) welcomeName.textContent = user.fullName || user.email.split('@')[0];

    const userNameSpan = document.getElementById('user-name');
    if (userNameSpan) userNameSpan.textContent = user.fullName || user.email;
}

async function loadInvoices() {
    const loadingEl = document.getElementById('invoices-loading');
    const emptyEl   = document.getElementById('invoices-empty');
    const tableEl   = document.getElementById('invoices-table');
    const tbody     = document.getElementById('invoices-list');

    try {
        const response = await api.getInvoices();

        if (response.success && response.invoices && response.invoices.length > 0) {
            loadingEl.classList.add('hidden');
            emptyEl.classList.add('hidden');
            tableEl.classList.remove('hidden');

            tbody.innerHTML = '';

            let totalAmount = 0;

            response.invoices.forEach(invoice => {
                totalAmount += invoice.totalAmount;
                const row = createInvoiceRow(invoice);
                tbody.appendChild(row);
            });

            const totalAmountEl = document.getElementById('total-amount');
            if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);

            const totalInvoicesEl = document.getElementById('total-invoices');
            if (totalInvoicesEl) totalInvoicesEl.textContent = response.invoices.length;

        } else {
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

// ✅ Build invoice row with status badge + status action buttons
function createInvoiceRow(invoice) {
    const row = document.createElement('tr');
    row.id = `invoice-row-${invoice.id}`;

    const status = invoice.status || 'pending';

    row.innerHTML = `
        <td><strong>${invoice.invoiceNumber}</strong></td>
        <td>${escapeHtml(invoice.clientName)}</td>
        <td>${formatDate(invoice.invoiceDate)}</td>
        <td>${formatDate(invoice.dueDate)}</td>
        <td>${formatCurrency(invoice.totalAmount)}</td>
        <td>
            <span id="status-badge-${invoice.id}" class="invoice-status status-${status}">
                ${getStatusLabel(status)}
            </span>
        </td>
        <td class="action-buttons">
            <button class="btn-icon" onclick="viewInvoice(${invoice.id})" title="View">👁️</button>
            <button class="btn-icon" onclick="downloadInvoice(${invoice.id})" title="Download">📄</button>
            <button class="btn-icon" onclick="shareInvoice(${invoice.id}, '${escapeHtml(invoice.clientName)}', '${invoice.invoiceNumber}')" title="Share via WhatsApp">💬</button>
            <div class="status-dropdown-wrapper">
                <button class="btn-icon btn-status" onclick="toggleStatusMenu(${invoice.id})" title="Change Status">🔄</button>
                <div id="status-menu-${invoice.id}" class="status-dropdown hidden">
                    <button onclick="changeInvoiceStatus(${invoice.id}, 'paid')"      class="status-option status-opt-paid">✅ Paid</button>
                    <button onclick="changeInvoiceStatus(${invoice.id}, 'unpaid')"    class="status-option status-opt-unpaid">💸 Unpaid</button>
                    <button onclick="changeInvoiceStatus(${invoice.id}, 'pending')"   class="status-option status-opt-pending">⏳ Pending</button>
                    <button onclick="changeInvoiceStatus(${invoice.id}, 'cancelled')" class="status-option status-opt-cancelled">❌ Cancelled</button>
                </div>
            </div>
        </td>
    `;
    return row;
}

// ✅ Status label helper
function getStatusLabel(status) {
    const labels = {
        paid:      '✅ Paid',
        unpaid:    '💸 Unpaid',
        pending:   '⏳ Pending',
        cancelled: '❌ Cancelled'
    };
    return labels[status] || '⏳ Pending';
}

// ✅ Toggle status dropdown menu
window.toggleStatusMenu = function(invoiceId) {
    // Close all other open menus first
    document.querySelectorAll('.status-dropdown').forEach(menu => {
        if (menu.id !== `status-menu-${invoiceId}`) {
            menu.classList.add('hidden');
        }
    });
    const menu = document.getElementById(`status-menu-${invoiceId}`);
    if (menu) menu.classList.toggle('hidden');
};

// ✅ Close status menus when clicking outside
document.addEventListener('click', function(e) {
    if (!e.target.closest('.status-dropdown-wrapper')) {
        document.querySelectorAll('.status-dropdown').forEach(menu => {
            menu.classList.add('hidden');
        });
    }
});

// ✅ Change invoice status
window.changeInvoiceStatus = async function(invoiceId, newStatus) {
    // Close the dropdown
    const menu = document.getElementById(`status-menu-${invoiceId}`);
    if (menu) menu.classList.add('hidden');

    try {
        const response = await api.updateInvoiceStatus(invoiceId, newStatus);

        if (response.success) {
            // Update the badge in place without reloading
            const badge = document.getElementById(`status-badge-${invoiceId}`);
            if (badge) {
                badge.className = `invoice-status status-${newStatus}`;
                badge.textContent = getStatusLabel(newStatus);
            }
            showAlert(`Invoice marked as ${newStatus}`, 'success');
        } else {
            showAlert(response.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Status update error:', error);
        showAlert('Failed to update invoice status', 'error');
    }
};

async function loadTrialInfo() {
    try {
        const response = await api.getTrialInfo();

        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;

            const trialDaysEl = document.getElementById('trial-days');
            if (trialDaysEl) {
                trialDaysEl.textContent = trialInfo.isPaidUser ? '∞' : trialInfo.daysRemaining;
            }

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

            updateTrialBannerDisplay(trialInfo);

            const subscribeLink   = document.getElementById('subscribe-link');
            const subscribeAction = document.getElementById('subscribe-action');
            const mobileSubscribe = document.getElementById('mobile-subscribe');

            if (!trialInfo.isPaidUser && (trialInfo.isExpired || trialInfo.daysRemaining <= 3)) {
                subscribeLink?.classList.remove('hidden');
                if (subscribeAction) subscribeAction.style.display = 'flex';
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else {
                subscribeLink?.classList.add('hidden');
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
            <div class="alert alert-warning" style="margin:0;border-radius:0;">
                ⚠️ Your 14-day free trial has expired!
                <a href="/subscribe.html">Subscribe now</a> to continue creating invoices.
            </div>`;
        banner.classList.remove('hidden');
    } else if (trialInfo.daysRemaining <= 3) {
        banner.innerHTML = `
            <div class="alert alert-warning" style="margin:0;border-radius:0;">
                ⏰ Your trial ends in ${trialInfo.daysRemaining} day${trialInfo.daysRemaining !== 1 ? 's' : ''}.
                <a href="/subscribe.html">Subscribe now</a> to avoid interruption.
            </div>`;
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
    }
}

function setupEventListeners() {
    const whatsappAction = document.getElementById('whatsapp-action');
    if (whatsappAction) {
        whatsappAction.addEventListener('click', function(e) {
            e.preventDefault();
            showAlert('WhatsApp invoicing feature is coming soon!', 'info');
        });
    }
}

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
    const message  = `📄 Invoice ${invoiceNumber} for ${clientName} is ready.\nView here: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
};

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}