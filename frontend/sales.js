// ==================== SALESPERSON DASHBOARD ====================

function renderSalespersonDashboard() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = `
    <a href="#" class="nav-item active" data-section="sales-card"><span class="nav-icon">💳</span><span>Card Details</span></a>
    <a href="#" class="nav-item" data-section="sales-market"><span class="nav-icon">🛒</span><span>Marketplace</span></a>
    <a href="#" class="nav-item" data-section="sales-checkout"><span class="nav-icon">💰</span><span>Checkout</span></a>
    <a href="#" class="nav-item" data-section="sales-history"><span class="nav-icon">📊</span><span>Transactions</span></a>
  `;

  const main = document.getElementById('main-content');
  main.innerHTML = `
    <!-- Card Details Section -->
    <div id="section-sales-card" class="page-section active-section">
      <div class="section-header"><h2 class="section-title">💳 Card Details</h2><p class="section-subtitle">Scan an RFID card to view holder information and balance</p></div>
      <div class="card-scan-section">
        <div class="glass-card">
          <h3>🏦 Card Preview</h3>
          <div class="card-visual-wrap">
            <div id="sales-card-visual" class="card-visual">
              <div class="card-chip"></div>
              <div class="card-number">**** **** **** ****</div>
              <div class="card-details">
                <div><span class="card-label">CARD HOLDER</span><span id="sales-card-holder" class="card-value">NO CARD</span></div>
                <div><span class="card-label">BALANCE</span><span id="sales-card-balance" class="card-value">Frw 0</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="glass-card">
          <h3>📋 Card Information</h3>
          <div id="sales-card-info"><div class="status-placeholder">Place an RFID card on the reader to view details...</div></div>
        </div>
      </div>
    </div>

    <!-- Marketplace Section -->
    <div id="section-sales-market" class="page-section">
      <div class="section-header"><h2 class="section-title">🛒 Marketplace</h2><p class="section-subtitle">Browse and add products to cart — items persist until removed or checkout</p></div>
      <div class="marketplace-layout">
        <div class="glass-card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h3 style="margin:0">Available Products</h3>
            <span class="cart-badge" id="market-cart-badge" style="display:none"><span id="market-cart-count">0</span></span>
          </div>
          <div class="category-filter" id="category-filter">
            <button class="category-btn active" data-category="all">All</button>
            <!-- Categories will be loaded here -->
          </div>

          <div class="product-grid" id="product-grid"></div>
        </div>
        <div class="glass-card marketplace-sidebar">
          <h3>🛍️ Shopping Cart</h3>
          <div id="sales-cart-items" class="cart-items"><div class="cart-empty"><span class="cart-empty-icon">🛒</span><p>Your cart is empty</p><p style="font-size:.75rem;color:var(--text-dim)">Click products to add them</p></div></div>
          <div id="sales-cart-summary" class="cart-summary" style="display:none">
            <div class="cart-summary-row"><span>Items</span><span id="sales-cart-total-items">0</span></div>
            <div class="cart-summary-row cart-total-row"><span>Total</span><span id="sales-cart-total-price">Frw 0</span></div>
          </div>
          <button class="btn-success btn-full" style="margin-top:.75rem" onclick="goToCheckout()">Proceed to Checkout →</button>
        </div>
      </div>
    </div>

    <!-- Checkout Section -->
    <div id="section-sales-checkout" class="page-section">
      <div class="section-header"><h2 class="section-title">💰 Checkout</h2><p class="section-subtitle">Complete payment using the scanned RFID card</p></div>
      <div class="content-grid">
        <div class="glass-card">
          <h3>📦 Order Summary</h3>
          <div id="checkout-items" class="cart-items"></div>
          <div id="checkout-summary" class="cart-summary" style="display:none">
            <div class="cart-summary-row"><span>Items</span><span id="checkout-total-items">0</span></div>
            <div class="cart-summary-row"><span>Card Balance</span><span id="checkout-card-balance" style="color:var(--primary)">Frw 0</span></div>
            <div class="cart-summary-row cart-total-row"><span>Amount Due</span><span id="checkout-total-price">Frw 0</span></div>
          </div>
        </div>
        <div class="glass-card">
          <h3>💳 Payment</h3>
          <div id="checkout-card-status">
            <div class="status-placeholder">Scan your RFID card to enable payment</div>
          </div>
          <div id="checkout-passcode-section" class="checkout-passcode-section" style="display:none">
            <span class="passcode-label">🔒 Enter Passcode</span>
            <div class="inline-passcode-container">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="0" inputmode="numeric">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="1" inputmode="numeric">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="2" inputmode="numeric">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="3" inputmode="numeric">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="4" inputmode="numeric">
              <input type="password" class="inline-passcode-digit checkout-pass" maxlength="1" data-index="5" inputmode="numeric">
            </div>
            <div id="checkout-pass-error" class="inline-passcode-error" style="display:none"></div>
          </div>
          <div id="checkout-payment-msg" class="payment-status-msg"></div>
          <button id="checkout-pay-btn" class="btn-success btn-full" style="margin-top:1rem" disabled onclick="processCheckout()">💳 Pay Now</button>
          <p class="checkout-hint" id="checkout-hint">Scan your card to enable payment</p>
        </div>
      </div>
    </div>

    <!-- Transaction History -->
    <div id="section-sales-history" class="page-section">
      <div class="section-header"><h2 class="section-title">📊 Transaction History</h2><p class="section-subtitle">View recent transactions for scanned cards</p></div>
      <div class="history-layout">
        <div class="glass-card"><div class="history-panel-header"><h3>💰 Top-Ups</h3><span class="history-count" id="s-topup-count">0</span></div><div id="s-topup-history" class="transaction-items"><p class="empty-history">Scan a card to view history</p></div></div>
        <div class="glass-card"><div class="history-panel-header"><h3>🛍️ Purchases</h3><span class="history-count" id="s-purchase-count">0</span></div><div id="s-purchase-history" class="transaction-items"><p class="empty-history">Scan a card to view history</p></div></div>
      </div>
    </div>
  `;

  setupSalesNavigation();
  setupSalesEvents();
  loadCartFromStorage();
  loadSalesProducts();
}

