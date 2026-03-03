// ==================== AGENT DASHBOARD ====================

function renderAgentDashboard() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = `
    <a href="#" class="nav-item active" data-section="agent-cards"><span class="nav-icon">💳</span><span>Card Holders</span></a>
    <a href="#" class="nav-item" data-section="agent-topup"><span class="nav-icon">💰</span><span>Top Up</span></a>
    <a href="#" class="nav-item" data-section="agent-register"><span class="nav-icon">📝</span><span>Register Card</span></a>
    <a href="#" class="nav-item" data-section="agent-history"><span class="nav-icon">📊</span><span>Transactions</span></a>
    <a href="#" class="nav-item" data-section="agent-users"><span class="nav-icon">👥</span><span>Users</span></a>
    <a href="#" class="nav-item" data-section="agent-settings"><span class="nav-icon">⚙️</span><span>Settings</span></a>
  `;

    const main = document.getElementById('main-content');
    main.innerHTML = `
    <!-- Card Holders Section -->
    <div id="section-agent-cards" class="page-section active-section">
      <div class="section-header"><h2 class="section-title">💳 Card Holders</h2><p class="section-subtitle">Manage all registered RFID cards and their holders</p></div>
      
      <!-- Stats - Only shown in Card Holders section -->
      <div class="stats-grid" id="agent-stats">
        <div class="stat-card"><div class="stat-icon-box purple">💳</div><div><div class="stat-label">Total Cards</div><div class="stat-value" id="s-total-cards">0</div></div></div>
        <div class="stat-card"><div class="stat-icon-box green">📈</div><div><div class="stat-label">Today's Transactions</div><div class="stat-value" id="s-today-tx">0</div></div></div>
        <div class="stat-card"><div class="stat-icon-box amber">💰</div><div><div class="stat-label">Top-Up Volume</div><div class="stat-value" id="s-topup-vol">$0.00</div></div></div>
        <div class="stat-card"><div class="stat-icon-box red">🛍️</div><div><div class="stat-label">Purchase Volume</div><div class="stat-value" id="s-purchase-vol">$0.00</div></div></div>
      </div>
      
      <div class="glass-card">
        <div class="search-bar"><span class="search-icon">🔍</span><input type="text" id="card-search" placeholder="Search by name, UID, or email..."></div>
        <div class="data-table-container"><table class="data-table" id="cards-table">
          <thead><tr><th>UID</th><th>Holder Name</th><th>Balance</th><th>Status</th><th>Last Updated</th><th>Actions</th></tr></thead>
          <tbody id="cards-tbody"><tr><td colspan="6" class="no-data">Loading cards...</td></tr></tbody>
        </table></div>
      </div>
    </div>

    <!-- Top Up Section -->
    <div id="section-agent-topup" class="page-section">
      <div class="section-header"><h2 class="section-title">💰 Top Up Card</h2><p class="section-subtitle">Add funds to any registered RFID card</p></div>
      <div class="content-grid">
        <div class="glass-card">
          <h3>🏦 Card Visual</h3>
          <div class="card-visual-wrap">
            <div id="topup-card-visual" class="card-visual">
              <div class="card-chip"></div>
              <div class="card-number">**** **** **** ****</div>
              <div class="card-details">
                <div><span class="card-label">CARD HOLDER</span><span id="topup-card-holder" class="card-value">NO CARD</span></div>
                <div><span class="card-label">BALANCE</span><span id="topup-card-balance" class="card-value">$0.00</span></div>
              </div>
            </div>
          </div>
          <div id="topup-status-display" class="status-content"><div class="status-placeholder">Scan an RFID card to begin...</div></div>
        </div>
        <div class="glass-card">
          <h3>💳 Add Funds</h3>
          <div class="input-group"><label>Card UID</label><input type="text" id="topup-uid" placeholder="Auto-populated on scan" readonly></div>
          <div class="quick-amounts">
            <button class="quick-amount-btn" data-amount="5">$5</button>
            <button class="quick-amount-btn" data-amount="10">$10</button>
            <button class="quick-amount-btn" data-amount="20">$20</button>
            <button class="quick-amount-btn" data-amount="50">$50</button>
          </div>
          <div class="input-group"><label>Custom Amount ($)</label><input type="number" id="topup-amount" placeholder="0.00" step="0.01"></div>
          <button id="topup-btn" class="btn-primary btn-full" disabled>💳 Confirm Top Up</button>
        </div>
      </div>
    </div>

    <!-- Register Card Section -->
    <div id="section-agent-register" class="page-section">
      <div class="section-header"><h2 class="section-title">📝 Register New Card</h2><p class="section-subtitle">Register a new RFID card with holder details</p></div>
      <div class="content-grid">
        <div class="glass-card">
          <h3>🏦 Card Preview</h3>
          <div class="card-visual-wrap">
            <div id="reg-card-visual" class="card-visual">
              <div class="card-chip"></div>
              <div class="card-number">**** **** **** ****</div>
              <div class="card-details">
                <div><span class="card-label">CARD HOLDER</span><span id="reg-card-holder" class="card-value">SCAN CARD</span></div>
                <div><span class="card-label">BALANCE</span><span id="reg-card-balance" class="card-value">$0.00</span></div>
              </div>
            </div>
          </div>
          <div id="reg-status" class="status-content"><div class="status-placeholder">Scan an unregistered RFID card...</div></div>
        </div>
        <div class="glass-card">
          <h3>📋 Card Details</h3>
          <div class="input-group"><label>Card UID</label><input type="text" id="reg-uid" placeholder="Auto-populated on scan" readonly></div>
          <div class="input-group"><label>Holder Name *</label><input type="text" id="reg-name" placeholder="Full name"></div>
          <div class="input-group"><label>Email</label><input type="email" id="reg-email" placeholder="Email address"></div>
          <div class="input-group"><label>Phone</label><input type="tel" id="reg-phone" placeholder="Phone number"></div>
          <div class="input-group"><label>Initial Balance ($) *</label><input type="number" id="reg-balance" placeholder="0.00" step="0.01"></div>
          <div class="new-card-passcode-section">
            <span class="passcode-setup-label">🔒 Set 6-Digit Passcode *</span>
            <p class="passcode-setup-hint">Required for card payments</p>
            <div class="setup-passcode-container" id="reg-passcode-container">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="0" inputmode="numeric">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="1" inputmode="numeric">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="2" inputmode="numeric">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="3" inputmode="numeric">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="4" inputmode="numeric">
              <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="5" inputmode="numeric">
            </div>
            <div id="reg-passcode-error" class="setup-passcode-error" style="display:none;"></div>
          </div>
          <button id="reg-btn" class="btn-success btn-full" disabled style="margin-top:1rem">📝 Register Card</button>
        </div>
      </div>
    </div>

    <!-- Transactions Section -->
    <div id="section-agent-history" class="page-section">
      <div class="section-header"><h2 class="section-title">📊 All Transactions</h2><p class="section-subtitle">Complete transaction history across all cards</p></div>
      <div class="history-layout">
        <div class="glass-card"><div class="history-panel-header"><h3>💰 Top-Ups</h3><span class="history-count" id="a-topup-count">0</span></div><div id="a-topup-history" class="transaction-items"><p class="empty-history">Loading...</p></div></div>
        <div class="glass-card"><div class="history-panel-header"><h3>🛍️ Purchases</h3><span class="history-count" id="a-purchase-count">0</span></div><div id="a-purchase-history" class="transaction-items"><p class="empty-history">Loading...</p></div></div>
      </div>
    </div>

    <!-- Users Section -->
    <div id="section-agent-users" class="page-section">
      <div class="section-header"><h2 class="section-title">👥 User Management</h2><p class="section-subtitle">Add salesperson accounts — they will receive a setup link to set their password</p></div>
      <div class="glass-card">
        <h3>➕ Add New Salesperson</h3>
        <p style="font-size:.8rem;color:var(--text-dim);margin-bottom:1rem">Agents are system-seeded and cannot be created here. Only salesperson accounts can be added.</p>
        <div class="add-user-form" id="add-user-form" style="grid-template-columns:1fr 1fr auto">
          <div class="input-group"><label>Full Name</label><input type="text" id="new-fullname" placeholder="e.g. Jane Doe"></div>
          <div class="input-group"><label>Email Address</label><input type="email" id="new-email" placeholder="e.g. jane@company.com"></div>
          <button class="btn-primary" onclick="addUser()" style="height:42px;margin-top:auto">📧 Create & Send Link</button>
        </div>
        <div id="setup-link-result" style="display:none;margin-top:1rem;padding:1rem;background:var(--success-light);border:1px solid rgba(16,185,129,.2);border-radius:10px">
          <p style="font-size:.85rem;color:var(--success);font-weight:600;margin-bottom:.5rem">✅ Account created!</p>
          <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.35rem">Username: <strong id="new-user-username"></strong></p>
          <p style="font-size:.78rem;color:var(--text-muted);margin-bottom:.35rem">Setup link (share with salesperson):</p>
          <p id="new-user-setup-link" style="font-size:.75rem;color:var(--primary);word-break:break-all;font-family:monospace;background:rgba(0,0,0,.3);padding:.5rem;border-radius:6px"></p>
        </div>
      </div>
      <div class="glass-card" style="margin-top:1rem">
        <h3>📋 System Users</h3>
        <div class="data-table-container"><table class="data-table"><thead><tr><th>Username</th><th>Full Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
        <tbody id="users-tbody"><tr><td colspan="7" class="no-data">Loading...</td></tr></tbody></table></div>
      </div>
    </div>

    <!-- Settings Section -->
    <div id="section-agent-settings" class="page-section">
      <div class="section-header"><h2 class="section-title">⚙️ System Settings</h2><p class="section-subtitle">System configuration and operational details</p></div>
      <div class="settings-grid">
        <div class="glass-card"><h3>🔌 System Status</h3><div class="settings-status-grid">
          <div class="settings-status-card"><div class="settings-status-icon" id="st-mqtt"></div><div><div class="settings-status-name">MQTT Broker</div><div class="settings-status-detail" id="st-mqtt-txt">Connecting...</div></div></div>
          <div class="settings-status-card"><div class="settings-status-icon" id="st-backend"></div><div><div class="settings-status-name">Backend</div><div class="settings-status-detail" id="st-backend-txt">Connecting...</div></div></div>
          <div class="settings-status-card"><div class="settings-status-icon" id="st-db"></div><div><div class="settings-status-name">MongoDB</div><div class="settings-status-detail" id="st-db-txt">Unknown</div></div></div>
          <div class="settings-status-card"><div class="settings-status-icon" id="st-ws"></div><div><div class="settings-status-name">WebSocket</div><div class="settings-status-detail" id="st-ws-txt">Connecting...</div></div></div>
        </div></div>
        <div class="glass-card"><h3>🖥️ System Info</h3><div class="settings-info-list">
          <div class="settings-info-row"><span class="settings-info-label">Application</span><span class="settings-info-value">TAP & PAY Dashboard</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Version</span><span class="settings-info-value">2.0.0</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Team ID</span><span class="settings-info-value badge">team_rdf</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Backend URL</span><span class="settings-info-value mono">${BACKEND_URL}</span></div>
          <div class="settings-info-row"><span class="settings-info-label">MQTT Broker</span><span class="settings-info-value mono">157.173.101.159:1883</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Database</span><span class="settings-info-value mono">MongoDB Atlas</span></div>
        </div></div>
        <div class="glass-card"><h3>📡 MQTT Topics</h3><div class="settings-info-list">
          <div class="settings-info-row"><span class="settings-info-label">Card Status</span><span class="settings-info-value mono">rfid/team_rdf/card/status</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Card Balance</span><span class="settings-info-value mono">rfid/team_rdf/card/balance</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Top-Up</span><span class="settings-info-value mono">rfid/team_rdf/card/topup</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Payment</span><span class="settings-info-value mono">rfid/team_rdf/card/payment</span></div>
        </div></div>
        <div class="glass-card"><h3>📈 Statistics</h3><div class="settings-info-list">
          <div class="settings-info-row"><span class="settings-info-label">Registered Cards</span><span class="settings-info-value" id="st-cards">0</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Total Transactions</span><span class="settings-info-value" id="st-tx">0</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Net Balance</span><span class="settings-info-value" id="st-net">$0.00</span></div>
          <div class="settings-info-row"><span class="settings-info-label">Active Cards</span><span class="settings-info-value" id="st-active">0</span></div>
        </div></div>
      </div>
    </div>
  `;

    setupAgentNavigation();
    setupAgentEvents();
    loadAgentData();
}

