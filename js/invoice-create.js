// ========================================
// WIZE INVOICE - MODERN CREATE INVOICE
// Live Preview + 8 Color Themes + Logo/Signature + Currency
// ========================================

let itemCounter = 0;
let currentTheme = 'emerald';
let currentLogoUrl = null;
let currentSignatureUrl = null;
let countdownInterval = null; // ✅ countdown timer reference

// 8 Color Themes Configuration
const themes = {
    emerald:  { primary: '#0F5C4B', secondary: '#FFB74D', name: 'Emerald' },
    ocean:    { primary: '#1E3A5F', secondary: '#67E8F9', name: 'Ocean' },
    coral:    { primary: '#E76F51', secondary: '#F4A261', name: 'Coral' },
    midnight: { primary: '#2D1B4E', secondary: '#F9A826', name: 'Midnight' },
    minimal:  { primary: '#2C3E50', secondary: '#95A5A6', name: 'Minimal' },
    royal:    { primary: '#5B2C6F', secondary: '#F1C40F', name: 'Royal' },
    forest:   { primary: '#1B4F3B', secondary: '#A3E4D7', name: 'Forest' },
    sunset:   { primary: '#D35400', secondary: '#F39C12', name: 'Sunset' }
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

    setTimeout(() => { calculateTotals(); updateLivePreview(); }, 100);
    setTimeout(() => { updateLivePreview(); }, 300);
    setTimeout(() => { updateLivePreview(); }, 500);
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
        emerald: 'theme-emerald', ocean: 'theme-ocean', coral: 'theme-coral',
        midnight: 'theme-midnight', minimal: 'theme-minimal', royal: 'theme-royal',
        forest: 'theme-forest', sunset: 'theme-sunset'
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
        input.addEventListener('input', () => { calculateTotals(); updateLivePreview(); });
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
        document.querySelectorAll('.item-row-modern').forEach((item, index) => {
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
    return window.currencySymbols?.[getCurrentCurrency()] || '₦';
}

function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll('.item-row-modern').forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
        subtotal += quantity * price;
    });

    const taxRate = parseFloat(document.getElementById('tax-rate')?.value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    const sym = getCurrencySymbol();
    const fmt = (n) => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const subtotalEl = document.getElementById('subtotal');
    const taxAmountEl = document.getElementById('tax-amount');
    const totalAmountEl = document.getElementById('total-amount');

    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);
    if (taxAmountEl) taxAmountEl.textContent = fmt(taxAmount);
    if (totalAmountEl) totalAmountEl.textContent = fmt(total);
}

function getFormData() {
    const items = [];
    document.querySelectorAll('.item-row-modern').forEach(row => {
        const description = row.querySelector('.item-description')?.value.trim();
        const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
        const unitPrice = parseFloat(row.querySelector('.item-price')?.value) || 0;
        if (description && quantity > 0 && unitPrice >= 0) {
            items.push({ description, quantity, unitPrice });
        }
    });

    return {
        clientName:     document.getElementById('client-name')?.value.trim() || 'Not specified',
        clientEmail:    document.getElementById('client-email')?.value.trim() || '',
        clientPhone:    document.getElementById('client-phone')?.value.trim() || '',
        invoiceDate:    document.getElementById('invoice-date')?.value || new Date().toISOString().split('T')[0],
        dueDate:        document.getElementById('due-date')?.value || '',
        items,
        taxRate:        parseFloat(document.getElementById('tax-rate')?.value) || 0,
        theme:          currentTheme,
        notes:          document.getElementById('notes')?.value.trim() || '',
        currency:       getCurrentCurrency(),
        companyName:    document.getElementById('company-name')?.value.trim() || '',
        companyAddress: document.getElementById('company-address')?.value.trim() || '',
        companyEmail:   document.getElementById('company-email')?.value.trim() || '',
        companyPhone:   document.getElementById('company-phone')?.value.trim() || '',
    };
}

