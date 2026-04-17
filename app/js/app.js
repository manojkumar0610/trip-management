// ─── TRIPSYNC APP v2.1 ────────────────────────────────────────

// ─── AUTH ─────────────────────────────────────────────────────
function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Please fill in all fields', 'warn'); return; }
  const isDemo = email === 'demo@tripsync.in' && pass === 'demo123';
  const name = isDemo ? 'Manoj Kumar' : email.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const initials = name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const user = { name, email, initials, phone:'', bio:'' };
  setStoredUser(user);
  initApp(user);
}

function handleSignup() {
  const name  = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;
  if (!name || !email || !pass) { showToast('Please fill in all fields', 'warn'); return; }
  if (pass.length < 6) { showToast('Password must be at least 6 characters', 'warn'); return; }
  const initials = name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
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
  document.querySelectorAll('.auth-tab').forEach((t,i) =>
    t.classList.toggle('active', (i===0 && tab==='login') || (i===1 && tab==='signup'))
  );
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
  updateTripSelectors();
  renderDashboard();
  renderTrips();
  renderItinerary();
  renderMembers();
  renderExpenses();
  fetchWeather();
}

function refreshUserUI() {
  const u = AppState.user;
  if (!u) return;
  ['user-avatar','user-avatar-m'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=u.initials; });
  const un = document.getElementById('user-name');
  if (un) un.textContent = u.name;
}

// ─── NAVIGATION ───────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page)
  );
  const pg = document.getElementById('page-' + page);
  if (pg) pg.classList.add('active');
  document.querySelector('.sidebar')?.classList.remove('open');

  if (page === 'dashboard') renderDashboard();
  if (page === 'trips')     renderTrips();
  if (page === 'itinerary') renderItinerary();
  if (page === 'members')   renderMembers();
  if (page === 'expenses')  renderExpenses();
  if (page === 'weather')   { /* user triggers manually */ }
}

function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
}

// ─── TRIP CONTEXT SELECTOR ────────────────────────────────────
function updateTripSelectors() {
  const trip = AppState.activeTrip;
  document.querySelectorAll('.active-trip-name').forEach(el =>
    el.textContent = trip ? trip.name : '— No trip selected —'
  );
  document.querySelectorAll('.trip-select').forEach(sel => {
    sel.innerHTML = AppState.trips.length === 0
      ? '<option value="">— Create a trip first —</option>'
      : AppState.trips.map(t =>
          `<option value="${t.id}" ${t.id===trip?.id?'selected':''}>${t.coverEmoji} ${t.name}</option>`
        ).join('');
  });
}

function switchTrip(tripId) {
  if (!tripId) return;
  const trip = getTripById(tripId);
  if (!trip) return;
  setActiveTrip(trip);
  updateTripSelectors();
  renderDashboard();
  renderItinerary();
  renderMembers();
  renderExpenses();
  showToast(`Active: ${trip.name}`, 'success');
}

