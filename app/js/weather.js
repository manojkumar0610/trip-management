// ─── WEATHER MODULE v2 — Real live Open-Meteo API ────────────

const WX_CODE = {
  0:{label:'Clear Sky',icon:'☀️'},1:{label:'Mainly Clear',icon:'🌤️'},
  2:{label:'Partly Cloudy',icon:'⛅'},3:{label:'Overcast',icon:'☁️'},
  45:{label:'Foggy',icon:'🌫️'},48:{label:'Freezing Fog',icon:'🌫️'},
  51:{label:'Light Drizzle',icon:'🌦️'},53:{label:'Drizzle',icon:'🌦️'},55:{label:'Heavy Drizzle',icon:'🌧️'},
  61:{label:'Light Rain',icon:'🌧️'},63:{label:'Rain',icon:'🌧️'},65:{label:'Heavy Rain',icon:'🌧️'},
  71:{label:'Light Snow',icon:'🌨️'},73:{label:'Snow',icon:'❄️'},75:{label:'Heavy Snow',icon:'🌨️'},
  80:{label:'Rain Showers',icon:'🌦️'},81:{label:'Showers',icon:'🌦️'},82:{label:'Heavy Showers',icon:'🌧️'},
  85:{label:'Snow Showers',icon:'🌨️'},86:{label:'Heavy Snow Showers',icon:'🌨️'},
  95:{label:'Thunderstorm',icon:'⛈️'},96:{label:'Thunderstorm+Hail',icon:'⛈️'},99:{label:'Heavy Thunderstorm',icon:'⛈️'},
};

function wxInfo(code) { return WX_CODE[code] || {label:'Unknown',icon:'🌡️'}; }

// Weather cache: {key: {data, ts}}
const WX_CACHE = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 min

async function geoCode(locationName) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName)}&count=1&language=en&format=json`;
  const r = await fetch(url);
  const d = await r.json();
  if (d.results?.length) {
    const { latitude, longitude, name, country } = d.results[0];
    return { lat: latitude, lon: longitude, name: `${name}, ${country}` };
  }
  return null;
}

async function fetchCurrentWeather(lat, lon) {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = WX_CACHE[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,apparent_temperature&wind_speed_unit=kmh&timezone=auto`;
  const r = await fetch(url);
  const d = await r.json();
  WX_CACHE[cacheKey] = { data: d.current, ts: Date.now() };
  return d.current;
}