function updateLivePreview() {
    const previewContainer = document.getElementById('live-preview');
    if (!previewContainer) return;

    const data = getFormData();
    const theme = themes[data.theme] || themes.emerald;
    const currencySymbol = window.currencySymbols?.[data.currency] || '₦';

    const businessName    = data.companyName    || 'Your Company Name';
    const businessAddress = data.companyAddress || '';
    const businessEmail   = data.companyEmail   || '';
    const businessPhone   = data.companyPhone   || '';

    let subtotal = 0;
    data.items.forEach(item => { subtotal += item.quantity * item.unitPrice; });
    const taxAmount = subtotal * (data.taxRate / 100);
    const total = subtotal + taxAmount;

    if (data.items.length === 0) {
        previewContainer.innerHTML = `
            <div class="preview-loading">
                <div class="spinner"></div>
                <p>Add items to see invoice preview</p>
            </div>`;
        return;
    }

    const formatAmount = (amount) =>
        `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const invoiceDate   = data.invoiceDate ? formatDate(data.invoiceDate) : 'Not set';
    const dueDate       = data.dueDate     ? formatDate(data.dueDate)     : 'Not set';
    const invoiceNumber = `WZ-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const logoHtml = currentLogoUrl
        ? `<img src="${currentLogoUrl}" alt="Logo" style="max-height:55px;max-width:55px;object-fit:contain;">`
        : `<div style="width:50px;height:50px;background:#f0f0f0;border:1px solid #ddd;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:22px;">🧾</div>`;

    const signatureHtml = currentSignatureUrl
        ? `<img src="${currentSignatureUrl}" alt="Signature" style="max-height:50px;max-width:90px;object-fit:contain;display:block;margin-left:auto;">`
        : `<div style="font-size:13px;text-align:right;">_____________________</div>`;

    const MIN_ROWS = 6;
    let itemRowsHtml = data.items.map(item => {
        const amount = item.quantity * item.unitPrice;
        return `
            <tr>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;">${escapeHtml(item.description)}</td>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;"></td>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${item.quantity}</td>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${formatAmount(item.unitPrice)}</td>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${data.taxRate}%</td>
                <td style="padding:6px 5px;border-bottom:1px solid #eee;font-size:10px;text-align:right;">${formatAmount(amount)}</td>
            </tr>`;
    }).join('');

    const fillerCount = Math.max(0, MIN_ROWS - data.items.length);
    for (let i = 0; i < fillerCount; i++) {
        itemRowsHtml += `<tr>${'<td style="padding:6px 5px;border-bottom:1px solid #eee;">&nbsp;</td>'.repeat(6)}</tr>`;
    }

    const notesHtml = (data.notes && data.notes.trim() !== '')
        ? `<div style="font-size:10px;font-weight:700;margin-bottom:4px;">NOTES:</div>
           <div style="font-size:10px;color:#555;line-height:1.4;white-space:pre-wrap;">${escapeHtml(data.notes)}</div>`
        : `<div style="font-size:10px;font-weight:700;margin-bottom:4px;">NOTES:</div>
           <div style="font-size:10px;color:#aaa;">Thank you for your business!</div>`;

    previewContainer.innerHTML = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:white;height:100%;display:flex;flex-direction:column;">

            <!-- TOP COLOR BAR -->
            <div style="background:${theme.primary};height:8px;width:100%;flex-shrink:0;"></div>

            <!-- HEADER -->
            <div style="padding:14px 18px 10px 18px;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;">
                <div style="display:flex;flex-direction:column;gap:6px;">
                    ${logoHtml}
                    <div style="font-size:20px;font-weight:700;color:#111;margin-top:3px;">Invoice</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:12px;font-weight:700;margin-bottom:3px;">${escapeHtml(businessName)}</div>
                    <div style="font-size:9px;color:#555;line-height:1.6;">
                        ${businessAddress ? `${escapeHtml(businessAddress)}<br>` : ''}
                        ${businessEmail   ? `${escapeHtml(businessEmail)}<br>`   : ''}
                        ${businessPhone   ? `${escapeHtml(businessPhone)}`        : ''}
                    </div>
                </div>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:0 18px;flex-shrink:0;"></div>

            <!-- BILL TO | INVOICE META -->
            <div style="padding:10px 18px;display:flex;justify-content:space-between;align-items:flex-start;flex-shrink:0;">
                <div>
                    <div style="font-size:9px;font-weight:700;color:#555;margin-bottom:4px;letter-spacing:0.5px;">BILL TO:</div>
                    <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${escapeHtml(data.clientName)}</div>
                    ${data.clientEmail ? `<div style="font-size:9px;color:#555;">${escapeHtml(data.clientEmail)}</div>` : ''}
                    ${data.clientPhone ? `<div style="font-size:9px;color:#555;">${escapeHtml(data.clientPhone)}</div>` : ''}
                </div>
                <div style="text-align:right;">
                    <div style="font-size:9px;font-weight:700;color:#555;letter-spacing:0.5px;">INVOICE #</div>
                    <div style="font-size:9px;margin-bottom:4px;">${invoiceNumber}</div>
                    <div style="font-size:9px;font-weight:700;color:#555;letter-spacing:0.5px;">DATE</div>
                    <div style="font-size:9px;margin-bottom:4px;">${invoiceDate}</div>
                    <div style="font-size:9px;font-weight:700;color:#555;letter-spacing:0.5px;">INVOICE DUE DATE</div>
                    <div style="font-size:9px;">${dueDate}</div>
                </div>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:0 18px;flex-shrink:0;"></div>

            <!-- ITEMS TABLE -->
            <div style="padding:8px 18px 0 18px;flex-shrink:0;">
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f2f2f2;">
                            <th style="padding:6px 5px;text-align:left;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">ITEMS</th>
                            <th style="padding:6px 5px;text-align:left;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">DESC</th>
                            <th style="padding:6px 5px;text-align:right;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">QTY</th>
                            <th style="padding:6px 5px;text-align:right;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">PRICE</th>
                            <th style="padding:6px 5px;text-align:right;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">TAX</th>
                            <th style="padding:6px 5px;text-align:right;font-size:9px;font-weight:700;border-bottom:2px solid #ddd;">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>${itemRowsHtml}</tbody>
                </table>
            </div>

            <!-- DIVIDER -->
            <div style="border-top:1px solid #ddd;margin:8px 18px 0 18px;flex-shrink:0;"></div>

            <!-- NOTES | TOTAL -->
            <div style="padding:10px 18px;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-shrink:0;">
                <div style="flex:1;">${notesHtml}</div>
                <div style="text-align:right;min-width:110px;">
                    <div style="font-size:9px;font-weight:700;color:#555;margin-bottom:4px;">TOTAL</div>
                    <div style="font-size:18px;font-weight:700;color:#111;">${formatAmount(total)}</div>
                </div>
            </div>

            <!-- SIGNATURE -->
            <div style="padding:8px 18px 14px 18px;border-top:1px solid #eee;flex-shrink:0;">
                ${signatureHtml}
                <div style="font-size:8px;color:#999;text-align:right;margin-top:3px;">Authorized Signature</div>
            </div>

            <!-- FOOTER BAR -->
            <div style="background:#e8f4f8;padding:7px 18px;text-align:center;margin-top:auto;flex-shrink:0;">
                <div style="font-size:9px;font-weight:700;">Powered by 📄 Wize Invoice</div>
                <div style="font-size:8px;color:#666;margin-top:1px;">This invoice was generated with Wize Invoice • wizeinvoice.com</div>
            </div>

        </div>
    `;
}

// ✅ Updated: pre-fills company fields from profile
async function loadUserBranding() {
    try {
        const response = await api.getProfile();
        if (response.success && response.user) {
            const nameEl    = document.getElementById('company-name');
            const addressEl = document.getElementById('company-address');
            const emailEl   = document.getElementById('company-email');
            const phoneEl   = document.getElementById('company-phone');

            if (nameEl    && !nameEl.value)    nameEl.value    = response.user.businessName    || '';
            if (addressEl && !addressEl.value) addressEl.value = response.user.businessAddress || '';
            if (emailEl   && !emailEl.value)   emailEl.value   = response.user.email           || '';
            if (phoneEl   && !phoneEl.value)   phoneEl.value   = response.user.phone           || '';

            if (response.user.logoUrl) {
                currentLogoUrl = response.user.logoUrl;
                const container = document.getElementById('logo-preview-invoice');
                if (container) container.innerHTML = `<img src="${currentLogoUrl}" alt="Logo" style="max-width:100px;max-height:100px;object-fit:contain;">`;
                const removeBtn = document.getElementById('remove-logo-invoice-btn');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }

            if (response.user.signatureUrl) {
                currentSignatureUrl = response.user.signatureUrl;
                const container = document.getElementById('signature-preview-invoice');
                if (container) container.innerHTML = `<img src="${currentSignatureUrl}" alt="Signature" style="max-width:100px;max-height:100px;object-fit:contain;">`;
                const removeBtn = document.getElementById('remove-signature-invoice-btn');
                if (removeBtn) removeBtn.classList.remove('hidden');
            }

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
    if (!validTypes.includes(file.type)) { showAlert('Please upload JPG, PNG, or SVG file', 'error'); return; }
    if (file.size > 2 * 1024 * 1024) { showAlert('Logo must be less than 2MB', 'error'); return; }

    const formData = new FormData();
    formData.append('file', file);
    const token = getAuthToken();
    const backendUrl = 'https://wizeinvoice-001-site1.ntempurl.com/';

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
            if (container) container.innerHTML = `<img src="${currentLogoUrl}" alt="Logo" style="max-width:100px;max-height:100px;object-fit:contain;">`;
            document.getElementById('remove-logo-invoice-btn')?.classList.remove('hidden');
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
    if (!validTypes.includes(file.type)) { showAlert('Please upload JPG or PNG file', 'error'); return; }
    if (file.size > 1 * 1024 * 1024) { showAlert('Signature must be less than 1MB', 'error'); return; }

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
            if (container) container.innerHTML = `<img src="${currentSignatureUrl}" alt="Signature" style="max-width:100px;max-height:100px;object-fit:contain;">`;
            document.getElementById('remove-signature-invoice-btn')?.classList.remove('hidden');
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
            document.getElementById('remove-logo-invoice-btn')?.classList.add('hidden');
            showAlert('Logo removed', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to remove logo', 'error');
        }
    } catch (error) {
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
            document.getElementById('remove-signature-invoice-btn')?.classList.add('hidden');
            showAlert('Signature removed', 'success');
            updateLivePreview();
        } else {
            showAlert(result.message || 'Failed to remove signature', 'error');
        }
    } catch (error) {
        showAlert('Connection error', 'error');
    }
}

function setupBrandingEventListeners() {
    const uploadLogoBtn = document.getElementById('upload-logo-invoice-btn');
    const logoFile = document.getElementById('logo-file-invoice');
    if (uploadLogoBtn && logoFile) {
        uploadLogoBtn.addEventListener('click', () => logoFile.click());
        logoFile.addEventListener('change', (e) => {
            if (e.target.files?.[0]) { uploadLogoInvoice(e.target.files[0]); logoFile.value = ''; }
        });
    }

    const uploadSignatureBtn = document.getElementById('upload-signature-invoice-btn');
    const signatureFile = document.getElementById('signature-file-invoice');
    if (uploadSignatureBtn && signatureFile) {
        uploadSignatureBtn.addEventListener('click', () => signatureFile.click());
        signatureFile.addEventListener('change', (e) => {
            if (e.target.files?.[0]) { uploadSignatureInvoice(e.target.files[0]); signatureFile.value = ''; }
        });
    }

    document.getElementById('remove-logo-invoice-btn')?.addEventListener('click', removeLogoInvoice);
    document.getElementById('remove-signature-invoice-btn')?.addEventListener('click', removeSignatureInvoice);
}

async function createInvoice() {
    const data = getFormData();
    if (!data.clientName || data.clientName === 'Not specified') {
        showAlert('Please enter client name', 'error'); return;
    }
    if (data.items.length === 0) {
        showAlert('Please add at least one item', 'error'); return;
    }

    const generateBtn = document.getElementById('generate-btn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Generating...';

    try {
        const response = await api.createInvoice({
            clientName:     data.clientName,
            clientEmail:    data.clientEmail    || null,
            clientPhone:    data.clientPhone    || null,
            invoiceDate:    data.invoiceDate,
            dueDate:        data.dueDate        || null,
            items:          data.items,
            taxRate:        data.taxRate,
            theme:          data.theme,
            notes:          data.notes          || null,
            currency:       data.currency,
            companyName:    data.companyName    || null,
            companyAddress: data.companyAddress || null,
            companyEmail:   data.companyEmail   || null,
            companyPhone:   data.companyPhone   || null
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
            if (invoice.pdfUrl) window.open(invoice.pdfUrl, '_blank');
            else showAlert('PDF will be available shortly', 'info');
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

function resetForm() {
    document.getElementById('client-name').value    = '';
    document.getElementById('client-email').value   = '';
    document.getElementById('client-phone').value   = '';
    document.getElementById('notes').value          = '';
    document.getElementById('company-name').value   = '';
    document.getElementById('company-address').value = '';
    document.getElementById('company-email').value  = '';
    document.getElementById('company-phone').value  = '';
    document.getElementById('items-container').innerHTML = '';
    itemCounter = 0;
    addItemRow(true);
    setDefaultDates();
    calculateTotals();
    updateLivePreview();
}

function setupEventListeners() {
    const form = document.getElementById('invoice-form');
    if (form) form.addEventListener('submit', async (e) => { e.preventDefault(); await createInvoice(); });

    document.getElementById('add-item-btn')?.addEventListener('click', () => addItemRow(false));
    document.getElementById('clear-form')?.addEventListener('click', () => { if (confirm('Clear all?')) resetForm(); });
    document.getElementById('tax-rate')?.addEventListener('change', () => { calculateTotals(); updateLivePreview(); });

    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', () => { calculateTotals(); updateLivePreview(); });
    }

    [
        'client-name', 'client-email', 'client-phone',
        'invoice-date', 'due-date', 'notes',
        'company-name', 'company-address', 'company-email', 'company-phone'
    ].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => updateLivePreview());
    });

    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
}

// ✅ UPDATED: Live countdown timer
async function loadTrialInfo() {
    try {
        const response = await api.getTrialInfo();
        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;

            const subscribeLink = document.getElementById('subscribe-link');
            const mobileSubscribe = document.getElementById('mobile-subscribe');

            if (!trialInfo.isPaidUser) {
                subscribeLink?.classList.remove('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else {
                subscribeLink?.classList.add('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'none';
            }

            // No banner for paid users
            if (trialInfo.isPaidUser) return;

            renderCountdownBanner(trialInfo);
        }
    } catch (error) {
        console.error(error);
    }
}

// ✅ Countdown banner with live ticking timer
function renderCountdownBanner(trialInfo) {
    const banner = document.getElementById('trial-banner');
    if (!banner) return;

    const trialEndDate = new Date(trialInfo.trialEndDate);

    // Clear any existing interval
    if (countdownInterval) clearInterval(countdownInterval);

    function updateBanner() {
        const now  = new Date();
        const diff = trialEndDate - now;

        if (diff <= 0) {
            // ✅ Expired state
            banner.innerHTML = `
                <div class="trial-countdown-banner expired">
                    <div class="trial-banner-left">
                        <span class="trial-banner-icon">🔒</span>
                        <div class="trial-banner-text">
                            <strong>Your free trial has expired.</strong>
                            <div style="font-size:0.75rem;opacity:0.9;margin-top:2px;">Upgrade to continue creating invoices.</div>
                        </div>
                    </div>
                    <div class="trial-banner-right">
                        <a href="/subscribe.html" class="trial-upgrade-btn expired">Upgrade Now</a>
                    </div>
                </div>`;
            banner.classList.remove('hidden');
            if (countdownInterval) clearInterval(countdownInterval);
            return;
        }

        const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const isUrgent  = days < 3;
        const icon      = isUrgent ? '⚠️' : '⏳';
        const urgentCls = isUrgent ? 'urgent' : '';
        const message   = isUrgent
            ? `Only <strong>${days}d ${hours}h</strong> left on your free trial!`
            : `<strong>${days} days</strong> remaining on your free trial`;

        banner.innerHTML = `
            <div class="trial-countdown-banner ${urgentCls}">
                <div class="trial-banner-left">
                    <span class="trial-banner-icon">${icon}</span>
                    <div class="trial-banner-text">
                        <div style="font-size:0.82rem;">${message}</div>
                        <div class="trial-timer">
                            <div class="timer-block">
                                <span class="timer-value">${String(days).padStart(2,'0')}</span>
                                <span class="timer-label">Days</span>
                            </div>
                            <span class="timer-separator">:</span>
                            <div class="timer-block">
                                <span class="timer-value">${String(hours).padStart(2,'0')}</span>
                                <span class="timer-label">Hrs</span>
                            </div>
                            <span class="timer-separator">:</span>
                            <div class="timer-block">
                                <span class="timer-value">${String(minutes).padStart(2,'0')}</span>
                                <span class="timer-label">Min</span>
                            </div>
                            <span class="timer-separator">:</span>
                            <div class="timer-block">
                                <span class="timer-value">${String(seconds).padStart(2,'0')}</span>
                                <span class="timer-label">Sec</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="trial-banner-right">
                    <a href="/subscribe.html" class="trial-upgrade-btn">Upgrade to Pro ✨</a>
                </div>
            </div>`;
        banner.classList.remove('hidden');
    }

    updateBanner();
    countdownInterval = setInterval(updateBanner, 1000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}