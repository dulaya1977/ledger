const STORAGE_KEY = 'voyage-expense-app-v1';
const CURRENCIES = ['TWD', 'USD', 'JPY', 'CNY', 'EUR', 'KRW', 'THB', 'SGD', 'VND', 'PHP'];
const CATEGORY_ICON = { '交通費': '▰', '住宿費': '▣', '交際費': '●●', '雜支': '◇' };

let data = loadData();
let currentTripId = data.activeTripId || data.trips[0]?.id || null;
let view = currentTripId ? 'detail' : 'list';
let filters = { category: 'all', currency: 'all' };

const $ = (id) => document.getElementById(id);
const elements = {
  topbar: $('topbar'), tripListView: $('tripListView'), tripListContent: $('tripListContent'),
  emptyState: $('emptyState'), tripView: $('tripView'), addExpenseButton: $('addExpenseButton'), addTripButton: $('addTripButton'),
  tripTitle: $('tripTitle'), portName: $('portName'), recordCount: $('recordCount'), currencyTotals: $('currencyTotals'),
  expenseList: $('expenseList'), noExpenseState: $('noExpenseState'), filterBar: $('filterBar'), categoryFilter: $('categoryFilter'), currencyFilter: $('currencyFilter'),
  tripModal: $('tripModal'), expenseModal: $('expenseModal'), backdrop: $('modalBackdrop'),
  tripForm: $('tripForm'), expenseForm: $('expenseForm'), tripList: $('tripList'), customCurrencyRow: $('customCurrencyRow'), formError: $('formError')
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && Array.isArray(saved.trips) && Array.isArray(saved.expenses) ? saved : { trips: [], expenses: [], activeTripId: null };
  } catch { return { trips: [], expenses: [], activeTripId: null }; }
}
function saveData() { data.activeTripId = currentTripId; localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function id() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function today() { return new Date().toISOString().slice(0, 10); }
function currentTrip() { return data.trips.find((trip) => trip.id === currentTripId); }
function expensesFor(tripId) { return data.expenses.filter((expense) => expense.tripId === tripId); }
function formatMoney(amount) { return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(date) { const [year, month, day] = date.split('-'); return `${year}/${month}/${day}`; }
function formatCreatedAt(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}
function categoryId(category) { return ({ '交通費': 'transport', '住宿費': 'lodging', '交際費': 'social', '雜支': 'misc' })[category]; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]); }

function render() {
  const trip = currentTrip();
  if (view === 'detail' && !trip) view = 'list';
  const isDetail = view === 'detail';
  elements.topbar.classList.toggle('topbar--list', !isDetail);
  elements.topbar.classList.toggle('hidden', isDetail);
  elements.tripListView.classList.toggle('hidden', isDetail);
  elements.tripView.classList.toggle('hidden', !isDetail);
  elements.addExpenseButton.classList.toggle('hidden', !isDetail);
  elements.addTripButton.classList.toggle('hidden', isDetail);

  if (!isDetail) {
    const hasTrips = data.trips.length > 0;
    elements.emptyState.classList.toggle('hidden', hasTrips);
    elements.tripListContent.classList.toggle('hidden', !hasTrips);
    if (hasTrips) renderTripList();
    return;
  }

  elements.tripTitle.textContent = trip.vesselName;
  elements.portName.textContent = trip.port;
  const expenses = expensesFor(trip.id);
  elements.recordCount.textContent = `共 ${expenses.length} 筆`;
  renderSummary(expenses);
  renderFilters(expenses);
  renderExpenses(expenses);
}

function renderSummary(expenses) {
  const currencyTotals = totalsByCurrency(expenses);
  elements.currencyTotals.innerHTML = Object.keys(currencyTotals).length
    ? Object.entries(currencyTotals).map(([currency, amount]) => `<div class="currency-total"><span class="currency-total__code">${escapeHtml(currency)}</span><strong class="currency-total__amount">${formatMoney(amount)}</strong></div>`).join('')
    : '<div class="currency-total"><span class="currency-total__code">尚未記錄</span><strong class="currency-total__amount">0.00</strong></div>';
  for (const category of Object.keys(CATEGORY_ICON)) {
    const amounts = totalsByCurrency(expenses.filter((expense) => expense.category === category));
    const text = Object.entries(amounts).map(([currency, amount]) => `${currency} ${formatMoney(amount)}`).join(' · ') || '—';
    $(`total-${categoryId(category)}`).textContent = text;
  }
}

function totalsByCurrency(expenses) {
  return expenses.reduce((totals, expense) => {
    totals[expense.currency] = (totals[expense.currency] || 0) + Number(expense.amount);
    return totals;
  }, {});
}

