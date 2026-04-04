// ─── TRIPSYNC DATA LAYER ─────────────────────────────────────

const AppState = {
  user: null,
  currentTrip: null,
  trips: [],
  members: [],
  expenses: [],
  itinerary: []
};

// Seed data
const SEED_TRIPS = [
  {
    id: 'leh2026', name: 'Leh Odyssey 2026',
    from: 'Bangalore', to: 'Leh, Ladakh',
    type: 'Bike Trip', status: 'active',
    start: '2026-06-15', end: '2026-07-02',
    budget: 84000, spent: 28600,
    days: 18, distance: '4800 km',
    participants: 8, description: 'Epic Himalayan bike journey from Silicon Valley of India to the Land of High Passes.'
  },
  {
    id: 'spiti2026', name: 'Spiti Valley Winter',
    from: 'Delhi', to: 'Kaza, Spiti',
    type: 'Road Trip', status: 'upcoming',
    start: '2026-10-10', end: '2026-10-18',
    budget: 45000, spent: 0,
    days: 9, distance: '1400 km',
    participants: 5, description: 'Exploring the cold desert monastery valley before roads close for winter.'
  },
  {
    id: 'goa2025', name: 'Goa Weekend Blast',
    from: 'Pune', to: 'Goa',
    type: 'Road Trip', status: 'completed',
    start: '2025-12-20', end: '2025-12-24',
    budget: 32000, spent: 29400,
    days: 5, distance: '600 km',
    participants: 6, description: 'Long weekend coastal escape.'
  }
];

const SEED_MEMBERS = [
  { id: 'm1', name: 'Manoj Kumar', phone: '+91 98765 43210', email: 'manoj@example.com', role: 'Organizer', vehicle: 'Royal Enfield Himalayan 450', emergency: 'Priya: +91 98765 00001', initials: 'MK', color: '#4f46e5' },
  { id: 'm2', name: 'Rahul Sharma', phone: '+91 87654 32109', email: 'rahul@example.com', role: 'Rider', vehicle: 'KTM 390 Adventure', emergency: 'Meena: +91 87654 00002', initials: 'RS', color: '#7c3aed' },
  { id: 'm3', name: 'Priya Nair', phone: '+91 76543 21098', email: 'priya@example.com', role: 'Photographer', vehicle: 'Honda CB500X', emergency: 'Raj: +91 76543 00003', initials: 'PN', color: '#0891b2' },
  { id: 'm4', name: 'Vikram Singh', phone: '+91 65432 10987', email: 'vikram@example.com', role: 'Mechanic', vehicle: 'Royal Enfield Classic 350', emergency: 'Sunita: +91 65432 00004', initials: 'VS', color: '#059669' },
  { id: 'm5', name: 'Ananya Reddy', phone: '+91 54321 09876', email: 'ananya@example.com', role: 'Medic', vehicle: 'BMW G310GS', emergency: 'Arun: +91 54321 00005', initials: 'AR', color: '#dc2626' },
];

const SEED_EXPENSES = [
  { id: 'e1', title: 'Hotel Manali', amount: 3200, category: 'Accommodation', paidBy: 'Manoj Kumar', date: '2026-06-20', icon: '🏨', split: 'equal' },
  { id: 'e2', title: 'Fuel Bangalore-Pune', amount: 4800, category: 'Fuel', paidBy: 'Rahul Sharma', date: '2026-06-15', icon: '⛽', split: 'equal' },
  { id: 'e3', title: 'Rohtang Pass Permit', amount: 2400, category: 'Entry Fees', paidBy: 'Manoj Kumar', date: '2026-06-21', icon: '🎫', split: 'equal' },
  { id: 'e4', title: 'Group Dinner – Manali', amount: 5600, category: 'Food', paidBy: 'Vikram Singh', date: '2026-06-20', icon: '🍽️', split: 'equal' },
  { id: 'e5', title: 'Tyre Puncture Repair', amount: 350, category: 'Repair / Mechanic', paidBy: 'Vikram Singh', date: '2026-06-18', icon: '🔧', split: 'equal' },
  { id: 'e6', title: 'Hotel Jispa', amount: 2800, category: 'Accommodation', paidBy: 'Priya Nair', date: '2026-06-22', icon: '🏨', split: 'equal' },
];

