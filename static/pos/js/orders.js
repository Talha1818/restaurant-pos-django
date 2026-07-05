let savedOrders = [];
let menuForEdit = null;
let editOrderState = null; // { orderId, order: {id: {item,qty}}, table, cust, payment, extra, notes }

async function loadOrders() {
  const r = await apiFetch('/api/orders/');
  savedOrders = r.orders || [];
  renderOrders();
}

function renderOrders() {
  const layout = document.getElementById('ord-layout');
  const pending = savedOrders.filter(o => o.status === 'pending').length;
  const done = savedOrders.filter(o => o.status === 'done').length;
  document.getElementById('ord-pending-chip').textContent = pending + ' pending';
  document.getElementById('ord-done-chip').textContent = done + ' done';

  const q = (document.getElementById('ord-search')?.value || '').toLowerCase().trim();
  const filtered = !q ? savedOrders : savedOrders.filter(o => {
    const idMatch = String(o.id).padStart(4, '0').includes(q) || String(o.id).includes(q);
    const tableMatch = o.table && String(o.table).includes(q);
    const payMatch = (o.payment || '').toLowerCase().includes(q);
    const itemsMatch = o.items.some(it => it.name.toLowerCase().includes(q));
    const notesMatch = (o.notes || '').toLowerCase().includes(q);
    return idMatch || tableMatch || payMatch || itemsMatch || notesMatch;
  });

  if (!filtered.length) {
    layout.innerHTML = `<div class="ord-empty"><i class="ti ti-receipt-off" style="font-size:40px;color:var(--line2)"></i><p style="font-size:13px">${q ? 'No orders match your search' : 'No saved orders yet'}</p><p style="font-size:11px;color:var(--ink3)">${q ? 'Try a different order #, table, item or payment method' : 'Save an order from POS to see it here'}</p></div>`;
    return;
  }
  layout.innerHTML = filtered.map(o => {
    const summary = o.items.map(x => x.name + (x.qty > 1 ? ` ×${x.qty}` : '')).join(', ');
    const isDone = o.status === 'done';
    return `<div class="ord-card">
      <div>
        <div class="ord-num">#${String(o.id).padStart(4, '0')}</div>
        <div class="ord-icon">${o.items[0]?.icon || '🍽'}</div>
      </div>
      <div class="ord-info">
        <div class="ord-meta">Table ${o.table || '—'} &nbsp;·&nbsp; ${o.cust || 1} guest${(o.cust || 1) > 1 ? 's' : ''} &nbsp;·&nbsp; ${o.payment === 'Cash' ? '💵' : '📱'} ${o.payment} &nbsp;·&nbsp; ${o.time}</div>
        <div class="ord-items-txt" title="${summary}">${summary}</div>
        ${o.notes ? `<div class="ord-notes-txt">📝 ${o.notes}</div>` : ''}
        <div class="ord-actions">
          <button class="act-btn" onclick="viewOrderCard(${o.id})"><i class="ti ti-${isDone ? 'receipt' : 'eye'}"></i> ${isDone ? 'Receipt' : 'View'}</button>
          <button class="act-btn" onclick="editOrderModal(${o.id})"><i class="ti ti-edit"></i> Edit</button>
          <button class="act-btn ${isDone ? 'done-btn' : ''}" onclick="markDone(${o.id})">${isDone ? '↺ Reopen' : '✓ Done'}</button>
          <button class="act-btn del" onclick="deleteOrderDB(${o.id})"><i class="ti ti-trash"></i> Delete</button>
        </div>
      </div>
      <div class="ord-right">
        <div class="ord-total">PKR ${o.total.toLocaleString()}</div>
        <span class="ord-status ${o.status}">${o.status}</span>
        <div class="ord-time">${o.date}</div>
      </div>
    </div>`;
  }).join('');
}