function renderFilters(expenses) {
  const currencies = [...new Set(expenses.map((expense) => expense.currency))].sort();
  elements.currencyFilter.innerHTML = '<option value="all">全部幣別</option>' + currencies.map((currency) => `<option value="${escapeHtml(currency)}">${escapeHtml(currency)}</option>`).join('');
  elements.categoryFilter.value = filters.category;
  elements.currencyFilter.value = currencies.includes(filters.currency) ? filters.currency : 'all';
}

function renderExpenses(expenses) {
  const visible = expenses
    .filter((expense) => (filters.category === 'all' || expense.category === filters.category) && (filters.currency === 'all' || expense.currency === filters.currency))
    .sort((a, b) => b.date.localeCompare(a.date));
  elements.noExpenseState.classList.toggle('hidden', visible.length > 0);
  elements.expenseList.innerHTML = visible.map((expense) => `<li class="expense-row"><span class="expense-date">${formatDate(expense.date)}</span><span class="expense-category-dot" aria-hidden="true">${CATEGORY_ICON[expense.category]}</span><span class="expense-info"><strong>${escapeHtml(expense.category)}</strong><span>${escapeHtml(expense.item)}</span></span><span class="expense-amount">${escapeHtml(expense.currency)}<br>${formatMoney(expense.amount)}</span><button class="delete-record" data-delete-expense="${expense.id}" type="button" aria-label="刪除 ${escapeHtml(expense.item)}">⌫</button></li>`).join('');
}

function renderTripList() {
  const trips = [...data.trips].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  elements.tripList.innerHTML = trips.map((trip) => {
    const totals = totalsByCurrency(expensesFor(trip.id));
    const totalChips = Object.keys(totals).length
      ? Object.entries(totals).map(([currency, amount]) => `<span class="trip-total-chip">${escapeHtml(currency)} ${formatMoney(amount)}</span>`).join('')
      : '<span class="trip-total-chip trip-total-chip--empty">尚無費用</span>';
    const createdAt = formatCreatedAt(trip.createdAt);
    const meta = [escapeHtml(trip.port), createdAt && `建立於 ${createdAt}`].filter(Boolean).join('<span class="trip-list-dot" aria-hidden="true"></span>');
    return `<li><button type="button" data-trip-id="${trip.id}"><strong>${escapeHtml(trip.vesselName)}</strong><span class="trip-list-meta">${meta}</span><span class="trip-list-totals">${totalChips}</span></button></li>`;
  }).join('');
}

function showModal(name) { elements.backdrop.classList.remove('hidden'); elements[name].classList.remove('hidden'); }
function closeModals() {
  elements.backdrop.classList.add('hidden');
  ['tripModal', 'expenseModal'].forEach((name) => elements[name].classList.add('hidden'));
  elements.formError.classList.add('hidden');
}
function openTripModal(trip = null) {
  $('tripModalTitle').textContent = trip ? '編輯出差' : '新增出差';
  $('tripId').value = trip?.id || '';
  $('vesselName').value = trip?.vesselName || '';
  $('port').value = trip?.port || '';
  showModal('tripModal');
  $('vesselName').focus();
}
function openExpenseModal(expense = null) {
  $('expenseModalTitle').textContent = expense ? '編輯費用' : '新增費用';
  $('expenseId').value = expense?.id || '';
  $('expenseDate').value = expense?.date || today();
  $('expenseItem').value = expense?.item || '';
  $('expenseCategory').value = expense?.category || '交通費';
  fillCurrencyOptions(expense?.currency || 'TWD');
  $('expenseAmount').value = expense?.amount || '';
  elements.formError.classList.add('hidden');
  showModal('expenseModal');
  $('expenseDate').focus();
}
function fillCurrencyOptions(selected) {
  const hasCustom = !CURRENCIES.includes(selected);
  $('expenseCurrency').innerHTML = CURRENCIES.map((currency) => `<option value="${currency}">${currency}</option>`).join('') + '<option value="OTHER">其他幣別</option>';
  $('expenseCurrency').value = hasCustom ? 'OTHER' : selected;
  $('customCurrency').value = hasCustom ? selected : '';
  elements.customCurrencyRow.classList.toggle('hidden', !hasCustom);
}

