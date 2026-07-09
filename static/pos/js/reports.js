// let currentPeriod = 'today';
// let customFrom = '', customTo = '';
// const PAY_COLORS = { Cash: 'var(--gold)', Online: 'var(--teal)' };
// const STATUS_COLORS = { done: 'var(--green)', pending: 'var(--gold)', cancelled: 'var(--red)' };

// function repFilter(period, btn) {
//   if (period === 'custom') {
//     openModal('Custom date range', `
//       <div class="form-2col">
//         <div class="form-row"><label>From</label><input id="cf-from" type="date" value="${customFrom}"></div>
//         <div class="form-row"><label>To</label><input id="cf-to" type="date" value="${customTo}"></div>
//       </div>`, () => {
//       customFrom = document.getElementById('cf-from').value;
//       customTo = document.getElementById('cf-to').value;
//       if (!customFrom || !customTo) { showToast('Pick both dates'); return; }
//       currentPeriod = 'custom';
//       document.querySelectorAll('.topbar-right .chip').forEach(c => c.classList.remove('active'));
//       document.getElementById('rf-custom').classList.add('active');
//       closeModal();
//       loadReports();
//     }, 'Apply');
//     return;
//   }
//   currentPeriod = period;
//   document.querySelectorAll('.topbar-right .chip').forEach(c => c.classList.remove('active'));
//   if (btn) btn.classList.add('active');
//   loadReports();
// }

// async function loadReports() {
//   let url = `/api/reports/?period=${currentPeriod}`;
//   if (currentPeriod === 'custom') url += `&from=${customFrom}&to=${customTo}`;
//   const r = await apiFetch(url);
//   renderReports(r);
// }

// function changeTag(pct) {
//   if (pct === null || pct === undefined) return `<div class="stat-change" style="color:var(--ink3)">vs previous period —</div>`;
//   const up = pct >= 0;
//   return `<div class="stat-change ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(pct)}% vs previous period</div>`;
// }

// function renderReports(r) {
//   const layout = document.getElementById('rep-layout');
//   const maxBar = Math.max(1, ...r.bars);
//   const bars = r.bars.map((v, i) => {
//     const isTop = v === maxBar && v > 0;
//     return `<div class="bar-col">
//       <span class="bar-val">${v > 0 ? (v / 1000).toFixed(1) + 'k' : ''}</span>
//       <div class="bar-fill ${isTop ? 'top' : ''}" style="height:${Math.max(4, v / maxBar * 90)}px"></div>
//       <span class="bar-label">${r.labels[i]}</span>
//     </div>`;
//   }).join('');

//   const topDishes = r.top_dishes.length ? r.top_dishes.map((d, i) => `
//     <div class="top-item-row">
//       <span class="ti-rank ${i === 0 ? 'gold' : ''}">${i + 1}</span>
//       <span class="ti-name">${d.name}</span>
//       <span class="ti-rev">PKR ${Math.round(d.revenue).toLocaleString()}</span>
//     </div>`).join('') : `<div style="text-align:center;color:var(--ink3);font-size:12px;padding:16px">No completed sales in this range yet</div>`;

//   function donut(entries, colors, iconMap) {
//     const filtered = entries.filter(([, pct]) => pct > 0);
//     const parts = []; let acc = 0;
//     (filtered.length ? filtered : [['none', 0]]).forEach(([k, pct]) => { parts.push(`${colors[k] || '#ccc'} ${acc}% ${acc + pct}%`); acc += pct; });
//     const style = filtered.length ? `conic-gradient(${parts.join(',')})` : 'var(--paper)';
//     const legend = entries.map(([k, pct]) => `<div class="dl-row"><span class="dl-dot" style="background:${colors[k] || '#ccc'}"></span>${(iconMap && iconMap[k]) || ''} ${k[0].toUpperCase() + k.slice(1)}<span class="dl-pct">${pct}%</span></div>`).join('');
//     return `<div class="payment-donut">
//         <div style="width:84px;height:84px;border-radius:50%;background:${style};flex-shrink:0;position:relative">
//           <div style="position:absolute;inset:14px;background:var(--card);border-radius:50%"></div>
//         </div>
//         <div class="donut-legend">${legend}</div>
//       </div>`;
//   }

//   const paymentDonut = donut(Object.entries(r.payments), PAY_COLORS, { Cash: '💵', Online: '📱' });
//   const statusDonut = donut(Object.entries(r.order_status), STATUS_COLORS, { done: '✅', pending: '⏳', cancelled: '❌' });

//   const recentRows = r.recent_orders.length ? r.recent_orders.map(o => `
//     <div class="ro-row">
//       <span class="ro-id">#${String(o.id).padStart(4, '0')}</span>
//       <span class="ro-items" title="${o.items}">${o.items}</span>
//       <span class="ro-table">${o.table}</span>
//       <span class="ro-time">${o.time}</span>
//       <span class="ro-amt">PKR ${o.amt.toLocaleString()}</span>
//     </div>`).join('') : `<div style="text-align:center;color:var(--ink3);font-size:12px;padding:16px">No orders in this range</div>`;