// ─── DASHBOARD ────────────────────────────────────────────────
function renderDashboard() {
  const trips = AppState.trips;
  const trip  = AppState.activeTrip;

  set('dash-active-count', trips.filter(t=>t.status==='active').length || trips.filter(t=>t.status==='upcoming').length || 0);
  set('dash-trips-count', trips.length);
  set('dash-members',  trip ? trip.members.length : 0);
  set('dash-spent',    trip ? formatINR(totalSpent(trip)) : '₹0');
  set('dash-greeting', `Welcome back, ${AppState.user?.name?.split(' ')[0] || 'Traveller'}!`);

  const heroEl = document.getElementById('dash-hero');
  if (!heroEl) return;

  if (!trip) {
    heroEl.innerHTML = `
      <div class="empty-state" style="padding:32px 20px">
        <div class="empty-icon">✈️</div>
        <h3>No active trip</h3>
        <p>Create your first trip to get started</p>
        <button class="btn-primary" style="margin-top:12px" onclick="navigate('trips');showCreateTrip()">+ Create Trip</button>
      </div>`;
    return;
  }

  const spent = totalSpent(trip);
  const pct   = trip.budget > 0 ? Math.min(100, Math.round((spent/trip.budget)*100)) : 0;
  const pctColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--accent)';

  heroEl.innerHTML = `
    <div class="trip-hero-bg"></div>
    <div class="trip-hero-content" onclick="navigate('itinerary')" style="cursor:pointer">
      <div class="trip-badge status-${trip.status}">${trip.status.toUpperCase()}</div>
      <h2 class="trip-hero-title">${trip.coverEmoji} ${trip.name}</h2>
      <p class="trip-hero-sub">${trip.from} → ${trip.to} · ${trip.type}</p>
      <div class="trip-hero-meta">
        ${trip.members.length ? `<span>👥 ${trip.members.length} member${trip.members.length!==1?'s':''}</span>` : ''}
        ${trip.startDate ? `<span>📅 ${formatDate(trip.startDate)}${trip.endDate?' – '+formatDate(trip.endDate):''}</span>` : ''}
        ${trip.itinerary.length ? `<span>🗺 ${trip.itinerary.length} days planned</span>` : ''}
      </div>
      ${trip.budget > 0 ? `
        <div class="trip-budget-row">
          <span>${formatINR(spent)} of ${formatINR(trip.budget)} spent</span>
          <span style="color:${pctColor}">${pct}%</span>
        </div>
        <div class="trip-progress-bar">
          <div class="trip-progress-fill" style="width:${pct}%;background:${pctColor}"></div>
        </div>` : ''}
    </div>`;

  // Activity feed from real trip data
  const actEl = document.getElementById('dash-activity');
  if (!actEl) return;
  const items = [];
  [...trip.expenses].reverse().slice(0,3).forEach(e =>
    items.push({ color:'green', text:`<b>${e.paidByName||'Someone'}</b> added expense: ${e.title} — ${formatINR(e.amount)}` })
  );
  [...trip.members].reverse().slice(0,2).forEach(m =>
    items.push({ color:'blue', text:`<b>${m.name}</b> joined as ${m.role}` })
  );
  actEl.innerHTML = items.length
    ? items.map(a=>`
        <div class="activity-item">
          <div class="activity-dot ${a.color}"></div>
          <div class="activity-content">${a.text}</div>
        </div>`).join('')
    : `<div class="empty-hint">No activity yet — add members and expenses to your trip</div>`;
}

// ─── TRIPS ────────────────────────────────────────────────────
let _inlineMembers = [];

