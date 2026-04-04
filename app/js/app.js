// ─── TRIPSYNC APP v2 ──────────────────────────────────────────

// ─── AUTH ─────────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Fill in all fields', 'warn'); return; }
  const isDemo = email === 'demo@tripsync.in' && pass === 'demo123';
  const name = isDemo ? 'Manoj Kumar' : email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const user = { name, email, initials, phone:'', bio:'' };
  setStoredUser(user);
  initApp(user);
}

function handleSignup() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;
  if (!name || !email || !pass) { showToast('Fill in all fields', 'warn'); return; }
  if (pass.length < 6) { showToast('Password must be at least 6 characters', 'warn'); return; }
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const user = { name, email, initials, phone:'', bio:'' };
  setStoredUser(user);
  initApp(user);
}

function handleLogout() {
  if (!confirm('Sign out of TripSync?')) return;
  clearStoredUser();
  location.reload();
}

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='login')||(i===1&&tab==='signup')));
  document.getElementById('login-form').classList.toggle('active', tab==='login');
  document.getElementById('signup-form').classList.toggle('active', tab==='signup');
}

// ─── INIT ─────────────────────────────────────────────────────
function initApp(user) {
  AppState.user = user;
  loadAll();

  document.getElementById('auth-overlay').style.display = 'none';
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('mob-nav').style.display = 'flex';

  refreshUserUI();
  renderDashboard();
  renderTrips();
  renderItinerary();
  renderMembers();
  renderExpenses();
  fetchWeather();

  // Update trip context selector everywhere
  updateTripSelectors();
}

function refreshUserUI() {
  const u = AppState.user;
  ['user-avatar','user-avatar-m'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = u.initials;
  });
  const un = document.getElementById('user-name');
  if (un) un.textContent = u.name;
}

// ─── NAVIGATION ───────────────────────────────────────────────
let currentPage = 'dashboard';

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  document.querySelector('.sidebar')?.classList.remove('open');

  // Refresh page content
  if (page === 'dashboard') renderDashboard();
  if (page === 'trips') renderTrips();
  if (page === 'itinerary') renderItinerary();
  if (page === 'members') renderMembers();
  if (page === 'expenses') renderExpenses();
}

function toggleSidebar() { document.querySelector('.sidebar')?.classList.toggle('open'); }

// ─── TRIP SELECTOR (global context) ──────────────────────────
function updateTripSelectors() {
  const trip = AppState.activeTrip;
  const name = trip ? trip.name : 'No Trip Selected';
  document.querySelectorAll('.active-trip-name').forEach(el => el.textContent = name);

  // Update all trip dropdowns
  document.querySelectorAll('.trip-select').forEach(sel => {
    sel.innerHTML = AppState.trips.length === 0
      ? '<option value="">— No trips yet —</option>'
      : AppState.trips.map(t => `<option value="${t.id}" ${t.id === trip?.id ? 'selected' : ''}>${t.name}</option>`).join('');
  });
}

