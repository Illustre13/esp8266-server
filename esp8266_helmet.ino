// ─────────────────────────────────────────────────
// Smart Safety Helmet — ESP8266 Controller Unit
// Posts data to hosted Next.js REST API via WiFi
// ─────────────────────────────────────────────────
#include <SoftwareSerial.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ── WiFi (AP mode fallback still works too) ───────
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ── Your deployed Next.js URL ─────────────────────
// Change this to your Vercel/Railway URL after deploy
const char* apiUrl = "https://your-app.vercel.app/api/data";

// ── HC-06 on D5/D6 ───────────────────────────────
SoftwareSerial hc06(D5, D6);

// ── Sensor data ───────────────────────────────────
float temperature = 0, humidity = 0, gas = 0;
float latitude    = 0, longitude = 0;
int   heartRate   = 0, alertFlag = 0;
String incoming   = "";
unsigned long lastPost = 0;
const long    POST_INTERVAL = 3000; // post every 3 seconds

void setup() {
  Serial.begin(115200);
  hc06.begin(9600);
  delay(1000);

  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500); Serial.print("."); tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi failed — check credentials");
  }
  Serial.println("API: " + String(apiUrl));
}

void loop() {
  readHC06();

  // post to API every POST_INTERVAL ms
  if (millis() - lastPost >= POST_INTERVAL && WiFi.status() == WL_CONNECTED) {
    postData();
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
        temperature = t; humidity  = h;
        gas         = g; heartRate = hr;
        alertFlag   = al; latitude = lat; longitude = lon;
      }
      incoming = "";
    } else {
      incoming += c;
    }
  }
}

// ── POST to Next.js API ───────────────────────────
void postData() {
  WiFiClient client;
  HTTPClient http;

  // build JSON body
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

  http.begin(client, apiUrl);
  http.addHeader("Content-Type", "application/json");

  int code = http.POST(body);
  if (code > 0) {
    Serial.println("POST " + String(code) + " — " + http.getString());
  } else {
    Serial.println("POST failed: " + http.errorToString(code));
  }
  http.end();
}
