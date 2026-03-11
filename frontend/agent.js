// ==================== AGENT DASHBOARD ====================

let allCards = [];
let allTransactions = [];
// allProducts is declared in shared.js
let selectedSection = 'agent-dash';

function renderAgentDashboard() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = `
    <a href="#" class="nav-item active" data-section="agent-dash"><span class="nav-icon">📊</span><span>Overview</span></a>
    <a href="#" class="nav-item" data-section="agent-cards"><span class="nav-icon">💳</span><span>Card Holders</span></a>
    <a href="#" class="nav-item" data-section="agent-stock"><span class="nav-icon">📦</span><span>Stock Review</span></a>
    <a href="#" class="nav-item" data-section="agent-topup"><span class="nav-icon">💰</span><span>Top Up Card</span></a>
    <a href="#" class="nav-item" data-section="agent-register"><span class="nav-icon">✨</span><span>Register Card</span></a>
    <a href="#" class="nav-item" data-section="agent-users"><span class="nav-icon">👥</span><span>Users</span></a>
    <a href="#" class="nav-item" data-section="agent-settings"><span class="nav-icon">⚙️</span><span>Settings</span></a>
    <a href="#" class="nav-item" data-section="agent-history"><span class="nav-icon">📜</span><span>System Logs</span></a>
  `;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <!-- Executive Header -->
    <div class="premium-dashboard-header animate-slide-up">
      <div class="welcome-text">
        <p class="section-subtitle">System Administrator Overview</p>
        <h1 id="agent-welcome-name">Welcome back, ${currentUser.fullName}</h1>
      </div>
      <div class="header-actions">
        <button class="btn-primary" onclick="refreshAgentDashboard()" style="display:flex;align-items:center;gap:0.5rem">
          <span>🔄</span> Refresh Data
        </button>
      </div>
    </div>

    <!-- Overview Section -->
    <div id="section-agent-dash" class="page-section active-section">
      <div class="kpi-grid">
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.1s">
          <div class="kpi-icon-wrapper blue">👥</div>
          <div class="kpi-content">
            <div class="kpi-label">Total Holders</div>
            <div class="kpi-value" id="stat-total-cards">0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.2s">
          <div class="kpi-icon-wrapper green">💵</div>
          <div class="kpi-content">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-value" id="stat-total-revenue">Frw 0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.3s">
          <div class="kpi-icon-wrapper indigo">↗️</div>
          <div class="kpi-content">
            <div class="kpi-label">Today's Tx</div>
            <div class="kpi-value" id="stat-today-tx">0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.4s">
          <div class="kpi-icon-wrapper purple">💎</div>
          <div class="kpi-content">
            <div class="kpi-label">Top-Up Vol.</div>
            <div class="kpi-value" id="stat-topup-vol">Frw 0</div>
          </div>
        </div>
      </div>

      <div class="agent-content-grid">
        <div class="glass-card animate-slide-up" style="animation-delay: 0.5s">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h3 style="margin:0">📈 Recent Transaction Volume</h3>
            <span style="font-size:0.75rem;color:var(--text-dim)">Live Metrics</span>
          </div>
          <div id="agent-tx-chart-placeholder" style="height:250px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.01);border-radius:20px;border:1px dashed var(--border)">
            <p style="color:var(--text-dim)">Transaction metrics will appear here in real-time...</p>
          </div>
        </div>
        <div class="glass-card animate-slide-up" style="animation-delay: 0.6s">
          <h3>📣 System Status</h3>
          <div id="agent-sys-status-list" class="settings-status-grid" style="grid-template-columns: 1fr; gap: 1rem">
            <div class="settings-status-card"><div class="settings-status-icon online" id="st-mqtt"></div><div><div class="settings-status-name">MQTT Broker</div><div class="settings-status-detail" id="st-mqtt-txt">Connected</div></div></div>
            <div class="settings-status-card"><div class="settings-status-icon online" id="st-backend"></div><div><div class="settings-status-name">API Server</div><div class="settings-status-detail" id="st-backend-txt">Responsive</div></div></div>
            <div class="settings-status-card"><div class="settings-status-icon online" id="st-db"></div><div><div class="settings-status-name">Database</div><div class="settings-status-detail" id="st-db-txt">Connected</div></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Holders Section -->
    <div id="section-agent-cards" class="page-section">
      <div class="section-header">
        <h2 class="section-title">💳 Card Management</h2>
        <p class="section-subtitle">Search, monitor and manage all issued RFID cards</p>
      </div>
      <div class="glass-card animate-slide-up">
        <div style="display:flex;gap:1.25rem;margin-bottom:1.75rem">
          <div class="login-input-wrapper" style="flex:1">
            <span class="input-icon">🔍</span>
            <input type="text" id="card-search" placeholder="Search by name, UID or email..." oninput="filterCards()" style="padding-left:2.8rem">
          </div>
          <select id="card-filter-status" onchange="filterCards()" style="max-width:200px">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Holder</th>
                <th>UID</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="cards-table-body">
              <tr><td colspan="6" class="no-data">Loading cardholders...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Stock Management Section -->
    <div id="section-agent-stock" class="page-section">
      <div class="section-header">
        <h2 class="section-title">📦 Inventory Command Center</h2>
        <p class="section-subtitle">Real-time oversight of your product ecosystem and supply chain</p>
      </div>
      
      <div class="kpi-grid" style="margin-bottom: 2.5rem">
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.1s">
          <div class="kpi-icon-wrapper indigo">📦</div>
          <div class="kpi-content">
            <div class="kpi-label">Total SKUs</div>
            <div id="stock-stat-skus" class="kpi-value">0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.2s">
          <div class="kpi-icon-wrapper danger" id="stock-stat-oos-icon">⚠️</div>
          <div class="kpi-content">
            <div class="kpi-label">Low/Out of Stock</div>
            <div id="stock-stat-oos" class="kpi-value">0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.3s">
          <div class="kpi-icon-wrapper green">💸</div>
          <div class="kpi-content">
            <div class="kpi-label">Valuation</div>
            <div id="stock-stat-value" class="kpi-value">Frw 0</div>
          </div>
        </div>
        <div class="agent-kpi-card animate-slide-up" style="animation-delay: 0.4s">
          <div class="kpi-icon-wrapper purple">🏷️</div>
          <div class="kpi-content">
            <div class="kpi-label">Categories</div>
            <div id="stock-stat-cats" class="kpi-value">0</div>
          </div>
        </div>
      </div>

      <div class="agent-content-grid">
        <div class="glass-card animate-slide-up">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h3 style="margin:0">📦 Master Inventory Ledger</h3>
            <div style="display:flex; gap:0.5rem">
               <input type="text" id="stock-search" placeholder="Search products..." oninput="renderProducts()" class="search-input">
               <button class="btn-icon-sm" onclick="loadStockData()" title="Reload Inventory">🔄</button>
            </div>
          </div>
          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>In Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="stock-tbody">
                 <tr><td colspan="5" class="no-data">Initializing inventory ledger...</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="stock-sidebar animate-slide-up" style="animation-delay: 0.5s; display:flex; flex-direction:column; gap:1.5rem">
          <div class="glass-card">
            <h3 style="margin-top:0">📂 Add Category</h3>
            <div class="form-grid col-1">
              <div class="input-group"><label>Name</label><input type="text" id="cat-name" placeholder="Health, Tech..."></div>
              <div class="input-group">
                <label>Icon</label>
                <select id="cat-icon" class="icon-selector">
                  <!-- Injected by JS -->
                </select>
              </div>
              <button class="btn-primary btn-full" onclick="addCategory()">Create Category</button>
            </div>
          </div>

          <div class="glass-card">
            <h3 style="margin-top:0">🍔 Add Product</h3>
            <div class="form-grid col-1">
              <div class="input-group"><label>Name</label><input type="text" id="prod-name" placeholder="Latte, Baguette..."></div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem">
                <div class="input-group"><label>Price (Frw)</label><input type="number" id="prod-price" placeholder="0"></div>
                <div class="input-group"><label>Stock</label><input type="number" id="prod-stock" value="100"></div>
              </div>
              <div class="input-group">
                <label>Icon</label>
                <select id="prod-icon" class="icon-selector">
                  <!-- Injected by JS -->
                </select>
              </div>
              <div class="input-group">
                <label>Category</label>
                <select id="prod-category">
                  <option value="">Select...</option>
                </select>
              </div>
              <button class="btn-primary btn-full" onclick="addProduct()">Publish Product</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Up Section -->
    <div id="section-agent-topup" class="page-section">
      <div class="section-header">
        <h2 class="section-title">💰 Instant Top-Up</h2>
        <p class="section-subtitle">Scan a card and add funds to the wallet balance</p>
      </div>
      <div class="agent-content-grid">
        <div class="glass-card animate-slide-up">
          <div class="agent-card-preview">
            <div id="topup-card-visual" class="card-visual" style="margin:0">
              <div class="card-chip"></div>
              <div class="card-number">**** **** **** ****</div>
              <div class="card-details">
                <div><span class="card-label">CARD HOLDER</span><span id="topup-card-holder" class="card-value">NO CARD</span></div>
                <div><span class="card-label">BALANCE</span><span id="topup-card-balance" class="card-value">Frw 0</span></div>
              </div>
            </div>
            <div id="topup-status-display" class="status-box">
              <div class="status-placeholder">Place card on reader to fetch profile...</div>
            </div>
          </div>
        </div>
        <div class="glass-card animate-slide-up" style="animation-delay: 0.1s">
          <h3>💵 Add Funds</h3>
          <div class="form-grid col-1">
            <div class="input-group">
              <label>Detected Card UID</label>
              <input type="text" id="topup-uid" readonly class="input-readonly" placeholder="Waiting for scan...">
            </div>
            <div class="input-group">
              <label>Top-Up Amount (Frw)</label>
              <input type="number" id="topup-amount" placeholder="Enter amount to add">
            </div>
            <div class="amount-presets-grid">
              <button class="btn-secondary" onclick="presetTopUp(500)">+Frw 500</button>
              <button class="btn-secondary" onclick="presetTopUp(1000)">+Frw 1,000</button>
              <button class="btn-secondary" onclick="presetTopUp(5000)">+Frw 5,000</button>
            </div>
            <button id="topup-btn" class="btn-success btn-full" disabled onclick="processTopUp()">💎 Complete Deposit</button>
          </div>
          <div class="info-box">
             <p>
                💡 <strong>Tip:</strong> Deposits are instant. Ensure the user has their card on the reader during the transaction.
             </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Register Section -->
    <div id="section-agent-register" class="page-section">
      <div class="section-header">
        <h2 class="section-title">✨ Card Issuance</h2>
        <p class="section-subtitle">Link a new RFID tag for a new user</p>
      </div>
      <div class="agent-content-grid">
        <div class="glass-card animate-slide-up">
          <h3>👤 User Profile</h3>
          <div class="form-grid col-1">
            <div class="input-group"><label>Full Name</label><input type="text" id="reg-name" placeholder="John Doe"></div>
            <div class="input-group"><label>Email Address</label><input type="email" id="reg-email" placeholder="john@example.com"></div>
            <div class="input-group"><label>Phone Number</label><input type="tel" id="reg-phone" placeholder="+1 234 567 890"></div>
            <div class="new-card-passcode-section" style="margin-top:0.5rem">
                <span class="passcode-setup-label" style="display:block; font-size:0.78rem; font-weight:600; color:var(--text-muted); margin-bottom:0.75rem; text-transform:uppercase">🔒 Set 6-Digit Passcode</span>
                <div class="setup-passcode-container" id="reg-passcode-container">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="0" inputmode="numeric">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="1" inputmode="numeric">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="2" inputmode="numeric">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="3" inputmode="numeric">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="4" inputmode="numeric">
                  <input type="password" class="setup-passcode-digit reg-passcode" maxlength="1" data-index="5" inputmode="numeric">
                </div>
            </div>
          </div>
          <div id="reg-status" class="status-box">
             <div class="status-placeholder">Scan new tag to begin registration...</div>
          </div>
        </div>
        <div class="glass-card animate-slide-up" style="animation-delay: 0.1s">
          <h3>🏷️ Registry Settings</h3>
          <div class="form-grid col-1">
            <div class="input-group"><label>New Card UID</label><input type="text" id="reg-uid" readonly class="input-readonly" placeholder="Waiting for scan..."></div>
            <div class="input-group"><label>Initial Balance (Frw)</label><input type="number" id="reg-balance" value="0"></div>
            <button id="reg-btn" class="btn-primary btn-full" disabled onclick="processRegister()">✨ Register Cardholder</button>
          </div>
          <div class="agent-card-preview" style="margin-top:2rem; padding:1.5rem; height:auto">
             <div id="reg-card-visual" class="card-visual small" style="margin:0">
              <div class="card-chip"></div>
              <div class="card-number">**** **** **** ****</div>
              <div class="card-details">
                <div><span class="card-label">NEW HOLDER</span><span id="reg-card-holder" class="card-value">WAITING...</span></div>
                <div><span class="card-label">START BAL</span><span id="reg-card-balance" class="card-value">Frw 0</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Users Section -->
    <div id="section-agent-users" class="page-section">
      <div class="section-header">
        <h2 class="section-title">👥 Salesperson Management</h2>
        <p class="section-subtitle">Manage system access for your sales team</p>
      </div>
      <div class="glass-card animate-slide-up">
        <h3>➕ Add Salesperson</h3>
        <div style="display:flex;gap:1.25rem;align-items:flex-end;margin-bottom:2rem">
          <div class="input-group" style="flex:1;margin-bottom:0"><label>Full Name</label><input type="text" id="user-fullname-input" placeholder="Jane Smith"></div>
          <div class="input-group" style="flex:1;margin-bottom:0"><label>Email Address</label><input type="email" id="user-email-input" placeholder="jane@example.com"></div>
          <button class="btn-primary" onclick="addUser()" style="height:45px">📧 Invite Member</button>
        </div>
        <div id="user-setup-result" style="display:none;margin-bottom:2rem;padding:1.25rem;background:var(--success-light);border:1px solid var(--success-glow);border-radius:16px">
            <div style="font-weight:700;color:var(--success);margin-bottom:0.5rem">✅ Invitation Sent!</div>
            <p style="font-size:0.85rem;margin-bottom:0.75rem">Credentials generated for <strong id="res-username"></strong>. Share the link below:</p>
            <div id="res-link" style="padding:0.75rem;background:rgba(0,0,0,0.2);border-radius:8px;font-family:monospace;font-size:0.75rem;word-break:break-all;color:var(--primary)"></div>
        </div>
        
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="users-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Settings Section -->
    <div id="section-agent-settings" class="page-section">
      <div class="section-header">
        <h2 class="section-title">⚙️ System Configuration</h2>
        <p class="section-subtitle">Manage operational parameters and security</p>
      </div>
      <div class="agent-content-grid">
         <div class="glass-card animate-slide-up">
           <h3>🔌 Network & Services</h3>
           <div class="settings-status-grid" style="grid-template-columns: 1fr; gap: 1rem">
              <div class="settings-status-card"><div class="settings-status-icon online" id="cfg-mqtt"></div><div><div class="settings-status-name">MQTT Layer</div><div class="settings-status-detail">Operational (Active)</div></div></div>
              <div class="settings-status-card"><div class="settings-status-icon online" id="cfg-api"></div><div><div class="settings-status-name">Central API</div><div class="settings-status-detail">v2.4.0 (Healthy)</div></div></div>
           </div>
           
           <h3 style="margin-top:2.5rem">🔑 API Keys & Auth</h3>
           <div class="form-grid col-1">
              <div class="input-group"><label>Frontend URL</label><input type="text" value="${location.origin}" readonly class="input-readonly"></div>
              <div class="input-group"><label>Backend Endpoint</label><input type="text" value="${BACKEND_URL}" readonly class="input-readonly"></div>
           </div>
         </div>
         <div class="glass-card animate-slide-up" style="animation-delay: 0.1s">
            <h3>🛡️ Security Actions</h3>
            <p style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1.5rem">Perform high-level administrative maintenance.</p>
            <div style="display:flex;flex-direction:column;gap:1rem">
               <button class="btn-secondary btn-full" onclick="showToast('Feature coming soon: Database Backup', 'info')">💾 Backup Database</button>
               <button class="btn-secondary btn-full" onclick="showToast('Feature coming soon: Security Audit', 'info')">🔍 run System Audit</button>
               <button class="btn-secondary btn-full danger" onclick="showToast('Caution: System restart restricted', 'error')">⚠️ Restart Services</button>
            </div>
         </div>
      </div>
    </div>

    <!-- Audit Logs Section -->
    <div id="section-agent-history" class="page-section">
      <div class="section-header">
        <h2 class="section-title">📜 System Audit Logs</h2>
        <p class="section-subtitle">Complete chronological record of all wallet and inventory events</p>
      </div>
      <div class="glass-card animate-slide-up">
        <div class="data-table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Cardholder</th>
                <th>Impact</th>
                <th>Operator</th>
              </tr>
            </thead>
            <tbody id="all-transactions-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  setupAgentNavigation();
  setupAgentEvents();
  populateIconSelectors();
  refreshAgentDashboard();
}

