// ─── TRIPSYNC DATA LAYER v2 ───────────────────────────────────
const AppState = { user: null, trips: [], activeTrip: null };

const KEYS = { USER: 'ts_v2_user', TRIPS: 'ts_v2_trips', ACTIVE: 'ts_v2_active' };

function loadAll() {
  try {
    AppState.trips = JSON.parse(localStorage.getItem(KEYS.TRIPS) || '[]');
    const aid = localStorage.getItem(KEYS.ACTIVE);
    AppState.activeTrip = AppState.trips.find(t => t.id === aid) || AppState.trips[0] || null;
  } catch(e) { AppState.trips = []; AppState.activeTrip = null; }
}

function saveTrips() { localStorage.setItem(KEYS.TRIPS, JSON.stringify(AppState.trips)); }

function setActiveTrip(trip) {
  AppState.activeTrip = trip;
  localStorage.setItem(KEYS.ACTIVE, trip ? trip.id : '');
}

function getTripById(id) { return AppState.trips.find(t => t.id === id); }

// ─── TRIP CRUD ────────────────────────────────────────────────
function createTrip(data) {
  const trip = {
    id: 'trip_' + Date.now(),
    name: data.name, from: data.from, to: data.to,
    type: data.type || 'Road Trip',
    status: 'upcoming',
    startDate: data.startDate || '', endDate: data.endDate || '',
    budget: parseFloat(data.budget) || 0,
    description: data.description || '',
    coverEmoji: tripEmoji(data.type),
    createdAt: new Date().toISOString(),
    members: [], expenses: [], itinerary: [],
  };
  AppState.trips.unshift(trip);
  saveTrips();
  return trip;
}

function updateTrip(tripId, patch) {
  const t = getTripById(tripId); if (!t) return;
  Object.assign(t, patch); saveTrips();
  if (AppState.activeTrip?.id === tripId) AppState.activeTrip = t;
}

function deleteTrip(tripId) {
  AppState.trips = AppState.trips.filter(t => t.id !== tripId);
  if (AppState.activeTrip?.id === tripId) {
    AppState.activeTrip = AppState.trips[0] || null;
  }
  saveTrips();
  localStorage.setItem(KEYS.ACTIVE, AppState.activeTrip?.id || '');
}

// ─── MEMBER CRUD ──────────────────────────────────────────────
function addMemberToTrip(tripId, data) {
  const trip = getTripById(tripId); if (!trip) return null;
  const initials = data.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  const member = {
    id: 'mem_' + Date.now(), name: data.name,
    phone: data.phone || '', email: data.email || '',
    role: data.role || 'Member', vehicle: data.vehicle || '',
    emergency: data.emergency || '', initials,
    color: ROLE_COLORS[data.role] || '#64748b',
  };
  trip.members.push(member); saveTrips(); return member;
}

function removeMemberFromTrip(tripId, memberId) {
  const trip = getTripById(tripId); if (!trip) return;
  trip.members = trip.members.filter(m => m.id !== memberId); saveTrips();
}

function updateMember(tripId, memberId, patch) {
  const trip = getTripById(tripId); if (!trip) return;
  const m = trip.members.find(m => m.id === memberId);
  if (m) { Object.assign(m, patch); saveTrips(); }
}

// ─── EXPENSE CRUD ─────────────────────────────────────────────
function addExpenseToTrip(tripId, data) {
  const trip = getTripById(tripId); if (!trip) return null;
  const expense = {
    id: 'exp_' + Date.now(), title: data.title,
    amount: parseFloat(data.amount), category: data.category || 'Misc',
    paidById: data.paidById || '', paidByName: data.paidByName || '',
    date: data.date || today(), icon: CAT_ICONS[data.category] || '📌',
    splitType: data.splitType || 'equal', settled: false,
  };
  trip.expenses.push(expense); saveTrips(); return expense;
}

function deleteExpense(tripId, expId) {
  const trip = getTripById(tripId); if (!trip) return;
  trip.expenses = trip.expenses.filter(e => e.id !== expId); saveTrips();
}

