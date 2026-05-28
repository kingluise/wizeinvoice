// ========================================
// WIZE INVOICE - MODERN CREATE INVOICE
// Live Preview + 8 Color Themes + Logo/Signature + Currency
// ========================================

let itemCounter = 0;
let currentTheme = 'emerald';
let currentLogoUrl = null;
let currentSignatureUrl = null;

// 8 Color Themes Configuration
const themes = {
    emerald: { primary: '#0F5C4B', secondary: '#FFB74D', name: 'Emerald' },
    ocean: { primary: '#1E3A5F', secondary: '#67E8F9', name: 'Ocean' },
    coral: { primary: '#E76F51', secondary: '#F4A261', name: 'Coral' },
    midnight: { primary: '#2D1B4E', secondary: '#F9A826', name: 'Midnight' },
    minimal: { primary: '#2C3E50', secondary: '#95A5A6', name: 'Minimal' },
    royal: { primary: '#5B2C6F', secondary: '#F1C40F', name: 'Royal' },
    forest: { primary: '#1B4F3B', secondary: '#A3E4D7', name: 'Forest' },
    sunset: { primary: '#D35400', secondary: '#F39C12', name: 'Sunset' }
};

document.addEventListener('DOMContentLoaded', async function() {
    if (!requireAuth()) return;
    
    setDefaultDates();
    addItemRow(true);
    
    const clientNameInput = document.getElementById('client-name');
    if (clientNameInput && !clientNameInput.value) {
        clientNameInput.value = 'Demo Client';
    }
    
    setupThemePicker();
    await loadTrialInfo();
    setupEventListeners();
    await loadUserBranding();
    setupBrandingEventListeners();
    
    const user = getCurrentUser();
    if (user) {
        const userNameSpan = document.getElementById('user-name');
        if (userNameSpan) userNameSpan.textContent = user.fullName || user.email;
    }
    
    setTimeout(() => {
        calculateTotals();
        updateLivePreview();
    }, 100);
    
    setTimeout(() => {
        updateLivePreview();
    }, 300);
    
    setTimeout(() => {
        updateLivePreview();
    }, 500);
});

function setDefaultDates() {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    
    const invoiceDateInput = document.getElementById('invoice-date');
    const dueDateInput = document.getElementById('due-date');
    
    if (invoiceDateInput) invoiceDateInput.value = today.toISOString().split('T')[0];
    if (dueDateInput) dueDateInput.value = dueDate.toISOString().split('T')[0];
}

function setupThemePicker() {
    const grid = document.getElementById('theme-color-grid-form');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const themeClasses = {
        emerald: 'theme-emerald',
        ocean: 'theme-ocean',
        coral: 'theme-coral',
        midnight: 'theme-midnight',
        minimal: 'theme-minimal',
        royal: 'theme-royal',
        forest: 'theme-forest',
        sunset: 'theme-sunset'
    };
    
    Object.entries(themes).forEach(([key, theme]) => {
        const option = document.createElement('div');
        option.className = `theme-color-option ${key === currentTheme ? 'selected' : ''}`;
        option.dataset.theme = key;
        option.innerHTML = `
            <div class="theme-color-preview ${themeClasses[key]}"></div>
            <span class="theme-color-name">${theme.name}</span>
        `;
        option.onclick = () => {
            document.querySelectorAll('#theme-color-grid-form .theme-color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            currentTheme = key;
            updateLivePreview();
        };
        grid.appendChild(option);
    });
}

function addItemRow(isFirstRow = false) {
    const container = document.getElementById('items-container');
    if (!container) return;
    
    const rowId = `item-${Date.now()}-${itemCounter++}`;
    
    const row = document.createElement('div');
    row.className = 'item-row-modern';
    row.id = rowId;
    row.innerHTML = `
        <div class="item-header">
            <span class="item-title">Item ${container.children.length + 1}</span>
            <button type="button" class="remove-item-btn" onclick="removeItemRow('${rowId}')">✕ Remove</button>
        </div>
        <div class="item-fields">
            <input type="text" class="form-input item-description" placeholder="Description" required>
            <input type="number" class="form-input item-quantity" placeholder="Qty" value="1" step="1" min="1" required>
            <input type="number" class="form-input item-price" placeholder="Price" step="0.01" min="0" required>
        </div>
    `;
    
    if (isFirstRow) {
        const descInput = row.querySelector('.item-description');
        const priceInput = row.querySelector('.item-price');
        if (descInput) descInput.value = 'Web Design Service';
        if (priceInput) priceInput.value = '50000';
    }
    
    const inputs = row.querySelectorAll('.item-description, .item-quantity, .item-price');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            calculateTotals();
            updateLivePreview();
        });
    });
    
    container.appendChild(row);
    calculateTotals();
    updateLivePreview();
}

