# Smart Safety Helmet Dashboard

Next.js dashboard + REST API for monitoring mining helmet sensors in real time.

## Project Structure

```
helmet-next/
├── app/
│   ├── layout.js            ← root layout
│   ├── page.js              ← dashboard UI (client component)
│   └── api/
│       ├── data/route.js    ← POST  /api/data      (ESP8266 posts here)
│       ├── helmets/
│       │   ├── route.js     ← GET   /api/helmets
│       │   └── [id]/
│       │       ├── route.js          ← GET/DELETE /api/helmets/:id
│       │       └── history/route.js  ← GET /api/helmets/:id/history
│       └── status/route.js  ← GET   /api/status
├── lib/
│   └── store.js             ← in-memory data store
├── esp8266_helmet.ino       ← Arduino sketch for ESP8266
└── package.json
```

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/data` | ESP8266 sends sensor readings |
| GET | `/api/helmets` | List all helmets |
| GET | `/api/helmets/:id` | Get one helmet + history |
| GET | `/api/helmets/:id/history` | History array only |
| DELETE | `/api/helmets/:id` | Remove a helmet |
| GET | `/api/status` | Server health check |

### POST /api/data body

```json
{
  "id":    "Helmet-1",
  "temp":  24.2,
  "hum":   70.3,
  "gas":   1121,
  "hr":    82,
  "alert": 0,
  "lat":   0,
  "lon":   0
}
```

---

## Deploy to Vercel (free, recommended)

### Step 1 — Push to GitHub

```bash
cd helmet-next
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOUR_USERNAME/helmet-dashboard.git
git push -u origin main
```

### Step 2 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New → Project**
3. Import your `helmet-dashboard` repository
4. Framework preset will auto-detect **Next.js**
5. Click **Deploy** — done in ~60 seconds
6. Your URL will be: `https://helmet-dashboard-xxx.vercel.app`

### Step 3 — Update ESP8266 sketch

Change this line in `esp8266_helmet.ino`:
```cpp
const char* apiUrl = "https://helmet-dashboard-xxx.vercel.app/api/data";
```

### Step 4 — Upload sketch to ESP8266

1. Open `esp8266_helmet.ino` in Arduino IDE
2. Set your WiFi credentials
3. Set the Vercel URL
4. Upload to NodeMCU

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Test the API locally with curl

```bash
# post fake data
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"id":"Helmet-1","temp":31.5,"hum":65,"gas":850,"hr":82,"alert":0,"lat":0,"lon":0}'

# get all helmets
curl http://localhost:3000/api/helmets

# trigger panic
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"id":"Helmet-1","temp":38,"hum":90,"gas":1300,"hr":52,"alert":1,"lat":-1.9441,"lon":30.0619}'
```
