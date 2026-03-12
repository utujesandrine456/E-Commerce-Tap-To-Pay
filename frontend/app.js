// ==================== MAIN APP ORCHESTRATOR ====================

function initializeApp() {
  // Hide login, show app
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-container').style.display = 'flex';

  // Set user info in sidebar
  document.getElementById('user-fullname').textContent = currentUser.fullName;
  document.getElementById('user-avatar').textContent = currentUser.fullName.charAt(0).toUpperCase();
  const roleBadge = document.getElementById('user-role-badge');
  roleBadge.textContent = currentUser.role;
  roleBadge.className = `user-role-badge ${currentUser.role === 'agent' ? 'agent-badge' : 'sales-badge'}`;
  document.getElementById('sidebar-role').textContent = currentUser.role === 'agent' ? 'Agent Dashboard' : 'Sales Dashboard';

  // Set scanner ID selection
  const scannerSelect = document.getElementById('terminal-id-selector');
  if (scannerSelect) scannerSelect.value = scannerId;

  // Render appropriate dashboard
  if (currentUser.role === 'agent') {
    renderAgentDashboard();
  } else {
    renderSalespersonDashboard();
  }

  // Setup socket listeners
  setupSocketListeners();
}

function setupSocketListeners() {
  const indicator = document.getElementById('connection-indicator');

  socket.on('connect', () => {
    console.log('Connected to backend');
    if (indicator) indicator.classList.add('connected');
    if (!currentUser) return;
    if (currentUser.role === 'agent') {
      loadAgentData();
      updateSysStatus('online');
    } else {
      loadSalesProducts();
    }
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from backend');
    if (indicator) indicator.classList.remove('connected');
    if (currentUser.role === 'agent') updateSysStatus('offline');
  });

  // Card scanned
  socket.on('card-status', async (data) => {
    if (data.deviceId && data.deviceId !== scannerId) return;
    cardPresent = data.present !== false;
    lookupCard(data.uid);
  });

  // Card balance update
  socket.on('card-balance', (data) => {
    if (data.deviceId && data.deviceId !== scannerId) return;
    if (data.uid !== lastScannedUid) return;
    if (currentCardData) currentCardData.balance = data.new_balance;
    const bal = `Frw ${data.new_balance.toLocaleString()}`;
    ['topup-card-balance', 'sales-card-balance', 'checkout-card-balance'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = bal;
    });
  });

  // Payment success
  socket.on('payment-success', (data) => {
    if (data.uid === lastScannedUid && currentCardData) {
      currentCardData.balance = data.balanceAfter;
      const bal = `Frw ${data.balanceAfter.toLocaleString()}`;
      ['topup-card-balance', 'sales-card-balance', 'checkout-card-balance'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = bal;
      });
    }
    if (currentUser.role === 'agent') { loadAgentStats(); loadAllTransactions(); }
    else if (typeof loadSalesHistory === 'function') loadSalesHistory();
  });

  // Card removed
  socket.on('card-removed', (data) => {
    if (data.deviceId && data.deviceId !== scannerId) return;
    if (data.uid !== lastScannedUid) return;
    cardPresent = false;
    const remaining = getRemainingGraceTime();
    if (remaining > 0) {
      if (gracePeriodTimer) clearInterval(gracePeriodTimer);
      gracePeriodTimer = setInterval(() => {
        const r = getRemainingGraceTime();
        if (r <= 0) {
          clearInterval(gracePeriodTimer);
          gracePeriodTimer = null;
        }
        if (typeof updateCheckoutPayBtn === 'function') updateCheckoutPayBtn();
      }, 1000);
    }
    if (typeof updateCheckoutPayBtn === 'function') updateCheckoutPayBtn();
  });
}