window.removeItemRow = function(rowId) {
    const row = document.getElementById(rowId);
    if (row && document.querySelectorAll('.item-row-modern').length > 1) {
        row.remove();
        calculateTotals();
        updateLivePreview();
        const items = document.querySelectorAll('.item-row-modern');
        items.forEach((item, index) => {
            const title = item.querySelector('.item-title');
            if (title) title.textContent = `Item ${index + 1}`;
        });
    } else if (row && document.querySelectorAll('.item-row-modern').length === 1) {
        showAlert('You need at least one item', 'warning');
    }
};

function getCurrentCurrency() {
    return document.getElementById('currency')?.value || 'NGN';
}

function getCurrencySymbol() {
    const currency = getCurrentCurrency();
    return window.currencySymbols?.[currency] || '₦';
}

function calculateTotals() {
    let subtotal = 0;
    const itemRows = document.querySelectorAll('.item-row-modern');
    
    itemRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        subtotal += quantity * price;
    });
    
    const taxRate = parseFloat(document.getElementById('tax-rate')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    const currencySymbol = getCurrencySymbol();
    
    const subtotalEl = document.getElementById('subtotal');
    const taxAmountEl = document.getElementById('tax-amount');
    const totalAmountEl = document.getElementById('total-amount');
    
    if (subtotalEl) subtotalEl.textContent = `${currencySymbol}${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (taxAmountEl) taxAmountEl.textContent = `${currencySymbol}${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (totalAmountEl) totalAmountEl.textContent = `${currencySymbol}${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getFormData() {
    const items = [];
    const itemRows = document.querySelectorAll('.item-row-modern');
    
    itemRows.forEach(row => {
        const description = row.querySelector('.item-description')?.value.trim();
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const unitPrice = parseFloat(row.querySelector('.item-price')?.value) || 0;
        
        if (description && quantity > 0 && unitPrice >= 0) {
            items.push({ description, quantity, unitPrice });
        }
    });
    
    return {
        clientName: document.getElementById('client-name')?.value.trim() || 'Not specified',
        clientEmail: document.getElementById('client-email')?.value.trim() || '',
        clientPhone: document.getElementById('client-phone')?.value.trim() || '',
        invoiceDate: document.getElementById('invoice-date')?.value || new Date().toISOString().split('T')[0],
        dueDate: document.getElementById('due-date')?.value || '',
        items: items,
        taxRate: parseFloat(document.getElementById('tax-rate')?.value) || 0,
        theme: currentTheme,
        notes: document.getElementById('notes')?.value.trim() || '',
        currency: getCurrentCurrency(),
        // ✅ Company details from form
        companyName: document.getElementById('company-name')?.value.trim() || '',
        companyAddress: document.getElementById('company-address')?.value.trim() || '',
        companyEmail: document.getElementById('company-email')?.value.trim() || '',
        companyPhone: document.getElementById('company-phone')?.value.trim() || '',
    };
}

function updateLivePreview() {
    const previewContainer = document.getElementById('live-preview');
    if (!previewContainer) return;

    const data = getFormData();
    const theme = themes[data.theme] || themes.emerald;
    const currencySymbol = window.currencySymbols?.[data.currency] || '₦';

    // ✅ Read company details from form fields
    const businessName = data.companyName || 'Your Company Name';
    const businessAddress = data.companyAddress || '';
    const businessEmail = data.companyEmail || '';
    const businessPhone = data.companyPhone || '';

    // Calculate totals
    let subtotal = 0;
    data.items.forEach(item => { subtotal += item.quantity * item.unitPrice; });
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    // Show loading if no items
    if (data.items.length === 0) {
        previewContainer.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <p>Add items to see invoice preview</p>
            </div>
        `;
        return;
    }

    const formatAmount = (amount) =>
        `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const invoiceDate = data.invoiceDate ? formatDate(data.invoiceDate) : 'Not set';
    const dueDate = data.dueDate ? formatDate(data.dueDate) : 'Not set';
    const invoiceNumber = `WZ-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Logo
    const logoHtml = currentLogoUrl
        ? `<img src="${currentLogoUrl}" alt="Logo" style="max-height:55px; max-width:55px; object-fit:contain;">`
        : `<div style="width:50px;height:50px;background:#f0f0f0;border:1px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;">🧾</div>`;

    // Signature
    const signatureHtml = currentSignatureUrl
        ? `<img src="${currentSignatureUrl}" alt="Signature" style="max-height:50px; max-width:90px; object-fit:contain; display:block; margin-left:auto;">`
        : `<div style="font-size:13px;text-align:right;">_____________________</div>`;

    // Items rows — 6 columns matching PDF
    const MIN_ROWS = 6;
    let itemRowsHtml = data.items.map(item => {
        const amount = item.quantity * item.unitPrice;
        return `
            <tr>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(item.description)}</td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;"></td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">${item.quantity}</td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">${formatAmount(item.unitPrice)}</td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">${data.taxRate}%</td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:11px;text-align:right;">${formatAmount(amount)}</td>
            </tr>
        `;
    }).join('');

    // Filler rows
    const fillerCount = Math.max(0, MIN_ROWS - data.items.length);
    for (let i = 0; i < fillerCount; i++) {
        itemRowsHtml += `
            <tr>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;">&nbsp;</td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;"></td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;"></td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;"></td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;"></td>
                <td style="padding:8px 6px;border-bottom:1px solid #eee;"></td>
            </tr>
        `;
    }

    // Notes
    const notesHtml = (data.notes && data.notes.trim() !== '')
        ? `
            <div style="margin-top:0;">
                <div style="font-size:11px;font-weight:700;margin-bottom:6px;">NOTES:</div>
                <div style="font-size:11px;color:#555;line-height:1.5;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>
            </div>
        `
        : `
            <div style="margin-top:0;">
                <div style="font-size:11px;font-weight:700;margin-bottom:6px;">NOTES:</div>
                <div style="font-size:11px;color:#aaa;">Thank you for your business!</div>
            </div>
        `;

    previewContainer.innerHTML = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:white;min-height:100%;">

            <!-- TOP TEAL BAR -->
            <div style="background:${theme.primary};height:10px;width:100%;"></div>

            <!-- HEADER: Logo+Invoice title LEFT | Company details RIGHT -->
            <div style="padding:20px 24px 14px 24px;display:flex;justify-content:space-between;align-items:flex-start;">
                
                <!-- Left: logo + Invoice title -->
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${logoHtml}
                    <div style="font-size:24px;font-weight:700;color:#111;letter-spacing:0.5px;margin-top:4px;">Invoice</div>
                </div>

                <!-- Right: company info -->
                <div style="text-align:right;">
                    <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${escapeHtml(businessName)}</div>
                    <div style="font-size:10px;color:#555;line-height:1.7;">
                        ${businessAddress ? `${escapeHtml(businessAddress)}<br>` : ''}
                        ${businessEmail ? `${escapeHtml(businessEmail)}<br>` : ''}
                        ${businessPhone ? `${escapeHtml(businessPhone)}` : ''}
                    </div>
                </div>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:0 24px;"></div>

            <!-- BILL TO (left) | INVOICE META (right) -->
            <div style="padding:14px 24px;display:flex;justify-content:space-between;align-items:flex-start;">
                
                <!-- Bill To -->
                <div>
                    <div style="font-size:10px;font-weight:700;color:#555;margin-bottom:5px;letter-spacing:0.5px;">BILL TO:</div>
                    <div style="font-size:13px;font-weight:700;margin-bottom:3px;">${escapeHtml(data.clientName)}</div>
                    ${data.clientEmail ? `<div style="font-size:10px;color:#555;">${escapeHtml(data.clientEmail)}</div>` : ''}
                    ${data.clientPhone ? `<div style="font-size:10px;color:#555;">${escapeHtml(data.clientPhone)}</div>` : ''}
                </div>

                <!-- Invoice Meta -->
                <div style="text-align:right;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#555;">INVOICE #</div>
                    <div style="font-size:10px;margin-bottom:6px;">${invoiceNumber}</div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#555;">DATE</div>
                    <div style="font-size:10px;margin-bottom:6px;">${invoiceDate}</div>
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#555;">INVOICE DUE DATE</div>
                    <div style="font-size:10px;">${dueDate}</div>
                </div>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:0 24px;"></div>

            <!-- ITEMS TABLE -->
            <div style="padding:14px 24px 0 24px;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:8px 6px;text-align:left;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">ITEMS</th>
                            <th style="padding:8px 6px;text-align:left;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">DESCRIPTION</th>
                            <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">QUANTITY</th>
                            <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">PRICE</th>
                            <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">TAX</th>
                            <th style="padding:8px 6px;text-align:right;font-size:10px;font-weight:700;border-bottom:2px solid #ddd;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRowsHtml}
                    </tbody>
                </table>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:14px 24px 0 24px;"></div>

            <!-- NOTES (left) | TOTAL (right) -->
            <div style="padding:14px 24px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">
                
                <!-- Notes -->
                <div style="flex:1;">
                    ${notesHtml}
                </div>

                <!-- Total -->
                <div style="text-align:right;min-width:130px;">
                    <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:#555;margin-bottom:5px;">TOTAL</div>
                    <div style="font-size:22px;font-weight:700;color:#111;">${formatAmount(total)}</div>
                </div>
            </div>

            <!-- SIGNATURE -->
            <div style="padding:10px 24px 20px 24px;border-top:1px solid #eee;margin-top:5px;">
                ${signatureHtml}
                <div style="font-size:9px;color:#999;text-align:right;margin-top:4px;">Authorized Signature</div>
            </div>

            <!-- FOOTER BAR -->
            <div style="background:#e8f4f8;padding:10px 24px;text-align:center;margin-top:10px;">
                <div style="font-size:10px;font-weight:700;">Powered by 📄 Wize Invoice</div>
                <div style="font-size:9px;color:#666;margin-top:2px;">This invoice was generated with Wize Invoice • wizeinvoice.com</div>
            </div>

        </div>
    `;
}

// ✅ Updated: pre-fills company fields from profile
async function loadUserBranding() {
    try {
        const response = await api.getProfile();
        if (response.success && response.user) {

            // Pre-fill company details
            const nameEl = document.getElementById('company-name');
            const addressEl = document.getElementById('company-address');
            const emailEl = document.getElementById('company-email');
            const phoneEl = document.getElementById('company-phone');

            if (nameEl && !nameEl.value) nameEl.value = response.user.businessName || '';
            if (addressEl && !addressEl.value) addressEl.value = response.user.businessAddress || '';
            if (emailEl && !emailEl.value) emailEl.value = response.user.email || '';
            if (phoneEl && !phoneEl.value) phoneEl.value = response.user.phone || '';

            // Logo
            if (response.user.logoUrl) {
                currentLogoUrl = response.user.logoUrl;
                const container = document.getElementById('logo-preview-invoice');
                if (container) container.innerHTML = `<img src="${currentLogoUrl}" alt="Logo" style="max-width: 100px; max-height: 100px; object-fit: contain;">`;
                const removeBtn = document.getElementById('remove-logo-invoice-btn');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }

            // Signature
            if (response.user.signatureUrl) {
                currentSignatureUrl = response.user.signatureUrl;
                const container = document.getElementById('signature-preview-invoice');
                if (container) container.innerHTML = `<img src="${currentSignatureUrl}" alt="Signature" style="max-width: 100px; max-height: 100px; object-fit: contain;">`;
                const removeBtn = document.getElementById('remove-signature-invoice-btn');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }

            // Refresh preview after profile loads
            updateLivePreview();
        }
    } catch (error) {
        console.error('Failed to load branding:', error);
    }
}

// ========================================
// UPLOAD FUNCTIONS
// ========================================

async function uploadLogoInvoice(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
        showAlert('Please upload JPG, PNG, or SVG file', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showAlert('Logo must be less than 2MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const backendUrl = 'https://localhost:7010';
    
    try {
        showAlert('Uploading logo...', 'info');
        const response = await fetch(`${backendUrl}/api/user/upload-logo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (result.success && result.logoUrl) {
            currentLogoUrl = result.logoUrl;
            const container = document.getElementById('logo-preview-invoice');
            if (container) container.innerHTML = `<img src="${currentLogoUrl}" alt="Logo" style="max-width: 100px; max-height: 100px; object-fit: contain;">`;
            const removeBtn = document.getElementById('remove-logo-invoice-btn');
            if (removeBtn) removeBtn.classList.remove('hidden');
            showAlert('Logo uploaded successfully', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to upload logo', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Connection error. Please try again.', 'error');
    }
}

