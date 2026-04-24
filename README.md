# Smart Safety Helmet Dashboard

A Next.js dashboard and REST API for monitoring mining helmet sensors in real time. The ESP8266 on the helmet posts sensor readings over WiFi; the server stores them in MongoDB and serves a live dashboard.

---

## Project Structure

```
esp8266-server/
├── app/
│   ├── layout.js
│   ├── page.js                          <- dashboard UI (client component)
│   └── api/
│       ├── data/
│       │   └── route.js                 <- POST /api/data  (ESP8266 posts here)
│       ├── helmets/
│       │   ├── route.js                 <- GET  /api/helmets
│       │   └── [id]/
│       │       ├── route.js             <- GET, DELETE /api/helmets/:id
│       │       └── history/
│       │           └── route.js         <- GET /api/helmets/:id/history
│       └── status/
│           └── route.js                 <- GET /api/status
├── lib/
│   ├── mongodb.js                       <- MongoDB connection helper
│   └── store.js                         <- in-memory store (live dashboard state)
├── esp8266_helmet.ino                   <- Arduino sketch for the ESP8266
├── esp_working.ino                      <- working with esp8266 wifi gateway
├── .env.local                           <- environment variables (not committed)
└── package.json
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/data` | ESP8266 posts sensor readings |
| GET | `/api/helmets` | List all active helmets |
| GET | `/api/helmets/:id` | Get one helmet with its history |
| GET | `/api/helmets/:id/history` | Reading history array only |
| DELETE | `/api/helmets/:id` | Remove a helmet record |
| GET | `/api/status` | Server health check |

### POST /api/data — request body

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

## Environment Variables

Create a `.env.local` file in the project root:

```bash
# For local testing (requires MongoDB running on your machine)
MONGODB_URI=mongodb://localhost:27017/helmet_db

# For production (MongoDB Atlas)
# MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/helmet_db?retryWrites=true&w=majority
```

---

## Run Locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

MongoDB must be running before starting the server. To start it:

```bash
mongod
```

---

## Test the API with curl

```bash
# Post a normal reading
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"id":"Helmet-1","temp":31.5,"hum":65,"gas":850,"hr":82,"alert":0,"lat":0,"lon":0}'

# Get all helmets
curl http://localhost:3000/api/helmets

# Trigger a panic alert
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"id":"Helmet-1","temp":38,"hum":90,"gas":1300,"hr":52,"alert":1,"lat":-1.9441,"lon":30.0619}'

# Server health check
curl http://localhost:3000/api/status
```

---

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/helmet-dashboard.git
git push -u origin main
```

### 2. Deploy

1. Go to vercel.com and sign in with GitHub
2. Click **Add New > Project** and import your repository
3. Next.js will be detected automatically
4. Add your `MONGODB_URI` under **Environment Variables** before deploying
5. Click **Deploy**

### 3. Update the ESP8266 sketch

Once deployed, update `esp8266_helmet.ino`:

```cpp
const char* apiUrl = "https://your-project.vercel.app/api/data";
```

---

## ESP8266 Setup

The sketch connects the ESP8266 to a 2.4 GHz WiFi network (station mode) and posts sensor data from the STM32 via HC-06 Bluetooth every 3 seconds.

**Requirements:**
- 2.4 GHz WiFi network (ESP8266 does not support 5 GHz)
- Next.js server reachable on the same network
- HC-06 connected to D5 (RX) and D6 (TX)

Set your credentials in `esp8266_helmet.ino`:

```cpp
const char* sta_ssid     = "your_network_name";
const char* sta_password = "your_password";
const char* apiUrl       = "http://<server-ip>:3000/api/data";
```

To find your server IP on Windows: run `ipconfig` and look for the IPv4 address on the adapter connected to the same network as the ESP8266.
