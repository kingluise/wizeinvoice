// ========================================
// WIZE INVOICE - SETTINGS
// ========================================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    if (!requireAuth()) return;
    
    currentUser = getCurrentUser();
    
    // Load user data
    await loadUserProfile();
    await loadAccountInfo();
    await loadTrialInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update user name in navbar
    const userNameSpan = document.getElementById('user-name');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.fullName || currentUser.email;
    }
});

async function loadUserProfile() {
    try {
        const response = await api.getProfile();
        
        if (response.success && response.user) {
            const user = response.user;
            
            // Fill profile form
            const fullnameInput = document.getElementById('fullname');
            const emailInput = document.getElementById('profile-email');
            const phoneInput = document.getElementById('phone');
            const businessNameInput = document.getElementById('business-name');
            const businessAddressInput = document.getElementById('business-address');
            
            if (fullnameInput) fullnameInput.value = user.fullName || '';
            if (emailInput) emailInput.value = user.email || '';
            if (phoneInput) phoneInput.value = user.phone || '';
            if (businessNameInput) businessNameInput.value = user.businessName || '';
            if (businessAddressInput) businessAddressInput.value = user.businessAddress || '';
            
            // Load logo and signature previews
            if (user.logoUrl) {
                displayLogoPreview(user.logoUrl);
                document.getElementById('remove-logo-btn')?.classList.remove('hidden');
            }
            
            if (user.signatureUrl) {
                displaySignaturePreview(user.signatureUrl);
                document.getElementById('remove-signature-btn')?.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error('Failed to load user profile:', error);
        showAlert('Failed to load profile data', 'error');
    }
}

async function loadAccountInfo() {
    try {
        const response = await api.getInvoices();
        
        if (response.success && response.invoices) {
            const totalInvoicesSpan = document.getElementById('total-invoices');
            if (totalInvoicesSpan) {
                totalInvoicesSpan.textContent = response.invoices.length;
            }
        }
    } catch (error) {
        console.error('Failed to load account info:', error);
    }
}

async function loadTrialInfo() {
    try {
        const response = await api.getTrialInfo();
        
        if (response.success && response.trialInfo) {
            const trialInfo = response.trialInfo;
            
            const accountStatusSpan = document.getElementById('account-status');
            const trialEndDateSpan = document.getElementById('trial-end-date');
            const daysRemainingSpan = document.getElementById('days-remaining');
            const upgradeBtn = document.getElementById('upgrade-btn');
            const subscribeLink = document.getElementById('subscribe-link');
            const mobileSubscribe = document.getElementById('mobile-subscribe');
            
            if (trialInfo.isPaidUser) {
                if (accountStatusSpan) {
                    accountStatusSpan.textContent = 'Premium Active';
                    accountStatusSpan.style.color = 'var(--success)';
                }
                if (upgradeBtn) upgradeBtn.style.display = 'none';
                if (subscribeLink) subscribeLink.classList.add('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'none';
            } else if (trialInfo.isTrialActive) {
                if (accountStatusSpan) {
                    accountStatusSpan.textContent = 'Free Trial';
                    accountStatusSpan.style.color = 'var(--primary)';
                }
                if (upgradeBtn) upgradeBtn.style.display = 'block';
                if (subscribeLink) subscribeLink.classList.remove('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            } else {
                if (accountStatusSpan) {
                    accountStatusSpan.textContent = 'Trial Expired';
                    accountStatusSpan.style.color = 'var(--error)';
                }
                if (upgradeBtn) upgradeBtn.style.display = 'block';
                if (subscribeLink) subscribeLink.classList.remove('hidden');
                if (mobileSubscribe) mobileSubscribe.style.display = 'flex';
            }
            
            if (trialEndDateSpan) {
                trialEndDateSpan.textContent = formatDate(trialInfo.trialEndDate, 'long');
            }
            
            if (daysRemainingSpan) {
                if (trialInfo.isPaidUser) {
                    daysRemainingSpan.textContent = 'Unlimited';
                } else {
                    daysRemainingSpan.textContent = `${trialInfo.daysRemaining} days`;
                    if (trialInfo.daysRemaining <= 3) {
                        daysRemainingSpan.style.color = 'var(--warning)';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to load trial info:', error);
    }
}

function displayLogoPreview(url) {
    const previewContainer = document.getElementById('logo-preview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = `<img src="${url}" alt="Company Logo">`;
}

function displaySignaturePreview(url) {
    const previewContainer = document.getElementById('signature-preview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = `<img src="${url}" alt="Signature">`;
}

async function updateProfile(data) {
    try {
        const response = await api.updateProfile(data);
        
        if (response.success) {
            showAlert('Profile updated successfully', 'success');
            // Update local user data
            if (currentUser) {
                currentUser.fullName = data.fullName;
                setAuthData(localStorage.getItem('wize_token'), currentUser);
            }
        } else {
            showAlert(response.message || 'Failed to update profile', 'error');
        }
    } catch (error) {
        showAlert('Connection error. Please try again.', 'error');
    }
}

async function uploadLogo(file) {
    try {
        const response = await api.uploadLogo(file);
        
        if (response.success && response.logoUrl) {
            displayLogoPreview(response.logoUrl);
            document.getElementById('remove-logo-btn')?.classList.remove('hidden');
            showAlert('Logo uploaded successfully', 'success');
        } else {
            showAlert(response.message || 'Failed to upload logo', 'error');
        }
    } catch (error) {
        showAlert('Failed to upload logo. Please try again.', 'error');
    }
}

async function uploadSignature(file) {
    try {
        const response = await api.uploadSignature(file);
        
        if (response.success && response.signatureUrl) {
            displaySignaturePreview(response.signatureUrl);
            document.getElementById('remove-signature-btn')?.classList.remove('hidden');
            showAlert('Signature uploaded successfully', 'success');
        } else {
            showAlert(response.message || 'Failed to upload signature', 'error');
        }
    } catch (error) {
        showAlert('Failed to upload signature. Please try again.', 'error');
    }
}

async function removeLogo() {
    try {
        const response = await api.removeLogo();
        
        if (response.success) {
            const previewContainer = document.getElementById('logo-preview');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-placeholder">
                        <span>📄</span>
                        <p>No logo uploaded</p>
                    </div>
                `;
            }
            document.getElementById('remove-logo-btn')?.classList.add('hidden');
            showAlert('Logo removed successfully', 'success');
        } else {
            showAlert(response.message || 'Failed to remove logo', 'error');
        }
    } catch (error) {
        showAlert('Failed to remove logo', 'error');
    }
}

async function removeSignature() {
    try {
        const response = await api.removeSignature();
        
        if (response.success) {
            const previewContainer = document.getElementById('signature-preview');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-placeholder">
                        <span>✍️</span>
                        <p>No signature uploaded</p>
                    </div>
                `;
            }
            document.getElementById('remove-signature-btn')?.classList.add('hidden');
            showAlert('Signature removed successfully', 'success');
        } else {
            showAlert(response.message || 'Failed to remove signature', 'error');
        }
    } catch (error) {
        showAlert('Failed to remove signature', 'error');
    }
}

function setupEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullname = document.getElementById('fullname')?.value;
            const phone = document.getElementById('phone')?.value;
            await updateProfile({ fullName: fullname, phone: phone });
        });
    }
    
    // Business form
    const businessForm = document.getElementById('business-form');
    if (businessForm) {
        businessForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const businessName = document.getElementById('business-name')?.value;
            const businessAddress = document.getElementById('business-address')?.value;
            await updateProfile({ businessName: businessName, businessAddress: businessAddress });
        });
    }
    
    // Password form
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password')?.value;
            const newPassword = document.getElementById('new-password')?.value;
            const confirmPassword = document.getElementById('confirm-password')?.value;
            
            try {
                await changePassword(currentPassword, newPassword, confirmPassword);
                showAlert('Password changed successfully', 'success');
                passwordForm.reset();
            } catch (error) {
                showAlert(error.message, 'error');
            }
        });
    }
    
    // Logo upload
    const uploadLogoBtn = document.getElementById('upload-logo-btn');
    const logoFile = document.getElementById('logo-file');
    const logoUploadArea = document.getElementById('logo-upload-area');
    
    if (uploadLogoBtn && logoFile) {
        uploadLogoBtn.addEventListener('click', () => logoFile.click());
        logoFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                uploadLogo(e.target.files[0]);
            }
        });
    }
    
    if (logoUploadArea) {
        logoUploadArea.addEventListener('click', () => logoFile?.click());
        logoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            logoUploadArea.style.borderColor = 'var(--primary)';
        });
        logoUploadArea.addEventListener('dragleave', () => {
            logoUploadArea.style.borderColor = 'var(--border)';
        });
        logoUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            logoUploadArea.style.borderColor = 'var(--border)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.match('image.*')) {
                uploadLogo(file);
            }
        });
    }
    
    // Signature upload
    const uploadSignatureBtn = document.getElementById('upload-signature-btn');
    const signatureFile = document.getElementById('signature-file');
    const signatureUploadArea = document.getElementById('signature-upload-area');
    
    if (uploadSignatureBtn && signatureFile) {
        uploadSignatureBtn.addEventListener('click', () => signatureFile.click());
        signatureFile.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                uploadSignature(e.target.files[0]);
            }
        });
    }
    
    if (signatureUploadArea) {
        signatureUploadArea.addEventListener('click', () => signatureFile?.click());
        signatureUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            signatureUploadArea.style.borderColor = 'var(--primary)';
        });
        signatureUploadArea.addEventListener('dragleave', () => {
            signatureUploadArea.style.borderColor = 'var(--border)';
        });
        signatureUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            signatureUploadArea.style.borderColor = 'var(--border)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.match('image.*')) {
                uploadSignature(file);
            }
        });
    }
    
    // Remove buttons
    const removeLogoBtn = document.getElementById('remove-logo-btn');
    const removeSignatureBtn = document.getElementById('remove-signature-btn');
    
    if (removeLogoBtn) {
        removeLogoBtn.addEventListener('click', removeLogo);
    }
    
    if (removeSignatureBtn) {
        removeSignatureBtn.addEventListener('click', removeSignature);
    }
    
    // Upgrade button
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/subscribe.html';
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}