function showCreateTrip() {
  document.getElementById('create-trip-form')?.classList.remove('hidden');
  document.getElementById('create-trip-form')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function hideCreateTrip() {
  document.getElementById('create-trip-form')?.classList.add('hidden');
  ['ct-name','ct-from','ct-to','ct-start','ct-end','ct-budget','ct-desc','ctm-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const ct = document.getElementById('ct-type');
  if (ct) ct.selectedIndex = 0;
  _inlineMembers = [];
  renderInlineMembers();
}

function addInlineMember() {
  const nameEl = document.getElementById('ctm-name');
  const name = nameEl?.value.trim();
  if (!name) { showToast('Enter a member name', 'warn'); return; }
  const role = document.getElementById('ctm-role')?.value || 'Member';
  _inlineMembers.push({
    name, role,
    initials: name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    color: ROLE_COLORS[role] || '#64748b'
  });
  nameEl.value = '';
  nameEl.focus();
  renderInlineMembers();
}

function removeInlineMember(idx) {
  _inlineMembers.splice(idx, 1);
  renderInlineMembers();
}

function renderInlineMembers() {
  const list = document.getElementById('inline-members-list');
  if (!list) return;
  list.innerHTML = _inlineMembers.map((m,i) => `
    <div class="inline-member-chip">
      <div class="chip-av" style="background:${m.color}">${m.initials}</div>
      <span>${m.name}</span>
      <small>${m.role}</small>
      <button class="chip-remove" onclick="removeInlineMember(${i})" title="Remove">×</button>
    </div>`).join('');
}

function submitCreateTrip() {
  const name   = document.getElementById('ct-name')?.value.trim();
  const fromLoc = document.getElementById('ct-from')?.value.trim();
  const toLoc   = document.getElementById('ct-to')?.value.trim();
  if (!name)    { showToast('Trip name is required', 'warn'); return; }
  if (!fromLoc) { showToast('"From" location is required', 'warn'); return; }
  if (!toLoc)   { showToast('"To" location is required', 'warn'); return; }

  const type   = document.getElementById('ct-type')?.value || 'Road Trip';
  const start  = document.getElementById('ct-start')?.value || '';
  const end    = document.getElementById('ct-end')?.value   || '';
  const budget = parseFloat(document.getElementById('ct-budget')?.value) || 0;
  const desc   = document.getElementById('ct-desc')?.value  || '';

  if (start && end && end < start) { showToast('End date must be after start date', 'warn'); return; }

  const trip = createTrip({ name, from: fromLoc, to: toLoc, type, startDate: start, endDate: end, budget, description: desc });

  // Add inline members
  _inlineMembers.forEach(m => addMemberToTrip(trip.id, m));
  _inlineMembers = [];

  setActiveTrip(trip);
  updateTripSelectors();
  hideCreateTrip();
  renderTrips();
  renderDashboard();
  showToast(`"${trip.name}" created!`, 'success');
}

function confirmDeleteTrip(tripId, e) {
  e?.stopPropagation();
  const trip = getTripById(tripId);
  if (!trip) return;
  if (!confirm(`Delete "${trip.name}"?\n\nThis removes all members, expenses, and itinerary. Cannot be undone.`)) return;
  deleteTrip(tripId);
  updateTripSelectors();
  renderTrips();
  renderDashboard();
  showToast('Trip deleted', 'success');
}

function selectTripContext(tripId) {
  const trip = getTripById(tripId);
  if (!trip) return;
  setActiveTrip(trip);
  updateTripSelectors();
  renderDashboard();
  renderItinerary();
  renderMembers();
  renderExpenses();
  showToast(`Active: ${trip.name}`, 'success');
}

function setTripStatus(tripId, status, e) {
  e?.stopPropagation();
  updateTrip(tripId, { status });
  renderTrips();
  renderDashboard();
}

function renderTrips() {
  const grid = document.getElementById('trips-grid');
  if (!grid) return;

  if (!AppState.trips.length) {
    grid.innerHTML = `
      <div class="empty-state full-width">
        <div class="empty-icon">🗺️</div>
        <h3>No trips yet</h3>
        <p>Start planning your first adventure!</p>
      </div>`;
    return;
  }

  grid.innerHTML = AppState.trips.map(t => {
    const spent   = totalSpent(t);
    const pct     = t.budget > 0 ? Math.min(100, Math.round((spent/t.budget)*100)) : 0;
    const isActive = AppState.activeTrip?.id === t.id;
    return `
      <div class="trip-card ${isActive?'active-trip':''}" onclick="selectTripContext('${t.id}')">
        ${isActive ? '<div class="active-trip-dot" title="Currently active"></div>' : ''}
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
          <span>👥 ${t.members.length} member${t.members.length!==1?'s':''}</span>
          <span>📅 ${t.itinerary.length} day${t.itinerary.length!==1?'s':''}</span>
        </div>
        ${t.budget > 0 ? `
          <div class="trip-budget-mini">
            <span>${formatINR(spent)} / ${formatINR(t.budget)}</span>
            <span>${pct}%</span>
          </div>
          <div class="trip-progress-bar" style="margin-bottom:8px">
            <div class="trip-progress-fill" style="width:${pct}%;background:${pct>90?'var(--red)':pct>70?'var(--amber)':'var(--accent)'}"></div>
          </div>` : ''}
        <div class="trip-card-actions" onclick="event.stopPropagation()">
          <select class="select-xs" onchange="setTripStatus('${t.id}',this.value,event)">
            <option value="upcoming"  ${t.status==='upcoming' ?'selected':''}>Upcoming</option>
            <option value="active"    ${t.status==='active'   ?'selected':''}>Active</option>
            <option value="completed" ${t.status==='completed'?'selected':''}>Completed</option>
          </select>
          <button class="btn-icon" onclick="navigate('itinerary')" title="View Itinerary">📅</button>
          <button class="btn-icon danger" onclick="confirmDeleteTrip('${t.id}',event)" title="Delete Trip">🗑</button>
        </div>
      </div>`;
  }).join('');
}

// ─── MEMBERS ─────────────────────────────────────────────────
function requireActiveTrip(label) {
  if (!AppState.activeTrip) {
    showToast(`Select a trip before adding ${label}`, 'warn');
    navigate('trips');
    return false;
  }
  return true;
}

function showAddMember() {
  if (!requireActiveTrip('members')) return;
  document.getElementById('add-member-form')?.classList.remove('hidden');
  document.getElementById('add-member-form')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  document.getElementById('mem-name')?.focus();
}

function hideAddMember() {
  document.getElementById('add-member-form')?.classList.add('hidden');
  ['mem-name','mem-phone','mem-email','mem-vehicle','mem-emergency'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const mr = document.getElementById('mem-role'); if (mr) mr.selectedIndex = 0;
}

function submitAddMember() {
  const name = document.getElementById('mem-name')?.value.trim();
  if (!name) { showToast('Name is required', 'warn'); return; }

  addMemberToTrip(AppState.activeTrip.id, {
    name,
    phone:     document.getElementById('mem-phone')?.value.trim()    || '',
    email:     document.getElementById('mem-email')?.value.trim()    || '',
    role:      document.getElementById('mem-role')?.value            || 'Member',
    vehicle:   document.getElementById('mem-vehicle')?.value.trim()  || '',
    emergency: document.getElementById('mem-emergency')?.value.trim()|| '',
  });

  hideAddMember();
  renderMembers();
  updatePaidByDropdown();
  showToast('Member added', 'success');
}

function confirmDeleteMember(tripId, memberId, e) {
  e?.stopPropagation();
  if (!confirm('Remove this member from the trip?')) return;
  removeMemberFromTrip(tripId, memberId);
  renderMembers();
  updatePaidByDropdown();
  showToast('Member removed', 'success');
}

function renderMembers() {
  const trip  = AppState.activeTrip;
  const grid  = document.getElementById('members-grid');
  const label = document.getElementById('members-trip-label');
  if (label) label.textContent = trip ? `Trip: ${trip.name}` : '';
  if (!grid) return;

  if (!trip) {
    grid.innerHTML = `<div class="empty-state full-width"><div class="empty-icon">👥</div><h3>No trip selected</h3><p><a href="#" onclick="navigate('trips')">Select a trip</a> to manage its members</p></div>`;
    return;
  }
  if (!trip.members.length) {
    grid.innerHTML = `<div class="empty-state full-width"><div class="empty-icon">👤</div><h3>No members yet</h3><p>Add members to <b>${trip.name}</b></p></div>`;
    return;
  }

  grid.innerHTML = trip.members.map(m => `
    <div class="member-card">
      <div class="member-avatar" style="background:linear-gradient(135deg,${m.color},${lightenColor(m.color)})">${m.initials}</div>
      <div class="member-info">
        <div class="member-name">${escHtml(m.name)}</div>
        <span class="member-role" style="background:${m.color}22;color:${m.color}">${m.role}</span>
        ${m.vehicle   ? `<div class="member-detail">🏍️ ${escHtml(m.vehicle)}</div>`   : ''}
        ${m.phone     ? `<div class="member-detail">📱 ${escHtml(m.phone)}</div>`     : ''}
        ${m.email     ? `<div class="member-detail">✉️ ${escHtml(m.email)}</div>`     : ''}
        ${m.emergency ? `<div class="member-detail warn">🆘 ${escHtml(m.emergency)}</div>` : ''}
      </div>
      <button class="btn-icon danger sm" onclick="confirmDeleteMember('${trip.id}','${m.id}',event)" title="Remove">×</button>
    </div>`).join('');
}

// ─── EXPENSES ────────────────────────────────────────────────
function updatePaidByDropdown() {
  const trip = AppState.activeTrip;
  const sel  = document.getElementById('exp-paidby');
  if (!sel) return;
  if (!trip || !trip.members.length) {
    sel.innerHTML = '<option value="">— Add members first —</option>';
    return;
  }
  sel.innerHTML = trip.members.map(m =>
    `<option value="${m.id}" data-name="${escAttr(m.name)}">${m.name}</option>`
  ).join('');
}

function showAddExpense() {
  if (!requireActiveTrip('expenses')) return;
  const trip = AppState.activeTrip;
  if (!trip.members.length) {
    showToast('Add at least one member to the trip first', 'warn');
    navigate('members'); return;
  }
  updatePaidByDropdown();
  document.getElementById('exp-date').value = today();
  document.getElementById('add-expense-form')?.classList.remove('hidden');
  document.getElementById('add-expense-form')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
  document.getElementById('exp-title')?.focus();
}

function hideAddExpense() {
  document.getElementById('add-expense-form')?.classList.add('hidden');
  ['exp-title','exp-amount','exp-date'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  const ec = document.getElementById('exp-cat'); if (ec) ec.selectedIndex = 0;
  const es = document.getElementById('exp-split'); if (es) es.selectedIndex = 0;
}

function submitAddExpense() {
  const title  = document.getElementById('exp-title')?.value.trim();
  const amount = parseFloat(document.getElementById('exp-amount')?.value);
  if (!title)        { showToast('Title is required', 'warn'); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'warn'); return; }

  const paidSel    = document.getElementById('exp-paidby');
  const paidById   = paidSel?.value || '';
  const paidByName = paidSel?.selectedOptions[0]?.dataset?.name || '';

  addExpenseToTrip(AppState.activeTrip.id, {
    title, amount,
    category:   document.getElementById('exp-cat')?.value   || 'Misc',
    paidById, paidByName,
    date:       document.getElementById('exp-date')?.value  || today(),
    splitType:  document.getElementById('exp-split')?.value || 'equal',
  });

  hideAddExpense();
  renderExpenses();
  renderDashboard();
  showToast('Expense added', 'success');
}

function confirmDeleteExpense(tripId, expId, e) {
  e?.stopPropagation();
  if (!confirm('Delete this expense?')) return;
  deleteExpense(tripId, expId);
  renderExpenses();
  renderDashboard();
  showToast('Expense deleted', 'success');
}

function renderExpenses() {
  const trip  = AppState.activeTrip;
  const label = document.getElementById('expenses-trip-label');
  if (label) label.textContent = trip ? `Trip: ${trip.name}` : '';

  if (!trip) {
    set('total-spent','₹0'); set('budget-left','₹0'); set('per-person','₹0');
    const sl = document.getElementById('split-summary');
    const el = document.getElementById('expense-list');
    if (sl) sl.innerHTML = `<div class="empty-hint">Select a trip to view expenses</div>`;
    if (el) el.innerHTML = '';
    return;
  }

  const spent  = totalSpent(trip);
  const left   = Math.max(0, trip.budget - spent);
  const perPerson = trip.members.length > 0 ? spent / trip.members.length : 0;
  set('total-spent', formatINR(spent));
  set('budget-left', formatINR(left));
  set('per-person',  formatINR(Math.round(perPerson)));

  const bar = document.getElementById('budget-progress');
  if (bar && trip.budget > 0) {
    const pct = Math.min(100, (spent / trip.budget) * 100);
    bar.style.width = pct + '%';
    bar.style.background = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)';
  }

  // Split / balance summary
  const splitEl = document.getElementById('split-summary');
  if (splitEl) {
    if (!trip.members.length) {
      splitEl.innerHTML = `<div class="empty-hint">Add members to see the split summary</div>`;
    } else if (!trip.expenses.length) {
      splitEl.innerHTML = `<div class="empty-hint">No expenses yet — all balances are zero</div>`;
    } else {
      const balances = computeBalances(trip);
      splitEl.innerHTML = balances.map(b => `
        <div class="split-card">
          <div class="split-name">${escHtml(b.name)}</div>
          <div class="split-amount ${b.net >= 0 ? 'receive' : 'owe'}">
            ${b.net >= 0 ? '+' : ''}${formatINR(Math.abs(Math.round(b.net)))}
          </div>
          <div class="split-label">${b.net > 0.5 ? '↑ to receive' : b.net < -0.5 ? '↓ to pay' : '✓ settled'}</div>
        </div>`).join('');
    }
  }

  // Expense list
  const listEl = document.getElementById('expense-list');
  if (!listEl) return;
  if (!trip.expenses.length) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🧾</div>
        <h3>No expenses yet</h3>
        <p>Add your first expense to start tracking</p>
      </div>`;
    return;
  }
  listEl.innerHTML = [...trip.expenses].reverse().map(e => `
    <div class="expense-item">
      <div class="exp-icon">${e.icon}</div>
      <div class="exp-info">
        <div class="exp-title">${escHtml(e.title)}</div>
        <div class="exp-meta">${e.category} · Paid by ${escHtml(e.paidByName||'Unknown')} · ${formatDate(e.date)}</div>
      </div>
      <div class="exp-right">
        <div class="exp-amount">${formatINR(e.amount)}</div>
        <button class="btn-icon danger sm" onclick="confirmDeleteExpense('${trip.id}','${e.id}',event)" title="Delete">×</button>
      </div>
    </div>`).join('');
}

// ─── ITINERARY ───────────────────────────────────────────────
function renderItinerary() {
  const trip    = AppState.activeTrip;
  const timeline = document.getElementById('itinerary-timeline');
  const label   = document.getElementById('itinerary-trip-label');
  if (label) label.textContent = trip ? `Trip: ${trip.name}` : '';
  if (!timeline) return;

  if (!trip) {
    timeline.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><h3>No trip selected</h3><p><a href="#" onclick="navigate('trips')">Select a trip</a> to view its itinerary</p></div>`;
    return;
  }

  if (!trip.itinerary.length) {
    timeline.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>No itinerary yet for "${trip.name}"</h3>
        <p>Add days manually or generate one with AI</p>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px">
          <button class="btn-primary" onclick="submitAddDay()">+ Add Day</button>
          <button class="btn-ghost" onclick="generateItinerary()">✦ Generate with AI</button>
        </div>
      </div>`;
    return;
  }

  timeline.innerHTML = trip.itinerary.map(d => `
    <div class="day-card ${d.status==='active'?'active-day':''}">
      <div class="day-number ${d.status==='active'?'act':d.status==='completed'?'done':''}">
        <span>${d.day}</span><small>DAY</small>
      </div>
      <div class="day-content">
        <div class="day-header">
          <div style="flex:1;min-width:0">
            <div class="day-title">${escHtml(d.from||'?')} → ${escHtml(d.to||'?')}</div>
            <div class="day-meta">
              ${d.distance ? `<span>📍 ${escHtml(d.distance)}</span>` : ''}
              ${d.date     ? `<span>📅 ${formatDate(d.date)}</span>` : ''}
              ${d.weather  ? `<span class="wx-chip">${d.weather}</span>` : ''}
            </div>
          </div>
          <div class="day-actions">
            <select class="select-xs" onchange="updateDay('${trip.id}','${d.id}',{status:this.value});renderItinerary()">
              <option value="upcoming"  ${d.status==='upcoming' ?'selected':''}>Upcoming</option>
              <option value="active"    ${d.status==='active'   ?'selected':''}>Active</option>
              <option value="completed" ${d.status==='completed'?'selected':''}>Completed</option>
            </select>
            <button class="btn-icon danger sm" onclick="confirmDeleteDay('${trip.id}','${d.id}')" title="Delete day">×</button>
          </div>
        </div>
        ${d.activities?.length ? `
          <div class="day-activities">
            ${d.activities.map(a=>`
              <div class="day-activity">
                <span class="act-time">${a.time||''}</span>
                <span>${escHtml(a.desc||String(a))}</span>
              </div>`).join('')}
          </div>` : ''}
        ${d.notes ? `<div class="day-note">⚠️ ${escHtml(d.notes)}</div>` : ''}
        ${(d.from && d.to) ? `
          <a class="map-link"
             href="https://www.google.com/maps/dir/${encodeURIComponent(d.from)}/${encodeURIComponent(d.to)}"
             target="_blank" rel="noopener noreferrer">
            🗺 View route on Google Maps →
          </a>` : ''}
      </div>
    </div>`).join('');
}

function submitAddDay() {
  if (!requireActiveTrip('itinerary days')) return;
  addDayToTrip(AppState.activeTrip.id, {});
  renderItinerary();
  showToast('Day added — edit the details', 'success');
}

function confirmDeleteDay(tripId, dayId) {
  if (!confirm('Delete this day from the itinerary?')) return;
  deleteDayFromTrip(tripId, dayId);
  renderItinerary();
  showToast('Day removed', 'success');
}

// ─── SETTINGS / PROFILE ──────────────────────────────────────
function openSettings() {
  const u = AppState.user;
  if (!u) return;
  setVal('set-name',   u.name);
  setVal('set-email',  u.email);
  setVal('set-phone',  u.phone  || '');
  setVal('set-bio',    u.bio    || '');
  setVal('set-apikey', getApiKey());
  document.getElementById('settings-modal')?.classList.remove('hidden');
}

function closeSettings() {
  document.getElementById('settings-modal')?.classList.add('hidden');
}

function saveProfile() {
  const name = document.getElementById('set-name')?.value.trim();
  if (!name) { showToast('Name cannot be empty', 'warn'); return; }

  const apiKey = document.getElementById('set-apikey')?.value.trim();
  if (apiKey) setApiKey(apiKey);

  const user = {
    ...AppState.user, name,
    email:    document.getElementById('set-email')?.value.trim()  || AppState.user.email,
    phone:    document.getElementById('set-phone')?.value.trim()  || '',
    bio:      document.getElementById('set-bio')?.value.trim()    || '',
    initials: name.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase(),
  };

  AppState.user = user;
  setStoredUser(user);
  refreshUserUI();
  closeSettings();
  showToast('Profile saved ✓', 'success');
}

function clearAllData() {
  if (!confirm('⚠️ Delete ALL trips, members, and expenses?\n\nThis cannot be undone.')) return;
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  showToast('All data cleared', 'success');
  setTimeout(() => location.reload(), 800);
}

// ─── TOAST ───────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let tc = document.getElementById('toast-container');
  if (!tc) {
    tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  tc.appendChild(t);
  requestAnimationFrame(() => { t.classList.add('show'); });
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 320); }, 3000);
}

// ─── HELPERS ────────────────────────────────────────────────
function set(id, val)  { const el = document.getElementById(id); if (el) el.textContent = String(val); }
function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function escHtml(t)    { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function escAttr(t)    { return String(t).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

// ─── BOOT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const user = getStoredUser();
  if (user) initApp(user);
});