async function uploadSignatureInvoice(file) {
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
        showAlert('Please upload JPG or PNG file', 'error');
        return;
    }
    if (file.size > 1 * 1024 * 1024) {
        showAlert('Signature must be less than 1MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const backendUrl = 'https://localhost:7010';
    
    try {
        showAlert('Uploading signature...', 'info');
        const response = await fetch(`${backendUrl}/api/user/upload-signature`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        const result = await response.json();
        if (result.success && result.signatureUrl) {
            currentSignatureUrl = result.signatureUrl;
            const container = document.getElementById('signature-preview-invoice');
            if (container) container.innerHTML = `<img src="${currentSignatureUrl}" alt="Signature" style="max-width: 100px; max-height: 100px; object-fit: contain;">`;
            const removeBtn = document.getElementById('remove-signature-invoice-btn');
            if (removeBtn) removeBtn.classList.remove('hidden');
            showAlert('Signature uploaded successfully', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to upload signature', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('Connection error. Please try again.', 'error');
    }
}

async function removeLogoInvoice() {
    const token = getAuthToken();
    const backendUrl = 'https://localhost:7010';
    try {
        const response = await fetch(`${backendUrl}/api/user/remove-logo`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            currentLogoUrl = null;
            const container = document.getElementById('logo-preview-invoice');
            if (container) container.innerHTML = `<div class="preview-placeholder-small"><span>📄</span><p>No logo</p></div>`;
            const removeBtn = document.getElementById('remove-logo-invoice-btn');
            if (removeBtn) removeBtn.classList.add('hidden');
            showAlert('Logo removed', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to remove logo', 'error');
        }
    } catch (error) {
        console.error('Remove error:', error);
        showAlert('Connection error', 'error');
    }
}

async function removeSignatureInvoice() {
    const token = getAuthToken();
    const backendUrl = 'https://localhost:7010';
    try {
        const response = await fetch(`${backendUrl}/api/user/remove-signature`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        const result = await response.json();
        if (result.success) {
            currentSignatureUrl = null;
            const container = document.getElementById('signature-preview-invoice');
            if (container) container.innerHTML = `<div class="preview-placeholder-small"><span>✍️</span><p>No signature</p></div>`;
            const removeBtn = document.getElementById('remove-signature-invoice-btn');
            if (removeBtn) removeBtn.classList.add('hidden');
            showAlert('Signature removed', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to remove signature', 'error');
        }
    } catch (error) {
        console.error('Remove error:', error);
        showAlert('Connection error', 'error');
    }
}

function setupBrandingEventListeners() {
    const uploadLogoBtn = document.getElementById('upload-logo-invoice-btn');
    const logoFile = document.getElementById('logo-file-invoice');
    if (uploadLogoBtn && logoFile) {
        uploadLogoBtn.addEventListener('click', () => logoFile.click());
        logoFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                uploadLogoInvoice(e.target.files[0]);
                logoFile.value = '';
            }
        });
    }
    
    const uploadSignatureBtn = document.getElementById('upload-signature-invoice-btn');
    const signatureFile = document.getElementById('signature-file-invoice');
    if (uploadSignatureBtn && signatureFile) {
        uploadSignatureBtn.addEventListener('click', () => signatureFile.click());
        signatureFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                uploadSignatureInvoice(e.target.files[0]);
                signatureFile.value = '';
            }
        });
    }
    
    const removeLogoBtn = document.getElementById('remove-logo-invoice-btn');
    const removeSignatureBtn = document.getElementById('remove-signature-invoice-btn');
    if (removeLogoBtn) removeLogoBtn.addEventListener('click', removeLogoInvoice);
    if (removeSignatureBtn) removeSignatureBtn.addEventListener('click', removeSignatureInvoice);
}

async function createInvoice() {
    const data = getFormData();
    if (!data.clientName || data.clientName === 'Not specified') {
        showAlert('Please enter client name', 'error');
        return;
    }
    if (data.items.length === 0) {
        showAlert('Please add at least one item', 'error');
        return;
    }
    
    const generateBtn = document.getElementById('generate-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating...';
    
    try {
       const response = await api.createInvoice({
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate || null,
        items: data.items,
        taxRate: data.taxRate,
        theme: data.theme,
        notes: data.notes || null,
        currency: data.currency,
        companyName: data.companyName || null,
        companyAddress: data.companyAddress || null,
        companyEmail: data.companyEmail || null,
        companyPhone: data.companyPhone || null
});
        
        if (response.success) {
            showSuccessModal(response.invoice);
            resetForm();
        } else {
            showAlert(response.message || 'Failed to create invoice', 'error');
        }
    } catch (error) {
        showAlert(error.message || 'Connection error', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

function showSuccessModal(invoice) {
    const modal = document.getElementById('success-modal');
    if (!modal) return;
    
    const downloadBtn = document.getElementById('modal-download');
    if (downloadBtn) {
        downloadBtn.onclick = () => {
            if (invoice.pdfUrl) {
                window.open(invoice.pdfUrl, '_blank');
            } else {
                showAlert('PDF will be available shortly', 'info');
            }
        };
    }
    
    const shareBtn = document.getElementById('modal-share');
    if (shareBtn) shareBtn.style.display = 'none';
    
    modal.classList.add('active');
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            window.location.href = '/dashboard.html';
        }
    };
}

// ✅ Updated: also clears company fields
function resetForm() {
    document.getElementById('client-name').value = '';
    document.getElementById('client-email').value = '';
    document.getElementById('client-phone').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('company-name').value = '';
    document.getElementById('company-address').value = '';
    document.getElementById('company-email').value = '';
    document.getElementById('company-phone').value = '';
    document.getElementById('items-container').innerHTML = '';
    itemCounter = 0;
    addItemRow(true);
    setDefaultDates();
    calculateTotals();
    updateLivePreview();
}

// ✅ Updated: includes company fields in listeners
function setupEventListeners() {
    const form = document.getElementById('invoice-form');
    if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); await createInvoice(); });
    
    document.getElementById('add-item-btn')?.addEventListener('click', () => addItemRow(false));
    document.getElementById('clear-form')?.addEventListener('click', () => { if (confirm('Clear all?')) resetForm(); });
    document.getElementById('tax-rate')?.addEventListener('change', () => { calculateTotals(); updateLivePreview(); });
    
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', () => {
            calculateTotals();
            updateLivePreview();
        });
    }
    
    // ✅ All fields that update the preview including company fields
    [
        'client-name', 'client-email', 'client-phone',
        'invoice-date', 'due-date', 'notes',
        'company-name', 'company-address', 'company-email', 'company-phone'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => updateLivePreview());
    });
    
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

async function loadTrialInfo() {
    try {
        const response = await api.getTrialInfo();
        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;
            const banner = document.getElementById('trial-banner');
            if (banner) {
                if (trialInfo.isPaidUser) banner.classList.add('hidden');
                else if (trialInfo.isExpired) {
                    banner.innerHTML = `<div class="alert alert-warning">⚠️ Trial expired! <a href="/subscribe.html">Subscribe now</a></div>`;
                    banner.classList.remove('hidden');
                } else if (trialInfo.daysRemaining <= 3) {
                    banner.innerHTML = `<div class="alert alert-warning">⏰ Trial ends in ${trialInfo.daysRemaining} days. <a href="/subscribe.html">Subscribe</a></div>`;
                    banner.classList.remove('hidden');
                } else banner.classList.add('hidden');
            }
            
            const subscribeLink = document.getElementById('subscribe-link');
            const mobileSubscribe = document.getElementById('mobile-subscribe');
            if (!trialInfo.isPaidUser) {
                if (subscribeLink) subscribeLink.classList.remove('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else {
                if (subscribeLink) subscribeLink.classList.add('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'none';
            }
        }
    } catch (error) { console.error(error); }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}