async function lookupCard(uid) {
  if (!uid) return;
  lastScannedUid = uid;
  cardScanTime = Date.now();
  if (gracePeriodTimer) { clearInterval(gracePeriodTimer); gracePeriodTimer = null; }

  try {
    const res = await fetch(`${BACKEND_URL}/card/${uid}`);

    if (currentUser.role === 'agent') {
      const topupUid = document.getElementById('topup-uid');
      const topupBtn = document.getElementById('topup-btn');
      const topupVisual = document.getElementById('topup-card-visual');
      const topupHolder = document.getElementById('topup-card-holder');
      const topupBalance = document.getElementById('topup-card-balance');
      const regUid = document.getElementById('reg-uid');
      const regBtn = document.getElementById('reg-btn');
      const regVisual = document.getElementById('reg-card-visual');
      const regHolder = document.getElementById('reg-card-holder');
      const regBalance = document.getElementById('reg-card-balance');

      if (res.ok) {
        currentCardData = await res.json();
        isNewCard = false;
        if (topupUid) topupUid.value = uid;
        if (topupBtn) topupBtn.disabled = false;
        if (topupVisual) topupVisual.classList.add('active');
        if (topupHolder) topupHolder.textContent = currentCardData.holderName;
        if (topupBalance) topupBalance.textContent = `Frw ${currentCardData.balance.toLocaleString()}`;

        const statusEl = document.getElementById('topup-status-display');
        if (statusEl) statusEl.innerHTML = `
            <div class="data-row"><span class="data-label">UID</span><span class="data-value">${currentCardData.uid}</span></div>
            <div class="data-row"><span class="data-label">Holder</span><span class="data-value">${currentCardData.holderName}</span></div>
            <div class="data-row"><span class="data-label">Balance</span><span class="data-value" style="color:var(--primary)">Frw ${currentCardData.balance.toLocaleString()}</span></div>
            <div class="data-row"><span class="data-label">Status</span><span class="data-value" style="color:var(--success)">Active</span></div>
          `;

        if (regUid) regUid.value = uid;
        const regStatus = document.getElementById('reg-status');
        if (regStatus) regStatus.innerHTML = '<div class="status-placeholder" style="color:var(--warning)">⚠️ This card is already registered. Use Top Up section instead.</div>';
        if (regBtn) regBtn.disabled = true;
      } else {
        currentCardData = null;
        isNewCard = true;
        if (topupUid) topupUid.value = uid;
        if (topupBtn) topupBtn.disabled = true;
        if (topupVisual) topupVisual.classList.add('active');
        if (topupHolder) topupHolder.textContent = uid;
        if (topupBalance) topupBalance.textContent = 'Frw 0';

        const statusEl = document.getElementById('topup-status-display');
        if (statusEl) statusEl.innerHTML = '<div class="status-placeholder" style="color:var(--warning)">⚠️ Unregistered card. Register it first.</div>';

        if (regUid) regUid.value = uid;
        if (regBtn) regBtn.disabled = false;
        if (regVisual) regVisual.classList.add('active');
        if (regHolder) regHolder.textContent = 'NEW CARD';
        if (regBalance) regBalance.textContent = 'Frw 0';
        const regStatus = document.getElementById('reg-status');
        if (regStatus) regStatus.innerHTML = `
            <div class="data-row"><span class="data-label">UID</span><span class="data-value">${uid}</span></div>
            <div class="data-row"><span class="data-label">Status</span><span class="data-value" style="color:var(--warning)">New - Ready to Register</span></div>
          `;
      }
    } else {
      const salesVisual = document.getElementById('sales-card-visual');
      const salesHolder = document.getElementById('sales-card-holder');
      const salesBalance = document.getElementById('sales-card-balance');

      if (res.ok) {
        currentCardData = await res.json();
        isNewCard = false;
        if (salesVisual) salesVisual.classList.add('active');
        if (salesHolder) salesHolder.textContent = currentCardData.holderName;
        if (salesBalance) salesBalance.textContent = `Frw ${currentCardData.balance.toLocaleString()}`;
        if (typeof updateSalesCardInfo === 'function') updateSalesCardInfo(currentCardData);

        const checkoutBal = document.getElementById('checkout-card-balance');
        if (checkoutBal) checkoutBal.textContent = `Frw ${currentCardData.balance.toLocaleString()}`;
        const checkoutStatus = document.getElementById('checkout-card-status');
        if (checkoutStatus) checkoutStatus.innerHTML = `
            <div class="data-row"><span class="data-label">Card</span><span class="data-value">${currentCardData.holderName}</span></div>
            <div class="data-row"><span class="data-label">Balance</span><span class="data-value" style="color:var(--primary)">Frw ${currentCardData.balance.toLocaleString()}</span></div>
          `;
        if (typeof updateCheckoutPayBtn === 'function') updateCheckoutPayBtn();
        if (typeof loadSalesHistory === 'function') loadSalesHistory();
      } else {
        currentCardData = null;
        isNewCard = true;
        if (salesVisual) salesVisual.classList.add('active');
        if (salesHolder) salesHolder.textContent = uid;
        if (salesBalance) salesBalance.textContent = 'Frw 0';
        if (typeof updateSalesCardInfo === 'function') updateSalesCardInfo(null);
      }
    }
  } catch (err) {
    console.error('Card fetch error:', err);
  }
}
