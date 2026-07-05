let settingsData = {};

async function loadSettings() {
  settingsData = await apiFetch('/api/settings/');
  document.getElementById('set-layout').innerHTML = `
    <div class="set-section">
      <div class="set-head">Restaurant info</div>
      <div class="set-row"><div class="set-label"><p>Restaurant name</p><span>Shown on receipts and the topbar</span></div><input class="set-input" id="s-name" value="${settingsData.restaurant_name}"></div>
      <div class="set-row"><div class="set-label"><p>Phone</p></div><input class="set-input" id="s-phone" value="${settingsData.phone}"></div>
      <div class="set-row"><div class="set-label"><p>Address</p></div><input class="set-input" id="s-address" value="${settingsData.address}"></div>
    </div>
    <div class="set-section">
      <div class="set-head">Billing</div>
      <div class="set-row"><div class="set-label"><p>Tax rate (%)</p><span>Applied to every order subtotal</span></div><input class="set-input" id="s-tax" type="number" step="0.1" value="${settingsData.tax_rate}"></div>
      <div class="set-row"><div class="set-label"><p>Show tax on bill</p></div><button class="toggle ${settingsData.tax_on_bill ? 'on' : 'off'}" id="s-taxbill" onclick="toggleSetting('taxbill')"></button></div>
      <div class="set-row"><div class="set-label"><p>Auto-print bill on save</p></div><button class="toggle ${settingsData.auto_print_bill ? 'on' : 'off'}" id="s-autoprint" onclick="toggleSetting('autoprint')"></button></div>
      <div class="set-row"><div class="set-label"><p>Currency</p></div><input class="set-input" id="s-currency" value="${settingsData.currency}"></div>
    </div>
    <div class="set-section">
      <div class="set-head">Floor & alerts</div>
      <div class="set-row"><div class="set-label"><p>Number of tables</p><span>Adds new free tables automatically when increased</span></div><input class="set-input" id="s-tables" type="number" min="1" value="${settingsData.num_tables}"></div>
      <div class="set-row"><div class="set-label"><p>Sound alerts</p><span>Play a sound on new saved orders</span></div><button class="toggle ${settingsData.sound_alerts ? 'on' : 'off'}" id="s-sound" onclick="toggleSetting('sound')"></button></div>
    </div>`;
}

function toggleSetting(key) {
  const map = { taxbill: 'tax_on_bill', autoprint: 'auto_print_bill', sound: 'sound_alerts' };
  settingsData[map[key]] = !settingsData[map[key]];
  const btn = document.getElementById('s-' + key);
  btn.classList.toggle('on'); btn.classList.toggle('off');
}

async function saveSettings() {
  const payload = {
    restaurant_name: document.getElementById('s-name').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
    address: document.getElementById('s-address').value.trim(),
    tax_rate: parseFloat(document.getElementById('s-tax').value) || 0,
    currency: document.getElementById('s-currency').value.trim(),
    num_tables: parseInt(document.getElementById('s-tables').value) || 1,
    tax_on_bill: settingsData.tax_on_bill,
    auto_print_bill: settingsData.auto_print_bill,
    sound_alerts: settingsData.sound_alerts,
  };
  await apiFetch('/api/settings/', 'POST', payload);
  showToast('Settings saved');
}

loadSettings();
