# TripSync — Trip Management Platform

A full-stack, mobile-first trip management web app for group road trips, Himalayan bike tours, and adventure travel.

## 🚀 Live Features

- **Auth** — Signup / Login / Logout (demo: `demo@tripsync.in` / `demo123`)
- **Trips** — Create & manage multiple trips with budget tracking
- **Itinerary** — Day-wise timeline with activities, weather chips, and alerts
- **Members** — Participant management with roles, vehicles & emergency contacts
- **Expenses** — Splitwise-style equal split engine with balance summary
- **Weather** — Live data via [Open-Meteo](https://open-meteo.com/) (free, no API key)
- **Traffic** — Road condition alerts for Himalayan routes
- **AI Assistant** — Powered by Anthropic Claude for intelligent trip planning

## 📁 Structure

```
trip-management/
├── app/
│   ├── index.html          # Main SPA — all pages
│   ├── css/
│   │   └── main.css        # Full design system
│   └── js/
│       ├── data.js         # State, seed data, localStorage
│       ├── app.js          # Auth, navigation, CRUD logic
│       ├── weather.js      # Open-Meteo integration
│       └── ai.js           # Claude AI chat agent
└── ARCHITECTURE.md         # Full tech spec & DB schema
```

## ⚡ Quick Start

Just open `app/index.html` in a browser — no build step needed.

Or deploy instantly to Netlify:
```bash
netlify deploy --prod --dir=app
```

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla JS + HTML/CSS (PWA) |
| Weather | Open-Meteo API (free, no key) |
| AI Agent | Anthropic Claude API |
| Database | Neon PostgreSQL (serverless) |
| Hosting | Netlify |

## 🔑 Environment Variables (for production)

```
ANTHROPIC_API_KEY=sk-ant-...
NEON_DATABASE_URL=postgresql://...
```

## 📖 Full Documentation

See [ARCHITECTURE.md](./ARCHITECTURE.md) for:
- System architecture diagram
- Full database schema (7 tables)
- API integrations reference
- Scalability plan for 10k users
- Development roadmap

---

*Built on top of [leh-odyssey](https://github.com/manojkumar0610/leh-odyssey) · April 2026*
