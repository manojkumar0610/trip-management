// ─── AI ASSISTANT MODULE ─────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are TripSync AI — an expert travel assistant specialized in Indian road trips, 
Himalayan bike tours, adventure travel planning, and group trip management.

You help users with:
- Detailed day-wise itinerary planning
- Best routes and distances between locations
- Permit and documentation requirements (ILP, Rohtang permit, etc.)
- Weather and road condition advice
- Budget estimation for groups
- Packing lists for different trip types
- Accommodation and restaurant recommendations
- Safety tips for high-altitude/remote travel
- Expense splitting and budget management advice

Current context: The user is planning/on a trip using TripSync, a trip management platform.
Be specific, practical, and concise. Use bullet points for lists. Mention costs in Indian Rupees.
If asked about specific routes, provide distances and expected travel times.`;

let chatHistory = [];

async function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  input.style.height = 'auto';
  appendUserMessage(msg);
  showThinking();

  const sendBtn = document.getElementById('ai-send-btn');
  sendBtn.disabled = true;

  chatHistory.push({ role: 'user', content: msg });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: AI_SYSTEM_PROMPT,
        messages: chatHistory
      })
    });

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sorry, I could not process that. Please try again.';

    chatHistory.push({ role: 'assistant', content: reply });
    removeThinking();
    appendBotMessage(reply);

  } catch (err) {
    removeThinking();
    appendBotMessage('⚠️ Connection error. Please check your internet connection and try again.');
    console.error('AI error:', err);
  } finally {
    sendBtn.disabled = false;
  }
}

function sendSuggestion(chip) {
  const msg = chip.textContent;
  document.getElementById('ai-input').value = msg;
  sendAIMessage();
  chip.closest('.ai-suggestions')?.remove();
}

function appendUserMessage(text) {
  const messages = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-message user';
  div.innerHTML = `
    <div class="ai-bubble">${escapeHtml(text)}</div>
    <div class="user-avatar sm">${AppState.user?.initials || 'U'}</div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function appendBotMessage(text) {
  const messages = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-message bot';
  div.innerHTML = `
    <div class="ai-avatar">✦</div>
    <div class="ai-bubble">${formatAIText(text)}</div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function showThinking() {
  const messages = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = 'ai-message bot';
  div.id = 'ai-thinking-indicator';
  div.innerHTML = `
    <div class="ai-avatar">✦</div>
    <div class="ai-bubble"><div class="ai-thinking"><span></span><span></span><span></span></div></div>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function removeThinking() {
  document.getElementById('ai-thinking-indicator')?.remove();
}

function handleAIKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAIMessage();
  }
  // Auto-resize textarea
  const ta = e.target;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function formatAIText(text) {
  // Convert markdown-like formatting to HTML
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="font-family:DM Mono,monospace;background:var(--bg);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;margin:3px 0">• $1</div>')
    .replace(/^\d+\. (.+)$/gm, (m, p1, offset, str) => `<div style="padding-left:12px;margin:3px 0">$& </div>`)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
