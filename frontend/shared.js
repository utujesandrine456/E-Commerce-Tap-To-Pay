// ==================== SHARED UTILITIES ====================
const socket = io(BACKEND_URL);
let lastScannedUid = null;
let currentCardData = null;
let cardPresent = false;
let cardScanTime = 0;
let isNewCard = false;
let cart = [];
let allProducts = [];
let selectedCategory = 'all';
let currentTransaction = null;
const GRACE_PERIOD = 15000;
let gracePeriodTimer = null;

// Toast notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100px)'; setTimeout(() => toast.remove(), 300); }, 4000);
}

function isPaymentAllowed() {
    if (cardPresent) return true;
    if (!cardScanTime) return false;
    return (Date.now() - cardScanTime) < GRACE_PERIOD;
}

function getRemainingGraceTime() {
    if (!cardScanTime) return 0;
    const remaining = GRACE_PERIOD - (Date.now() - cardScanTime);
    return Math.max(0, Math.ceil(remaining / 1000));
}

// ==================== PASSCODE MODAL ====================
let passcodeCallback = null;

function showPasscodeModal(mode = 'verify', message = null) {
    const modal = document.getElementById('passcode-modal');
    const title = document.getElementById('passcode-modal-title');
    const msg = document.getElementById('passcode-modal-message');
    const digits = document.querySelectorAll('#passcode-modal .passcode-digit');

    title.textContent = mode === 'set' ? 'Set Passcode' : 'Enter Passcode';
    msg.textContent = message || (mode === 'set' ? 'Create a 6-digit passcode' : 'Enter your 6-digit passcode');
    digits.forEach(d => d.value = '');
    document.getElementById('passcode-error').style.display = 'none';
    modal.style.display = 'flex';
    setTimeout(() => digits[0].focus(), 100);

    return new Promise((resolve, reject) => { passcodeCallback = { resolve, reject }; });
}

function hidePasscodeModal() {
    document.getElementById('passcode-modal').style.display = 'none';
}

function getPasscodeValue() {
    return Array.from(document.querySelectorAll('#passcode-modal .passcode-digit')).map(i => i.value).join('');
}

function showPasscodeError(msg) {
    const el = document.getElementById('passcode-error');
    el.textContent = msg; el.style.display = 'block';
    document.querySelectorAll('#passcode-modal .passcode-digit').forEach(i => {
        i.style.animation = 'shake 0.5s'; setTimeout(() => i.style.animation = '', 500);
    });
}

// Setup passcode digit inputs
function setupPasscodeDigits(selector) {
    const digits = document.querySelectorAll(selector);
    digits.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (!/^\d$/.test(e.target.value)) { e.target.value = ''; return; }
            if (e.target.value && index < digits.length - 1) digits[index + 1].focus();
            if (index === digits.length - 1 && Array.from(digits).every(d => d.value.length === 1)) {
                setTimeout(() => {
                    const confirmBtn = document.getElementById('passcode-confirm-btn');
                    if (confirmBtn) confirmBtn.click();
                }, 200);
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) digits[index - 1].focus();
        });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            d.split('').forEach((c, i) => { if (digits[i]) digits[i].value = c; });
        });
    });
}

// Init passcode modal buttons
document.addEventListener('DOMContentLoaded', () => {
    setupPasscodeDigits('#passcode-modal .passcode-digit');

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            menuToggle.textContent = sidebar.classList.contains('open') ? '✕' : '☰';
        });
    }

    // Close sidebar when clicking a nav item on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && sidebar && sidebar.classList.contains('open')) {
            if (e.target.closest('.nav-item') || (!e.target.closest('.sidebar') && !e.target.closest('.menu-toggle'))) {
                sidebar.classList.remove('open');
                if (menuToggle) menuToggle.textContent = '☰';
            }
        }
    });

    document.getElementById('passcode-confirm-btn').addEventListener('click', () => {
        const p = getPasscodeValue();
        if (p.length !== 6) { showPasscodeError('Please enter all 6 digits'); return; }
        if (passcodeCallback) { passcodeCallback.resolve(p); passcodeCallback = null; }
        hidePasscodeModal();
    });

    document.getElementById('passcode-cancel-btn').addEventListener('click', () => {
        if (passcodeCallback) { passcodeCallback.reject(new Error('Cancelled')); passcodeCallback = null; }
        hidePasscodeModal();
    });

    document.getElementById('passcode-modal-close').addEventListener('click', () => {
        document.getElementById('passcode-cancel-btn').click();
    });
});