function viewOrderCard(id) {
  const o = savedOrders.find(x => x.id === id); if (!o) return;
  const rows = o.items.map(({ name, icon, qty, price }) =>
    `<div class="receipt-row"><span>${icon} ${name} ×${qty}</span><span>PKR ${(price * qty).toLocaleString()}</span></div>`).join('');
  const b = BRAND || { name: 'Nawab Restaurant' };
  openModal('Receipt — Order #' + String(o.id).padStart(4, '0'), `
    <div class="receipt-box">
      <div class="receipt-header">
        <img src="/static/pos/images/logo.png" alt="${b.name}" style="width:52px;height:52px;object-fit:contain;border-radius:10px;margin:0 auto 8px;display:block">
        <div style="font-weight:600;font-size:15px">${b.name || 'Nawab Restaurant'}</div>
        ${b.address ? `<div style="font-size:10.5px;color:var(--ink3);margin-top:2px">${b.address}</div>` : ''}
        ${b.phone ? `<div style="font-size:10.5px;color:var(--ink3)">${b.phone}</div>` : ''}
        <div style="font-size:11px;margin-top:6px">Table <strong>${o.table || '—'}</strong> &nbsp;·&nbsp; ${o.date} ${o.time}</div>
        <div style="font-size:11px;color:var(--ink3)">Order #${String(o.id).padStart(4, '0')} &nbsp;·&nbsp; ${o.cust || 1} guest${(o.cust || 1) > 1 ? 's' : ''} &nbsp;·&nbsp; ${o.payment === 'Cash' ? '💵' : '📱'} ${o.payment}</div>
      </div>
      <div style="margin-bottom:8px">${rows}</div>
      ${o.notes ? `<div style="padding:7px 9px;background:var(--gold-light);border-radius:7px;font-size:11px;color:var(--ink2);margin-bottom:8px">📝 <em>${o.notes}</em></div>` : ''}
      <div class="receipt-total">
        <div class="receipt-row" style="font-size:12px;color:var(--ink3)"><span>Subtotal</span><span>PKR ${o.sub.toLocaleString()}</span></div>
        <div class="receipt-row" style="font-size:12px;color:var(--ink3)"><span>Tax</span><span>PKR ${o.tax.toLocaleString()}</span></div>
        ${o.extra ? `<div class="receipt-row" style="font-size:12px;color:var(--ink3)"><span>Extra</span><span>PKR ${o.extra.toLocaleString()}</span></div>` : ''}
        <div class="receipt-row" style="font-size:15px;font-weight:600;margin-top:6px"><span>Total</span><span style="color:var(--gold)">PKR ${o.total.toLocaleString()}</span></div>
      </div>
      <div class="receipt-footer">Thank you for dining with us! 🙏</div>
    </div>`, () => printOrder(id), 'Print', 'Close');
}

function printOrder(id) {
  const o = savedOrders.find(x => x.id === id); if (!o) return;
  printReceipt(receiptHTML({
    id: o.id, table: o.table, cust: o.cust, payment: o.payment, notes: o.notes,
    items: o.items, sub: o.sub, tax: o.tax, extra: o.extra, total: o.total, date: o.date, time: o.time,
  }));
}

async function markDone(id) {
  const o = savedOrders.find(x => x.id === id); if (!o) return;
  const newStatus = o.status === 'done' ? 'pending' : 'done';
  await apiFetch(`/api/orders/${id}/update/`, 'POST', { status: newStatus });
  showToast(newStatus === 'done' ? 'Order marked done' : 'Order reopened');
  loadOrders();
}
async function deleteOrderDB(id) {
  if (!confirm('Delete this order? Any consumed stock will be restored.')) return;
  await apiFetch(`/api/orders/${id}/delete/`, 'POST');
  showToast('Order deleted');
  loadOrders();
}

