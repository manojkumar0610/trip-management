// ─── WEATHER & TRAFFIC MODULE ────────────────────────────────

// Route waypoints for Leh Odyssey
const ROUTE_WAYPOINTS = [
  { name: 'Manali', lat: 32.2396, lon: 77.1887 },
  { name: 'Keylong', lat: 32.5680, lon: 77.0362 },
  { name: 'Jispa', lat: 32.6818, lon: 77.1010 },
  { name: 'Sarchu', lat: 32.9050, lon: 77.6533 },
  { name: 'Leh', lat: 34.1526, lon: 77.5771 },
];

const CONDITION_MAP = {
  0: { label: 'Clear Sky', icon: '☀️' },
  1: { label: 'Mainly Clear', icon: '🌤️' },
  2: { label: 'Partly Cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Freezing Fog', icon: '🌫️' },
  51: { label: 'Light Drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  61: { label: 'Light Rain', icon: '🌧️' },
  63: { label: 'Rain', icon: '🌧️' },
  71: { label: 'Light Snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy Snow', icon: '🌨️' },
  80: { label: 'Rain Showers', icon: '🌦️' },
  85: { label: 'Snow Showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
};

function getCondition(code) {
  return CONDITION_MAP[code] || { label: 'Unknown', icon: '🌡️' };
}

async function fetchWeatherForLocation(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&wind_speed_unit=kmh`;
  const resp = await fetch(url);
  const data = await resp.json();
  return data.current;
}

async function fetchWeather() {
  const locationInput = document.getElementById('weather-location')?.value?.trim() || 'Manali';
  const mainCard = document.getElementById('weather-main');
  const routeCards = document.getElementById('route-cards');
  const trafficList = document.getElementById('traffic-list');

  if (mainCard) mainCard.innerHTML = '<div class="weather-loading">⟳ Fetching live weather data...</div>';

  try {
    // Geocode the searched location
    const geoResp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationInput)}&count=1`);
    const geoData = await geoResp.json();

    let lat, lon, locName;
    if (geoData.results && geoData.results[0]) {
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
      locName = geoData.results[0].name + ', ' + (geoData.results[0].country || '');
    } else {
      // Default to Manali
      lat = 32.2396; lon = 77.1887; locName = 'Manali, India';
    }

    const current = await fetchWeatherForLocation(lat, lon);
    const cond = getCondition(current.weather_code);

    if (mainCard) {
      mainCard.innerHTML = `
        <div class="weather-display">
          <div class="weather-icon-big">${cond.icon}</div>
          <div class="weather-temp">${Math.round(current.temperature_2m)}°</div>
          <div class="weather-info">
            <div class="weather-location">${locName}</div>
            <div class="weather-condition">${cond.label}</div>
            <div class="weather-details">
              <div class="weather-detail"><span>Humidity</span>${current.relative_humidity_2m}%</div>
              <div class="weather-detail"><span>Wind</span>${Math.round(current.wind_speed_10m)} km/h</div>
              <div class="weather-detail"><span>Precipitation</span>${current.precipitation} mm</div>
            </div>
          </div>
        </div>
      `;
    }

    // Fetch route waypoints
    if (routeCards) {
      routeCards.innerHTML = '<div style="color:var(--muted);font-size:13px">Loading route data...</div>';

      const promises = ROUTE_WAYPOINTS.map(wp =>
        fetchWeatherForLocation(wp.lat, wp.lon).then(d => ({ ...wp, weather: d }))
      );

      const results = await Promise.all(promises);
      routeCards.innerHTML = results.map(r => {
        const c = getCondition(r.weather.weather_code);
        const alertColor = r.weather.weather_code >= 71 ? 'var(--red)' : r.weather.weather_code >= 51 ? 'var(--amber)' : 'var(--border)';
        return `
          <div class="route-card" style="border-color: ${alertColor}">
            <div class="route-card-name">${r.name}</div>
            <div class="route-card-temp">${c.icon} ${Math.round(r.weather.temperature_2m)}°C</div>
            <div class="route-card-cond">${c.label}</div>
            <div style="font-size:11px; color: var(--muted); margin-top:6px">
              💧 ${r.weather.relative_humidity_2m}% · 💨 ${Math.round(r.weather.wind_speed_10m)} km/h
            </div>
          </div>
        `;
      }).join('');
    }

    // Mock traffic / road alerts (in production: use TomTom or Google Maps Traffic API)
    if (trafficList) {
      const alerts = generateTrafficAlerts();
      trafficList.innerHTML = alerts.map(a => `
        <div class="traffic-item">
          <div class="traffic-icon">${a.icon}</div>
          <div class="traffic-info">
            <div class="traffic-title">${a.title}</div>
            <div class="traffic-desc">${a.desc}</div>
          </div>
          <span class="traffic-severity sev-${a.severity}">${a.severity.toUpperCase()}</span>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Weather fetch error:', err);
    if (mainCard) mainCard.innerHTML = `<div class="weather-loading" style="color:var(--red)">⚠️ Could not load weather data. Check connection.</div>`;
  }
}

function generateTrafficAlerts() {
  return [
    { icon: '🚧', title: 'Rohtang Pass – Road Widening Work', desc: 'Single lane traffic 09:00–17:00. Expect 45-min delays near BRO checkpoint.', severity: 'medium' },
    { icon: '⚠️', title: 'Baralacha La – Recent Snowfall', desc: 'Black ice reported on descent. Reduce speed and use low gear. Chains recommended.', severity: 'high' },
    { icon: '✅', title: 'Manali–Leh Highway (NH3) – Clear', desc: 'No major obstructions. BRO has cleared debris from yesterday\'s landslide near Patseo.', severity: 'low' },
    { icon: '⛽', title: 'Tandi Petrol Pump – Open', desc: 'Last pump before Leh. Queue of ~20 vehicles. Carry jerry cans for 500km stretch.', severity: 'low' },
    { icon: '🌊', title: 'Zingchen Bridge – Flash Flood Risk', desc: 'River water level elevated due to glacial melt. Cross before 14:00 recommended.', severity: 'medium' },
  ];
}