function setupAgentNavigation() {
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
      
      const sectionId = item.dataset.section;
      const target = document.getElementById(`section-${sectionId}`);
      if (target) {
        target.classList.add('active-section');
        // Re-trigger animations
        target.querySelectorAll('.animate-slide-up').forEach(el => {
          el.style.animation = 'none';
          el.offsetHeight;
          el.style.animation = '';
        });
      }
    });
  });
}

function setupAgentEvents() {
    // Add any global listeners for agent dashboard
    setupPasscodeDigits('.reg-passcode');
}

function refreshAgentDashboard() {
    loadAgentData();
    loadStockData();
    updateSysStatus('online'); // Assume online if we can refresh
    renderMockChart();
}

function updateSysStatus(state) {
    const online = state === 'online';
    const systems = ['mqtt', 'backend', 'db', 'ws', 'cfg-mqtt', 'cfg-api'];
    systems.forEach(sys => {
        const dot = document.getElementById(sys === 'cfg-mqtt' || sys === 'cfg-api' ? sys : `st-${sys}`);
        const txt = document.getElementById(`st-${sys}-txt`);
        if (dot) {
          dot.classList.remove('online', 'offline');
          dot.classList.add(online ? 'online' : 'offline');
        }
        if (txt) txt.textContent = online ? (sys === 'db' ? 'Connected' : 'Stable') : 'Disconnected';
    });
}

