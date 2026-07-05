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
      <div class="cat-icon">${ct.icon}</div>
      <div class="cat-name">${ct.name}</div>
      <div class="cat-count">${ct.count} item${ct.count === 1 ? '' : 's'}</div>
    </div>`).join('') || `<div style="text-align:center;color:var(--ink3);padding:20px;grid-column:1/-1">No categories yet — add one to get started</div>`;
}

function addCatModal() {
  openModal('Add category', `
    <div class="form-row"><label>Category name</label><input id="c-name" type="text" placeholder="e.g. Desserts"></div>
    <div class="form-row"><label>Icon</label>${emojiSelectHTML('c-icon')}</div>`, async () => {
    const name = document.getElementById('c-name').value.trim();
    if (!name) { showToast('Enter a name'); return; }
    const r = await apiFetch('/api/admin/categories/', 'POST', { action: 'add', name, icon: document.getElementById('c-icon').value.trim() || '🍽' });
    if (r.error) { showToast(r.error); return; }
    showToast('Category added'); closeModal(); loadCategories();
  });
}
function editCatModal(id) {
  const ct = categoriesData.find(c => c.id === id); if (!ct) return;
  openModal('Edit category', `
    <div class="form-row"><label>Category name</label><input id="c-name" type="text" value="${ct.name}"></div>
    <div class="form-row"><label>Icon</label>${emojiSelectHTML('c-icon', ct.icon)}</div>`, async () => {
    await apiFetch('/api/admin/categories/', 'POST', { action: 'edit', id, name: document.getElementById('c-name').value.trim(), icon: document.getElementById('c-icon').value.trim() });
    showToast('Category updated'); closeModal(); loadCategories();
  });
}
async function delCatDB(id) {
  if (!confirm('Delete this category?')) return;
  const r = await apiFetch('/api/admin/categories/', 'POST', { action: 'delete', id });
  if (r.error) { showToast(r.error); return; }
  showToast('Category removed'); loadCategories();
}

loadCategories();
