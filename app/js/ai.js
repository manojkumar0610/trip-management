// ─── AI ASSISTANT v2.1 ───────────────────────────────────────

const AI_SYSTEM = `You are TripSync AI — an expert travel assistant for Indian road trips, Himalayan bike tours, and group adventure travel.

You help with:
- Day-wise itinerary planning with distances and timings
- Routes, road conditions, mountain passes, altitude info
- Permit requirements (ILP, Rohtang, Protected Area Permits)
- Budget estimates in Indian Rupees for groups
- Packing lists for specific trip types and seasons
- Accommodation options (camping, guesthouses, hotels)
- Safety advice for high-altitude and remote areas
- Real road condition and seasonal travel advice

Format rules:
- Use bullet points for lists
- Distances in km, costs in ₹, altitude in meters
- For itineraries: "Day N: Place A → Place B (X km, ~Y hrs drive)"
- Always mention altitude for Himalayan destinations
- Be specific with real place names and practical distances`;

let _chatHistory = [];

// ─── API KEY ─────────────────────────────────────────────────
function getApiKey()    { return localStorage.getItem('ts_anthropic_key') || ''; }
function setApiKey(key) { if (key) localStorage.setItem('ts_anthropic_key', key); }

// ─── MAIN SEND ───────────────────────────────────────────────
async function sendAIMessage() {
  const inputEl = document.getElementById('ai-input');
  const msg = inputEl?.value.trim();
  if (!msg) return;

  inputEl.value = '';
  if (inputEl.style) inputEl.style.height = 'auto';
  appendUserMsg(msg);
  showThinking();

  const sendBtn = document.getElementById('ai-send-btn');
  if (sendBtn) sendBtn.disabled = true;

  _chatHistory.push({ role: 'user', content: msg });

  // Build messages with optional trip context prepended
  const context = buildTripContext();
  const messages = context
    ? [
        { role: 'user',      content: context },
        { role: 'assistant', content: 'Got it — I have your trip context loaded. How can I help?' },
        ..._chatHistory
      ]
    : _chatHistory;

  const apiKey = getApiKey();
  if (!apiKey) {
    removeThinking();
    appendBotMsg('🔑 **No API key configured.** Go to **Settings → Anthropic API Key** to add yours.\n\nGet a free key at [console.anthropic.com](https://console.anthropic.com)');
    if (sendBtn) sendBtn.disabled = false;
    return;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':             'application/json',
        'x-api-key':                apiKey,
        'anthropic-version':        '2023-06-01',
        'anthropic-dangerous-direct-browser-iab-override': 'true',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system:     AI_SYSTEM,
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `API error ${res.status}`;
      throw new Error(errMsg);
    }

    const reply = data.content?.[0]?.text || 'No response received. Please try again.';
    _chatHistory.push({ role: 'assistant', content: reply });
    removeThinking();
    appendBotMsg(reply);

    // If it looks like an itinerary, show import option
    if (AppState.activeTrip && reply.includes('Day') && /Day\s+\d+/i.test(reply) && reply.includes('km')) {
      appendImportBar(reply);
    }

  } catch (err) {
    removeThinking();
    const isAuthErr = err.message?.includes('401') || err.message?.toLowerCase().includes('api_key') || err.message?.toLowerCase().includes('authentication');
    appendBotMsg(isAuthErr
      ? '🔑 **Invalid API key.** Please check your key in Settings → Anthropic API Key.'
      : `⚠️ **Error:** ${err.message}\n\nCheck your internet connection and try again.`
    );
    console.error('AI error:', err);
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ─── ITINERARY GENERATION ────────────────────────────────────
async function generateItinerary() {
  const trip = AppState.activeTrip;
  if (!trip) {
    showToast('Select a trip first to generate its itinerary', 'warn');
    navigate('trips');
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    showToast('Add your Anthropic API key in Settings first', 'warn');
    openSettings();
    return;
  }

  let days = '';
  if (trip.startDate && trip.endDate) {
    const d = Math.ceil((new Date(trip.endDate) - new Date(trip.startDate)) / 86400000);
    if (d > 0) days = `- Duration: ${d} days (${formatDate(trip.startDate)} to ${formatDate(trip.endDate)})`;
  }

  const prompt = `Generate a complete, practical day-by-day itinerary for this trip:
- Name: ${trip.name}
- Route: ${trip.from} → ${trip.to}
- Type: ${trip.type}
${days}
- Budget: ${trip.budget > 0 ? formatINR(trip.budget) + ' total' : 'budget-friendly'}
- Members: ${trip.members.length > 0 ? trip.members.length + ' people' : 'group trip'}

Please format EXACTLY like this for each day:
Day 1: [From Place] → [To Place] (X km, ~Y hrs)
Highlights: [key stops or sights]
Stay: [hotel/camp recommendation]
Notes: [altitude, permits, tips if needed]

Be specific with real towns, distances, and practical advice for Indian travellers.`;

  navigate('ai');
  const inputEl = document.getElementById('ai-input');
  if (inputEl) {
    inputEl.value = prompt;
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  }
  await sendAIMessage();
}

function appendImportBar(aiText) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const safeText = aiText.replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\${/g,'\\${');
  const div = document.createElement('div');
  div.className = 'ai-import-bar';
  div.innerHTML = `
    <span>✨ AI generated an itinerary for <b>${AppState.activeTrip?.name || 'your trip'}</b></span>
    <button class="btn-primary sm" id="import-btn">Import to Trip →</button>`;
  div.querySelector('#import-btn').addEventListener('click', () => importAIItinerary(aiText));
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function importAIItinerary(text) {
  const trip = AppState.activeTrip;
  if (!trip) { showToast('No active trip selected', 'warn'); return; }

  const lines = text.split('\n');
  let imported = 0;

  lines.forEach(line => {
    // Match "Day N: From → To (X km ...)" or "Day N: From → To"
    const m = line.match(/^Day\s+(\d+)\s*[:\-]\s*(.+?)(?:\s*\(|$)/i);
    if (!m) return;
    const dayNum = parseInt(m[1]);
    const routePart = m[2].trim();
    const arrowParts = routePart.split(/→|->/).map(s => s.trim().replace(/\s+/g,' '));
    const from = arrowParts[0] || '';
    const to   = arrowParts[1] || '';

    // Extract distance if present
    const distMatch = line.match(/(\d+)\s*km/i);
    const distance  = distMatch ? distMatch[1] + ' km' : '';

    if (from || to) {
      // Collect notes from subsequent lines
      const notes = [];
      const idx = lines.indexOf(line);
      for (let i = idx+1; i < Math.min(idx+5, lines.length); i++) {
        if (/^Day\s+\d+/i.test(lines[i])) break;
        const noteLine = lines[i].trim();
        if (noteLine.startsWith('Notes:')) notes.push(noteLine.replace('Notes:','').trim());
      }

      addDayToTrip(trip.id, {
        day: dayNum, from, to, distance,
        status: 'upcoming',
        notes: notes.join(' ') || 'AI generated — review and edit',
        activities: [],
      });
      imported++;
    }
  });

  if (imported === 0) {
    showToast('Could not parse itinerary days. Try asking AI to format as "Day N: From → To"', 'warn');
    return;
  }

  saveTrips();
  showToast(`Imported ${imported} days to ${trip.name}`, 'success');
  navigate('itinerary');
  renderItinerary();

  // Remove the import bar
  document.querySelectorAll('.ai-import-bar').forEach(el => el.remove());
}

// ─── CONTEXT ────────────────────────────────────────────────
function buildTripContext() {
  const trip = AppState.activeTrip;
  if (!trip) return null;
  const spent = totalSpent(trip);
  return `[Trip Context]
Trip: ${trip.name} (${trip.type})
Route: ${trip.from} → ${trip.to}
Dates: ${trip.startDate||'TBD'} to ${trip.endDate||'TBD'}
Budget: ${formatINR(trip.budget)}${spent > 0 ? ` (${formatINR(spent)} spent so far)` : ''}
Members (${trip.members.length}): ${trip.members.map(m=>`${m.name} (${m.role})`).join(', ')||'none yet'}
Itinerary: ${trip.itinerary.length} days planned
${trip.description ? `Description: ${trip.description}` : ''}`;
}

// ─── CHAT UI ────────────────────────────────────────────────
function appendUserMsg(text) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'ai-msg user';
  div.innerHTML = `
    <div class="ai-bubble user">${escHtml(text)}</div>
    <div class="user-av">${AppState.user?.initials || 'U'}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendBotMsg(text) {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.innerHTML = `
    <div class="ai-av">✦</div>
    <div class="ai-bubble bot">${formatAIText(text)}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showThinking() {
  const msgs = document.getElementById('ai-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.id = 'ai-thinking';
  div.className = 'ai-msg bot';
  div.innerHTML = `<div class="ai-av">✦</div><div class="ai-bubble bot"><div class="ai-dots"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeThinking() {
  document.getElementById('ai-thinking')?.remove();
}

function sendSuggestion(el) {
  const msg = el.textContent.trim();
  const inputEl = document.getElementById('ai-input');
  if (inputEl) inputEl.value = msg;
  el.closest('.ai-chips')?.remove();
  sendAIMessage();
}

function handleAIKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
  // Auto-resize
  const ta = e.target;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

function formatAIText(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,     '<em>$1</em>')
    .replace(/`([^`\n]+)`/g,   '<code>$1</code>')
    .replace(/^#{1,3} (.+)$/gm,'<div class="ai-heading">$1</div>')
    .replace(/^[•\-] (.+)$/gm, '<div class="ai-li">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, '<div class="ai-li">$&</div>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--accent2)">$1</a>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g,   '<br/>');
}