// ==================== RECEIPT ====================
function showReceipt(transaction) {
    currentTransaction = transaction;
    const modal = document.getElementById('receipt-modal');
    const content = document.getElementById('receipt-content');
    const date = new Date(transaction.timestamp);

    let itemsHtml = '';
    if (transaction.items && transaction.items.length > 0) {
        itemsHtml = `
        <div class="receipt-divider"></div>
        <div class="receipt-section">
            <h4 class="receipt-section-title">ITEMS PURCHASED</h4>
            <div class="receipt-items-list">
                ${transaction.items.map(item => {
            const qty = item.qty || item.quantity || 1;
            const itemTotal = item.price * qty;
            return `
                    <div class="receipt-item-line">
                        <div class="item-name-qty">
                            <span class="item-name">${item.name}</span>
                            <span class="item-qty">x${qty}</span>
                        </div>
                        <span class="item-price">$${itemTotal.toFixed(2)}</span>
                    </div>`;
        }).join('')}
            </div>
        </div>`;
    }

    content.innerHTML = `
    <div class="receipt-paper">
      <div class="receipt-paid-badge">PAID</div>
      
      <div class="receipt-header">
        <div class="receipt-logo">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
                <rect width="40" height="40" rx="12" fill="#1a1a2e" />
                <path d="M12 16H28M12 22H22M16 28H28" stroke="white" stroke-width="2.5" stroke-linecap="round" />
                <circle cx="28" cy="28" r="6" fill="#10b981" stroke="white" stroke-width="2" />
            </svg>
        </div>
        <h2 class="receipt-brand">TAP & PAY</h2>
        <p class="receipt-tagline">Secure RFID Cashless Payment</p>
        <div class="receipt-id-tag">#${transaction.receiptId || 'TRANS-ID'}</div>
      </div>

      <div class="receipt-divider"></div>

      <div class="receipt-details">
        <div class="receipt-row"><span>DATE</span><span>${date.toLocaleDateString()}</span></div>
        <div class="receipt-row"><span>TIME</span><span>${date.toLocaleTimeString()}</span></div>
        <div class="receipt-row"><span>HOLDER</span><span>${transaction.holderName || 'N/A'}</span></div>
        <div class="receipt-row"><span>CARD UID</span><span class="receipt-mono">${transaction.uid || 'N/A'}</span></div>
      </div>

      ${itemsHtml}

      <div class="receipt-divider"></div>

      <div class="receipt-total-section">
        <div class="receipt-total-row">
            <span>TOTAL AMOUNT</span>
            <span class="total-value">$${transaction.amount.toFixed(2)}</span>
        </div>
        <div class="receipt-balance-info">
            <div class="balance-row"><span>Previous Balance</span><span>$${transaction.balanceBefore.toFixed(2)}</span></div>
            <div class="balance-row"><span>Remaining Balance</span><span class="new-balance">$${transaction.balanceAfter.toFixed(2)}</span></div>
        </div>
      </div>

      <div class="receipt-footer">
        <div class="receipt-barcode">|| ||| || ||| || || |||</div>
        <p>Thank you for your purchase!</p>
        <p class="team-credit">Powered by Team RDF • Verified Secure</p>
        <div class="receipt-timestamp-small">Printed at ${new Date().toLocaleString()}</div>
      </div>
    </div>`;
    modal.style.display = 'flex';
}


function closeReceiptModal() { document.getElementById('receipt-modal').style.display = 'none'; }