function switchTrip(tripId) {
  const trip = getTripById(tripId);
  if (trip) {
    setActiveTrip(trip);
    updateTripSelectors();
    renderItinerary();
    renderMembers();
    renderExpenses();
    renderDashboard();
    showToast(`Switched to ${trip.name}`, 'success');
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────
function renderDashboard() {
  const trips = AppState.trips;
  const active = trips.filter(t => t.status === 'active').length;
  const upcoming = trips.filter(t => t.status === 'upcoming').length;
  const trip = AppState.activeTrip;

  set('dash-active-count', active || upcoming || trips.length);
  set('dash-trips-count', trips.length);
  set('dash-greeting', `Welcome back, ${AppState.user?.name?.split(' ')[0] || ''}!`);

  // Active trip summary
  const heroEl = document.getElementById('dash-hero');
  if (!heroEl) return;

  if (!trip) {
    heroEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✈️</div>
        <h3>No trips yet</h3>
        <p>Create your first trip to get started</p>
        <button class="btn-primary" onclick="navigate('trips');showCreateTrip()">+ Create Trip</button>
      </div>`;
    set('dash-spent', '₹0'); set('dash-members', '0'); set('dash-days', '0');
    return;
  }

  const spent = totalSpent(trip);
  const pct = trip.budget > 0 ? Math.min(100, Math.round((spent / trip.budget) * 100)) : 0;

  set('dash-spent', formatINR(spent));
  set('dash-members', trip.members.length);
  set('dash-days', trip.itinerary.length);

  heroEl.innerHTML = `
    <div class="trip-hero-bg"></div>
    <div class="trip-hero-content">
      <div class="trip-badge status-${trip.status}">${trip.status.toUpperCase()}</div>
      <h2 class="trip-hero-title">${trip.coverEmoji} ${trip.name}</h2>
      <p class="trip-hero-sub">${trip.from} → ${trip.to} · ${trip.type}</p>
      <div class="trip-hero-meta">
        ${trip.members.length ? `<span>👥 ${trip.members.length} members</span>` : ''}
        ${trip.startDate ? `<span>📅 ${formatDate(trip.startDate)}${trip.endDate?' – '+formatDate(trip.endDate):''}</span>` : ''}
        ${trip.itinerary.length ? `<span>🗺 ${trip.itinerary.length} days planned</span>` : ''}
      </div>
      ${trip.budget > 0 ? `
        <div class="trip-budget-row">
          <span>${formatINR(spent)} spent of ${formatINR(trip.budget)}</span>
          <span>${pct}%</span>
        </div>
        <div class="trip-progress-bar"><div class="trip-progress-fill" style="width:${pct}%"></div></div>
      ` : ''}
    </div>
  `;

  // Recent activity
  const actEl = document.getElementById('dash-activity');
  if (actEl) {
    const activities = [];
    trip.expenses.slice(-3).reverse().forEach(e => activities.push({ icon:'💸', text:`${e.paidByName || 'Someone'} added <b>${e.title}</b> — ${formatINR(e.amount)}`, color:'green' }));
    trip.members.slice(-2).reverse().forEach(m => activities.push({ icon:'👤', text:`<b>${m.name}</b> joined as ${m.role}`, color:'blue' }));

    actEl.innerHTML = activities.length
      ? activities.map(a => `
          <div class="activity-item">
            <div class="activity-dot ${a.color}"></div>
            <div class="activity-content">${a.text}</div>
          </div>`).join('')
      : `<div class="empty-hint">No activity yet — start by adding members and expenses</div>`;
  }
}

// ─── TRIPS ────────────────────────────────────────────────────
function showCreateTrip() {
  document.getElementById('create-trip-form')?.classList.remove('hidden');
  document.getElementById('create-trip-form')?.scrollIntoView({ behavior:'smooth' });
}

function hideCreateTrip() {
  document.getElementById('create-trip-form')?.classList.add('hidden');
  document.getElementById('ctf')?.reset();
  document.getElementById('inline-members-list').innerHTML = '';
  inlineMembers = [];
}

let inlineMembers = [];

function addInlineMember() {
  const name = document.getElementById('ctm-name').value.trim();
  const role = document.getElementById('ctm-role').value;
  if (!name) { showToast('Enter member name', 'warn'); return; }
  inlineMembers.push({ name, role, initials: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(), color: ROLE_COLORS[role]||'#64748b' });
  document.getElementById('ctm-name').value = '';
  renderInlineMembers();
}

function removeInlineMember(idx) {
  inlineMembers.splice(idx, 1);
  renderInlineMembers();
}

function renderInlineMembers() {
  const list = document.getElementById('inline-members-list');
  if (!list) return;
  list.innerHTML = inlineMembers.map((m, i) => `
    <div class="inline-member-chip">
      <div class="chip-av" style="background:${m.color}">${m.initials}</div>
      <span>${m.name}</span>
      <small>${m.role}</small>
      <button onclick="removeInlineMember(${i})" class="chip-remove">×</button>
    </div>
  `).join('');
}

function createTrip() {
  const name  = document.getElementById('ct-name').value.trim();
  const from  = document.getElementById('ct-from').value.trim();
  const to    = document.getElementById('ct-to').value.trim();
  if (!name || !from || !to) { showToast('Name, From, and To are required', 'warn'); return; }

  const trip = createTrip_data({
    name, from, to,
    type:        document.getElementById('ct-type').value,
    startDate:   document.getElementById('ct-start').value,
    endDate:     document.getElementById('ct-end').value,
    budget:      document.getElementById('ct-budget').value,
    description: document.getElementById('ct-desc').value,
  });

  // Add inline members
  inlineMembers.forEach(m => addMemberToTrip(trip.id, m));
  inlineMembers = [];

  setActiveTrip(trip);
  updateTripSelectors();
  hideCreateTrip();
  renderTrips();
  renderDashboard();
  showToast(`"${trip.name}" created!`, 'success');
}

// rename to avoid conflict
function createTrip_data(data) { return createTrip(data); }

// Fix: override the function name collision
(function(){
  const orig = window.createTrip;
  window.createTrip = function() {
    const name  = document.getElementById('ct-name').value.trim();
    const from  = document.getElementById('ct-from').value.trim();
    const to    = document.getElementById('ct-to').value.trim();
    if (!name || !from || !to) { showToast('Name, From, and To are required', 'warn'); return; }

    const trip = orig({
      name, from, to,
      type:        document.getElementById('ct-type').value,
      startDate:   document.getElementById('ct-start').value,
      endDate:     document.getElementById('ct-end').value,
      budget:      document.getElementById('ct-budget').value,
      description: document.getElementById('ct-desc').value,
    });

    inlineMembers.forEach(m => addMemberToTrip(trip.id, m));
    inlineMembers = [];

    setActiveTrip(trip);
    updateTripSelectors();
    hideCreateTrip();
    renderTrips();
    renderDashboard();
    showToast(`"${trip.name}" created!`, 'success');
  };
})();

function confirmDeleteTrip(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  if (!confirm(`Delete "${trip.name}"? This will remove all members, expenses and itinerary. This cannot be undone.`)) return;
  deleteTrip(tripId);
  updateTripSelectors();
  renderTrips();
  renderDashboard();
  showToast('Trip deleted', 'success');
}

function selectTripAsActive(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  setActiveTrip(trip);
  updateTripSelectors();
  renderDashboard();
  renderItinerary();
  renderMembers();
  renderExpenses();
  showToast(`Active trip: ${trip.name}`, 'success');
}

function changeTripStatus(tripId, status) {
  updateTrip(tripId, { status });
  renderTrips();
  renderDashboard();
}

function renderTrips() {
  const grid = document.getElementById('trips-grid');
  if (!grid) return;

  if (!AppState.trips.length) {
    grid.innerHTML = `<div class="empty-state full-width"><div class="empty-icon">🗺️</div><h3>No trips yet</h3><p>Create your first adventure!</p></div>`;
    return;
  }

  grid.innerHTML = AppState.trips.map(t => {
    const spent = totalSpent(t);
    const isActive = AppState.activeTrip?.id === t.id;
    return `
    <div class="trip-card ${isActive ? 'active-trip' : ''}" onclick="selectTripAsActive('${t.id}')">
      <div class="trip-card-header">
        <span class="trip-card-emoji">${t.coverEmoji}</span>
        <div style="flex:1;min-width:0">
          <div class="trip-card-title">${t.name}</div>
          <div class="trip-card-route">${t.from} → ${t.to}</div>
        </div>
        <span class="trip-badge status-${t.status}">${t.status}</span>
      </div>
      <div class="trip-card-meta">
        ${t.startDate ? `<span>📅 ${formatDate(t.startDate)}</span>` : ''}
        <span>👥 ${t.members.length} members</span>
        <span>🗺 ${t.itinerary.length} days</span>
      </div>
      ${t.budget > 0 ? `
        <div class="trip-budget-mini">
          <span>${formatINR(spent)} / ${formatINR(t.budget)}</span>
          <span>${t.budget > 0 ? Math.round((spent/t.budget)*100) : 0}%</span>
        </div>
      ` : ''}
      <div class="trip-card-actions" onclick="event.stopPropagation()">
        <select class="select-xs" onchange="changeTripStatus('${t.id}',this.value)">
          <option value="upcoming" ${t.status==='upcoming'?'selected':''}>Upcoming</option>
          <option value="active"   ${t.status==='active'?'selected':''}>Active</option>
          <option value="completed"${t.status==='completed'?'selected':''}>Completed</option>
        </select>
        <button class="btn-icon" onclick="navigate('itinerary')" title="Itinerary">🗺</button>
        <button class="btn-icon danger" onclick="confirmDeleteTrip('${t.id}')" title="Delete">🗑</button>
      </div>
      ${isActive ? '<div class="active-trip-dot" title="Active trip"></div>' : ''}
    </div>`;
  }).join('');
}

// ─── MEMBERS ─────────────────────────────────────────────────
function requireTrip(action) {
  if (!AppState.activeTrip) {
    showToast('Select or create a trip first', 'warn');
    navigate('trips');
    return false;
  }
  return true;
}

function showAddMember() {
  if (!requireTrip()) return;
  document.getElementById('add-member-form')?.classList.remove('hidden');
  document.getElementById('add-member-form')?.scrollIntoView({ behavior:'smooth' });
}

function hideAddMember() { document.getElementById('add-member-form')?.classList.add('hidden'); }

function addMember() {
  const name = document.getElementById('mem-name').value.trim();
  if (!name) { showToast('Name is required', 'warn'); return; }

  addMemberToTrip(AppState.activeTrip.id, {
    name,
    phone:     document.getElementById('mem-phone').value,
    email:     document.getElementById('mem-email').value,
    role:      document.getElementById('mem-role').value,
    vehicle:   document.getElementById('mem-vehicle').value,
    emergency: document.getElementById('mem-emergency').value,
  });

  hideAddMember();
  ['mem-name','mem-phone','mem-email','mem-vehicle','mem-emergency'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderMembers();
  renderExpenses(); // refresh paid-by dropdown
  showToast('Member added', 'success');
}

function confirmDeleteMember(tripId, memberId) {
  if (!confirm('Remove this member?')) return;
  removeMemberFromTrip(tripId, memberId);
  renderMembers();
  renderExpenses();
}

function renderMembers() {
  const trip = AppState.activeTrip;
  const grid = document.getElementById('members-grid');
  if (!grid) return;

  // Update trip selector label
  const label = document.getElementById('members-trip-label');
  if (label) label.textContent = trip ? trip.name : 'No trip selected';

  if (!trip) {
    grid.innerHTML = `<div class="empty-state full-width"><div class="empty-icon">👥</div><h3>No trip selected</h3><p><a href="#" onclick="navigate('trips')">Select a trip</a> to manage members</p></div>`;
    return;
  }

  if (!trip.members.length) {
    grid.innerHTML = `<div class="empty-state full-width"><div class="empty-icon">👤</div><h3>No members yet</h3><p>Add your first member to ${trip.name}</p></div>`;
    return;
  }

  grid.innerHTML = trip.members.map(m => `
    <div class="member-card">
      <div class="member-avatar" style="background:linear-gradient(135deg,${m.color},${lightenColor(m.color)})">${m.initials}</div>
      <div class="member-info">
        <div class="member-name">${m.name}</div>
        <span class="member-role" style="background:${m.color}22;color:${m.color}">${m.role}</span>
        ${m.vehicle ? `<div class="member-detail">🏍️ ${m.vehicle}</div>` : ''}
        ${m.phone ? `<div class="member-detail">📱 ${m.phone}</div>` : ''}
        ${m.email ? `<div class="member-detail">✉️ ${m.email}</div>` : ''}
        ${m.emergency ? `<div class="member-detail warn">🆘 ${m.emergency}</div>` : ''}
      </div>
      <button class="btn-icon danger sm" onclick="confirmDeleteMember('${trip.id}','${m.id}')" title="Remove">×</button>
    </div>
  `).join('');
}

// ─── EXPENSES ─────────────────────────────────────────────────
function showAddExpense() {
  if (!requireTrip()) return;
  const trip = AppState.activeTrip;

  if (!trip.members.length) {
    showToast('Add members to the trip first', 'warn');
    navigate('members'); return;
  }

  // Populate paid-by dropdown with actual trip members
  const sel = document.getElementById('exp-paidby');
  if (sel) {
    sel.innerHTML = trip.members.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('');
  }

  document.getElementById('add-expense-form')?.classList.remove('hidden');
  document.getElementById('add-expense-form')?.scrollIntoView({ behavior:'smooth' });
}

function hideAddExpense() { document.getElementById('add-expense-form')?.classList.add('hidden'); }

function addExpense() {
  const title  = document.getElementById('exp-title').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  if (!title || !amount) { showToast('Title and amount are required', 'warn'); return; }

  const paidSel = document.getElementById('exp-paidby');
  const paidById = paidSel?.value || '';
  const paidByName = paidSel?.selectedOptions[0]?.dataset.name || '';

  addExpenseToTrip(AppState.activeTrip.id, {
    title, amount,
    category:   document.getElementById('exp-cat').value,
    paidById, paidByName,
    date:       document.getElementById('exp-date').value || today(),
    splitType:  document.getElementById('exp-split').value,
  });

  hideAddExpense();
  ['exp-title','exp-amount','exp-date'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  renderExpenses();
  showToast('Expense added', 'success');
}

function confirmDeleteExpense(tripId, expId) {
  if (!confirm('Delete this expense?')) return;
  deleteExpense(tripId, expId);
  renderExpenses();
  showToast('Expense deleted', 'success');
}

function renderExpenses() {
  const trip = AppState.activeTrip;
  const label = document.getElementById('expenses-trip-label');
  if (label) label.textContent = trip ? trip.name : 'No trip selected';

  if (!trip) {
    ['expense-list','split-summary'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">💸</div><h3>No trip selected</h3></div>`;
    });
    set('total-spent','₹0'); set('budget-left','₹0'); set('per-person','₹0');
    return;
  }

  const spent = totalSpent(trip);
  const left  = Math.max(0, trip.budget - spent);
  const perPerson = trip.members.length > 0 ? spent / trip.members.length : 0;

  set('total-spent', formatINR(spent));
  set('budget-left', formatINR(left));
  set('per-person',  formatINR(Math.round(perPerson)));

  // Budget progress
  const budgetBar = document.getElementById('budget-progress');
  if (budgetBar && trip.budget > 0) {
    const pct = Math.min(100, (spent / trip.budget) * 100);
    budgetBar.style.width = pct + '%';
    budgetBar.style.background = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e';
  }

  // Split summary
  const splitEl = document.getElementById('split-summary');
  if (splitEl) {
    if (!trip.members.length) {
      splitEl.innerHTML = `<div class="empty-hint">Add members to see split summary</div>`;
    } else {
      const balances = computeBalances(trip);
      splitEl.innerHTML = balances.map(b => `
        <div class="split-card">
          <div class="split-name">${b.name}</div>
          <div class="split-amount ${b.net >= 0 ? 'receive' : 'owe'}">${b.net >= 0 ? '+' : ''}${formatINR(Math.abs(Math.round(b.net)))}</div>
          <div class="split-label">${b.net >= 0 ? '↑ to receive' : '↓ to pay'}</div>
        </div>
      `).join('');
    }
  }

  // Expense list
  const listEl = document.getElementById('expense-list');
  if (listEl) {
    if (!trip.expenses.length) {
      listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">🧾</div><h3>No expenses yet</h3><p>Add your first expense</p></div>`;
      return;
    }
    listEl.innerHTML = [...trip.expenses].reverse().map(e => `
      <div class="expense-item">
        <div class="exp-icon">${e.icon}</div>
        <div class="exp-info">
          <div class="exp-title">${e.title}</div>
          <div class="exp-meta">${e.category} · ${e.paidByName || 'Unknown'} · ${formatDate(e.date)}</div>
        </div>
        <div class="exp-right">
          <div class="exp-amount">${formatINR(e.amount)}</div>
          <button class="btn-icon danger sm" onclick="confirmDeleteExpense('${trip.id}','${e.id}')" title="Delete">×</button>
        </div>
      </div>
    `).join('');
  }
}