function setupSalesNavigation() {
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

function setupSalesEvents() {
  // Checkout passcode
  setupPasscodeDigits('.checkout-pass');
}


async function goToCheckout() {
  if (cart.length === 0) { showToast('Add products to cart first', 'error'); return; }
  
  // Reserve stock before proceeding
  try {
    const items = cart.map(i => ({ productId: i.product._id, qty: i.qty }));
    const res = await fetch(`${BACKEND_URL}/api/products/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, sessionId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(`Stock Lock Failed: ${data.error}`, 'error');
      // Refresh products to show correct stock
      loadSalesProducts();
      return;
    }
    showToast('Stock reserved for 5 minutes', 'success');
  } catch (err) {
    showToast('Failed to lock stock. Please try again.', 'error');
    return;
  }

  // Navigate to checkout section
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
  const checkoutNav = document.querySelector('[data-section="sales-checkout"]');
  if (checkoutNav) checkoutNav.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
  document.getElementById('section-sales-checkout').classList.add('active-section');
  updateCheckoutView();
}

async function loadSalesProducts() {
  try {
    const [prodRes, catRes] = await Promise.all([
      fetch(`${BACKEND_URL}/api/products`),
      fetch(`${BACKEND_URL}/api/categories`)
    ]);
    
    if (prodRes.ok) allProducts = await prodRes.json();
    if (catRes.ok) {
        const cats = await catRes.json();
        renderCategoryFilters(cats);
    }
  } catch (err) {
    console.error('Failed to load marketplace data:', err);
  }
  applyPendingCart();
  renderSalesProducts();
}

function renderCategoryFilters(categories) {
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    
    filter.innerHTML = `<button class="category-btn ${selectedCategory === 'all' ? 'active' : ''}" data-category="all">All</button>` + 
        categories.map(c => `<button class="category-btn ${selectedCategory === c.slug ? 'active' : ''}" data-category="${c.slug}">${c.icon} ${c.name}</button>`).join('');
        
    // Re-attach events
    filter.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filter.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCategory = btn.dataset.category;
            renderSalesProducts();
        });
    });
}


function renderSalesProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  
  const filtered = selectedCategory === 'all' 
    ? allProducts 
    : allProducts.filter(p => p.category && p.category.slug === selectedCategory);
    
  if (!filtered.length) { grid.innerHTML = '<div class="no-data">No products in this category</div>'; return; }
  
  grid.innerHTML = filtered.map(p => {
    const available = p.availableStock !== undefined ? p.availableStock : p.stock;
    const isOutOfStock = available <= 0;
    const isLowStock = available > 0 && available < 10;
    
    let badge = '';
    if (isOutOfStock) badge = '<span class="product-badge danger">Out of Stock</span>';
    else if (isLowStock) badge = `<span class="product-badge warning">Only ${available} left</span>`;
    else if (p.category && p.category.slug === 'rwandan') badge = '<span class="product-badge rwandan">🇷🇼</span>';
    
    const inCart = cart.find(i => i.product._id === p._id);
    const qtyControls = inCart ? `<div class="product-qty-controls" onclick="event.stopPropagation()"><button class="qty-btn" onclick="changeSalesQty('${p._id}',-1)">−</button><span class="cart-item-qty">${inCart.qty}</span><button class="qty-btn" onclick="changeSalesQty('${p._id}',1)">+</button></div>` : '<div class="product-add-hint">Click to add</div>';
    
    return `
      <div class="product-card${inCart ? ' in-cart' : ''}${isOutOfStock ? ' disabled' : ''}" onclick="${isOutOfStock ? '' : `addToSalesCart('${p._id}')`}">
        ${badge}
        <span class="product-icon">${p.icon}</span>
        <div class="product-name">${p.name}</div>
        <div class="product-price">Frw ${p.price.toLocaleString()}</div>
        <div class="product-stock-small">${available} available</div>
        ${isOutOfStock ? '' : qtyControls}
      </div>`;
  }).join('');
}


function addToSalesCart(productId) {
  const product = allProducts.find(p => p._id === productId);
  if (!product) return;
  const available = product.availableStock !== undefined ? product.availableStock : product.stock;
  if (available <= 0) { showToast('Product is out of stock', 'error'); return; }

  const existing = cart.find(i => i.product._id === productId);
  if (existing) {
      if (existing.qty >= available) { showToast('Cannot add more: Stock limit reached', 'error'); return; }
      existing.qty++;
  }
  else cart.push({ product, qty: 1 });
  
  saveCartToStorage();
  updateSalesCartUI();
  renderSalesProducts();
}

function removeFromSalesCart(productId) {
  cart = cart.filter(i => i.product._id !== productId);
  saveCartToStorage();
  updateSalesCartUI();
  renderSalesProducts();
}

function changeSalesQty(productId, delta) {
  const item = cart.find(i => i.product._id === productId);
  if (!item) return;
  
  if (delta > 0 && item.qty >= item.product.stock) {
      showToast('Cannot add more: Stock limit reached', 'error');
      return;
  }
  
  item.qty += delta;
  if (item.qty <= 0) { removeFromSalesCart(productId); return; }
  saveCartToStorage();
  updateSalesCartUI();
  renderSalesProducts();
}


// ===== CART PERSISTENCE =====
function saveCartToStorage() {
  try {
    const data = cart.map(i => ({ productId: i.product._id, qty: i.qty }));
    localStorage.setItem('tapandpay_cart', JSON.stringify(data));
  } catch (e) { console.warn('Failed to save cart:', e); }
}


function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('tapandpay_cart');
    if (!saved) return;
    const items = JSON.parse(saved);
    window._pendingCart = items;
  } catch (e) { console.warn('Failed to load cart:', e); }
}

function applyPendingCart() {
  if (!window._pendingCart || !allProducts.length) return;
  cart = [];
  window._pendingCart.forEach(item => {
    const product = allProducts.find(p => p._id === item.productId);
    if (product) cart.push({ product, qty: item.qty });
  });
  window._pendingCart = null;
  updateSalesCartUI();
}


// Make functions globally accessible
window.addToSalesCart = addToSalesCart;
window.removeFromSalesCart = removeFromSalesCart;
window.changeSalesQty = changeSalesQty;

function getCartTotal() { return cart.reduce((s, i) => s + i.product.price * i.qty, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateSalesCartUI() {
  const count = getCartCount();
  const total = getCartTotal();
  const badge = document.getElementById('market-cart-badge');
  const countEl = document.getElementById('market-cart-count');
  if (badge) badge.style.display = count > 0 ? 'inline' : 'none';
  if (countEl) countEl.textContent = count;

  const itemsEl = document.getElementById('sales-cart-items');
  const summaryEl = document.getElementById('sales-cart-summary');
  if (!cart.length) {
    if (itemsEl) itemsEl.innerHTML = '<div class="cart-empty"><span class="cart-empty-icon">🛒</span><p>Your cart is empty</p></div>';
    if (summaryEl) summaryEl.style.display = 'none';
  } else {
    if (itemsEl) itemsEl.innerHTML = cart.map(i => `
      <div class="cart-item">
        <span class="cart-item-icon">${i.product.icon}</span>
        <div class="cart-item-info"><div class="cart-item-name">${i.product.name}</div><div class="cart-item-price">Frw ${i.product.price.toLocaleString()} each</div></div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeSalesQty('${i.product._id}',-1)">−</button>
          <span class="cart-item-qty">${i.qty}</span>
          <button class="qty-btn" onclick="changeSalesQty('${i.product._id}',1)">+</button>
        </div>
        <span class="cart-item-total">Frw ${(i.product.price * i.qty).toLocaleString()}</span>
        <button class="cart-item-remove" onclick="removeFromSalesCart('${i.product._id}')">✕</button>
      </div>
    `).join('');

    if (summaryEl) {
      summaryEl.style.display = 'block';
      document.getElementById('sales-cart-total-items').textContent = count;
      document.getElementById('sales-cart-total-price').textContent = `Frw ${total.toLocaleString()}`;
    }
  }
}

function updateCheckoutView() {
  const itemsEl = document.getElementById('checkout-items');
  const summaryEl = document.getElementById('checkout-summary');
  if (!cart.length) {
    if (itemsEl) itemsEl.innerHTML = '<div class="cart-empty"><span class="cart-empty-icon">📦</span><p>No items to checkout</p></div>';
    if (summaryEl) summaryEl.style.display = 'none';
    return;
  }
  if (itemsEl) itemsEl.innerHTML = cart.map(i => `
    <div class="cart-item">
      <span class="cart-item-icon">${i.product.icon}</span>
      <div class="cart-item-info"><div class="cart-item-name">${i.product.name}</div><div class="cart-item-price">Frw ${i.product.price.toLocaleString()} × ${i.qty}</div></div>
      <span class="cart-item-total">Frw ${(i.product.price * i.qty).toLocaleString()}</span>
    </div>
  `).join('');

  if (summaryEl) {
    summaryEl.style.display = 'block';
    document.getElementById('checkout-total-items').textContent = getCartCount();
    document.getElementById('checkout-total-price').textContent = `Frw ${getCartTotal().toLocaleString()}`;
    if (currentCardData) document.getElementById('checkout-card-balance').textContent = `Frw ${currentCardData.balance.toLocaleString()}`;
  }
  updateCheckoutPayBtn();
}

function updateCheckoutPayBtn() {
  const btn = document.getElementById('checkout-pay-btn');
  const hint = document.getElementById('checkout-hint');
  const hasCard = !!lastScannedUid;
  const hasItems = cart.length > 0;
  const allowed = isPaymentAllowed();
  if (btn) btn.disabled = !(hasCard && hasItems && allowed);
  if (hint) {
    if (!hasCard) { hint.textContent = 'Scan your RFID card to enable payment'; hint.style.color = ''; }
    else if (!allowed) { hint.textContent = '⚠️ Grace period expired! Place card on reader'; hint.style.color = 'var(--danger)'; }
    else if (!hasItems) { hint.textContent = 'Add items to cart first'; hint.style.color = ''; }
    else { hint.textContent = ''; }
  }
  // Show passcode if card has one
  const passSection = document.getElementById('checkout-passcode-section');
  if (passSection && currentCardData && currentCardData.passcodeSet && hasCard) passSection.style.display = 'block';
  else if (passSection) passSection.style.display = 'none';
}

async function processCheckout() {
  if (!lastScannedUid || cart.length === 0) return;
  if (!isPaymentAllowed()) { showCheckoutMsg('⚠️ Place card on reader first!', 'error'); return; }

  const total = getCartTotal();
  if (currentCardData && currentCardData.balance < total) {
    showCheckoutMsg(`Insufficient balance! Need $${total.toFixed(2)}, have $${currentCardData.balance.toFixed(2)}. Transaction rolled back.`, 'error');
    return;
  }

  let passcode = null;
  if (currentCardData && currentCardData.passcodeSet) {
    passcode = Array.from(document.querySelectorAll('.checkout-pass')).map(i => i.value).join('');
    if (passcode.length !== 6) {
      showCheckoutPassError('Enter your 6-digit passcode');
      return;
    }
  }

  const btn = document.getElementById('checkout-pay-btn');
  btn.disabled = true; btn.textContent = '⏳ Processing...';

  const items = cart.map(i => ({ id: i.product._id, name: i.product.name, price: i.product.price, qty: i.qty }));
  const desc = `Purchase: ${cart.map(i => i.qty > 1 ? `${i.product.name} x${i.qty}` : i.product.name).join(', ')}`;


  try {
    const body = { uid: lastScannedUid, amount: total, description: desc, items, processedBy: currentUser.username, sessionId, deviceId: scannerId };
    if (passcode) body.passcode = passcode;

    const res = await fetch(`${BACKEND_URL}/pay`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.success) {
      currentCardData = data.card;
      const salesCardBal = document.getElementById('sales-card-balance');
      if (salesCardBal) salesCardBal.textContent = `Frw ${data.card.balance.toLocaleString()}`;

      showCheckoutMsg(`✅ Payment of Frw ${data.transaction.amount.toLocaleString()} successful!`, 'success');
      showToast(`Payment successful! Balance: Frw ${data.card.balance.toLocaleString()}`, 'success');

      // Show receipt
      const transaction = {
        ...data.transaction,
        holderName: data.card.holderName,
        uid: data.card.uid
      };
      showReceipt(transaction);

      // Notify user that receipt is being emailed (by backend)
      if (data.card.email && data.card.email.trim()) {
        showToast(`Receipt emailed to ${data.card.email}`, 'success');
      }

      // Clear cart after successful payment
      cart = [];
      saveCartToStorage();
      localStorage.removeItem('tapandpay_cart');
      updateSalesCartUI();
      loadSalesProducts(); // Refresh stock counts from server
      updateCheckoutView();
      document.querySelectorAll('.checkout-pass').forEach(i => i.value = '');
      loadSalesHistory();
    } else {
      // Clear passcode on error (especially for invalid passcode)
      if (data.error && (data.error.toLowerCase().includes('passcode') || data.error.toLowerCase().includes('incorrect'))) {
        clearCheckoutPasscode();
        showCheckoutPassError(data.error);
      }

      if (data.rolledBack) showCheckoutMsg(`❌ ${data.error} (Transaction rolled back)`, 'error');
      else showCheckoutMsg(`❌ ${data.error}`, 'error');
    }
  } catch (err) {
    showCheckoutMsg('❌ Payment failed. Could not connect to server.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = '💳 Pay Now';
    updateCheckoutPayBtn();
  }
}

function showCheckoutMsg(msg, type) {
  const el = document.getElementById('checkout-payment-msg');
  if (!el) return;
  el.textContent = msg; el.className = `payment-status-msg show ${type}`;
  setTimeout(() => { el.className = 'payment-status-msg'; }, 6000);
}

function showCheckoutPassError(msg) {
  const el = document.getElementById('checkout-pass-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';

  // Shake animation on passcode inputs
  document.querySelectorAll('.checkout-pass').forEach(i => {
    i.style.animation = 'shake 0.5s';
    setTimeout(() => i.style.animation = '', 500);
  });

  // Hide error after 3 seconds
  setTimeout(() => {
    el.style.display = 'none';
  }, 3000);
}

function clearCheckoutPasscode() {
  document.querySelectorAll('.checkout-pass').forEach(i => i.value = '');
  const firstInput = document.querySelector('.checkout-pass[data-index="0"]');
  if (firstInput) setTimeout(() => firstInput.focus(), 100);
}

async function loadSalesHistory() {
  if (!lastScannedUid) return;
  try {
    const res = await fetch(`${BACKEND_URL}/transactions/${lastScannedUid}`);
    const txs = await res.json();
    const topups = txs.filter(t => t.type === 'topup');
    const debits = txs.filter(t => t.type === 'debit');
    const el = id => document.getElementById(id);
    if (el('s-topup-count')) el('s-topup-count').textContent = topups.length;
    if (el('s-purchase-count')) el('s-purchase-count').textContent = debits.length;
    renderTxList('s-topup-history', topups);
    renderTxList('s-purchase-history', debits);
  } catch (err) { console.error('History error:', err); }
}

function updateSalesCardInfo(data) {
  const info = document.getElementById('sales-card-info');
  if (!info) return;
  if (data) {
    info.innerHTML = `
      <div class="data-row"><span class="data-label">UID</span><span class="data-value" style="font-family:monospace;font-size:.8rem">${data.uid}</span></div>
      <div class="data-row"><span class="data-label">Holder</span><span class="data-value">${data.holderName}</span></div>
      <div class="data-row"><span class="data-label">Balance</span><span class="data-value" style="color:var(--primary);font-size:1.1rem">Frw ${data.balance.toLocaleString()}</span></div>
      <div class="data-row"><span class="data-label">Status</span><span class="data-value" style="color:var(--success)">${data.status || 'Active'}</span></div>
      <div class="data-row"><span class="data-label">Passcode</span><span class="data-value" style="color:${data.passcodeSet ? 'var(--success)' : 'var(--warning)'}">${data.passcodeSet ? '🔒 Protected' : '⚠️ Not Set'}</span></div>
      ${data.email ? `<div class="data-row"><span class="data-label">Email</span><span class="data-value">${data.email}</span></div>` : ''}
      ${data.phone ? `<div class="data-row"><span class="data-label">Phone</span><span class="data-value">${data.phone}</span></div>` : ''}
      <div class="data-row"><span class="data-label">Registered</span><span class="data-value" style="font-size:.8rem;color:var(--text-dim)">${new Date(data.createdAt).toLocaleDateString()}</span></div>
    `;
  } else {
    info.innerHTML = '<div class="status-placeholder">Card not found in database</div>';
  }
}