// ─── ITINERARY CRUD ───────────────────────────────────────────
function addDayToTrip(tripId, data) {
  const trip = getTripById(tripId); if (!trip) return null;
  const lastDay = trip.itinerary[trip.itinerary.length - 1];
  const day = {
    id: 'day_' + Date.now(),
    day: data.day || (lastDay ? lastDay.day + 1 : 1),
    date: data.date || '', from: data.from || (lastDay?.to || trip.from || ''),
    to: data.to || '', distance: data.distance || '',
    status: data.status || 'upcoming',
    activities: data.activities || [],
    notes: data.notes || '', weather: data.weather || '',
  };
  trip.itinerary.push(day);
  trip.itinerary.sort((a,b) => a.day - b.day);
  saveTrips(); return day;
}

function deleteDayFromTrip(tripId, dayId) {
  const trip = getTripById(tripId); if (!trip) return;
  trip.itinerary = trip.itinerary.filter(d => d.id !== dayId); saveTrips();
}

function updateDay(tripId, dayId, patch) {
  const trip = getTripById(tripId); if (!trip) return;
  const d = trip.itinerary.find(d => d.id === dayId);
  if (d) { Object.assign(d, patch); saveTrips(); }
}

// ─── SPLIT ENGINE ─────────────────────────────────────────────
function computeBalances(trip) {
  const bal = {};
  trip.members.forEach(m => bal[m.id] = { name: m.name, net: 0 });
  const n = trip.members.length || 1;
  trip.expenses.forEach(exp => {
    const share = exp.amount / n;
    Object.keys(bal).forEach(id => {
      bal[id].net += (id === exp.paidById) ? (exp.amount - share) : -share;
    });
  });
  return Object.values(bal);
}

function totalSpent(trip) { return trip.expenses.reduce((s,e) => s + e.amount, 0); }

// ─── USER ─────────────────────────────────────────────────────
function getStoredUser() { try { return JSON.parse(localStorage.getItem(KEYS.USER)); } catch { return null; } }
function setStoredUser(u) { localStorage.setItem(KEYS.USER, JSON.stringify(u)); }
function clearStoredUser() { localStorage.removeItem(KEYS.USER); }

// ─── CONSTANTS ────────────────────────────────────────────────
const CAT_ICONS = {
  'Accommodation':'🏨','Fuel':'⛽','Food':'🍽️','Entry Fees':'🎫',
  'Repair / Mechanic':'🔧','Medical':'💊','Gear / Equipment':'🎒',
  'Toll / Ferry':'🛂','Misc':'📌',
};
const ROLE_COLORS = {
  'Organizer':'#6366f1','Rider':'#8b5cf6','Co-Rider':'#0891b2',
  'Photographer':'#d97706','Mechanic':'#059669','Navigator':'#2563eb',
  'Medic':'#dc2626','Member':'#64748b',
};
const TRIP_TYPES = ['Bike Trip','Road Trip','Trekking','International','Backpacking','Weekend Getaway'];
const ROLES = ['Organizer','Rider','Co-Rider','Photographer','Mechanic','Navigator','Medic','Member'];
const CATEGORIES = ['Accommodation','Fuel','Food','Entry Fees','Repair / Mechanic','Medical','Gear / Equipment','Toll / Ferry','Misc'];

function tripEmoji(type) {
  return {'Bike Trip':'🏍️','Road Trip':'🚗','Trekking':'🥾','International':'✈️','Backpacking':'🎒','Weekend Getaway':'🏖️'}[type] || '✈️';
}

function today() { return new Date().toISOString().slice(0,10); }
function formatINR(n) {
  if (!n && n!==0) return '₹0'; n=Math.round(n);
  if(n>=100000) return '₹'+(n/100000).toFixed(1)+'L';
  if(n>=1000) return '₹'+(n/1000).toFixed(1)+'k';
  return '₹'+n.toLocaleString('en-IN');
}
function formatDate(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}); } catch { return d; }
}
function lightenColor(hex) {
  try {
    const n=parseInt(hex.slice(1),16);
    return '#'+((1<<24)+(Math.min(255,(n>>16)+70)<<16)+(Math.min(255,((n>>8)&0xFF)+70)<<8)+Math.min(255,(n&0xFF)+70)).toString(16).slice(1);
  } catch { return hex; }
}
