// ─── TRIPSYNC APP.JS ─────────────────────────────────────────

// ─── AUTH ─────────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) return alert('Please fill all fields');

  const isDemo = email === DEMO_USER.email && pass === DEMO_USER.password;
  const user = isDemo ? DEMO_USER : { email, name: email.split('@')[0], initials: email.slice(0,2).toUpperCase() };

  setStoredUser(user);
  initApp(user);
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass = document.getElementById('signup-pass').value;
  if (!name || !email || !pass) return alert('Please fill all fields');

  const initials = name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const user = { name, email, initials };
  setStoredUser(user);
  initApp(user);
}

function handleLogout() {
  clearStoredUser();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('app-mobile-nav').style.display = 'none';
  document.getElementById('auth-overlay').style.display = 'flex';
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => {
    t.classList.toggle('active', (i===0 && tab==='login') || (i===1 && tab==='signup'));
  });
  document.getElementById('login-form').classList.toggle('active', tab==='login');
  document.getElementById('signup-form').classList.toggle('active', tab==='signup');
}

// ─── INIT ─────────────────────────────────────────────────────
function initApp(user) {
  AppState.user = user;
  loadData();

  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('app-mobile-nav').style.display = 'flex';

  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-avatar').textContent = user.initials;
  document.getElementById('user-avatar-mobile').textContent = user.initials;
  document.getElementById('dash-greeting').textContent = `Welcome back, ${user.name.split(' ')[0]}`;

  renderTripsGrid();
  renderMembers();
  renderExpenses();
  renderItinerary();
  fetchWeather();
}

