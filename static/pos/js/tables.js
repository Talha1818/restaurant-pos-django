async function initTables() {
  const r = await apiFetch('/api/tables/');
  const dbTables = r.tables || [];
  const ordersR = await apiFetch('/api/orders/');
  const orders = ordersR.orders || [];
  const sc = { occupied: 'var(--gold)', free: 'var(--teal)', reserved: 'var(--red)' };
  const sb = { occupied: 'var(--gold-bg)', free: 'var(--teal-bg)', reserved: 'var(--red-bg)' };
  let free = 0, occ = 0, res = 0, liveRevenue = 0;
  const floor = dbTables.map(t => {
    const activeOrder = orders.find(o => o.table === t.number && o.status === 'pending');
    const status = activeOrder ? 'occupied' : t.status;
    if (status === 'occupied') { occ++; liveRevenue += activeOrder ? activeOrder.total : 0; } else if (status === 'reserved') res++; else free++;
    return `<div class="table-card ${status}">
      <div class="tc-top">
        <span class="tc-name">Table ${t.number}</span>
        <span class="tc-status" style="background:${sb[status] || 'var(--paper)'};color:${sc[status] || 'var(--ink)'}">${status}</span>
      </div>
      <div class="tc-row"><i class="ti ti-users"></i> Cap: ${t.capacity}${activeOrder ? ` &nbsp;·&nbsp; ${activeOrder.cust || 1} guest${(activeOrder.cust || 1) > 1 ? 's' : ''}` : ''}</div>
      ${activeOrder ? `<div class="tc-order">
        <div class="tc-order-row"><span>Order #${String(activeOrder.id).padStart(4, '0')}</span><span style="font-size:10px;padding:2px 7px;border-radius:8px;background:var(--paper);color:var(--ink2)">${activeOrder.payment === 'Cash' ? '💵' : '📱'} ${activeOrder.payment}</span></div>
        <div class="tc-total">PKR ${activeOrder.total.toLocaleString()}</div>
      </div>` : ''}
    </div>`;
  }).join('');
  document.getElementById('table-floor').innerHTML = floor || `<div style="grid-column:1/-1;text-align:center;color:var(--ink3);padding:30px">No tables configured yet — one is created automatically when an order is saved with a table number.</div>`;
  document.getElementById('tbl-free-chip').textContent = free + ' free';
  document.getElementById('tbl-occ-chip').textContent = occ + ' occupied';
  document.getElementById('tbl-res-chip').textContent = res + ' reserved';
  document.getElementById('tbl-stats').innerHTML = `
    <div class="stat-card" style="border-top-color:var(--gold)"><div class="stat-label">Total tables</div><div class="stat-val">${dbTables.length}</div></div>
    <div class="stat-card" style="border-top-color:var(--magenta)"><div class="stat-label">Occupied</div><div class="stat-val">${occ}</div></div>
    <div class="stat-card" style="border-top-color:var(--teal)"><div class="stat-label">Free now</div><div class="stat-val">${free}</div></div>
    <div class="stat-card" style="border-top-color:var(--maroon)"><div class="stat-label">Live running total</div><div class="stat-val">PKR ${liveRevenue.toLocaleString()}</div></div>`;

//     document.getElementById('tbl-stats').innerHTML=`
// <div class="stat-card total"><div><div class="stat-label">Total Tables</div><div class="stat-val">${dbTables.length}</div></div><div class="stat-icon"><i class="ti ti-layout-grid"></i></div></div>
// <div class="stat-card occupied"><div><div class="stat-label">Occupied</div><div class="stat-val">${occ}</div></div><div class="stat-icon"><i class="ti ti-armchair"></i></div></div>
// <div class="stat-card free"><div><div class="stat-label">Available</div><div class="stat-val">${free}</div></div><div class="stat-icon"><i class="ti ti-check"></i></div></div>
// <div class="stat-card revenue"><div><div class="stat-label">Live Revenue</div><div class="stat-val">PKR ${liveRevenue.toLocaleString()}</div></div><div class="stat-icon"><i class="ti ti-cash"></i></div></div>`;


document.getElementById('tbl-stats').innerHTML = `
  <div class="stat-card c-gold"><div class="stat-icon"><i class="ti ti-layout-grid"></i></div><div class="stat-body"><div class="stat-label">Total tables</div><div class="stat-val">${dbTables.length}</div></div></div>
  <div class="stat-card c-red"><div class="stat-icon"><i class="ti ti-users"></i></div><div class="stat-body"><div class="stat-label">Occupied</div><div class="stat-val">${occ}</div></div></div>
  <div class="stat-card c-teal"><div class="stat-icon"><i class="ti ti-check"></i></div><div class="stat-body"><div class="stat-label">Free now</div><div class="stat-val">${free}</div></div></div>
  <div class="stat-card c-blue"><div class="stat-icon"><i class="ti ti-currency-rupee"></i></div><div class="stat-body"><div class="stat-label">Live running total</div><div class="stat-val">PKR ${liveRevenue.toLocaleString()}</div></div></div>`;
}





initTables();
