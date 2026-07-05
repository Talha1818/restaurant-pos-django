let itemsData = { items: [], categories: [], ingredients: [] };

async function loadItems() {
  itemsData = await apiFetch('/api/admin/items/');
  document.getElementById('items-count').textContent = `Menu items (${itemsData.items.length})`;
  document.getElementById('items-tbody').innerHTML = itemsData.items.map(i => `<tr>
    <td style="font-size:18px">${i.icon}</td>
    <td>${i.name}</td>
    <td><span style="font-size:10px;padding:2px 7px;border-radius:10px;background:var(--gold-bg);color:var(--gold)">${i.cat}</span></td>
    <td style="font-weight:500;color:var(--gold)">PKR ${i.price.toLocaleString()}</td>
    <td style="color:var(--ink2)">${i.stock}</td>
    <td><div class="act-btns">
      <button class="act-btn" onclick="editItemModal(${i.id})" title="Edit"><i class="ti ti-edit"></i></button>
      <button class="act-btn" onclick="recipeModal(${i.id})" title="Recipe"><i class="ti ti-list-details"></i></button>
      <button class="act-btn del" onclick="delItemDB(${i.id})" title="Delete"><i class="ti ti-trash"></i></button>
    </div></td>
  </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--ink3);padding:20px">No menu items yet</td></tr>`;
}

function addItemModal() {
  openModal('Add menu item', `
    <div class="form-row"><label>Item name</label><input id="m-name" type="text" placeholder="Chicken Tikka half kg"></div>
    <div class="form-2col">
      <div class="form-row"><label>Category</label><select id="m-cat">${itemsData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>Icon</label>${emojiSelectHTML('m-icon')}</div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Price (PKR)</label><input id="m-price" type="number" placeholder="700"></div>
      <div class="form-row"><label>Fallback stock</label><input id="m-stock" type="number" placeholder="20"></div>
    </div>`, async () => {
    const name = document.getElementById('m-name').value.trim();
    const price = parseInt(document.getElementById('m-price').value) || 0;
    if (!name || !price) { showToast('Fill name and price'); return; }
    await apiFetch('/api/admin/items/', 'POST', { action: 'add', name, cat_id: parseInt(document.getElementById('m-cat').value), price, icon: document.getElementById('m-icon').value.trim() || '🍽', stock: parseInt(document.getElementById('m-stock').value) || 20 });
    showToast('Item added'); closeModal(); loadItems();
  });
}
function editItemModal(id) {
  const i = itemsData.items.find(x => x.id === id); if (!i) return;
  openModal('Edit item', `
    <div class="form-row"><label>Name</label><input id="m-name" type="text" value="${i.name}"></div>
    <div class="form-2col">
      <div class="form-row"><label>Category</label><select id="m-cat">${itemsData.categories.map(c => `<option value="${c.id}" ${c.id === i.cat_id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>Icon</label>${emojiSelectHTML('m-icon', i.icon)}</div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Price (PKR)</label><input id="m-price" type="number" value="${i.price}"></div>
      <div class="form-row"><label>Fallback stock</label><input id="m-stock" type="number" value="${i.stock}"></div>
    </div>`, async () => {
    await apiFetch('/api/admin/items/', 'POST', { action: 'edit', id, name: document.getElementById('m-name').value.trim(), price: parseFloat(document.getElementById('m-price').value), icon: document.getElementById('m-icon').value.trim(), cat_id: parseInt(document.getElementById('m-cat').value), stock: parseInt(document.getElementById('m-stock').value) || 0 });
    showToast('Item updated'); closeModal(); loadItems();
  });
}
async function delItemDB(id) {
  if (!confirm('Delete this menu item?')) return;
  await apiFetch('/api/admin/items/', 'POST', { action: 'delete', id });
  showToast('Item removed'); loadItems();
}
function recipeModal(id) {
  const i = itemsData.items.find(x => x.id === id); if (!i) return;
  const recipeMap = {}; i.recipe.forEach(r => recipeMap[r.ing] = r.qty);
  const rows = itemsData.ingredients.map(ing => `
    <div class="form-2col" style="align-items:end">
      <div style="font-size:12.5px;color:var(--ink2);padding-bottom:9px">${ing.icon} ${ing.name} <span style="color:var(--ink3)">(${ing.unit})</span></div>
      <div class="form-row" style="margin-bottom:0"><input id="rc-${ing.id}" type="number" step="0.01" min="0" placeholder="0" value="${recipeMap[ing.id] || ''}"></div>
    </div>`).join('');
  openModal('Recipe — ' + i.name, `
    <div style="font-size:11px;color:var(--ink3);margin-bottom:10px">Amount of each raw ingredient consumed per 1 unit ordered. Leave blank / 0 for unused ingredients.</div>
    ${rows}`, async () => {
    const recipe = itemsData.ingredients.map(ing => ({ ing: ing.id, qty: parseFloat(document.getElementById('rc-' + ing.id).value) || 0 })).filter(r => r.qty > 0);
    await apiFetch('/api/admin/items/', 'POST', { action: 'set_recipe', id, recipe });
    showToast('Recipe saved'); closeModal(); loadItems();
  }, 'Save recipe');
}

loadItems();