//   layout.innerHTML = `
//     <div class="rep-cal-row">
//       <label>Range:</label>
//       <span style="font-size:12px;color:var(--ink)">${periodLabel()}</span>
//       <span class="cal-sep">·</span>
//       <span class="cal-result">${r.orders} order${r.orders === 1 ? '' : 's'} completed</span>
//     </div>
//     <div class="stat-row">
//       <div class="stat-card" style="border-top-color:var(--gold)"><div class="stat-label">Total sales</div><div class="stat-val">PKR ${Math.round(r.sales).toLocaleString()}</div>${changeTag(r.changes.sales)}</div>
//       <div class="stat-card" style="border-top-color:var(--magenta)"><div class="stat-label">Orders completed</div><div class="stat-val">${r.orders}</div>${changeTag(r.changes.orders)}</div>
//       <div class="stat-card" style="border-top-color:var(--teal)"><div class="stat-label">Average order value</div><div class="stat-val">PKR ${Math.round(r.avg).toLocaleString()}</div>${changeTag(r.changes.avg)}</div>
//       <div class="stat-card" style="border-top-color:var(--maroon)"><div class="stat-label">Tax collected</div><div class="stat-val">PKR ${Math.round(r.tax).toLocaleString()}</div>${changeTag(r.changes.tax)}</div>
//     </div>
//     <div class="rep-grid">
//       <div class="rep-card">
//         <div class="rep-card-title">Sales trend</div>
//         <div class="chart-bars">${bars || '<div style="color:var(--ink3);font-size:12px;margin:auto">No data</div>'}</div>
//       </div>
//       <div class="rep-card">
//         <div class="rep-card-title">Top dishes by revenue</div>
//         ${topDishes}
//       </div>
//     </div>
//     <div class="rep-grid">
//       <div class="rep-card">
//         <div class="rep-card-title">Payment methods</div>
//         ${paymentDonut}
//       </div>
//       <div class="rep-card">
//         <div class="rep-card-title">Orders by status</div>
//         ${statusDonut}
//       </div>
//     </div>
//     <div class="recent-orders">
//       <div class="ro-title">Recent orders</div>
//       ${recentRows}
//     </div>`;
// }

// function periodLabel() {
//   if (currentPeriod === 'today') return 'Today';
//   if (currentPeriod === 'week') return 'Last 7 days';
//   if (currentPeriod === 'month') return 'Last 30 days';
//   if (currentPeriod === 'custom') return `${customFrom} → ${customTo}`;
//   return '';
// }

// loadReports();


let currentPeriod = 'today';
let customFrom = '', customTo = '';
const PAY_COLORS = { Cash: 'var(--gold)', Online: 'var(--teal)' };
const TYPE_COLORS = { 'Walk in': 'var(--blue)', 'Delivery': 'var(--red)', 'Takeaway': 'var(--green)' };
const STATUS_COLORS = { done: 'var(--green)', pending: 'var(--gold)', cancelled: 'var(--red)' };