function renderMockChart() {
    const container = document.getElementById('agent-tx-chart-placeholder');
    if (!container) return;
    
    // Create a simple CSS-based bar chart for visual appeal
    const data = [45, 60, 85, 30, 95, 70, 55];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    container.innerHTML = `
      <div style="display:flex; align-items:flex-end; gap:0.75rem; width:100%; padding:0 1rem">
        ${data.map((val, i) => `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:0.5rem">
            <div style="width:100%; background:linear-gradient(to top, var(--primary), #8b5cf6); height:${val}%; border-radius:6px 6px 4px 4px; position:relative; min-height:10px; transition: height 1s ease">
              <div style="position:absolute; top:-20px; left:50%; transform:translateX(-50%); font-size:0.6rem; font-weight:700; color:var(--text-main)">${val}</div>
            </div>
            <span style="font-size:0.65rem; color:var(--text-dim)">${days[i]}</span>
          </div>
        `).join('')}
      </div>
    `;
}

async function loadAgentData() {
    await Promise.all([
        loadAllCards(),
        loadAgentStats(),
        loadAllTransactions(),
        loadUsers()
    ]);
}

async function loadAgentStats() {
    try {
        const res = await fetch(`${BACKEND_URL}/stats`);
        const s = await res.json();
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        setVal('stat-total-cards', s.totalCards);
        setVal('stat-total-revenue', `Frw ${s.totalRevenue.toLocaleString()}`);
        setVal('stat-today-tx', s.todayTransactions);
        setVal('stat-topup-vol', `Frw ${s.topupVolume.toLocaleString()}`);
        
        // Settings/Dashboard stats consistency
        setVal('st-cards', s.totalCards);
        setVal('st-tx', s.totalTransactions);
        setVal('st-net', `Frw ${s.netBalance.toLocaleString()}`);
        setVal('st-active', s.activeCards);
        
    } catch (err) { console.error('Stats error:', err); }
}

