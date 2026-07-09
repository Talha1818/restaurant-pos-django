let itemsData = { items: [], categories: [], ingredients: [] };

async function loadItems() {
  itemsData = await apiFetch('/api/admin/items/');
  document.getElementById('items-count').textContent = `Menu items (${itemsData.items.length})`;
  document.getElementById('items-tbody').innerHTML = itemsData.items.map(i => `<tr>
    <td style="width:44px">
      ${i.image_url
        ? `<img src="${i.image_url}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;display:block">`
        : `<span style="font-size:22px">${i.icon}</span>`}
    </td>
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

function _imageUploadField(inputId, previewId, currentUrl, label) {
  const currentImg = currentUrl ? `<img src="${currentUrl}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block">` : '';
  return `<div class="form-row">
    <label>${label || 'Item image (optional)'}</label>
    ${currentImg}
    <input type="file" id="${inputId}" accept="image/*" style="width:100%;border:0.5px solid var(--line2);border-radius:8px;padding:7px 10px;font-size:12px;background:var(--paper);color:var(--ink)">
    <div id="${previewId}" style="margin-top:6px"></div>
  </div>`;
}

function _bindImagePreview(inputId, previewId) {
  setTimeout(() => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.addEventListener('change', function () {
      const prev = document.getElementById(previewId);
      if (this.files[0]) {
        prev.innerHTML = `<img src="${URL.createObjectURL(this.files[0])}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:0.5px solid var(--line2)">`;
      }
    });
  }, 100);
}

function addItemModal() {
  openModal('Add menu item', `
    <div class="form-row"><label>Item name</label><input id="m-name" type="text" placeholder="Chicken Tikka half kg"></div>
    <div class="form-2col">
      <div class="form-row"><label>Category</label><select id="m-cat">${itemsData.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>Icon (fallback)</label>${emojiSelectHTML('m-icon')}</div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Price (PKR)</label><input id="m-price" type="number" placeholder="700"></div>
      <div class="form-row"><label>Fallback stock</label><input id="m-stock" type="number" placeholder="0"></div>
    </div>
    ${_imageUploadField('m-image', 'm-img-prev', null, 'Item image (optional — shows on card)')}`,
    async () => {
      const name = document.getElementById('m-name').value.trim();
      const price = parseInt(document.getElementById('m-price').value) || 0;
      if (!name || !price) { showToast('Fill name and price'); return; }
      const fd = new FormData();
      fd.append('action', 'add');
      fd.append('name', name);
      fd.append('cat_id', document.getElementById('m-cat').value);
      fd.append('price', price);
      fd.append('icon', document.getElementById('m-icon').value.trim() || '🍽');
      fd.append('stock', parseInt(document.getElementById('m-stock').value) || 20);
      const img = document.getElementById('m-image').files[0];
      if (img) fd.append('image', img);
      await apiFetchForm('/api/admin/items/', fd);
      showToast('Item added'); closeModal(); loadItems();
    });
  _bindImagePreview('m-image', 'm-img-prev');
}

function editItemModal(id) {
  const i = itemsData.items.find(x => x.id === id); if (!i) return;
  openModal('Edit item', `
    <div class="form-row"><label>Name</label><input id="m-name" type="text" value="${i.name}"></div>
    <div class="form-2col">
      <div class="form-row"><label>Category</label><select id="m-cat">${itemsData.categories.map(c => `<option value="${c.id}" ${c.id === i.cat_id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
      <div class="form-row"><label>Icon (fallback)</label>${emojiSelectHTML('m-icon', i.icon)}</div>
    </div>
    <div class="form-2col">
      <div class="form-row"><label>Price (PKR)</label><input id="m-price" type="number" value="${i.price}"></div>
      <div class="form-row"><label>Fallback stock</label><input id="m-stock" type="number" value="${i.stock}"></div>
    </div>
    ${_imageUploadField('m-image', 'm-img-prev', i.image_url, i.image_url ? 'Image (upload new to replace)' : 'Item image (optional)')}`,
    async () => {
      const fd = new FormData();
      fd.append('action', 'edit');
      fd.append('id', id);
      fd.append('name', document.getElementById('m-name').value.trim());
      fd.append('price', parseFloat(document.getElementById('m-price').value));
      fd.append('icon', document.getElementById('m-icon').value.trim());
      fd.append('cat_id', parseInt(document.getElementById('m-cat').value));
      fd.append('stock', parseInt(document.getElementById('m-stock').value) || 0);
      const img = document.getElementById('m-image').files[0];
      if (img) fd.append('image', img);
      await apiFetchForm('/api/admin/items/', fd);
      showToast('Item updated'); closeModal(); loadItems();
    });
  _bindImagePreview('m-image', 'm-img-prev');
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
