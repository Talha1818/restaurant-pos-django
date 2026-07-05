let menuData = { categories: [], items: [], ingredients: [], tax_rate: 5 };
if (!sessionStorage.getItem('nawab_defaults_v2')) {
  sessionStorage.removeItem('nawab_order_meta');
  sessionStorage.setItem('nawab_defaults_v2', '1');
}
let order = JSON.parse(sessionStorage.getItem('nawab_order') || '{}');
let orderMeta = JSON.parse(sessionStorage.getItem('nawab_order_meta') || '{"table":1,"cust":2,"payment":"Cash","extra":0}');
let orderNotes = sessionStorage.getItem('nawab_order_notes') || '';
let activeCat = 'all';

function persistOrder() {
  sessionStorage.setItem('nawab_order', JSON.stringify(order));
  sessionStorage.setItem('nawab_order_meta', JSON.stringify(orderMeta));
  sessionStorage.setItem('nawab_order_notes', orderNotes);
}

async function loadMenu() {
  menuData = await apiFetch('/api/menu/');
}

function initPOS() {
  document.getElementById('pos-date').textContent = menuData.server_date || '';
  document.getElementById('od-table').value = orderMeta.table || '';
  document.getElementById('od-cust').value = orderMeta.cust || '';
  document.getElementById('od-extra').value = orderMeta.extra || '';
  document.getElementById('order-notes').value = orderNotes;
  document.getElementById('ft-tax-rate').textContent = menuData.tax_rate ?? 5;
  setPayment(orderMeta.payment || 'Cash');
  renderCats();
  renderItems();
  renderOrder();
}