/* ─── EDIT ORDER ─── */
async function editOrderModal(id) {
  const o = savedOrders.find(x => x.id === id); if (!o) return;
  if (!menuForEdit) menuForEdit = await apiFetch('/api/menu/');
  const orderMap = {};
  o.items.forEach(it => {
    const menuItem = menuForEdit.items.find(m => m.name === it.name);
    if (menuItem) orderMap[menuItem.id] = { item: menuItem, qty: it.qty };
  });
  editOrderState = { orderId: id, order: orderMap, table: o.table || '', cust: o.cust || 1, payment: o.payment, extra: o.extra || 0, notes: o.notes || '' };
  renderEditModal();
}
function renderEditModal() {
  const s = editOrderState;
  const itemOptions = menuForEdit.items.map(i => `<option value="${i.id}">${i.icon} ${i.name} — PKR ${i.price}</option>`).join('');
  const rows = Object.keys(s.order).map(id => {
    const { item, qty } = s.order[id];
    return `<div class="form-2col" style="align-items:center;margin-bottom:8px">
      <div style="font-size:12.5px;color:var(--ink)">${item.icon} ${item.name}</div>
      <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end">
        <button class="qb" onclick="editChQty(${id},-1)">−</button>
        <span class="qnum">${qty}</span>
        <button class="qb" onclick="editChQty(${id},1)">+</button>
        <button class="act-btn del" onclick="editRemoveItem(${id})"><i class="ti ti-x"></i></button>
      </div>
    </div>`;
  }).join('') || `<div style="font-size:12px;color:var(--ink3);text-align:center;padding:10px">No items — add one below</div>`;

  openModal('Edit order #' + String(s.orderId).padStart(4, '0'), `
    <div class="form-2col">
      <div class="form-row"><label>Table</label><input id="e-table" type="number" value="${s.table}"></div>
      <div class="form-row"><label>Guests</label><input id="e-cust" type="number" value="${s.cust}"></div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Payment</label><select id="e-payment"><option ${s.payment === 'Cash' ? 'selected' : ''}>Cash</option><option ${s.payment === 'Online' ? 'selected' : ''}>Online</option></select></div>
      <div class="form-row"><label>Extra (PKR)</label><input id="e-extra" type="number" value="${s.extra}"></div>
    </div>
    <div class="form-row"><label>Notes</label><textarea id="e-notes" rows="2">${s.notes}</textarea></div>
    <div class="form-row"><label>Items</label></div>
    <div id="edit-items-list">${rows}</div>
    <div class="form-2col" style="margin-top:6px">
      <select id="e-additem">${itemOptions}</select>
      <button class="act-btn" style="width:100%" onclick="editAddItem()"><i class="ti ti-plus"></i> Add item</button>
    </div>
  `, saveEditedOrder, 'Save changes');
}
function editChQty(id, d) {
  syncEditMetaFromForm();
  if (!editOrderState.order[id]) return;
  editOrderState.order[id].qty += d;
  if (editOrderState.order[id].qty <= 0) delete editOrderState.order[id];
  renderEditModal();
}
function editRemoveItem(id) {
  syncEditMetaFromForm();
  delete editOrderState.order[id];
  renderEditModal();
}
function editAddItem() {
  syncEditMetaFromForm();
  const id = parseInt(document.getElementById('e-additem').value);
  const item = menuForEdit.items.find(i => i.id === id);
  if (!item) return;
  if (!editOrderState.order[id]) editOrderState.order[id] = { item, qty: 0 };
  editOrderState.order[id].qty++;
  renderEditModal();
}
function syncEditMetaFromForm() {
  const t = document.getElementById('e-table'), c = document.getElementById('e-cust'), p = document.getElementById('e-payment'), ex = document.getElementById('e-extra'), n = document.getElementById('e-notes');
  if (!t) return;
  editOrderState.table = parseInt(t.value) || '';
  editOrderState.cust = parseInt(c.value) || 1;
  editOrderState.payment = p.value;
  editOrderState.extra = parseFloat(ex.value) || 0;
  editOrderState.notes = n.value;
}
async function saveEditedOrder() {
  syncEditMetaFromForm();
  const s = editOrderState;
  const keys = Object.keys(s.order);
  if (!keys.length) { showToast('Order must have at least one item'); return; }
  let sub = 0;
  const items = keys.map(id => { const { item, qty } = s.order[id]; sub += item.price * qty; return { id: parseInt(id), qty }; });
  const rate = (menuForEdit.tax_rate ?? 5) / 100;
  const tax = Math.round(sub * rate);
  const total = sub + tax + (s.extra || 0);
  const r = await apiFetch(`/api/orders/${s.orderId}/edit/`, 'POST', {
    table: s.table, cust: s.cust, payment: s.payment, extra: s.extra, notes: s.notes, sub, tax, total, items,
  });
  if (r.success) { showToast('Order updated'); closeModal(); loadOrders(); }
  else showToast(r.error || 'Could not update order');
}

/* ─── EXPORT TO EXCEL ─── */
function exportModal() {
  openModal('Export to Excel', `
    <div style="font-size:12.5px;color:var(--ink2);margin-bottom:14px">Download a spreadsheet (CSV, opens directly in Excel) of every saved order for the selected day.</div>
    <div class="form-row"><label>Which day?</label>
      <select id="exp-range">
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
      </select>
    </div>`, () => {
    const range = document.getElementById('exp-range').value;
    window.location.href = `/api/orders/export/?range=${range}`;
    showToast('Downloading sheet...');
    closeModal();
  }, 'Download', 'Cancel');
}

loadOrders();