async function loadAllCards() {
    try {
        const res = await fetch(`${BACKEND_URL}/cards`);
        allCards = await res.json();
        renderAllCards();
    } catch (err) { console.error('Load cards error:', err); }
}

function renderAllCards() {
    const body = document.getElementById('cards-table-body');
    if (!body) return;
    
    const query = document.getElementById('card-search')?.value.toLowerCase() || '';
    const status = document.getElementById('card-filter-status')?.value || 'all';
    
    const filtered = allCards.filter(c => {
        const matchQ = !query || c.holderName.toLowerCase().includes(query) || c.uid.toLowerCase().includes(query) || (c.email && c.email.toLowerCase().includes(query));
        const matchS = status === 'all' || c.status === status;
        return matchQ && matchS;
    });

    if (!filtered.length) {
        body.innerHTML = `<tr><td colspan="6" class="no-data">${allCards.length ? 'No results found' : 'No cardholders registered'}</td></tr>`;
        return;
    }

    body.innerHTML = filtered.map(c => `
      <tr>
        <td data-label="Holder">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div class="user-avatar" style="width:36px;height:36px;font-size:0.8rem">${c.holderName.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700; color:var(--text-main)">${c.holderName}</div>
              <div style="font-size:0.7rem; color:var(--text-dim)">${c.email || 'No email provided'}</div>
            </div>
          </div>
        </td>
        <td data-label="UID"><code style="background:var(--bg-input); padding:4px 8px; border-radius:8px; font-size:0.75rem">${c.uid}</code></td>
        <td data-label="Balance" style="font-weight:800; color:var(--primary)">Frw ${c.balance.toLocaleString()}</td>
        <td data-label="Status"><span class="status-badge ${c.status || 'active'}">${c.status || 'active'}</span></td>
        <td data-label="Created" style="font-size:0.75rem; color:var(--text-dim)">${new Date(c.createdAt).toLocaleDateString()}</td>
        <td data-label="Actions">
          <div class="table-actions">
            <button class="btn-icon-sm" onclick='openEditCardModal(${JSON.stringify(c).replace(/'/g, "\\'")})' title="Manage Settings">⚙️</button>
            <button class="btn-icon-sm danger" onclick="deleteCard('${c.uid}')" title="Revoke Card">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
}

function filterCards() {
    renderAllCards();
}

async function deleteCard(uid) {
    if (!confirm(`Are you sure you want to revoke and delete card ${uid}? This action is irreversible.`)) return;
    try {
        const res = await fetch(`${BACKEND_URL}/card/${uid}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
            showToast('Card revoked successfully', 'success');
            loadAgentData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Operation failed', 'error'); }
}

const COMMON_ICONS = ['🍔', '🍕', '🥗', '🍦', '🍩', '🥐', '🥖', '🥯', '🥨', '🥪', '🥣', '🥘', '🍲', '🍿', '🍱', '🥟', '🍤', '🍙', '🍘', '🍥', '🍡', '🍢', '🍣', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍼', '🥛', '☕', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🍴', '🧺', '📦', '💻', '📱', '⌚', '💾', '💿', '📁', '📄', '📅', '🗑️', '⚙️', '🔧', '🔨', '🛠️', '🛡️', '💊', '🩹', '🩸', '🛒', '🛍️', '🎁', '🎫', '🏆', '⚽', '🎨', '🧶', '🧵', '🎹', '🎸', '🎷', '🎺', '🎻', '🥁', '🎧', '📻', '📺', '📷', '📼'];

function populateIconSelectors() {
    const selects = document.querySelectorAll('.icon-selector');
    const options = COMMON_ICONS.map(emoji => `<option value="${emoji}">${emoji}</option>`).join('');
    selects.forEach(s => {
        s.innerHTML = options;
    });
}

async function loadStockData() {
    try {
        const [catRes, prodRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/categories`),
            fetch(`${BACKEND_URL}/api/products`)
        ]);
        const cats = await catRes.json();
        allProducts = await prodRes.json();
        
        // Update product category dropdowns (New Product and Edit Product)
        const selectors = ['prod-category', 'edit-prod-category'];
        selectors.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Select Category</option>' + 
                    cats.map(c => `<option value="${c._id}">${c.icon} ${c.name}</option>`).join('');
            }
        });
        
        // Update Stock Stats
        const skus = allProducts.length;
        const lowStock = allProducts.filter(p => p.stock < 10).length;
        const totalVal = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        
        setVal('stock-stat-skus', skus);
        setVal('stock-stat-oos', lowStock);
        setVal('stock-stat-value', `Frw ${totalVal.toLocaleString()}`);
        setVal('stock-stat-cats', cats.length);

        // Visual feedback based on low stock
        const oosIcon = document.getElementById('stock-stat-oos-icon');
        if (oosIcon) {
            oosIcon.className = `kpi-icon-wrapper ${lowStock > 0 ? 'danger' : 'green'}`;
            oosIcon.textContent = lowStock > 0 ? '⚠️' : '✅';
        }

        renderProducts();
    } catch (err) { console.error('Stock load error:', err); }
}

function renderProducts() {
    const tbody = document.getElementById('stock-tbody');
    if (!tbody) return;
    
    const query = document.getElementById('stock-search')?.value.toLowerCase() || '';
    const filtered = allProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.name.toLowerCase().includes(query))
    );

    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="no-data">${allProducts.length ? 'No products match your search' : 'Inventory is empty.'}</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(p => {
        const isLow = p.stock < 10;
        const isEmpty = p.stock <= 0;
        const stockClass = isEmpty ? 'empty' : (isLow ? 'low' : '');
        return `
          <tr>
            <td data-label="Product">
               <div style="display:flex;align-items:center;gap:0.75rem">
                 <span style="font-size:1.5rem">${p.icon}</span>
                 <span style="font-weight:700">${p.name}</span>
               </div>
            </td>
            <td data-label="Category"><span class="status-badge active" style="background:var(--primary-light); color:var(--primary); font-size:0.7rem">${p.category ? p.category.name : 'Uncategorized'}</span></td>
            <td data-label="Price" style="font-weight:800; color:var(--success)">Frw ${p.price.toLocaleString()}</td>
            <td data-label="Stock">
              <div class="stock-badge ${stockClass}">
                ${p.stock} units
              </div>
            </td>
            <td data-label="Actions">
              <div class="table-actions">
                <button class="btn-icon-sm" onclick="addStockQuick('${p._id}', '${p.name}')" title="Restock (+10)">➕</button>
                <button class="btn-icon-sm" onclick='openEditProductModal(${JSON.stringify(p).replace(/'/g, "\\'")})' title="Edit Details">✏️</button>
                <button class="btn-icon-sm danger" onclick="deleteProduct('${p._id}')" title="Remove Product">🗑️</button>
              </div>
            </td>
          </tr>
        `;
    }).join('');
}

async function addCategory() {
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value || '📦';
    if (!name) { showToast('Category name is required', 'error'); return; }

    try {
        const res = await fetch(`${BACKEND_URL}/api/categories`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ name, icon })
        });
        const data = await res.json();
        if (data._id) {
            showToast(`Category "${name}" created`, 'success');
            document.getElementById('cat-name').value = '';
            loadStockData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to create category', 'error'); }
}

async function addProduct() {
    const name = document.getElementById('prod-name').value.trim();
    const categoryId = document.getElementById('prod-category').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const icon = document.getElementById('prod-icon').value || '🍟';
    const stock = parseInt(document.getElementById('prod-stock').value) || 0;

    if (!name || !categoryId || isNaN(price)) { showToast('Please complete all fields', 'error'); return; }

    try {
        const res = await fetch(`${BACKEND_URL}/api/products`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ name, categoryId, price, icon, stock })
        });
        const data = await res.json();
        if (data._id) {
            showToast(`${name} added to inventory`, 'success');
            ['prod-name', 'prod-price', 'prod-stock'].forEach(id => document.getElementById(id).value = '');
            loadStockData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Failed to add product', 'error'); }
}

async function addStockQuick(id, name) {
    const qty = 10;
    try {
        const res = await fetch(`${BACKEND_URL}/api/products/${id}/add-stock`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ quantity: qty })
        });
        const data = await res.json();
        if (data._id) {
            showToast(`Inventory updated: +${qty} ${name}`, 'success');
            loadStockData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Update failed', 'error'); }
}

async function setStockManual(id, name, current) {
    const amt = prompt(`Adjust inventory for ${name}:`, current);
    if (amt === null) return;
    const amount = parseInt(amt);
    if (isNaN(amount) || amount < 0) { showToast('Invalid stock count', 'error'); return; }

    try {
        const res = await fetch(`${BACKEND_URL}/api/products/${id}/stock`, {
            method: 'PUT', headers: getAuthHeaders(),
            body: JSON.stringify({ amount })
        });
        const data = await res.json();
        if (data._id) {
            showToast(`Inventory count updated for ${name}`, 'success');
            loadStockData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Update failed', 'error'); }
}

async function deleteProduct(id) {
    if(!confirm('Permanently remove this product from inventory?')) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/products/${id}`, { 
            method: 'DELETE', 
            headers: getAuthHeaders() 
        });
        const data = await res.json();
        if (data.success) {
            showToast('Product removed', 'success');
            loadStockData();
        } else {
            showToast(data.error || 'Delete failed', 'error');
        }
    } catch (err) { showToast('Delete failed', 'error'); }
}

