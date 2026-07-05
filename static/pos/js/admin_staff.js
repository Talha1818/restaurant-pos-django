let staffData = [];

async function loadStaff() {
  const r = await apiFetch('/api/admin/staff/');
  staffData = r.staff || [];
  renderStaffTable();
}

function renderStaffTable() {
  const q = (document.getElementById('staff-search')?.value || '').toLowerCase();
  const filtered = staffData.filter(s => !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || (s.phone || '').includes(q));
  document.getElementById('staff-count').textContent = `Staff (${staffData.length})`;
  document.getElementById('staff-tbody').innerHTML = filtered.map(s => `<tr>
    <td><div style="display:flex;align-items:center;gap:8px">
      <div style="width:28px;height:28px;border-radius:50%;background:var(--gold-bg);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:500;color:var(--gold);flex-shrink:0">${s.name.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
      ${s.name}
    </div></td>
    <td><span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--teal-bg);color:var(--teal)">${s.role}</span></td>
    <td style="color:var(--ink2);font-size:12px">${s.shift}</td>
    <td style="color:var(--ink3)">${s.phone || '—'}</td>
    <td>${s.is_admin ? '<span class="badge-admin">Admin</span>' : '<span style="color:var(--ink3);font-size:11px">—</span>'}</td>
    <td><div class="act-btns">
      <button class="act-btn" onclick="editStaffModal(${s.id})"><i class="ti ti-edit"></i></button>
      <button class="act-btn del" onclick="delStaffDB(${s.id})"><i class="ti ti-trash"></i></button>
    </div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--ink3);padding:20px">${q ? 'No staff match your search' : 'No staff yet'}</td></tr>`;
}

function addStaffModal() {
  openModal('Add staff', `
    <div class="form-row"><label>Full name</label><input id="sf-name" type="text"></div>
    <div class="form-2col">
      <div class="form-row"><label>Role</label><select id="sf-role"><option>Waiter</option><option>Cashier</option><option>Chef</option><option>Manager</option><option>Cleaner</option></select></div>
      <div class="form-row"><label>Shift</label><select id="sf-shift"><option>Morning</option><option>Evening</option><option>Both</option></select></div>
    </div>
    <div class="form-row"><label>Phone (optional)</label><input id="sf-phone" type="text" placeholder="+92 300 0000000"></div>
    <div class="form-check"><input type="checkbox" id="sf-admin" style="width:16px;height:16px"> <label for="sf-admin" style="font-size:12.5px;color:var(--ink2)">Grant admin panel access</label></div>`, async () => {
    const name = document.getElementById('sf-name').value.trim();
    if (!name) { showToast('Enter name'); return; }
    await apiFetch('/api/admin/staff/', 'POST', {
      action: 'add', name, role: document.getElementById('sf-role').value, shift: document.getElementById('sf-shift').value,
      phone: document.getElementById('sf-phone').value.trim(), is_admin: document.getElementById('sf-admin').checked,
    });
    showToast('Staff added'); closeModal(); loadStaff();
  });
}
function editStaffModal(id) {
  const s = staffData.find(x => x.id === id); if (!s) return;
  openModal('Edit staff', `
    <div class="form-row"><label>Full name</label><input id="sf-name" type="text" value="${s.name}"></div>
    <div class="form-2col">
      <div class="form-row"><label>Role</label><select id="sf-role">${['Waiter', 'Cashier', 'Chef', 'Manager', 'Cleaner'].map(r => `<option ${r === s.role ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="form-row"><label>Shift</label><select id="sf-shift">${['Morning', 'Evening', 'Both'].map(sh => `<option ${sh === s.shift ? 'selected' : ''}>${sh}</option>`).join('')}</select></div>
    </div>
    <div class="form-row"><label>Phone (optional)</label><input id="sf-phone" type="text" value="${s.phone || ''}"></div>
    <div class="form-check"><input type="checkbox" id="sf-admin" ${s.is_admin ? 'checked' : ''} style="width:16px;height:16px"> <label for="sf-admin" style="font-size:12.5px;color:var(--ink2)">Grant admin panel access</label></div>`, async () => {
    await apiFetch('/api/admin/staff/', 'POST', {
      action: 'edit', id, name: document.getElementById('sf-name').value.trim(), role: document.getElementById('sf-role').value,
      shift: document.getElementById('sf-shift').value, phone: document.getElementById('sf-phone').value.trim(),
      is_admin: document.getElementById('sf-admin').checked,
    });
    showToast('Staff updated'); closeModal(); loadStaff();
  });
}
async function delStaffDB(id) {
  if (!confirm('Remove this staff member?')) return;
  await apiFetch('/api/admin/staff/', 'POST', { action: 'delete', id });
  showToast('Staff removed'); loadStaff();
}

loadStaff();
