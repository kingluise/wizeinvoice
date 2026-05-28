// ========================================
// WIZE INVOICE - ADMIN PANEL
// ========================================

let currentUserPage = 1;
let currentInvoicePage = 1;
let currentActivityPage = 1;
let userSearchTerm = '';
let invoiceSearchTerm = '';
let activitySearchTerm = '';
let activityUserId = '';

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is admin
    if (!requireAdmin()) return;
    
    // Setup tab switching
    setupTabs();
    
    // Load dashboard data
    await loadDashboardStats();
    await loadActivitySummary();
    
    // Load initial data for active tab
    await loadUsers();
    await loadInvoices();
    await loadActivityLogs();
    
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

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Update active tab button
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            // Refresh data when switching tabs
            if (tabId === 'dashboard') {
                loadDashboardStats();
                loadActivitySummary();
            } else if (tabId === 'users') {
                loadUsers();
            } else if (tabId === 'invoices') {
                loadInvoices();
            } else if (tabId === 'activity') {
                loadActivityLogs();
            }
        });
    });
}

async function loadDashboardStats() {
    try {
        const response = await api.getAdminStats();
        
        if (response.success) {
            const stats = response.stats;
            
            document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
            document.getElementById('stat-total-invoices').textContent = stats.totalInvoices || 0;
            document.getElementById('stat-trial-users').textContent = stats.trialUsers || 0;
            document.getElementById('stat-paid-users').textContent = stats.paidUsers || 0;
            document.getElementById('stat-revenue').textContent = formatCurrency(stats.totalRevenue || 0);
            document.getElementById('stat-invoices-month').textContent = stats.invoicesThisMonth || 0;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        showAlert('Failed to load dashboard stats', 'error');
    }
}

async function loadActivitySummary() {
    try {
        const response = await api.getActivitySummary();
        
        if (response.success && response.summary) {
            const summary = response.summary;
            document.getElementById('activity-24h').textContent = summary.last24Hours || 0;
            document.getElementById('activity-7d').textContent = summary.last7Days || 0;
            document.getElementById('activity-30d').textContent = summary.last30Days || 0;
            
            const topActionsList = document.getElementById('top-actions-list');
            if (topActionsList && summary.byAction) {
                topActionsList.innerHTML = '';
                summary.byAction.slice(0, 5).forEach(action => {
                    const li = document.createElement('li');
                    li.innerHTML = `<strong>${action.action}</strong>: ${action.count} times`;
                    topActionsList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error('Failed to load activity summary:', error);
    }
}

async function loadUsers() {
    const loadingEl = document.getElementById('users-loading');
    const emptyEl = document.getElementById('users-empty');
    const tableEl = document.getElementById('users-table');
    const tbody = document.getElementById('users-list');
    const paginationEl = document.getElementById('users-pagination');
    
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    tableEl.classList.add('hidden');
    
    try {
        const response = await api.getAdminUsers(currentUserPage, userSearchTerm);
        
        if (response.success && response.users && response.users.length > 0) {
            loadingEl.classList.add('hidden');
            tableEl.classList.remove('hidden');
            
            tbody.innerHTML = '';
            response.users.forEach(user => {
                const row = document.createElement('tr');
                const statusClass = user.isActive ? 'status-active' : 'status-blocked';
                const statusText = user.isActive ? 'Active' : 'Blocked';
                const paidClass = user.isPaidUser ? 'status-paid' : 'status-trial';
                const paidText = user.isPaidUser ? 'Premium' : 'Trial';
                
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td><strong>${escapeHtml(user.fullName)}</strong><br><small>${user.businessName || 'No business'}</small></td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>${formatDate(user.trialEndDate)}</td>
                    <td><span class="status-badge ${paidClass}">${paidText}</span></td>
                    <td class="action-buttons">
                        <button class="action-btn extend" onclick="extendTrial(${user.id})" title="Extend Trial">📅</button>
                        <button class="action-btn activate" onclick="toggleUserStatus(${user.id}, ${user.isActive})" title="${user.isActive ? 'Block' : 'Activate'}">${user.isActive ? '🔒' : '🔓'}</button>
                        <button class="action-btn" onclick="togglePaidStatus(${user.id}, ${user.isPaidUser})" title="${user.isPaidUser ? 'Remove Premium' : 'Make Premium'}">💎</button>
                        <button class="action-btn delete" onclick="deleteUser(${user.id})" title="Delete User">🗑️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            // Pagination
            renderPagination(paginationEl, response.pagination, (page) => {
                currentUserPage = page;
                loadUsers();
            });
        } else {
            loadingEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        loadingEl.classList.add('hidden');
        showAlert('Failed to load users', 'error');
    }
}

async function loadInvoices() {
    const loadingEl = document.getElementById('invoices-loading');
    const emptyEl = document.getElementById('invoices-empty');
    const tableEl = document.getElementById('invoices-table');
    const tbody = document.getElementById('invoices-list');
    const paginationEl = document.getElementById('invoices-pagination');
    
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    tableEl.classList.add('hidden');
    
    try {
        const response = await api.getAdminInvoices(currentInvoicePage, invoiceSearchTerm);
        
        if (response.success && response.invoices && response.invoices.length > 0) {
            loadingEl.classList.add('hidden');
            tableEl.classList.remove('hidden');
            
            tbody.innerHTML = '';
            response.invoices.forEach(invoice => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${invoice.id}</td>
                    <td><strong>${invoice.invoiceNumber}</strong></td>
                    <td>${escapeHtml(invoice.clientName)}</td>
                    <td>${formatCurrency(invoice.totalAmount)}</td>
                    <td><small>${escapeHtml(invoice.userEmail)}</small></td>
                    <td>${formatDate(invoice.createdAt)}</td>
                    <td>
                        <button class="action-btn" onclick="viewInvoice(${invoice.id})" title="View">👁️</button>
                        <button class="action-btn delete" onclick="deleteInvoice(${invoice.id})" title="Delete">🗑️</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            
            renderPagination(paginationEl, response.pagination, (page) => {
                currentInvoicePage = page;
                loadInvoices();
            });
        } else {
            loadingEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load invoices:', error);
        loadingEl.classList.add('hidden');
        showAlert('Failed to load invoices', 'error');
    }
}

async function loadActivityLogs() {
    const loadingEl = document.getElementById('activity-loading');
    const emptyEl = document.getElementById('activity-empty');
    const tableEl = document.getElementById('activity-table');
    const tbody = document.getElementById('activity-list');
    const paginationEl = document.getElementById('activity-pagination');
    
    loadingEl.classList.remove('hidden');
    emptyEl.classList.add('hidden');
    tableEl.classList.add('hidden');
    
    try {
        const response = await api.getActivityLogs(currentActivityPage, activityUserId, activitySearchTerm);
        
        if (response.success && response.logs && response.logs.length > 0) {
            loadingEl.classList.add('hidden');
            tableEl.classList.remove('hidden');
            
            tbody.innerHTML = '';
            response.logs.forEach(log => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><small>${formatDate(log.timestamp, 'full')}</small></td>
                    <td>${escapeHtml(log.userEmail || 'Unknown')}</td>
                    <td><span class="status-badge status-active">${log.action}</span></td>
                    <td>${escapeHtml(log.details || '-')}</td>
                    <td><small>${log.ipAddress || '-'}</small></td>
                `;
                tbody.appendChild(row);
            });
            
            renderPagination(paginationEl, response.pagination, (page) => {
                currentActivityPage = page;
                loadActivityLogs();
            });
        } else {
            loadingEl.classList.add('hidden');
            emptyEl.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load activity logs:', error);
        loadingEl.classList.add('hidden');
        showAlert('Failed to load activity logs', 'error');
    }
}

function renderPagination(container, pagination, onPageChange) {
    if (!container || !pagination || pagination.totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let html = '';
    html += `<button class="page-btn ${pagination.page === 1 ? 'disabled' : ''}" onclick="changePage(${pagination.page - 1})">← Prev</button>`;
    
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += `<button class="page-btn disabled">...</button>`;
        }
    }
    
    html += `<button class="page-btn ${pagination.page === pagination.totalPages ? 'disabled' : ''}" onclick="changePage(${pagination.page + 1})">Next →</button>`;
    
    container.innerHTML = html;
    window.changePage = onPageChange;
}

// Global admin actions
window.extendTrial = async function(userId) {
    const days = prompt('Enter number of days to extend trial:', '7');
    if (days && !isNaN(days) && days > 0) {
        try {
            const response = await api.extendUserTrial(userId, parseInt(days));
            if (response.success) {
                showAlert(`Trial extended by ${days} days`, 'success');
                loadUsers();
            } else {
                showAlert(response.message || 'Failed to extend trial', 'error');
            }
        } catch (error) {
            showAlert('Failed to extend trial', 'error');
        }
    }
};

window.toggleUserStatus = async function(userId, isActive) {
    const action = isActive ? 'block' : 'activate';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        try {
            const response = await api.toggleUserStatus(userId);
            if (response.success) {
                showAlert(`User ${response.isActive ? 'activated' : 'blocked'} successfully`, 'success');
                loadUsers();
            } else {
                showAlert(response.message || 'Failed to toggle user status', 'error');
            }
        } catch (error) {
            showAlert('Failed to toggle user status', 'error');
        }
    }
};

window.togglePaidStatus = async function(userId, isPaid) {
    const action = isPaid ? 'remove premium from' : 'make premium';
    if (confirm(`Are you sure you want to ${action} this user?`)) {
        try {
            const response = await api.toggleUserPaid(userId);
            if (response.success) {
                showAlert(`User paid status changed to ${response.isPaidUser ? 'Premium' : 'Trial'}`, 'success');
                loadUsers();
                loadDashboardStats();
            } else {
                showAlert(response.message || 'Failed to toggle paid status', 'error');
            }
        } catch (error) {
            showAlert('Failed to toggle paid status', 'error');
        }
    }
};

window.deleteUser = async function(userId) {
    if (confirm('⚠️ WARNING: This will permanently delete the user and all their invoices. This action cannot be undone. Are you sure?')) {
        try {
            const response = await api.deleteUser(userId);
            if (response.success) {
                showAlert('User deleted successfully', 'success');
                loadUsers();
                loadDashboardStats();
            } else {
                showAlert(response.message || 'Failed to delete user', 'error');
            }
        } catch (error) {
            showAlert('Failed to delete user', 'error');
        }
    }
};

window.deleteInvoice = async function(invoiceId) {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
        try {
            const response = await api.deleteInvoice(invoiceId);
            if (response.success) {
                showAlert('Invoice deleted successfully', 'success');
                loadInvoices();
                loadDashboardStats();
            } else {
                showAlert(response.message || 'Failed to delete invoice', 'error');
            }
        } catch (error) {
            showAlert('Failed to delete invoice', 'error');
        }
    }
};

window.viewInvoice = function(invoiceId) {
    window.open(`/invoice-view.html?id=${invoiceId}`, '_blank');
};

function setupEventListeners() {
    // User search
    const userSearch = document.getElementById('user-search');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(() => {
            userSearchTerm = userSearch.value;
            currentUserPage = 1;
            loadUsers();
        }, 500));
    }
    
    // Invoice search
    const invoiceSearch = document.getElementById('invoice-search');
    if (invoiceSearch) {
        invoiceSearch.addEventListener('input', debounce(() => {
            invoiceSearchTerm = invoiceSearch.value;
            currentInvoicePage = 1;
            loadInvoices();
        }, 500));
    }
    
    // Activity search
    const activitySearch = document.getElementById('activity-search');
    const activityUserId = document.getElementById('activity-user-id');
    
    if (activitySearch) {
        activitySearch.addEventListener('input', debounce(() => {
            activitySearchTerm = activitySearch.value;
            currentActivityPage = 1;
            loadActivityLogs();
        }, 500));
    }
    
    if (activityUserId) {
        activityUserId.addEventListener('change', () => {
            activityUserId.value = activityUserId.value;
            currentActivityPage = 1;
            loadActivityLogs();
        });
    }
    
    // Refresh buttons
    const refreshUsers = document.getElementById('refresh-users');
    if (refreshUsers) {
        refreshUsers.addEventListener('click', () => loadUsers());
    }
    
    const refreshInvoices = document.getElementById('refresh-invoices');
    if (refreshInvoices) {
        refreshInvoices.addEventListener('click', () => loadInvoices());
    }
    
    const refreshActivity = document.getElementById('refresh-activity');
    if (refreshActivity) {
        refreshActivity.addEventListener('click', () => loadActivityLogs());
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}