// ─── ITINERARY ────────────────────────────────────────────────
function renderItinerary() {
  const trip = AppState.activeTrip;
  const timeline = document.getElementById('itinerary-timeline');
  const label = document.getElementById('itinerary-trip-label');
  if (label) label.textContent = trip ? trip.name : 'No trip selected';

  if (!timeline) return;

  if (!trip) {
    timeline.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><h3>No trip selected</h3><p><a href="#" onclick="navigate('trips')">Select a trip</a> to view its itinerary</p></div>`;
    return;
  }

  if (!trip.itinerary.length) {
    timeline.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No itinerary yet</h3>
        <p>Add days manually or let AI generate one for you</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px">
          <button class="btn-primary" onclick="addDay()">+ Add Day</button>
          <button class="btn-ghost" onclick="generateItinerary()">✦ Generate with AI</button>
        </div>
      </div>`;
    return;
  }

  timeline.innerHTML = trip.itinerary.map(day => `
    <div class="day-card ${day.status === 'active' ? 'active-day' : ''}">
      <div class="day-number ${day.status === 'active' ? 'act' : day.status === 'completed' ? 'done' : ''}">
        <span>${day.day}</span>
        <small>DAY</small>
      </div>
      <div class="day-content">
        <div class="day-header">
          <div>
            <div class="day-title">${day.from || '—'} → ${day.to || '—'}</div>
            <div class="day-meta">
              ${day.distance ? `<span>📍 ${day.distance}</span>` : ''}
              ${day.date ? `<span>📅 ${formatDate(day.date)}</span>` : ''}
              ${day.weather ? `<span class="wx-chip">${day.weather}</span>` : ''}
            </div>
          </div>
          <div class="day-actions">
            <select class="select-xs" onchange="updateDay('${trip.id}','${day.id}',{status:this.value});renderItinerary()">
              <option value="upcoming" ${day.status==='upcoming'?'selected':''}>Upcoming</option>
              <option value="active"   ${day.status==='active'?'selected':''}>Active</option>
              <option value="completed"${day.status==='completed'?'selected':''}>Completed</option>
            </select>
            <button class="btn-icon danger sm" onclick="confirmDeleteDay('${trip.id}','${day.id}')" title="Delete day">×</button>
          </div>
        </div>
        ${day.activities?.length ? `
          <div class="day-activities">
            ${day.activities.map(a => `
              <div class="day-activity">
                <span class="act-time">${a.time||''}</span>
                <span>${a.desc||a}</span>
              </div>`).join('')}
          </div>` : ''}
        ${day.notes ? `<div class="day-note">⚠️ ${day.notes}</div>` : ''}

        <!-- Inline map link -->
        ${(day.from && day.to) ? `
          <a class="map-link" href="https://www.google.com/maps/dir/${encodeURIComponent(day.from)}/${encodeURIComponent(day.to)}" target="_blank" rel="noopener">
            🗺 View on Google Maps →
          </a>` : ''}
      </div>
    </div>
  `).join('');
}