const SEED_ITINERARY = [
  { day: 1, from: 'Bangalore', to: 'Pune', date: '2026-06-15', distance: '560 km', status: 'completed',
    activities: [
      { time: '05:00', desc: 'Depart Bangalore – KIA petrol pump meetpoint' },
      { time: '10:00', desc: 'Breakfast stop – Kamat Hotel, Kolhapur bypass' },
      { time: '14:30', desc: 'Arrive Pune – Check-in Hotel Saffron' },
      { time: '19:00', desc: 'Team briefing & dinner' }
    ], notes: 'Light traffic on NH48. Weather clear.', weather: '☀️ 32°C'
  },
  { day: 2, from: 'Pune', to: 'Nagpur', date: '2026-06-16', distance: '720 km', status: 'completed',
    activities: [
      { time: '04:30', desc: 'Early start to beat Pune traffic' },
      { time: '12:00', desc: 'Lunch at Wardha – Ashoka Dhaba' },
      { time: '17:00', desc: 'Arrive Nagpur – Fuel up at IOC pump' },
    ], notes: 'Long highway day. Stay hydrated.', weather: '🌤️ 36°C'
  },
  { day: 6, from: 'Kullu', to: 'Manali', date: '2026-06-20', distance: '42 km', status: 'active',
    activities: [
      { time: '09:00', desc: 'Depart Kullu after breakfast' },
      { time: '11:00', desc: 'Old Manali market – gear check & supplies' },
      { time: '13:00', desc: 'Check-in Hotel Snow Valley' },
      { time: '15:00', desc: 'Rohtang Permit arrangements' },
      { time: '19:00', desc: 'Group dinner & Leh highway briefing' }
    ], notes: 'Apply for Rohtang/ILP permits today!', weather: '🌥️ 18°C'
  },
  { day: 7, from: 'Manali', to: 'Jispa', date: '2026-06-21', distance: '115 km', status: 'upcoming',
    activities: [
      { time: '07:00', desc: 'Cross Rohtang Pass (3,978m) – arrive before 10am' },
      { time: '10:30', desc: 'Keylong – fuel & snacks' },
      { time: '14:00', desc: 'Arrive Jispa – Drilbu Resort' },
    ], notes: 'High altitude starts here. Carry altitude sickness meds.', weather: '❄️ 8°C'
  },
  { day: 8, from: 'Jispa', to: 'Sarchu', date: '2026-06-22', distance: '80 km', status: 'upcoming',
    activities: [
      { time: '07:30', desc: 'Depart Jispa after light breakfast' },
      { time: '09:30', desc: 'Baralacha La Pass (4,890m)' },
      { time: '14:00', desc: 'Bharatpur – lunch at dhabha' },
      { time: '16:00', desc: 'Arrive Sarchu camp (4,253m)' }
    ], notes: 'Very high altitude – no exertion, rest well.', weather: '🌨️ 2°C'
  },
  { day: 18, from: 'Leh', to: 'Leh (Fly out)', date: '2026-07-02', distance: '0 km', status: 'upcoming',
    activities: [
      { time: '09:00', desc: 'Last morning in Leh – Shanti Stupa sunrise' },
      { time: '12:00', desc: 'Group photo at Leh Palace' },
      { time: '15:00', desc: 'Cushok Bakula Rimpochee Airport' },
      { time: '17:30', desc: 'Depart Leh → Bangalore (IndiGo 6E-XXXX)' }
    ], notes: 'Bikes to be transported via cargo. Pre-book 3 weeks in advance.', weather: '☀️ 22°C'
  }
];

// ─── USERS ───────────────────────────────────────────────────
const DEMO_USER = { email: 'demo@tripsync.in', password: 'demo123', name: 'Manoj Kumar', initials: 'MK' };

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('ts_user')); } catch { return null; }
}

function setStoredUser(u) {
  localStorage.setItem('ts_user', JSON.stringify(u));
}

function clearStoredUser() {
  localStorage.removeItem('ts_user');
}

// ─── LOAD DATA ───────────────────────────────────────────────
function loadData() {
  AppState.trips = JSON.parse(localStorage.getItem('ts_trips') || 'null') || SEED_TRIPS;
  AppState.members = JSON.parse(localStorage.getItem('ts_members') || 'null') || SEED_MEMBERS;
  AppState.expenses = JSON.parse(localStorage.getItem('ts_expenses') || 'null') || SEED_EXPENSES;
  AppState.itinerary = SEED_ITINERARY;
  AppState.currentTrip = AppState.trips.find(t => t.status === 'active') || AppState.trips[0];
}

function saveTrips() { localStorage.setItem('ts_trips', JSON.stringify(AppState.trips)); }
function saveMembers() { localStorage.setItem('ts_members', JSON.stringify(AppState.members)); }
function saveExpenses() { localStorage.setItem('ts_expenses', JSON.stringify(AppState.expenses)); }

// ─── CATEGORY ICONS ──────────────────────────────────────────
const CAT_ICONS = {
  'Accommodation': '🏨', 'Fuel': '⛽', 'Food': '🍽️',
  'Entry Fees': '🎫', 'Repair / Mechanic': '🔧', 'Medical': '💊',
  'Gear / Equipment': '🎒', 'Toll / Ferry': '🛂', 'Misc': '📌'
};

const ROLE_COLORS = {
  'Organizer': '#4f46e5', 'Rider': '#7c3aed', 'Co-Rider': '#0891b2',
  'Photographer': '#d97706', 'Mechanic': '#059669', 'Navigator': '#2563eb',
  'Medic': '#dc2626'
};
