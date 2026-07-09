let categoriesData = [];

async function loadCategories() {
  const r = await apiFetch('/api/admin/categories/');
  categoriesData = r.categories || [];
  document.getElementById('cats-count').textContent = `Categories (${categoriesData.length})`;
  document.getElementById('cat-grid').innerHTML = categoriesData.map(ct => `
    <div class="cat-card">
      <div class="cat-card-acts">
        <button class="act-btn" onclick="event.stopPropagation();editCatModal(${ct.id})" title="Edit"><i class="ti ti-edit"></i></button>
        <button class="act-btn del" onclick="event.stopPropagation();delCatDB(${ct.id})" title="Delete"><i class="ti ti-trash"></i></button>
      </div>
      ${ct.image_url
        ? `<div class="cat-img-wrap"><img src="${ct.image_url}" alt="${ct.name}" style="width:56px;height:56px;object-fit:cover;border-radius:10px;margin-bottom:6px;display:block"></div>`
        : `<div class="cat-icon">${ct.icon}</div>`}
      <div class="cat-name">${ct.name}</div>
      <div class="cat-count">${ct.count} item${ct.count === 1 ? '' : 's'}</div>
    </div>`).join('') || `<div style="text-align:center;color:var(--ink3);padding:20px;grid-column:1/-1">No categories yet — add one to get started</div>`;
}

function addCatModal() {
  openModal('Add category', `
    <div class="form-row"><label>Category name</label><input id="c-name" type="text" placeholder="e.g. Desserts"></div>
    <div class="form-row"><label>Icon (fallback)</label>${emojiSelectHTML('c-icon')}</div>
    <div class="form-row">
      <label>Category image (optional)</label>
      <input type="file" id="c-image" accept="image/*" style="width:100%;border:0.5px solid var(--line2);border-radius:8px;padding:7px 10px;font-size:12px;background:var(--paper);color:var(--ink)">
      <div id="c-img-prev" style="margin-top:6px"></div>
    </div>`,
    async () => {
      const name = document.getElementById('c-name').value.trim();
      if (!name) { showToast('Enter a name'); return; }
      const fd = new FormData();
      fd.append('action', 'add');
      fd.append('name', name);
      fd.append('icon', document.getElementById('c-icon').value.trim() || '🍽');
      const img = document.getElementById('c-image').files[0];
      if (img) fd.append('image', img);
      const r = await apiFetchForm('/api/admin/categories/', fd);
      if (r && r.error) { showToast(r.error); return; }
      showToast('Category added'); closeModal(); loadCategories();
    });
  setTimeout(() => {
    const inp = document.getElementById('c-image');
    if (!inp) return;
    inp.addEventListener('change', function () {
      const prev = document.getElementById('c-img-prev');
      if (this.files[0]) {
        prev.innerHTML = `<img src="${URL.createObjectURL(this.files[0])}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:0.5px solid var(--line2)">`;
      }
    });
  }, 100);
}

function editCatModal(id) {
  const ct = categoriesData.find(c => c.id === id); if (!ct) return;
  const currentImg = ct.image_url ? `<img src="${ct.image_url}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block">` : '';
  openModal('Edit category', `
    <div class="form-row"><label>Category name</label><input id="c-name" type="text" value="${ct.name}"></div>
    <div class="form-row"><label>Icon (fallback)</label>${emojiSelectHTML('c-icon', ct.icon)}</div>
    <div class="form-row">
      <label>${ct.image_url ? 'Image (upload new to replace)' : 'Category image (optional)'}</label>
      ${currentImg}
      <input type="file" id="c-image" accept="image/*" style="width:100%;border:0.5px solid var(--line2);border-radius:8px;padding:7px 10px;font-size:12px;background:var(--paper);color:var(--ink)">
      <div id="c-img-prev" style="margin-top:6px"></div>
    </div>`,
    async () => {
      const fd = new FormData();
      fd.append('action', 'edit');
      fd.append('id', id);
      fd.append('name', document.getElementById('c-name').value.trim());
      fd.append('icon', document.getElementById('c-icon').value.trim());
      const img = document.getElementById('c-image').files[0];
      if (img) fd.append('image', img);
      await apiFetchForm('/api/admin/categories/', fd);
      showToast('Category updated'); closeModal(); loadCategories();
    });
  setTimeout(() => {
    const inp = document.getElementById('c-image');
    if (!inp) return;
    inp.addEventListener('change', function () {
      const prev = document.getElementById('c-img-prev');
      if (this.files[0]) {
        prev.innerHTML = `<img src="${URL.createObjectURL(this.files[0])}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:0.5px solid var(--line2)">`;
      }
    });
  }, 100);
}

async function delCatDB(id) {
  if (!confirm('Delete this category?')) return;
  const r = await apiFetch('/api/admin/categories/', 'POST', { action: 'delete', id });
  if (r.error) { showToast(r.error); return; }
  showToast('Category removed'); loadCategories();
}

loadCategories();