// ─── NAVIGATION ──────────────────────────────────────────────
function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');

  // highlight sidebar link
  document.querySelectorAll('[data-page="' + page + '"]').forEach(l => l.classList.add('active'));

  // close mobile sidebar
  document.querySelector('.sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// ─── TRIPS ───────────────────────────────────────────────────
function showCreateTrip() {
  document.getElementById('create-trip-form').classList.remove('hidden');
  document.getElementById('create-trip-form').scrollIntoView({ behavior: 'smooth' });
}

function hideCreateTrip() {
  document.getElementById('create-trip-form').classList.add('hidden');
}

function createTrip() {
  const name = document.getElementById('trip-name').value.trim();
  const from = document.getElementById('trip-from').value.trim();
  const to = document.getElementById('trip-to').value.trim();
  if (!name || !from || !to) return alert('Please fill required fields');

  const trip = {
    id: 'trip_' + Date.now(),
    name, from, to,
    type: document.getElementById('trip-type').value,
    status: 'upcoming',
    start: document.getElementById('trip-start').value,
    end: document.getElementById('trip-end').value,
    budget: parseInt(document.getElementById('trip-budget').value) || 0,
    spent: 0,
    description: document.getElementById('trip-desc').value,
    participants: 1
  };

  AppState.trips.unshift(trip);
  saveTrips();
  hideCreateTrip();
  renderTripsGrid();

  // clear form
  ['trip-name','trip-from','trip-to','trip-start','trip-end','trip-budget','trip-desc'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function renderTripsGrid() {
  const grid = document.getElementById('trips-grid');
  grid.innerHTML = AppState.trips.map(t => `
    <div class="trip-card" onclick="selectTrip('${t.id}')">
      <div class="trip-card-header">
        <div class="trip-card-title">${t.name}</div>
        <span class="trip-card-status status-${t.status}">${t.status.toUpperCase()}</span>
      </div>
      <div class="trip-card-meta">
        <span>📍 ${t.from} → ${t.to}</span>
        ${t.start ? `<span>📅 ${formatDate(t.start)} – ${formatDate(t.end || t.start)}</span>` : ''}
        <span>🚗 ${t.type}</span>
      </div>
      <div class="trip-card-footer">
        <span>👥 ${t.participants || 1} members</span>
        <span>₹${formatNum(t.spent || 0)} / ₹${formatNum(t.budget)}</span>
      </div>
    </div>
  `).join('');
}

function selectTrip(id) {
  AppState.currentTrip = AppState.trips.find(t => t.id === id);
  navigate('itinerary', null);
}

// ─── MEMBERS ─────────────────────────────────────────────────
function showAddMember() {
  document.getElementById('add-member-form').classList.remove('hidden');
  document.getElementById('add-member-form').scrollIntoView({ behavior: 'smooth' });
}

function hideAddMember() {
  document.getElementById('add-member-form').classList.add('hidden');
}

function addMember() {
  const name = document.getElementById('mem-name').value.trim();
  if (!name) return alert('Name is required');

  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const role = document.getElementById('mem-role').value;

  const member = {
    id: 'm' + Date.now(),
    name, initials,
    phone: document.getElementById('mem-phone').value,
    email: document.getElementById('mem-email').value,
    role,
    vehicle: document.getElementById('mem-vehicle').value,
    emergency: document.getElementById('mem-emergency').value,
    color: ROLE_COLORS[role] || '#4f46e5'
  };

  AppState.members.push(member);
  saveMembers();
  hideAddMember();
  renderMembers();

  ['mem-name','mem-phone','mem-email','mem-vehicle','mem-emergency'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function renderMembers() {
  const grid = document.getElementById('members-grid');
  grid.innerHTML = AppState.members.map(m => `
    <div class="member-card">
      <div class="member-avatar" style="background: linear-gradient(135deg, ${m.color}, ${lighten(m.color)})">${m.initials}</div>
      <div class="member-info">
        <div class="member-name">${m.name}</div>
        <span class="member-role" style="background: ${m.color}22; color: ${m.color}">${m.role}</span>
        ${m.phone ? `<div class="member-detail">📱 ${m.phone}</div>` : ''}
        ${m.vehicle ? `<div class="member-detail">🏍️ ${m.vehicle}</div>` : ''}
        ${m.emergency ? `<div class="member-detail" style="color: var(--amber)">🆘 ${m.emergency}</div>` : ''}
      </div>
    </div>
  `).join('');
}

// ─── EXPENSES ─────────────────────────────────────────────────
function showAddExpense() {
  document.getElementById('add-expense-form').classList.remove('hidden');
  document.getElementById('add-expense-form').scrollIntoView({ behavior: 'smooth' });
}

function hideAddExpense() {
  document.getElementById('add-expense-form').classList.add('hidden');
}

function addExpense() {
  const title = document.getElementById('exp-title').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!title || !amount) return alert('Title and amount required');

  const cat = document.getElementById('exp-cat').value;
  const expense = {
    id: 'e' + Date.now(),
    title, amount, category: cat,
    paidBy: document.getElementById('exp-paidby').value,
    date: document.getElementById('exp-date').value || new Date().toISOString().slice(0,10),
    icon: CAT_ICONS[cat] || '📌',
    split: document.getElementById('exp-split').value
  };

  AppState.expenses.push(expense);
  saveExpenses();
  hideAddExpense();
  renderExpenses();

  ['exp-title','exp-amount','exp-date'].forEach(id => document.getElementById(id).value = '');
}

function renderExpenses() {
  const total = AppState.expenses.reduce((s, e) => s + e.amount, 0);
  const budget = AppState.currentTrip?.budget || 0;
  const members = AppState.members.length || 1;

  document.getElementById('total-spent').textContent = '₹' + formatNum(total);
  document.getElementById('budget-left').textContent = '₹' + formatNum(Math.max(0, budget - total));
  document.getElementById('per-person').textContent = '₹' + formatNum(Math.round(total / members));

  // Balance summary per person
  const balances = {};
  AppState.members.forEach(m => balances[m.name] = 0);

  AppState.expenses.forEach(exp => {
    const share = exp.amount / members;
    Object.keys(balances).forEach(name => {
      if (name === exp.paidBy) {
        balances[name] += exp.amount - share; // paid for others
      } else {
        balances[name] -= share; // owes
      }
    });
  });

  document.getElementById('split-summary').innerHTML = Object.entries(balances).map(([name, bal]) => `
    <div class="split-card">
      <div class="split-name">${name}</div>
      <div class="split-amount ${bal >= 0 ? 'receive' : 'owe'}">${bal >= 0 ? '+' : ''}₹${formatNum(Math.abs(Math.round(bal)))}</div>
      <div class="split-label">${bal >= 0 ? 'to receive' : 'to pay'}</div>
    </div>
  `).join('');

  // Expense list
  document.getElementById('expense-list').innerHTML = [...AppState.expenses].reverse().map(e => `
    <div class="expense-item">
      <div class="exp-icon">${e.icon}</div>
      <div class="exp-info">
        <div class="exp-title">${e.title}</div>
        <div class="exp-meta">${e.category} · Paid by ${e.paidBy} · ${e.date}</div>
      </div>
      <div class="exp-amount">₹${formatNum(e.amount)}</div>
    </div>
  `).join('');
}

// ─── ITINERARY ────────────────────────────────────────────────
function renderItinerary() {
  const timeline = document.getElementById('itinerary-timeline');
  timeline.innerHTML = AppState.itinerary.map(day => `
    <div class="day-card ${day.status === 'active' ? 'active-day' : ''}">
      <div class="day-number">
        <span>${day.day}</span>
        DAY
      </div>
      <div class="day-content">
        <div class="day-header">
          <div>
            <div class="day-title">${day.from} → ${day.to}</div>
            <div class="day-route">
              <span>${day.distance}</span>
              ${day.weather ? `<span class="day-weather-chip">${day.weather}</span>` : ''}
            </div>
          </div>
          <div class="day-date">${formatDate(day.date)}</div>
        </div>
        <div class="day-activities">
          ${day.activities.map(a => `
            <div class="day-activity">
              <span class="activity-time-tag">${a.time}</span>
              <span>${a.desc}</span>
            </div>
          `).join('')}
        </div>
        ${day.notes ? `<div style="margin-top:10px; font-size:12px; color: var(--amber); padding: 8px 10px; background: rgba(245,158,11,.08); border-radius: 6px; border-left: 2px solid var(--amber)">⚠️ ${day.notes}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function loadItinerary() { renderItinerary(); }

function addDay() {
  const lastDay = AppState.itinerary[AppState.itinerary.length - 1];
  const newDay = {
    day: (lastDay?.day || 0) + 1,
    from: lastDay?.to || 'Start',
    to: 'Destination',
    date: '',
    distance: '? km',
    status: 'upcoming',
    activities: [{ time: '08:00', desc: 'Depart after breakfast' }],
    notes: '', weather: ''
  };
  AppState.itinerary.push(newDay);
  renderItinerary();
}

// ─── UTILS ───────────────────────────────────────────────────
function formatNum(n) {
  if (n >= 100000) return (n/100000).toFixed(1) + 'L';
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toLocaleString('en-IN');
}

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' });
  } catch { return d; }
}

function lighten(hex) {
  // Simple hex lighten
  try {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (num >> 16) + 60);
    const g = Math.min(255, ((num >> 8) & 0xFF) + 60);
    const b = Math.min(255, (num & 0xFF) + 60);
    return `#${((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}`;
  } catch { return hex; }
}

// ─── STARTUP ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const storedUser = getStoredUser();
  if (storedUser) {
    initApp(storedUser);
  }
});