function printReceipt() {
    if (!currentTransaction) {
        showToast('No transaction data available', 'error');
        return;
    }

    // Set document title for print filename
    const originalTitle = document.title;
    const date = new Date(currentTransaction.timestamp);
    const dateStr = date.getFullYear() + '-' + (date.getMonth() + 1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0');
    const holderName = (currentTransaction.holderName || 'Customer').trim().replace(/\s+/g, '_');
    const receiptId = currentTransaction.receiptId || 'TRANS';

    // Format: Receipt_John_Doe_2026-03-04_RCP12345
    const printTitle = `Receipt_${holderName}_${dateStr}_${receiptId}`;
    document.title = printTitle;

    // Some browsers need a slight delay to update the title in the print dialog
    // We also hide the UI elements more aggressively via classes if needed
    window.focus();

    setTimeout(() => {
        window.print();
        // Restore title after a longer delay to ensure the dialog is gone
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    }, 100);
}

// ==================== EDIT CARD MODAL ====================
let editingCardUid = null;

function openEditCardModal(card) {
    editingCardUid = card.uid;
    document.getElementById('edit-card-uid').value = card.uid;
    document.getElementById('edit-card-name').value = card.holderName;
    document.getElementById('edit-card-email').value = card.email || '';
    document.getElementById('edit-card-phone').value = card.phone || '';
    document.getElementById('edit-card-balance').value = card.balance;
    document.getElementById('edit-card-status').value = card.status || 'active';
    document.getElementById('edit-card-modal').style.display = 'flex';
}

function closeEditCardModal() { document.getElementById('edit-card-modal').style.display = 'none'; editingCardUid = null; }

async function saveCardChanges() {
    if (!editingCardUid) return;
    const btn = document.getElementById('save-card-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
        const res = await fetch(`${BACKEND_URL}/card/${editingCardUid}`, {
            method: 'PUT', headers: getAuthHeaders(),
            body: JSON.stringify({
                holderName: document.getElementById('edit-card-name').value,
                email: document.getElementById('edit-card-email').value,
                phone: document.getElementById('edit-card-phone').value,
                balance: parseFloat(document.getElementById('edit-card-balance').value),
                status: document.getElementById('edit-card-status').value
            })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Card updated successfully', 'success');
            closeEditCardModal();
            if (typeof loadAgentData === 'function') loadAgentData();
        } else {
            showToast(data.error || 'Failed to update', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Changes';
    }
}

// ==================== TRANSACTION LIST RENDERING ====================
function renderTxList(containerId, txs) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!txs.length) { el.innerHTML = '<p class="empty-history">No transactions yet</p>'; return; }
    el.innerHTML = txs.map(tx => {
        const d = new Date(tx.timestamp);
        const cls = tx.type === 'topup' ? 'topup' : 'debit';
        const icon = tx.type === 'topup' ? '↑' : '↓';
        const sign = tx.type === 'topup' ? '+' : '-';
        const color = tx.type === 'topup' ? 'positive' : 'negative';

        // Build description with items if available
        let description = tx.description || tx.type;
        if (tx.items && tx.items.length > 0) {
            const itemsList = tx.items.map(item => `${item.name} (${item.qty || item.quantity || 1}x)`).join(', ');
            description = `${tx.holderName} - ${itemsList}`;
        } else {
            description = `${tx.holderName} - ${description}`;
        }

        return `<div class="transaction-item ${cls}"><div class="transaction-icon">${icon}</div><div class="transaction-details"><div class="transaction-desc">${description}</div><div class="transaction-time">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</div></div><div class="transaction-amount"><div class="amount-value ${color}">${sign}$${tx.amount.toFixed(2)}</div><div class="balance-after">Bal: $${tx.balanceAfter.toFixed(2)}</div></div></div>`;
    }).join('');
}

// ==================== EMAIL RECEIPT ====================
async function emailReceipt(transaction) {
    if (!transaction.uid) {
        showToast('Cannot send receipt: No card information', 'error');
        return;
    }

    try {
        // Get card details to get email
        const cardRes = await fetch(`${BACKEND_URL}/card/${transaction.uid}`);
        const card = await cardRes.json();

        if (!card.email) {
            showToast('Cannot send receipt: No email address on file', 'error');
            return;
        }

        const res = await fetch(`${BACKEND_URL}/send-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: card.email,
                transaction: transaction
            })
        });

        const data = await res.json();
        if (data.success) {
            showToast(`Receipt sent to ${card.email}`, 'success');
        } else {
            showToast(data.error || 'Failed to send receipt', 'error');
        }
    } catch (err) {
        console.error('Email receipt error:', err);
        showToast('Failed to send receipt', 'error');
    }
}
