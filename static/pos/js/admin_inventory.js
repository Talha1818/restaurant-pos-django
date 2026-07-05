let inventoryData = [];

async function loadInventory() {
  const r = await apiFetch('/api/admin/inventory/');
  inventoryData = r.ingredients || [];
  renderInventoryTable();
}

function renderInventoryTable() {
  const q = (document.getElementById('inv-search')?.value || '').toLowerCase();
  const filtered = inventoryData.filter(ing => !q || ing.name.toLowerCase().includes(q));
  document.getElementById('inv-count').textContent = `Inventory — raw stock (${inventoryData.length})`;
  document.getElementById('inv-tbody').innerHTML = filtered.map(ing => {
    const low = ing.stock <= ing.low_threshold;
    const pct = Math.min(100, Math.round(ing.stock / Math.max(ing.stock, ing.low_threshold * 4 || 1) * 100));
    return `<tr class="${low ? 'inv-low' : ''}">
      <td>${ing.icon} ${ing.name}</td>
      <td style="${low ? 'color:var(--red);font-weight:500' : 'color:var(--ink)'}">${ing.stock} ${ing.unit}</td>
      <td>
        <div class="inv-bar-wrap"><div class="inv-bar" style="width:${pct}%"></div></div>
        <span style="font-size:10px;color:${low ? 'var(--red)' : 'var(--ink3)'}">${low ? '⚠ Low — reorder' : '✓ OK'}</span>
      </td>
      <td><div class="stock-ctrl">
        <input class="stock-inp" id="stk-${ing.id}" type="number" step="0.1" placeholder="+qty" min="0.1">
        <button class="act-btn" onclick="addStock(${ing.id})">Add</button>
        <button class="act-btn" onclick="editIngredientModal(${ing.id})" title="Edit"><i class="ti ti-edit"></i></button>
      </div></td>
      <td><button class="act-btn del" onclick="delIngredientDB(${ing.id})" title="Delete"><i class="ti ti-trash"></i></button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;color:var(--ink3);padding:20px">${q ? 'No ingredients match your search' : 'No ingredients yet — add one to start tracking stock'}</td></tr>`;
}

async function addStock(id) {
  const inp = document.getElementById('stk-' + id);
  const qty = parseFloat(inp.value);
  if (!qty || qty <= 0) { showToast('Enter a valid quantity'); return; }
  const r = await apiFetch('/api/admin/inventory/', 'POST', { action: 'add_stock', id, qty });
  showToast(`+${qty} added — new total ${r.stock}`);
  loadInventory();
}

function editIngredientModal(id) {
  const ing = inventoryData.find(i => i.id === id); if (!ing) return;
  openModal('Edit — ' + ing.name, `
    <div class="form-row"><label>Ingredient name</label><input id="ing-name" type="text" value="${ing.name}"></div>
    <div class="form-2col">
      <div class="form-row"><label>Unit</label><select id="ing-unit">
        <option value="kg" ${ing.unit === 'kg' ? 'selected' : ''}>kg</option>
        <option value="ltr" ${ing.unit === 'ltr' ? 'selected' : ''}>ltr</option>
        <option value="pcs" ${ing.unit === 'pcs' ? 'selected' : ''}>pcs</option>
      </select></div>
      <div class="form-row"><label>Icon</label>${emojiSelectHTML('ing-icon', ing.icon)}</div>
    </div>
    <div class="form-row"><label>Low stock alert below</label><input id="ing-low" type="number" step="0.1" value="${ing.low_threshold}"></div>
    <div class="form-row"><label>Set exact stock (override)</label><input id="ing-set" type="number" step="0.1" placeholder="Current: ${ing.stock}"></div>`, async () => {
    await apiFetch('/api/admin/inventory/', 'POST', {
      action: 'edit', id, name: document.getElementById('ing-name').value.trim(),
      unit: document.getElementById('ing-unit').value, icon: document.getElementById('ing-icon').value.trim(),
      low: parseFloat(document.getElementById('ing-low').value) || 0,
    });
    const setVal = document.getElementById('ing-set').value;
    if (setVal !== '') {
      await apiFetch('/api/admin/inventory/', 'POST', { action: 'update_stock', id, stock: parseFloat(setVal) });
    }
    showToast('Ingredient updated'); closeModal(); loadInventory();
  });
}

function addIngredientModal() {
  openModal('Add ingredient', `
    <div class="form-row"><label>Ingredient name</label><input id="ing-name" type="text" placeholder="e.g. Green chilies"></div>
    <div class="form-2col">
      <div class="form-row"><label>Unit</label><select id="ing-unit"><option value="kg">kg</option><option value="ltr">ltr</option><option value="pcs">pcs</option></select></div>
      <div class="form-row"><label>Icon</label>${emojiSelectHTML('ing-icon')}</div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Initial stock</label><input id="ing-stock" type="number" step="0.1" placeholder="10"></div>
      <div class="form-row"><label>Low stock alert below</label><input id="ing-low" type="number" step="0.1" placeholder="3"></div>
    </div>`, async () => {
    const name = document.getElementById('ing-name').value.trim();
    if (!name) { showToast('Enter a name'); return; }
    await apiFetch('/api/admin/inventory/', 'POST', {
      action: 'add', name, unit: document.getElementById('ing-unit').value,
      icon: document.getElementById('ing-icon').value.trim() || '📦',
      stock: parseFloat(document.getElementById('ing-stock').value) || 0,
      low: parseFloat(document.getElementById('ing-low').value) || 5,
    });
    showToast('Ingredient added'); closeModal(); loadInventory();
  });
}

async function delIngredientDB(id) {
  if (!confirm('Delete this ingredient? Any recipes using it will lose this ingredient.')) return;
  await apiFetch('/api/admin/inventory/', 'POST', { action: 'delete', id });
  showToast('Ingredient removed'); loadInventory();
}

loadInventory();