function repFilter(period, btn) {
  if (period === 'custom') {
    openModal('Custom date range', `
      <div class="form-2col">
        <div class="form-row"><label>From</label><input id="cf-from" type="date" value="${customFrom}"></div>
        <div class="form-row"><label>To</label><input id="cf-to" type="date" value="${customTo}"></div>
      </div>`, () => {
      customFrom = document.getElementById('cf-from').value;
      customTo = document.getElementById('cf-to').value;
      if (!customFrom || !customTo) { showToast('Pick both dates'); return; }
      currentPeriod = 'custom';
      document.querySelectorAll('.topbar-right .chip').forEach(c => c.classList.remove('active'));
      document.getElementById('rf-custom').classList.add('active');
      closeModal();
      loadReports();
    }, 'Apply');
    return;
  }
  currentPeriod = period;
  document.querySelectorAll('.topbar-right .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadReports();
}

async function loadReports() {
  let url = `/api/reports/?period=${currentPeriod}`;
  if (currentPeriod === 'custom') url += `&from=${customFrom}&to=${customTo}`;
  const r = await apiFetch(url);
  renderReports(r);
}

function changeTag(pct) {
  if (pct === null || pct === undefined) return `<span class="stat-change" style="color:var(--ink3)">vs previous period —</span>`;
  const up = pct >= 0;
  return `<span class="stat-change ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(pct)}% vs previous period</span>`;
}

function statCard(cls, icon, label, val) {
  return `<div class="stat-card ${cls}">
    <div class="stat-icon"><i class="ti ${icon}"></i></div>
    <div class="stat-body">
      <div class="stat-label">${label}</div>
      <div class="stat-val">${val.val}</div>
      ${changeTag(val.pct)}
    </div>
  </div>`;
}

function renderReports(r) {
  const layout = document.getElementById('rep-layout');
  const maxBar = Math.max(1, ...r.bars);
  const bars = r.bars.map((v, i) => {
    const isTop = v === maxBar && v > 0;
    return `<div class="bar-col">
      <span class="bar-val">${v > 0 ? (v / 1000).toFixed(1) + 'k' : ''}</span>
      <div class="bar-fill ${isTop ? 'top' : ''}" style="height:${Math.max(4, v / maxBar * 90)}px"></div>
      <span class="bar-label">${r.labels[i]}</span>
    </div>`;
  }).join('');

  const topDishes = r.top_dishes.length ? r.top_dishes.map((d, i) => `
    <div class="top-item-row">
      <span class="ti-rank ${i === 0 ? 'gold' : ''}">${i + 1}</span>
      <span class="ti-name">${d.name}</span>
      <span class="ti-rev">PKR ${Math.round(d.revenue).toLocaleString()}</span>
    </div>`).join('') : `<div style="text-align:center;color:var(--ink3);font-size:12px;padding:16px">No completed sales in this range yet</div>`;

  function donut(entries, colors, iconMap) {
    const filtered = entries.filter(([, pct]) => pct > 0);
    const parts = []; let acc = 0;
    (filtered.length ? filtered : [['none', 0]]).forEach(([k, pct]) => { parts.push(`${colors[k] || '#ccc'} ${acc}% ${acc + pct}%`); acc += pct; });
    const style = filtered.length ? `conic-gradient(${parts.join(',')})` : 'var(--paper)';
    const legend = entries.map(([k, pct]) => `<div class="dl-row"><span class="dl-dot" style="background:${colors[k] || '#ccc'}"></span>${(iconMap && iconMap[k]) || ''} ${k[0].toUpperCase() + k.slice(1)}<span class="dl-pct">${pct}%</span></div>`).join('');
    return `<div class="payment-donut">
        <div style="width:84px;height:84px;border-radius:50%;background:${style};flex-shrink:0;position:relative">
          <div style="position:absolute;inset:14px;background:var(--card);border-radius:50%"></div>
        </div>
        <div class="donut-legend">${legend}</div>
      </div>`;
  }

  const paymentDonut = donut(Object.entries(r.payments), PAY_COLORS, { Cash: '💵', Online: '📱' });
  const typeDonut = donut(Object.entries(r.order_types || {}), TYPE_COLORS, { 'Walk in': '🪑', 'Delivery': '🛵', 'Takeaway': '🥡' });
  const statusDonut = donut(Object.entries(r.order_status), STATUS_COLORS, { done: '✅', pending: '⏳', cancelled: '❌' });

  const recentRows = r.recent_orders.length ? r.recent_orders.map(o => `
    <div class="ro-row">
      <span class="ro-id">#${String(o.id).padStart(4, '0')}</span>
      <span class="ro-items" title="${o.items}">${o.items}</span>
      <span class="ro-table">${o.table}</span>
      <span class="ro-time">${o.time}</span>
      <span class="ro-amt">PKR ${o.amt.toLocaleString()}</span>
    </div>`).join('') : `<div style="text-align:center;color:var(--ink3);font-size:12px;padding:16px">No orders in this range</div>`;

  layout.innerHTML = `
    <div class="rep-cal-row">
      <label>Range:</label>
      <span style="font-size:12px;color:var(--ink)">${periodLabel()}</span>
      <span class="cal-sep">·</span>
      <span class="cal-result">${r.orders} order${r.orders === 1 ? '' : 's'} completed</span>
    </div>
    <div class="stat-row">
      ${statCard('c-gold', 'ti-cash', 'Total sales', { val: 'PKR ' + Math.round(r.sales).toLocaleString(), pct: r.changes.sales })}
      ${statCard('c-red', 'ti-receipt', 'Orders completed', { val: r.orders, pct: r.changes.orders })}
      ${statCard('c-teal', 'ti-chart-line', 'Average order value', { val: 'PKR ' + Math.round(r.avg).toLocaleString(), pct: r.changes.avg })}
      ${statCard('c-blue', 'ti-receipt-tax', 'Tax collected', { val: 'PKR ' + Math.round(r.tax).toLocaleString(), pct: r.changes.tax })}
    </div>
    <div class="rep-grid">
      <div class="rep-card">
        <div class="rep-card-title">Sales trend</div>
        <div class="chart-bars">${bars || '<div style="color:var(--ink3);font-size:12px;margin:auto">No data</div>'}</div>
      </div>
      <div class="rep-card">
        <div class="rep-card-title">Top dishes by revenue</div>
        ${topDishes}
      </div>
    </div>
    <div class="rep-grid">
      <div class="rep-card">
        <div class="rep-card-title">Payment methods</div>
        ${paymentDonut}
      </div>
      <div class="rep-card">
        <div class="rep-card-title">Order type</div>
        ${typeDonut}
      </div>
    </div>
    <div class="rep-grid">
      <div class="rep-card">
        <div class="rep-card-title">Orders by status</div>
        ${statusDonut}
      </div>
    </div>
    <div class="recent-orders">
      <div class="ro-title">Recent orders</div>
      ${recentRows}
    </div>`;
}

function periodLabel() {
  if (currentPeriod === 'today') return 'Today';
  if (currentPeriod === 'week') return 'Last 7 days';
  if (currentPeriod === 'month') return 'Last 30 days';
  if (currentPeriod === 'custom') return `${customFrom} → ${customTo}`;
  return '';
}

loadReports();