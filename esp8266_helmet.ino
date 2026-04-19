// ─────────────────────────────────────────────────
// Smart Safety Helmet — ESP8266 Controller Unit
// ACCESS POINT MODE + posts to Next.js on your PC
//
// Flow:
//   ESP8266 creates "HelmetMonitor" WiFi network
//   Your PC connects to "HelmetMonitor"
//   Next.js runs on your PC (npm run dev)
//   ESP8266 posts data to http://192.168.4.2:3000
//   192.168.4.2 is always your PC on AP network
// ─────────────────────────────────────────────────
#include <SoftwareSerial.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ── AP credentials — ESP8266 creates this network ─
const char* ap_ssid     = "HelmetMonitor";
const char* ap_password = "helmet123";

// WiFi.mode(WIFI_STA);           // station mode, not AP
// WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");

// ── Your PC's IP on the AP network (always this) ──
// Your PC gets 192.168.4.2 when it joins HelmetMonitor
// const char* apiUrl = "http://192.168.4.2:3000/api/data";
const char* apiUrl = "https://esp8266-server.vercel.app/api/data";

// ── HC-06 on D5/D6 ───────────────────────────────
SoftwareSerial hc06(D5, D6);

// ── Sensor data ───────────────────────────────────
float temperature = 0, humidity = 0, gas = 0;
float latitude    = 0, longitude = 0;
int   heartRate   = 0, alertFlag = 0;
String incoming   = "";
unsigned long lastPost = 0;
const long    POST_INTERVAL = 3000;

// ── Forward declarations ──────────────────────────
void readHC06();
void postData();

// ─────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  hc06.begin(9600);
  delay(1000);

  Serial.println("\nStarting Access Point...");

  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_password);

  IPAddress apIP = WiFi.softAPIP();
  Serial.println("AP started!");
  Serial.println("Network  : " + String(ap_ssid));
  Serial.println("Password : " + String(ap_password));
  Serial.println("ESP8266 IP: " + apIP.toString());
  Serial.println("----------------------------------------");
  Serial.println("Step 1: Connect your PC to 'HelmetMonitor' WiFi");
  Serial.println("Step 2: Run 'npm run dev' on your PC");
  Serial.println("Step 3: ESP8266 will POST to https://esp8266-server.vercel.app/");
  Serial.println("Step 4: Open https://esp8266-server.vercel.app/ in browser");
  Serial.println("----------------------------------------");
}

// ─────────────────────────────────────────────────
void loop() {
  readHC06();

  if (millis() - lastPost >= POST_INTERVAL) {
    // only post if at least one client is connected
    if (WiFi.softAPgetStationNum() > 0) {
      postData();
    } else {
      Serial.println("Waiting for PC to connect to HelmetMonitor...");
    }
    lastPost = millis();
  }
}

// ── Parse incoming BT data ────────────────────────
// Format: T:24.2,H:70.3,G:1121,HR:0,AL:0,LAT:0,LON:0\n
void readHC06() {
  while (hc06.available()) {
    char c = hc06.read();
    if (c == '\n') {
      incoming.trim();
      if (incoming.length() > 5) {
        Serial.println("BT: " + incoming);
        float t=0,h=0,g=0,lat=0,lon=0;
        int   hr=0,al=0;
        sscanf(incoming.c_str(),
          "T:%f,H:%f,G:%f,HR:%d,AL:%d,LAT:%f,LON:%f",
          &t,&h,&g,&hr,&al,&lat,&lon);
        temperature = t; humidity    = h;
        gas         = g; heartRate   = hr;
        alertFlag   = al; latitude   = lat;
        longitude   = lon;
      }
      incoming = "";
    } else {
      incoming += c;
    }
  }
}

// ── POST JSON to Next.js running on PC ────────────
void postData() {
  WiFiClient client;
  HTTPClient http;

  String body = "{";
  body += "\"id\":\"Helmet-1\",";
  body += "\"temp\":"  + String(temperature, 1) + ",";
  body += "\"hum\":"   + String(humidity, 1)    + ",";
  body += "\"gas\":"   + String(gas, 0)         + ",";
  body += "\"hr\":"    + String(heartRate)       + ",";
  body += "\"alert\":" + String(alertFlag)       + ",";
  body += "\"lat\":"   + String(latitude, 6)     + ",";
  body += "\"lon\":"   + String(longitude, 6);
  body += "}";

  Serial.println("POSTing to: " + String(apiUrl));
  Serial.println("Body: " + body);

  http.begin(client, apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int code = http.POST(body);
  if (code > 0) {
    Serial.println("Response " + String(code) + ": " + http.getString());
  } else {
    Serial.println("POST failed: " + http.errorToString(code));
    Serial.println("Is Next.js running on your PC?");
  }
  http.end();
}