function renderCats() {
  const pills = `<button class="cat-pill ${activeCat === 'all' ? 'active' : ''}" onclick="filterCat('all',this)">All items</button>` +
    menuData.categories.map(c => `<button class="cat-pill ${activeCat == c.id ? 'active' : ''}" onclick="filterCat(${c.id},this)">${c.icon} ${c.name}</button>`).join('');
  document.getElementById('cat-pills').innerHTML = pills;
}
function filterCat(id, btn) {
  activeCat = id;
  document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderItems();
}
const CAT_COLOR_RAMP = ['var(--gold-bg)', 'var(--magenta-bg)', 'var(--teal-bg)', 'var(--maroon-bg)', 'var(--blue-bg)', 'var(--green-bg)'];
function catColor(catId) {
  const idx = menuData.categories.findIndex(c => c.id === catId);
  return CAT_COLOR_RAMP[(idx < 0 ? 0 : idx) % CAT_COLOR_RAMP.length];
}
function renderItems() {
  const q = (document.getElementById('pos-search').value || '').toLowerCase();
  const grid = document.getElementById('item-grid');
  const filtered = menuData.items.filter(i => {
    const matchCat = activeCat === 'all' || i.cat == activeCat;
    const matchQ = !q || i.name.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  if (!filtered.length) { grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:40px;font-size:13px">No items found</div>`; return; }
  grid.innerHTML = filtered.map(i => {
    const inOrder = order[i.id] ? order[i.id].qty : 0;
    const lowStk = i.stock < 10;
    return `<div class="item-card" onclick="addItem(${i.id})">
      <div class="item-img" style="background:${catColor(i.cat)}">${i.icon}${inOrder > 0 ? `<span style="position:absolute;top:5px;right:7px;background:var(--rail-bg);color:var(--rail-active);border-radius:10px;font-size:10px;padding:1px 6px;font-weight:500">${inOrder}</span>` : ''}</div>
      <div class="item-body">
        <div class="item-name">${i.name}</div>
        <div class="item-price">PKR ${i.price.toLocaleString()}</div>
        <div class="item-footer">
          <span class="item-stock" style="color:${lowStk ? 'var(--red)' : 'var(--ink3)'}">${i.stock === null ? '' : (lowStk ? '⚠ ' : '') + i.stock + ' left'}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
function addItem(id) {
  const item = menuData.items.find(i => i.id === id);
  if (!item) return;
  if (!order[id]) order[id] = { item, qty: 0 };
  order[id].qty++;
  persistOrder();
  renderItems(); renderOrder();
}
function chQty(id, d) {
  if (!order[id]) return;
  order[id].qty += d;
  if (order[id].qty <= 0) delete order[id];
  persistOrder();
  renderItems(); renderOrder();
}
function renderOrder() {
  const body = document.getElementById('op-body');
  const foot = document.getElementById('op-footer');
  const cnt = document.getElementById('order-count');
  const keys = Object.keys(order);
  cnt.textContent = keys.length + ' item' + (keys.length === 1 ? '' : 's');
  if (!keys.length) {
    body.innerHTML = `<div class="op-empty"><i class="ti ti-shopping-bag"></i><p>Add items from menu</p></div>`;
    foot.style.display = 'none'; return;
  }
  let sub = 0;
  body.innerHTML = keys.map(id => {
    const { item, qty } = order[id];
    const line = item.price * qty; sub += line;
    return `<div class="oi-row">
      <span class="oi-emoji">${item.icon}</span>
      <div class="oi-info">
        <div class="oi-name">${item.name}</div>
        <div class="oi-sub">PKR ${item.price.toLocaleString()} each</div>
        <div class="oi-ctrl">
          <button class="qb" onclick="chQty(${id},-1)">−</button>
          <span class="qnum">${qty}</span>
          <button class="qb" onclick="chQty(${id},1)">+</button>
        </div>
      </div>
      <span class="oi-price">PKR ${line.toLocaleString()}</span>
    </div>`;
  }).join('');
  const rate = (menuData.tax_rate ?? 5) / 100;
  const tax = Math.round(sub * rate);
  const extra = orderMeta.extra || 0;
  document.getElementById('ft-sub').textContent = 'PKR ' + sub.toLocaleString();
  document.getElementById('ft-tax').textContent = 'PKR ' + tax.toLocaleString();
  const er = document.getElementById('ft-extra-row');
  if (extra > 0) { er.style.display = 'flex'; document.getElementById('ft-extra').textContent = 'PKR ' + extra.toLocaleString(); }
  else er.style.display = 'none';
  document.getElementById('ft-total').textContent = 'PKR ' + (sub + tax + extra).toLocaleString();
  foot.style.display = 'block';
}
function updateOrderMeta() {
  orderMeta.table = Math.max(1, parseInt(document.getElementById('od-table').value) || 1);
  orderMeta.cust = Math.max(2, parseInt(document.getElementById('od-cust').value) || 2);
  orderMeta.extra = parseFloat(document.getElementById('od-extra').value) || 0;
  persistOrder();
  renderOrder();
}
function setPayment(m) {
  orderMeta.payment = m;
  document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('pay-' + m);
  if (btn) btn.classList.add('active');
  persistOrder();
}
function clearOrder() {
  order = {}; orderNotes = '';
  orderMeta = { table: 1, cust: 2, payment: 'Cash', extra: 0 };
  document.getElementById('od-table').value = 1;
  document.getElementById('od-cust').value = 2;
  ['od-extra', 'order-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  setPayment('Cash');
  persistOrder();
  renderItems(); renderOrder();
}
function buildOrderPayload(status) {
  updateOrderMeta();
  orderNotes = document.getElementById('order-notes').value;
  persistOrder();
  let sub = 0;
  const orderItems = Object.keys(order).map(id => {
    const { item, qty } = order[id]; sub += item.price * qty;
    return { id: parseInt(id), qty };
  });
  const rate = (menuData.tax_rate ?? 5) / 100;
  const tax = Math.round(sub * rate);
  const extra = orderMeta.extra || 0;
  return { table: orderMeta.table, cust: orderMeta.cust, payment: orderMeta.payment, extra, notes: orderNotes, sub, tax, total: sub + tax + extra, status, items: orderItems };
}
async function saveOrder() {
  if (!Object.keys(order).length) { showToast('No items in order'); return; }
  const payload = buildOrderPayload('pending');
  const r = await apiFetch('/api/orders/save/', 'POST', payload);
  if (r.success) {
    showToast('Order #' + String(r.order_id).padStart(4, '0') + ' saved');
    clearOrder();
    await loadMenu();
    setTimeout(() => { window.location.href = '/orders/'; }, 600);
  } else showToast(r.error || 'Could not save order');
}
async function doBill() {
  if (!Object.keys(order).length) { showToast('No items in order'); return; }
  const payload = buildOrderPayload('done');
  const itemsForReceipt = Object.values(order).map(({ item, qty }) => ({ name: item.name, icon: item.icon, qty, price: item.price }));
  const r = await apiFetch('/api/orders/save/', 'POST', payload);
  if (r.success) {
    printReceipt(receiptHTML({
      id: r.order_id, table: payload.table, cust: payload.cust, payment: payload.payment,
      notes: payload.notes, items: itemsForReceipt, sub: payload.sub, tax: payload.tax,
      extra: payload.extra, total: payload.total,
      date: r.date, time: r.time, restaurant: menuData.restaurant,
    }));
    showToast('Bill printed — Order #' + String(r.order_id).padStart(4, '0'));
    clearOrder();
    await loadMenu();
    renderItems();
  } else showToast(r.error || 'Could not print bill');
}

(async function () {
  await loadMenu();
  initPOS();
})();