function setupAgentNavigation() {
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
            const target = document.getElementById(`section-${item.dataset.section}`);
            if (target) { target.classList.add('active-section'); target.style.animation = 'none'; target.offsetHeight; target.style.animation = ''; }
        });
    });
}

function setupAgentEvents() {
    // Quick amounts
    document.querySelectorAll('.quick-amount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('topup-amount').value = btn.dataset.amount;
        });
    });

    // Search
    document.getElementById('card-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('#cards-tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    });

    // Register passcode digits
    setupPasscodeDigits('.reg-passcode');

    // Top-up button
    document.getElementById('topup-btn').addEventListener('click', agentTopUp);

    // Register button
    document.getElementById('reg-btn').addEventListener('click', agentRegisterCard);
}

async function loadAgentData() {
    loadAllCards();
    loadAgentStats();
    loadAllTransactions();
    loadUsers();
}

async function loadAllCards() {
    try {
        const res = await fetch(`${BACKEND_URL}/cards`);
        const cards = await res.json();
        const tbody = document.getElementById('cards-tbody');
        if (!cards.length) { tbody.innerHTML = '<tr><td colspan="6" class="no-data">No cards registered yet</td></tr>'; return; }
        tbody.innerHTML = cards.map(c => `
      <tr>
        <td style="font-family:monospace;font-size:.78rem">${c.uid}</td>
        <td><strong>${c.holderName}</strong>${c.email ? '<br><span style="font-size:.7rem;color:var(--text-dim)">' + c.email + '</span>' : ''}</td>
        <td style="font-weight:600;color:var(--primary)">$${c.balance.toFixed(2)}</td>
        <td><span class="status-badge ${c.status || 'active'}">${c.status || 'active'}</span></td>
        <td style="font-size:.75rem;color:var(--text-dim)">${new Date(c.updatedAt).toLocaleDateString()}</td>
        <td><div class="table-actions">
          <button class="btn-icon-sm" onclick='openEditCardModal(${JSON.stringify(c).replace(/'/g, "\\'")})' title="Edit">✏️</button>
          <button class="btn-icon-sm danger" onclick="deleteCard('${c.uid}')" title="Delete">🗑️</button>
        </div></td>
      </tr>
    `).join('');
    } catch (err) { console.error('Load cards error:', err); }
}

