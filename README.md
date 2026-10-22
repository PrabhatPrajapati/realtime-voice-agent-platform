# 🤖 AI Outbound Calling Platform (Google)

A production-grade, modular AI outbound calling platform built with **Node.js**, **Express**, **Twilio Voice & Media Streams**, **OpenAI Realtime API (`gpt-realtime`)**, **MongoDB (Prisma ORM)**, **Redis**, **BullMQ**, and **WebSockets**.

---

## 🏗️ Architecture & Call Flow

```text
Customer Phone <──Twilio Voice──> Twilio Media Streams (WebSocket wss://) <──> Node.js Backend <──WebSocket──> OpenAI Realtime API (gpt-realtime)
                                                                                       │
                                                                           MongoDB 7 Replica Set (rs0)
                                                                                       │
                                                                           Redis 7 & BullMQ Campaign Queue
```

### 🔄 Call Flow Lifecycle:
1. **Trigger Call** (Dashboard / API / Campaign Queue) → Outbound Twilio Call placed.
2. **Answer & Stream** → Twilio connects via WebSocket to `/media-stream`.
3. **OpenAI Realtime Session** → Connects to `wss://api.openai.com/v1/realtime?model=gpt-realtime` using `audio/pcmu` (G.711 u-law).
4. **Natural Conversation**:
   - **Initial Greeting**: Sarah introduces herself from Google.
   - **Barge-in / Interruption Handling**: If customer speaks, AI stops speaking instantly and listens.
   - **Structured Issue Logging**: AI automatically calls function `create_issue` to extract summary, category, priority, and saves to MongoDB.
   - **CSR Live Handoff**: If customer requests human or has complex issue, AI executes `transfer_to_csr`.
   - **Callback / Do Not Call**: Automatically schedules callback or marks customer as DNC.

---

## 🚀 Quick Start (Everyday Run)

### 1. Start ngrok Tunnel
```powershell
npx ngrok http 3000
```
Copy your ngrok forwarding URL (e.g. `https://timothy-frigidly-manor.ngrok-free.dev`).

### 2. Verify `.env`
Ensure `PUBLIC_BASE_URL` matches your active ngrok URL:
```env
PUBLIC_BASE_URL=https://timothy-frigidly-manor.ngrok-free.dev
```

### 3. Start Infrastructure via Docker
```powershell
docker compose up -d
```

### 4. Open Web Dashboard
Visit **[http://localhost:3000](http://localhost:3000)** to view live metrics, call logs, structured issues, and trigger test calls!

---

## 📡 API Reference

### Health & Stats
- `GET /api/health` - Health check (MongoDB, Redis, Twilio status)
- `GET /api/stats` - Real-time call & issue aggregated metrics

### Calls
- `POST /api/calls/test` - Trigger instant outbound test call:
  ```json
  {
    "name": "Prabhat Kumar",
    "phone": "+919818149932"
  }
  ```
- `GET /api/calls` - List call records with transcripts and outcomes
- `GET /api/calls/:id` - Detailed call timeline & audio transcripts

### Issues & Campaigns
- `GET /api/issues` - List structured customer issues logged by AI
- `POST /api/campaigns` - Create bulk automated outbound calling campaign

### Twilio Webhooks
- `POST /webhooks/twilio/voice` - TwiML Voice Webhook (Media Stream connector)
- `POST /webhooks/twilio/status` - Live call status callback
- `POST /webhooks/twilio/transfer` - CSR live handoff TwiML