function addDay() {
  if (!requireTrip()) return;
  const trip = AppState.activeTrip;
  addDayToTrip(trip.id, {});
  renderItinerary();
  showToast('Day added', 'success');
}

function confirmDeleteDay(tripId, dayId) {
  if (!confirm('Delete this day?')) return;
  deleteDayFromTrip(tripId, dayId);
  renderItinerary();
  showToast('Day removed', 'success');
}

// ─── SETTINGS / PROFILE ───────────────────────────────────────
function openSettings() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;
  // Pre-fill fields
  const u = AppState.user;
  setVal('set-name', u.name);
  setVal('set-email', u.email);
  setVal('set-phone', u.phone || '');
  setVal('set-bio', u.bio || '');
  setVal('set-apikey', getApiKey());
  modal.classList.remove('hidden');
}

function closeSettings() { document.getElementById('settings-modal')?.classList.add('hidden'); }

function saveProfile() {
  const name = document.getElementById('set-name')?.value.trim();
  if (!name) { showToast('Name is required', 'warn'); return; }
  const user = {
    ...AppState.user,
    name,
    email:    document.getElementById('set-email')?.value.trim() || AppState.user.email,
    phone:    document.getElementById('set-phone')?.value.trim() || '',
    bio:      document.getElementById('set-bio')?.value.trim() || '',
    initials: name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
  };
  const apiKey = document.getElementById('set-apikey')?.value.trim();
  if (apiKey) setApiKey(apiKey);

  AppState.user = user;
  setStoredUser(user);
  refreshUserUI();
  closeSettings();
  showToast('Profile saved', 'success');
}

function clearAllData() {
  if (!confirm('⚠️ This will delete ALL your trips, members, and expenses. This cannot be undone. Continue?')) return;
  localStorage.clear();
  location.reload();
}

// ─── TOAST ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let tc = document.getElementById('toast-container');
  if (!tc) { tc = document.createElement('div'); tc.id = 'toast-container'; document.body.appendChild(tc); }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ─── HELPERS ─────────────────────────────────────────────────
function set(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

// ─── BOOT ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const user = getStoredUser();
  if (user) { initApp(user); }
});