async function deleteCard(uid) {
    if (!confirm(`Delete card ${uid}? This cannot be undone.`)) return;
    try {
        const res = await fetch(`${BACKEND_URL}/card/${uid}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) { showToast('Card deleted', 'success'); loadAllCards(); loadAgentStats(); }
        else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to delete card', 'error'); }
}

async function loadAgentStats() {
    try {
        const res = await fetch(`${BACKEND_URL}/stats`);
        const s = await res.json();
        const el = (id) => document.getElementById(id);

        // Helper function to set value with responsive sizing
        const setValue = (element, value) => {
            if (!element) return;
            element.textContent = value;
            const length = value.toString().length;
            if (length > 12) {
                element.setAttribute('data-length', 'very-long');
            } else if (length > 8) {
                element.setAttribute('data-length', 'long');
            } else {
                element.removeAttribute('data-length');
            }
        };

        setValue(el('s-total-cards'), s.totalCards);
        setValue(el('s-today-tx'), s.todayTransactions);
        setValue(el('s-topup-vol'), `$${s.topupVolume.toFixed(2)}`);
        setValue(el('s-purchase-vol'), `$${s.purchaseVolume.toFixed(2)}`);
        if (el('st-cards')) el('st-cards').textContent = s.totalCards;
        if (el('st-tx')) el('st-tx').textContent = s.totalTransactions;
        if (el('st-net')) el('st-net').textContent = `$${s.netBalance.toFixed(2)}`;
        if (el('st-active')) el('st-active').textContent = s.activeCards;
        updateSysStatus('online');
    } catch (err) { console.error('Stats error:', err); }
}


function updateSysStatus(state) {
    const online = state === 'online';
    ['mqtt', 'backend', 'db', 'ws'].forEach(sys => {
        const dot = document.getElementById(`st-${sys}`);
        const txt = document.getElementById(`st-${sys}-txt`);
        if (dot) dot.className = 'settings-status-icon ' + (online ? 'online' : 'offline');
        if (txt) txt.textContent = online ? 'Connected' : 'Disconnected';
    });
}

async function loadAllTransactions() {
    try {
        const res = await fetch(`${BACKEND_URL}/transactions?limit=200`);
        const txs = await res.json();
        const topups = txs.filter(t => t.type === 'topup');
        const debits = txs.filter(t => t.type === 'debit');
        const el = (id) => document.getElementById(id);
        if (el('a-topup-count')) el('a-topup-count').textContent = topups.length;
        if (el('a-purchase-count')) el('a-purchase-count').textContent = debits.length;
        renderTxList('a-topup-history', topups);
        renderTxList('a-purchase-history', debits);
    } catch (err) { console.error('Transactions error:', err); }
}

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
            const itemsList = tx.items.map(item => `${item.name} (${item.quantity}x)`).join(', ');
            description = `${tx.holderName} - ${itemsList}`;
        } else {
            description = `${tx.holderName} - ${description}`;
        }

        return `<div class="transaction-item ${cls}"><div class="transaction-icon">${icon}</div><div class="transaction-details"><div class="transaction-desc">${description}</div><div class="transaction-time">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</div></div><div class="transaction-amount"><div class="amount-value ${color}">${sign}$${tx.amount.toFixed(2)}</div><div class="balance-after">Bal: $${tx.balanceAfter.toFixed(2)}</div></div></div>`;
    }).join('');
}


async function loadUsers() {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/users`, { headers: getAuthHeaders() });
        const users = await res.json();
        const tbody = document.getElementById('users-tbody');
        if (!users.length) { tbody.innerHTML = '<tr><td colspan="7" class="no-data">No users</td></tr>'; return; }
        tbody.innerHTML = users.map(u => {
            const isAgent = u.role === 'agent';
            const pwStatus = u.passwordSet
                ? '<span style="color:var(--success);font-size:.75rem">✅ Set</span>'
                : '<span style="color:var(--warning);font-size:.75rem">⏳ Pending setup</span>';
            const canDelete = !isAgent && u._id !== currentUser.id;
            return `
      <tr>
        <td><strong>${u.username}</strong></td>
        <td>${u.fullName}</td>
        <td style="font-size:.78rem;color:var(--text-dim)">${u.email || '-'}</td>
        <td><span class="status-badge ${isAgent ? 'active' : 'suspended'}">${u.role}</span></td>
        <td>${pwStatus}</td>
        <td style="font-size:.75rem;color:var(--text-dim)">${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
        <td>${canDelete ? `<button class="btn-icon-sm danger" onclick="deleteUser('${u._id}')" title="Delete">🗑️</button>` : (isAgent ? '<span style="font-size:.65rem;color:var(--text-dim)">Seeded</span>' : '<span style="font-size:.65rem;color:var(--text-dim)">You</span>')}</td>
      </tr>
      `;
        }).join('');
    } catch (err) { console.error('Users error:', err); }
}