async function fetchWeather() {
  const input = document.getElementById('weather-location');
  const locationName = input?.value?.trim() || 'Manali, India';
  const mainCard = document.getElementById('weather-main');
  const routeCards = document.getElementById('route-cards');
  const trafficList = document.getElementById('traffic-list');

  if (mainCard) mainCard.innerHTML = `<div class="wx-loading"><span class="spin">⟳</span> Fetching live weather for <b>${locationName}</b>…</div>`;
  if (routeCards) routeCards.innerHTML = '';
  if (trafficList) trafficList.innerHTML = '';

  try {
    // Geocode user input
    const geo = await geoCode(locationName);
    if (!geo) {
      if (mainCard) mainCard.innerHTML = `<div class="wx-error">📍 Location "${locationName}" not found. Try a different spelling.</div>`;
      return;
    }

    const current = await fetchCurrentWeather(geo.lat, geo.lon);
    const wx = wxInfo(current.weather_code);

    const temp = Math.round(current.temperature_2m);
    const feels = Math.round(current.apparent_temperature);
    const humidity = current.relative_humidity_2m;
    const wind = Math.round(current.wind_speed_10m);
    const precip = current.precipitation;

    const alertColor = current.weather_code >= 71 ? '#ef4444' : current.weather_code >= 51 ? '#f59e0b' : current.weather_code >= 45 ? '#f59e0b' : 'var(--border)';

    if (mainCard) {
      mainCard.innerHTML = `
        <div class="wx-display">
          <div class="wx-icon-big">${wx.icon}</div>
          <div class="wx-temp">${temp}°<span style="font-size:24px;color:var(--muted)">C</span></div>
          <div class="wx-info">
            <div class="wx-location">${geo.name}</div>
            <div class="wx-condition">${wx.label}</div>
            <div class="wx-feels">Feels like ${feels}°C</div>
            <div class="wx-grid">
              <div class="wx-stat"><span>💧</span><div><b>${humidity}%</b><small>Humidity</small></div></div>
              <div class="wx-stat"><span>💨</span><div><b>${wind} km/h</b><small>Wind</small></div></div>
              <div class="wx-stat"><span>🌧️</span><div><b>${precip} mm</b><small>Precipitation</small></div></div>
            </div>
          </div>
          <div class="wx-live-badge">● LIVE</div>
        </div>
      `;
    }

    // Route waypoints from active trip OR default Leh route
    const trip = AppState.activeTrip;
    let waypoints = [];

    if (trip?.itinerary?.length > 0) {
      // Build waypoints from trip itinerary locations (unique)
      const locs = [...new Set(trip.itinerary.flatMap(d => [d.from, d.to]).filter(Boolean))];
      waypoints = locs.slice(0, 6).map(name => ({ name }));
    } else {
      waypoints = [
        {name:'Manali'},{name:'Keylong'},{name:'Jispa'},{name:'Sarchu'},{name:'Pang'},{name:'Leh'}
      ];
    }

    if (routeCards) {
      routeCards.innerHTML = `<div class="wx-loading"><span class="spin">⟳</span> Loading route conditions…</div>`;

      const results = await Promise.allSettled(
        waypoints.map(async wp => {
          const g = await geoCode(wp.name);
          if (!g) return null;
          const w = await fetchCurrentWeather(g.lat, g.lon);
          return { name: wp.name, weather: w };
        })
      );

      const valid = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);

      if (valid.length === 0) {
        routeCards.innerHTML = `<div class="wx-error">Could not load route waypoints.</div>`;
      } else {
        routeCards.innerHTML = valid.map(r => {
          const c = wxInfo(r.weather.weather_code);
          const borderColor = r.weather.weather_code >= 71 ? '#ef4444' : r.weather.weather_code >= 51 ? '#f59e0b' : 'var(--border)';
          const tempColor = r.weather.temperature_2m <= 0 ? '#60a5fa' : r.weather.temperature_2m <= 10 ? '#94a3b8' : '#e2e8f0';
          return `
            <div class="route-card" style="border-color:${borderColor}">
              <div class="route-card-name">${r.name}</div>
              <div class="route-card-temp" style="color:${tempColor}">${c.icon} ${Math.round(r.weather.temperature_2m)}°C</div>
              <div class="route-card-cond">${c.label}</div>
              <div class="route-card-sub">💧${r.weather.relative_humidity_2m}% · 💨${Math.round(r.weather.wind_speed_10m)}km/h</div>
            </div>
          `;
        }).join('');
      }
    }

    // Traffic & road alerts — generated contextually from weather data
    if (trafficList) {
      const alerts = generateSmartAlerts(valid || []);
      if (!alerts.length) {
        trafficList.innerHTML = `<div class="wx-clear">✅ No major road alerts at this time. Conditions look good.</div>`;
      } else {
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
    }

  } catch(err) {
    console.error('Weather error:', err);
    if (mainCard) mainCard.innerHTML = `<div class="wx-error">⚠️ Failed to load weather. Check your internet connection and try again.</div>`;
  }
}

function generateSmartAlerts(waypoints) {
  const alerts = [];
  waypoints.forEach(wp => {
    const w = wp.weather;
    const code = w.weather_code;
    if (code >= 75) alerts.push({ icon:'❄️', title:`Heavy Snow — ${wp.name}`, desc:`Snowfall reported. Road may be blocked. Check BRO status before proceeding.`, severity:'high' });
    else if (code >= 71) alerts.push({ icon:'🌨️', title:`Snow — ${wp.name}`, desc:`Light to moderate snowfall. Reduce speed, chains recommended.`, severity:'medium' });
    else if (code >= 63) alerts.push({ icon:'🌧️', title:`Heavy Rain — ${wp.name}`, desc:`Heavy rain may cause reduced visibility and slippery roads.`, severity:'medium' });
    else if (code >= 95) alerts.push({ icon:'⛈️', title:`Thunderstorm — ${wp.name}`, desc:`Severe thunderstorm. Avoid exposed routes and high passes.`, severity:'high' });
    else if (w.temperature_2m <= 0) alerts.push({ icon:'🧊', title:`Freezing Temp — ${wp.name}`, desc:`${Math.round(w.temperature_2m)}°C. Black ice risk on road surface. Drive carefully.`, severity:'high' });
    else if (w.wind_speed_10m > 50) alerts.push({ icon:'💨', title:`High Winds — ${wp.name}`, desc:`Wind speed ${Math.round(w.wind_speed_10m)} km/h. Risk for two-wheelers and high vehicles.`, severity:'medium' });
  });
  return alerts;
}