let editingProductId = null;
function openEditProductModal(product) {
    editingProductId = product._id;
    document.getElementById('edit-prod-name').value = product.name;
    document.getElementById('edit-prod-price').value = product.price;
    document.getElementById('edit-prod-icon').value = product.icon;
    document.getElementById('edit-prod-stock').value = product.stock;
    document.getElementById('edit-prod-category').value = product.category ? product.category._id : '';
    document.getElementById('edit-product-modal').style.display = 'flex';
}

function closeEditProductModal() {
    document.getElementById('edit-product-modal').style.display = 'none';
    editingProductId = null;
}

async function saveProductChanges() {
    if (!editingProductId) return;
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true; btn.textContent = 'Saving...';

    const payload = {
        name: document.getElementById('edit-prod-name').value.trim(),
        price: parseFloat(document.getElementById('edit-prod-price').value),
        icon: document.getElementById('edit-prod-icon').value,
        stock: parseInt(document.getElementById('edit-prod-stock').value),
        categoryId: document.getElementById('edit-prod-category').value
    };

    if (!payload.name || isNaN(payload.price)) {
        showToast('Name and Price are required', 'error');
        btn.disabled = false; btn.textContent = 'Save Changes';
        return;
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/products/${editingProductId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data._id) {
            showToast('Product updated successfully', 'success');
            closeEditProductModal();
            loadStockData();
        } else {
            showToast(data.error || 'Update failed', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Save Changes';
    }
}

async function processTopUp() {
    const uid = document.getElementById('topup-uid').value;
    const amount = parseFloat(document.getElementById('topup-amount').value);
    if (!uid) { showToast('Please scan a card first', 'error'); return; }
    if (isNaN(amount) || amount <= 0) { showToast('Invalid deposit amount', 'error'); return; }
    
    const btn = document.getElementById('topup-btn');
    btn.disabled = true; btn.textContent = '⏳ Processing...';
    
    try {
        const res = await fetch(`${BACKEND_URL}/topup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, amount, processedBy: currentUser.username, deviceId: scannerId })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Deposit Successful! $${amount.toFixed(2)} credited to ${data.card.holderName}`, 'success');
            document.getElementById('topup-amount').value = '';
            document.getElementById('topup-card-balance').textContent = `$${data.card.balance.toFixed(2)}`;
            currentCardData = data.card;
            loadAgentData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Transaction failed', 'error'); }
    finally { btn.disabled = false; btn.textContent = '💎 Complete Deposit'; }
}

function presetTopUp(amt) {
    document.getElementById('topup-amount').value = amt;
}

async function processRegister() {
    const uid = document.getElementById('reg-uid').value;
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const balance = parseFloat(document.getElementById('reg-balance').value);
    const passcode = Array.from(document.querySelectorAll('.reg-passcode')).map(i => i.value).join('');

    if (!uid) { showToast('Waiting for RFID scan...', 'error'); return; }
    if (!name) { showToast('Cardholder name is mandatory', 'error'); return; }
    if (passcode.length !== 6) { showToast('Security passcode must be 6 digits', 'error'); return; }

    const btn = document.getElementById('reg-btn');
    btn.disabled = true; btn.textContent = '⏳ Encrypting & Activating...';
    try {
        const res = await fetch(`${BACKEND_URL}/topup`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid, amount: balance, holderName: name, passcode, email, phone, processedBy: currentUser.username, deviceId: scannerId })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Card Issued successfully to ${name}`, 'success');
            ['reg-name', 'reg-email', 'reg-phone', 'reg-balance'].forEach(id => document.getElementById(id).value = '');
            document.querySelectorAll('.reg-passcode').forEach(i => i.value = '');
            loadAgentData();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Registration sequence failed', 'error'); }
    finally { btn.disabled = false; btn.textContent = '✨ Register Cardholder'; }
}

async function loadUsers() {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/users`, { headers: getAuthHeaders() });
        const users = await res.json();
        const tbody = document.getElementById('users-tbody');
        if (!tbody) return;
        
        tbody.innerHTML = users.map(u => {
            const isAgent = u.role === 'agent';
            const canDelete = !isAgent && u._id !== currentUser.id;
            return `
              <tr>
                <td>
                  <div style="display:flex;align-items:center;gap:0.75rem">
                    <div class="user-avatar" style="background:var(--bg-input); color:var(--text-main); font-size:0.7rem">${u.username.charAt(0).toUpperCase()}</div>
                    <div>
                      <div style="font-weight:700">${u.fullName}</div>
                      <div style="font-size:0.7rem; color:var(--text-dim)">@${u.username}</div>
                    </div>
                  </div>
                </td>
                <td><span class="status-badge ${isAgent ? 'active' : 'suspended'}" style="font-size:0.65rem">${u.role}</span></td>
                <td>
                  ${u.passwordSet 
                    ? '<span style="color:var(--success);font-size:0.7rem">● Verified</span>' 
                    : '<span style="color:var(--warning);font-size:0.7rem">● Inviting...</span>'}
                </td>
                <td style="font-size:0.75rem; color:var(--text-dim)">${u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Pending'}</td>
                <td>
                  ${canDelete ? `<button class="btn-icon-sm danger" onclick="deleteUser('${u._id}')">🗑️</button>` : '<span style="font-size:0.7rem; color:var(--text-dim)">Locked</span>'}
                </td>
              </tr>
            `;
        }).join('');
    } catch (err) { console.error('Users load error:', err); }
}

async function addUser() {
    const fullName = document.getElementById('user-fullname-input').value.trim();
    const email = document.getElementById('user-email-input').value.trim();
    if (!fullName || !email) { showToast('Member details required', 'error'); return; }
    
    try {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST', headers: getAuthHeaders(),
            body: JSON.stringify({ fullName, email })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Invitation link generated', 'success');
            document.getElementById('user-fullname-input').value = '';
            document.getElementById('user-email-input').value = '';
            
            const resBox = document.getElementById('user-setup-result');
            document.getElementById('res-username').textContent = data.username;
            document.getElementById('res-link').textContent = data.setupUrl;
            resBox.style.display = 'block';
            
            loadUsers();
        } else showToast(data.error, 'error');
    } catch (err) { showToast('Operation failed', 'error'); }
}