async function addUser() {
    const fullName = document.getElementById('new-fullname').value.trim();
    const email = document.getElementById('new-email').value.trim();
    if (!fullName || !email) { showToast('Full name and email are required', 'error'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Enter a valid email address', 'error'); return; }
    try {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ fullName, email })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            document.getElementById('new-fullname').value = '';
            document.getElementById('new-email').value = '';
            // Show setup link
            const linkResult = document.getElementById('setup-link-result');
            document.getElementById('new-user-username').textContent = data.username;
            document.getElementById('new-user-setup-link').textContent = data.setupUrl;
            linkResult.style.display = 'block';
            setTimeout(() => { linkResult.style.display = 'none'; }, 30000);
            loadUsers();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to add user', 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
        const res = await fetch(`${BACKEND_URL}/auth/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) { showToast('User deleted', 'success'); loadUsers(); }
        else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to delete user', 'error'); }
}

async function agentTopUp() {
    const uid = document.getElementById('topup-uid').value;
    const amount = parseFloat(document.getElementById('topup-amount').value);
    if (!uid) { showToast('Scan a card first', 'error'); return; }
    if (isNaN(amount) || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
    const btn = document.getElementById('topup-btn');
    btn.disabled = true; btn.textContent = '⏳ Processing...';
    try {
        const res = await fetch(`${BACKEND_URL}/topup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, amount, processedBy: currentUser.username })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Top-up of $${amount.toFixed(2)} successful! New balance: $${data.card.balance.toFixed(2)}`, 'success');
            document.getElementById('topup-amount').value = '';
            document.querySelectorAll('.quick-amount-btn').forEach(b => b.classList.remove('active'));
            document.getElementById('topup-card-balance').textContent = `$${data.card.balance.toFixed(2)}`;
            currentCardData = data.card;
            loadAgentData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to top-up', 'error'); }
    finally { btn.disabled = false; btn.textContent = '💳 Confirm Top Up'; }
}

async function agentRegisterCard() {
    const uid = document.getElementById('reg-uid').value;
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const balance = parseFloat(document.getElementById('reg-balance').value);
    const passcode = Array.from(document.querySelectorAll('.reg-passcode')).map(i => i.value).join('');

    if (!uid) { showToast('Scan an unregistered card first', 'error'); return; }
    if (!name) { showToast('Holder name is required', 'error'); return; }
    if (isNaN(balance) || balance <= 0) { showToast('Enter a valid initial balance', 'error'); return; }
    if (passcode.length !== 6) { showToast('Enter a 6-digit passcode', 'error'); return; }

    const btn = document.getElementById('reg-btn');
    btn.disabled = true; btn.textContent = '⏳ Registering...';
    try {
        const res = await fetch(`${BACKEND_URL}/topup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, amount: balance, holderName: name, passcode, email, phone, processedBy: currentUser.username })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Card registered for ${name} with $${balance.toFixed(2)}`, 'success');
            ['reg-name', 'reg-email', 'reg-phone', 'reg-balance'].forEach(id => document.getElementById(id).value = '');
            document.querySelectorAll('.reg-passcode').forEach(i => i.value = '');
            loadAgentData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Registration failed', 'error'); }
    finally { btn.disabled = false; btn.textContent = '📝 Register Card'; }
}
