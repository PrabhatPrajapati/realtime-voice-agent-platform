# 🚀 AI Outbound Calling Agent - Complete Startup Guide

Ye guide aapko batayegi ki jab bhi aap apna computer on karein ya project ko scratch se chalana ho, to kaise **sirf 3 simple steps** me is poore AI Calling Agent ko live run karein.

---

## 📋 Prerequisites (Ye Sab Already Configured Hai)
- **Docker Desktop** (Make sure Docker Desktop start ho)
- **Node.js** (Installed)
- **ngrok** (Authtoken configured)

---

## ⚡ Daily Startup Workflow (Sirf 3 Steps)

### 🔹 STEP 1: ngrok Tunnel Start Karein
Twilio ko aapke local computer se connect karne ke liye ek terminal me ngrok chalu karein:

```powershell
npx ngrok http 3000
```

> **Note:** Terminal me aapko ek **Forwarding URL** milega, jaise:  
> `https://timothy-frigidly-manor.ngrok-free.dev`

---

### 🔹 STEP 2: `.env` me ngrok URL Check / Update Karein
1. Project ki `.env` file kholein.
2. Line 15 par ensure karein ki `PUBLIC_BASE_URL` wahi URL ho jo Step 1 me ngrok ne diya hai:
   ```env
   PUBLIC_BASE_URL=https://timothy-frigidly-manor.ngrok-free.dev
   ```

---

### 🔹 STEP 3: Docker Containers Start Karein
Ek naye terminal (VS Code PowerShell) me ye command chalayein:

```powershell
docker compose up -d
```

Ye command automatically 3 cheezein background me start kar degi:
1. 🍃 **MongoDB Replica Set (`rs0`)** (Port: 27017)
2. ⚡ **Redis Server** (Port: 6379)
3. 🤖 **AI Calling Agent Backend & Dashboard** (Port: 3000)

---

## 📅 Automated Weekly Customer Check-in Calls

System me **Recurring Weekly Calling Scheduler** active hai:
- **Default Schedule:** Har **Monday subah 10:00 AM**
- **Kaise Kaam Karta Hai:**
  1. Database se automatically sabhi `ACTIVE` customers ko select karta hai (`DO_NOT_CALL` wale exclude ho jate hain).
  2. Ek nayi campaign launch karta hai (jaise `Weekly Check-In - 16 Sep 2026`).
  3. `MAX_CONCURRENT_CALLS` (e.g. 5 calls ek sath) ke sath sabhi customers ko dial karta hai.
  4. AI Sarah unse weekly feedback/issue puchti hai aur saare structured outcomes dashboard par log karti hai.

### Schedule Change Karna:
Apni `.env` file me aap din aur time kabhi bhi change kar sakte hain:
```env
ENABLE_WEEKLY_CHECKIN=true
WEEKLY_CHECKIN_DAY=MONDAY      # MONDAY, TUESDAY, WEDNESDAY, etc.
WEEKLY_CHECKIN_TIME=10:00      # 24-hour format (e.g. 10:00 for 10 AM, 15:30 for 3:30 PM)
```

### Dashboard Se Manual Test Karna:
1. `http://localhost:3000` par **Outbound Campaigns** tab me jayein.
2. Top par **"⚡ Run Weekly Check-in Now"** button par click karein — ye instantly sabhi active customers ko weekly check-in dialer me daal dega!

---

## 🛠️ Helpful Commands

| Kaam | Command |
|---|---|
| **Live Logs dekhna** | `docker compose logs -f backend` |
| **Containers Restart karna** | `docker compose restart backend` |
| **Code me change karne ke baad Reload** | `docker compose up -d --build backend` |
| **Sabhi Containers Stop karna** | `docker compose down` |
| **Health Check verify karna** | `curl http://localhost:3000/api/health` |

---

## 🔒 Configuration Summary (`.env`)

- **OpenAI Model**: `gpt-realtime` (GA Realtime API)
- **Audio Format**: G.711 u-law (`audio/pcmu`) Native Twilio Media Stream
- **Twilio Number**: `+17205732743`
- **Database**: MongoDB 7 Replica Set via Prisma ORM
- **Queue/Worker**: Redis + BullMQ