async function exportCsv() {
  const trip = currentTrip();
  if (!trip) return;
  const rows = expensesFor(trip.id).sort((a, b) => a.date.localeCompare(b.date));
  const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = ['船名,港口,發生日期,分類,項目,幣別,金額', ...rows.map((expense) => [trip.vesselName, trip.port, expense.date, expense.category, expense.item, expense.currency, expense.amount].map(quote).join(','))].join('\r\n');
  const filename = `${trip.vesselName}-${trip.port}-出差費用.csv`;
  const file = new File(['\ufeff' + csv], filename, { type: 'text/csv;charset=utf-8;' });
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
    try { await navigator.share({ files: [file], title: '出差費用', text: `${trip.vesselName}・${trip.port} 的匯出資料` }); return; }
    catch (error) { if (error.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.style.display = 'none';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function deleteCurrentTrip() {
  const trip = currentTrip();
  if (!trip || !confirm(`確定要刪除「${trip.vesselName}」及其所有費用嗎？此操作無法復原。`)) return;
  data.trips = data.trips.filter((item) => item.id !== trip.id);
  data.expenses = data.expenses.filter((expense) => expense.tripId !== trip.id);
  currentTripId = null;
  view = 'list';
  saveData();
  closeModals();
  render();
}

$('createFirstTripButton').addEventListener('click', () => openTripModal());
elements.addTripButton.addEventListener('click', () => openTripModal());
$('editTripButton').addEventListener('click', () => openTripModal(currentTrip()));
elements.addExpenseButton.addEventListener('click', () => openExpenseModal());
$('tripMenuButton').addEventListener('click', () => { view = 'list'; render(); });
$('exportButton').addEventListener('click', exportCsv);
$('deleteTripButton').addEventListener('click', deleteCurrentTrip);
$('filterButton').addEventListener('click', () => elements.filterBar.classList.toggle('hidden'));
document.querySelectorAll('.close-modal').forEach((button) => button.addEventListener('click', closeModals));
elements.backdrop.addEventListener('click', closeModals);
elements.categoryFilter.addEventListener('change', (event) => { filters.category = event.target.value; renderExpenses(expensesFor(currentTripId)); });
elements.currencyFilter.addEventListener('change', (event) => { filters.currency = event.target.value; renderExpenses(expensesFor(currentTripId)); });
$('expenseCurrency').addEventListener('change', (event) => { elements.customCurrencyRow.classList.toggle('hidden', event.target.value !== 'OTHER'); if (event.target.value !== 'OTHER') $('customCurrency').value = ''; });

elements.tripForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const tripId = $('tripId').value;
  const vesselName = $('vesselName').value.trim();
  const port = $('port').value.trim();
  if (!vesselName || !port) return;
  if (tripId) Object.assign(data.trips.find((trip) => trip.id === tripId), { vesselName, port });
  else {
    const trip = { id: id(), vesselName, port, createdAt: new Date().toISOString() };
    data.trips.unshift(trip);
    currentTripId = trip.id;
    view = 'detail';
  }
  saveData(); closeModals(); render();
});

elements.expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const currency = $('expenseCurrency').value === 'OTHER' ? $('customCurrency').value.trim().toUpperCase() : $('expenseCurrency').value;
  const amount = Number($('expenseAmount').value);
  if (!/^[A-Z]{3}$/.test(currency)) return showFormError('請輸入三碼英文幣別，例如 AUD。');
  if (!Number.isFinite(amount) || amount <= 0) return showFormError('金額必須大於 0。');
  const expenseId = $('expenseId').value;
  const payload = { tripId: currentTripId, date: $('expenseDate').value, item: $('expenseItem').value.trim(), category: $('expenseCategory').value, currency, amount };
  if (expenseId) Object.assign(data.expenses.find((expense) => expense.id === expenseId), payload);
  else data.expenses.push({ id: id(), ...payload });
  saveData(); closeModals(); render();
});
function showFormError(message) { elements.formError.textContent = message; elements.formError.classList.remove('hidden'); }

elements.tripList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-trip-id]');
  if (!button) return;
  currentTripId = button.dataset.tripId;
  filters = { category: 'all', currency: 'all' };
  view = 'detail';
  saveData();
  render();
});
elements.expenseList.addEventListener('click', (event) => {
  const deleteButton = event.target.closest('[data-delete-expense]');
  if (deleteButton) {
    const expense = data.expenses.find((item) => item.id === deleteButton.dataset.deleteExpense);
    if (expense && confirm(`刪除「${expense.item}」？`)) { data.expenses = data.expenses.filter((item) => item.id !== expense.id); saveData(); render(); }
    return;
  }
  const row = event.target.closest('.expense-row');
  if (!row) return;
  const expense = data.expenses.find((item) => item.id === row.querySelector('[data-delete-expense]')?.dataset.deleteExpense);
  if (expense) openExpenseModal(expense);
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModals(); });

render();
