// ─── AI ASSISTANT v2 — Connected Anthropic Claude ────────────

const AI_SYSTEM = `You are TripSync AI — an expert travel assistant for Indian road trips, Himalayan bike tours, and group adventure travel. You help users with:
- Day-wise itinerary planning with specific distances and timings
- Best routes, road conditions, and pass information  
- Permit & documentation requirements (ILP, Rohtang, Protected Area)
- Budget estimation in Indian Rupees for groups
- Packing lists tailored to trip type and season
- Accommodation recommendations (budget to premium)
- Safety tips for high-altitude and remote travel
- Real-time road condition advice

Rules:
- Be specific, practical, and concise
- Use bullet points for lists
- Always mention distances in km and driving time
- Costs in Indian Rupees (₹)
- When generating itineraries, format as: "Day N: Place A → Place B (X km, Y hrs)"
- If asked to generate a full itinerary, provide it in clean structured format
- Always mention altitude in meters for Himalayan destinations`;

let chatHistory = [];

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  autoResizeInput(input);
  appendUserMsg(msg);
  showThinking();
  document.getElementById('ai-send-btn').disabled = true;

  chatHistory.push({ role: 'user', content: msg });

  // Inject trip context
  const contextMsg = buildTripContext();
  const messages = contextMsg
    ? [{ role: 'user', content: contextMsg }, { role: 'assistant', content: 'Got it, I have your trip context. How can I help?' }, ...chatHistory]
    : chatHistory;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: AI_SYSTEM,
        messages,
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.content?.[0]?.text || 'Sorry, no response received.';
    chatHistory.push({ role: 'assistant', content: reply });
    removeThinking();
    appendBotMsg(reply);

    // If reply looks like an itinerary, show import button
    if (reply.includes('Day') && reply.includes('km') && AppState.activeTrip) {
      appendImportBtn(reply);
    }

  } catch (err) {
    removeThinking();
    const isApiKeyError = err.message?.includes('401') || err.message?.includes('api_key');
    appendBotMsg(
      isApiKeyError
        ? '🔑 **API key not configured.** To enable AI, add your Anthropic API key in Settings (top-right gear icon).'
        : `⚠️ Connection error: ${err.message}. Please check your internet and try again.`
    );
    console.error('AI error:', err);
  } finally {
    document.getElementById('ai-send-btn').disabled = false;
  }
}

// ─── ITINERARY GENERATION ─────────────────────────────────────
async function generateItinerary() {
  const trip = AppState.activeTrip;
  if (!trip) {
    showToast('Select a trip first', 'warn');
    navigate('trips'); return;
  }

  const days = trip.startDate && trip.endDate
    ? Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000)
    : null;

  const prompt = `Generate a complete day-by-day itinerary for this trip:
- Trip: ${trip.name}
- From: ${trip.from} → To: ${trip.to}
- Type: ${trip.type}
${days ? `- Duration: ${days} days` : ''}
- Budget: ${formatINR(trip.budget)} total

Format each day as:
Day N (Date if known): [From] → [To]
Distance: X km | Drive time: Y hours
Highlights: [key stops/sights]
Stay: [accommodation suggestion]
Notes: [permits, altitude, tips]

Be specific with real places, distances, and practical advice.`;

  navigate('ai');
  document.getElementById('ai-input').value = prompt;
  await sendAIMessage();
}

function appendImportBtn(aiText) {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-import-bar';
  div.innerHTML = `
    <span>✨ AI generated an itinerary</span>
    <button class="btn-primary sm" onclick="importAIItinerary(\`${aiText.replace(/`/g,'\\`')}\`)">
      Import to Trip →
    </button>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function importAIItinerary(text) {
  const trip = AppState.activeTrip;
  if (!trip) { showToast('No active trip selected','warn'); return; }

  // Parse "Day N: From → To" lines
  const dayLines = text.match(/Day\s+\d+[^:\n]*:[^\n]+/gi) || [];
  let imported = 0;

  dayLines.forEach((line, idx) => {
    const dayNum = parseInt(line.match(/Day\s+(\d+)/i)?.[1]) || idx+1;
    const routePart = line.split(':')[1] || '';
    const parts = routePart.split('→').map(s => s.trim().replace(/[^a-zA-Z\s,]/g,'').trim());
    const from = parts[0] || '';
    const to = parts[1] || '';

    if (from || to) {
      addDayToTrip(trip.id, {
        day: dayNum, from, to,
        status: 'upcoming',
        notes: 'AI generated — review and edit',
      });
      imported++;
    }
  });

  saveTrips();
  showToast(`Imported ${imported} days into itinerary`, 'success');
  renderItinerary();
  navigate('itinerary');
}

// ─── CONTEXT BUILDER ─────────────────────────────────────────
function buildTripContext() {
  const trip = AppState.activeTrip;
  if (!trip) return null;
  return `Current active trip context:
- Trip: ${trip.name} (${trip.type})
- Route: ${trip.from} → ${trip.to}
- Dates: ${trip.startDate || 'TBD'} to ${trip.endDate || 'TBD'}
- Budget: ${formatINR(trip.budget)}
- Members: ${trip.members.length} (${trip.members.map(m=>m.name).join(', ') || 'none yet'})
- Itinerary days planned: ${trip.itinerary.length}
Please use this context for your responses.`;
}

// ─── API KEY MANAGEMENT ───────────────────────────────────────
function getApiKey() { return localStorage.getItem('ts_anthropic_key') || ''; }
function setApiKey(key) { localStorage.setItem('ts_anthropic_key', key); }

// Override fetch to inject API key
const _origFetch = window.fetch.bind(window);
window.fetch = function(url, opts) {
  if (typeof url === 'string' && url.includes('anthropic.com')) {
    const key = getApiKey();
    if (key) {
      opts = opts || {};
      opts.headers = { ...opts.headers, 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-iab-override': 'true' };
    }
  }
  return _origFetch(url, opts);
};

// ─── CHAT UI HELPERS ─────────────────────────────────────────
function appendUserMsg(text) {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-msg user';
  div.innerHTML = `
    <div class="ai-bubble user">${escHtml(text)}</div>
    <div class="user-av">${AppState.user?.initials || 'U'}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotMsg(text) {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.innerHTML = `
    <div class="ai-av">✦</div>
    <div class="ai-bubble bot">${fmtAI(text)}</div>
  `;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showThinking() {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.id = 'ai-think'; div.className = 'ai-msg bot';
  div.innerHTML = `<div class="ai-av">✦</div><div class="ai-bubble bot"><div class="ai-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeThinking() { document.getElementById('ai-think')?.remove(); }

function sendSuggestion(el) {
  document.getElementById('ai-input').value = el.textContent;
  el.closest('.ai-chips')?.remove();
  sendAIMessage();
}

function handleAIKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
  autoResizeInput(e.target);
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function escHtml(t) {
  return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function fmtAI(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/^#{1,3} (.+)$/gm,'<div class="ai-heading">$1</div>')
    .replace(/^- (.+)$/gm,'<div class="ai-li">• $1</div>')
    .replace(/^\d+\. (.+)$/gm,'<div class="ai-li">$&</div>')
    .replace(/\n\n/g,'<br/><br/>')
    .replace(/\n/g,'<br/>');
}
