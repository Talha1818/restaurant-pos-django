/* ─── COMMON: CSRF / fetch helper ─── */
function getCookie(name) {
  let value = null;
  if (document.cookie && document.cookie !== '') {
    document.cookie.split(';').forEach(c => {
      c = c.trim();
      if (c.startsWith(name + '=')) value = decodeURIComponent(c.substring(name.length + 1));
    });
  }
  return value;
}
const CSRF_TOKEN = getCookie('csrftoken');

async function apiFetch(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': CSRF_TOKEN } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  return r.json();
}

/* ─── TOAST ─── */
function showToast(msg) {
  const t = document.getElementById('toast-msg');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ─── MODAL ─── */
function openModal(title, formHTML, saveFn, saveLbl, cancelLbl) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-form').innerHTML = formHTML;
  const sb = document.getElementById('modal-save-btn');
  sb.textContent = saveLbl || 'Save';
  sb.onclick = saveFn;
  document.getElementById('modal-cancel-btn').textContent = cancelLbl || 'Cancel';
  document.getElementById('modal-bg').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
}
document.addEventListener('DOMContentLoaded', () => {
  const bg = document.getElementById('modal-bg');
  if (bg) bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
});

/* ─── PRINT ─── */
let BRAND = { name: 'Nawab Restaurant', phone: '', address: '' };
(async function loadBrand() {
  try {
    const s = await apiFetch('/api/settings/');
    BRAND = { name: s.restaurant_name || 'Nawab Restaurant', phone: s.phone || '', address: s.address || '' };
  } catch (e) { /* keep defaults */ }
})();

function printReceipt(innerHTML) {
  const area = document.getElementById('print-area');
  if (!area) { showToast('Print area not found'); return; }
  area.innerHTML = innerHTML;
  setTimeout(() => window.print(), 50);
}
function receiptHTML({ id, table, cust, payment, notes, items, sub, tax, extra, total, date, time, restaurant }) {
  const rows = items.map(it => `<div class="pr-row"><span>${it.icon || ''} ${it.name} ×${it.qty}</span><span>PKR ${(it.price * it.qty).toLocaleString()}</span></div>`).join('');
  const b = restaurant || BRAND;
  return `<div class="pr-header">
      <img src="/static/pos/images/logo.png" alt="${b.name}" style="width:40px;height:40px;object-fit:contain;border-radius:8px;margin:0 auto 6px;display:block">
      <div style="font-weight:700;font-size:13px">${b.name || 'Nawab Restaurant'}</div>
      ${b.address ? `<div style="font-size:9px;color:#666;margin-top:2px">${b.address}</div>` : ''}
      ${b.phone ? `<div style="font-size:9px;color:#666">${b.phone}</div>` : ''}
      <div style="font-size:10.5px;margin-top:5px">Table <strong>${table || '—'}</strong> &nbsp;·&nbsp; ${date || ''} ${time || ''}</div>
      <div style="font-size:9.5px;color:#555">Order #${String(id).padStart(4, '0')} &nbsp;·&nbsp; ${cust || 1} guest${(cust || 1) > 1 ? 's' : ''} &nbsp;·&nbsp; ${payment === 'Cash' ? '💵' : '📱'} ${payment}</div>
    </div>
    ${rows}
    ${notes ? `<div style="margin-top:6px;font-size:10px"><em>📝 ${notes}</em></div>` : ''}
    <div class="pr-total">
      <div class="pr-row"><span>Subtotal</span><span>PKR ${sub.toLocaleString()}</span></div>
      <div class="pr-row"><span>Tax</span><span>PKR ${tax.toLocaleString()}</span></div>
      ${extra ? `<div class="pr-row"><span>Extra</span><span>PKR ${extra.toLocaleString()}</span></div>` : ''}
      <div class="pr-row" style="font-size:13px;font-weight:700"><span>Total</span><span>PKR ${total.toLocaleString()}</span></div>
    </div>
    <div class="pr-footer">Thank you for dining with us! 🙏</div>`;
}

/* ─── FOOD EMOJI PICKER ─── */
const FOOD_EMOJIS = [
  ['🍗', 'Chicken leg'], ['🍖', 'Meat on bone'], ['🥩', 'Steak/meat'], ['🍤', 'Shrimp/kabab'],
  ['🍛', 'Curry/rice'], ['🍚', 'Rice'], ['🍲', 'Karahi/stew'], ['🥘', 'Handi/paella'],
  ['🍜', 'Noodles/soup'], ['🍕', 'Pizza'], ['🍔', 'Burger'], ['🌮', 'Taco/wrap'],
  ['🌯', 'Roll/wrap'], ['🥙', 'Shawarma/gyro'], ['🧆', 'Falafel/kabab'], ['🫓', 'Naan/flatbread'],
  ['🥗', 'Salad'], ['🍅', 'Tomato/raita'], ['🥒', 'Vegetables'], ['🌶️', 'Spicy/chili'],
  ['🍳', 'Egg dish'], ['🍰', 'Cake/dessert'], ['🍮', 'Custard/kheer'], ['🍩', 'Donut'],
  ['🍦', 'Ice cream'], ['🥧', 'Pie'], ['🍯', 'Honey/sweet'], ['🍞', 'Bread'],
  ['🥤', 'Soft drink'], ['🧃', 'Juice'], ['☕', 'Tea/coffee'], ['🍹', 'Mocktail'],
  ['🍷', 'Beverage'], ['🥛', 'Milk/lassi'], ['🍽️', 'Meal/platter'], ['🔥', 'Grill/BBQ'],
];
function emojiSelectHTML(id, selected) {
  const opts = FOOD_EMOJIS.map(([e, label]) => `<option value="${e}" ${e === selected ? 'selected' : ''}>${e}  ${label}</option>`).join('');
  const customSelected = selected && !FOOD_EMOJIS.some(([e]) => e === selected);
  return `<select id="${id}">${customSelected ? `<option value="${selected}" selected>${selected}  Current</option>` : ''}${opts}</select>`;
}

/* ─── THEME ─── */
function setTheme(cls, dot) {
  document.body.className = cls;
  document.querySelectorAll('.theme-dot').forEach(d => d.classList.remove('active'));
  if (dot) dot.classList.add('active');
  localStorage.setItem('nawab_theme', cls);
}
(function () {
  const t = localStorage.getItem('nawab_theme') || '';
  if (t) document.body.className = t;
  document.addEventListener('DOMContentLoaded', () => {
    const dot = document.querySelector(t ? `.theme-dot[data-theme="${t}"]` : '.t-classic');
    if (dot) dot.classList.add('active');
  });
})();