async function deleteUser(id) {
    if (!confirm('Revoke team member access?')) return;
    try {
        const res = await fetch(`${BACKEND_URL}/auth/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (res.ok) {
            showToast('Access revoked', 'success');
            loadUsers();
        }
    } catch (err) { showToast('Revoke failed', 'error'); }
}

async function loadAllTransactions() {
    try {
        const res = await fetch(`${BACKEND_URL}/transactions?limit=100`);
        allTransactions = await res.json();
        renderAllTransactions();
    } catch (err) { console.error('History load error:', err); }
}

function renderAllTransactions() {
    const body = document.getElementById('all-transactions-body');
    if (!body) return;
    
    if (!allTransactions.length) {
        body.innerHTML = '<tr><td colspan="5" class="no-data">System log is empty</td></tr>';
        return;
    }
    
    body.innerHTML = allTransactions.map(tx => {
        const isDebit = tx.type === 'debit';
        return `
          <tr>
            <td style="font-size:0.75rem; color:var(--text-dim)">${new Date(tx.timestamp).toLocaleString()}</td>
            <td>
              <div style="display:flex;align-items:center;gap:0.6rem">
                <span>${isDebit ? '🛒' : '💎'}</span>
                <span style="font-weight:600">${tx.description || (isDebit ? 'Purchase' : 'Top-Up')}</span>
              </div>
            </td>
            <td><code style="font-size:0.75rem">${tx.uid}</code></td>
            <td style="font-weight:800; color:${isDebit ? 'var(--danger)' : 'var(--success)'}">
              ${isDebit ? '-' : '+'}Frw ${tx.amount.toLocaleString()}
            </td>
            <td><span class="status-badge" style="background:var(--bg-input); opacity:0.8; font-size:0.65rem">${tx.processedBy || 'System'}</span></td>
          </tr>
        `;
    }).join('');
}
