// ─────────────────────────────────────────────────
// Smart Safety Helmet — ESP8266 Controller Unit
// HC-06 → ESP8266 → Next.js API
// FIXED: stable serial + clean parsing + no duplication
// ─────────────────────────────────────────────────

#include <SoftwareSerial.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

// ── Access Point ────────────────────────────────
const char* ap_ssid = "HelmetMonitor";
const char* ap_password = "helmet123";

// ── Backend API ─────────────────────────────────
// const char* apiUrl = "https://esp8266-server.vercel.app/api/data";
// const char* apiUrl = "http://localhost:3000/api/data";
const char* apiUrl = "http://192.168.4.2:3000/api/data";
// const char* apiUrl = "http://localhost:3000";

// ── HC-06 Bluetooth (RX, TX) ───────────────────
SoftwareSerial hc06(D5, D6);

// ── Sensor Data ────────────────────────────────
String incoming = "";

float temperature = 0;
float humidity = 0;
float gas = 0;
int heartRate = 0;
int alertFlag = 0;
float latitude = 0;
float longitude = 0;

// ── Timing ──────────────────────────────────────
unsigned long lastPost = 0;
const long POST_INTERVAL = 3000;

// ────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);     // Debug
  hc06.begin(9600);         // HC-06 baud rate

  Serial.println("\nStarting Helmet System...");

  // AP Mode
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ap_ssid, ap_password);

  Serial.println("AP Started: HelmetMonitor");
  Serial.println("Waiting for Bluetooth data...");
}

// ────────────────────────────────────────────────
void loop() {
  readHC06();

  if (millis() - lastPost >= POST_INTERVAL) {
    postData();
    lastPost = millis();
  }
}

// ────────────────────────────────────────────────
// READ BLUETOOTH DATA
// Expected format from STM32:
// 25.4,68.2,1100,72,1,0,0
// ────────────────────────────────────────────────
void readHC06() {
  while (hc06.available()) {
    char c = hc06.read();

    // Keep only printable characters
    if (c >= 32 && c <= 126) {
      incoming += c;
    }

    // End of packet
    if (c == '\n') {
      incoming.trim();

      if (incoming.length() > 5) {

        Serial.println("BT RAW: " + incoming);

        float t = 0, h = 0, g = 0, lat = 0, lon = 0;
        int hr = 0, al = 0;

        // SAFE PARSING (CSV format)
        // int parsed = sscanf(incoming.c_str(),
        //                     "%f,%f,%f,%d,%d,%f,%f",
        //                     &t, &h, &g, &hr, &al, &lat, &lon);

          int parsed = sscanf(incoming.c_str(),
            "T:%f,H:%f,G:%f,HR:%d,AL:%d,LAT:%f,LON:%f",
            &t, &h, &g, &hr, &al, &lat, &lon);


        if (parsed >= 3) {
          temperature = t;
          humidity = h;
          gas = g;
          heartRate = hr;
          alertFlag = al;
          latitude = lat;
          longitude = lon;

          Serial.println("Parsed OK");
        } else {
          Serial.println("Parse FAILED");
        }
      }

      incoming = "";
    }
  }
}

// ────────────────────────────────────────────────
// POST TO NEXT.JS API
// ────────────────────────────────────────────────
void postData() {

  if (WiFi.softAPgetStationNum() < 1) {
    Serial.println("No client connected to AP");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  String body = "{";
  body += "\"id\":\"Helmet-1\",";
  body += "\"temp\":" + String(temperature, 1) + ",";
  body += "\"hum\":" + String(humidity, 1) + ",";
  body += "\"gas\":" + String(gas, 0) + ",";
  body += "\"hr\":" + String(heartRate) + ",";
  body += "\"alert\":" + String(alertFlag) + ",";
  body += "\"lat\":" + String(latitude, 6) + ",";
  body += "\"lon\":" + String(longitude, 6);
  body += "}";

  Serial.println("POST → " + String(apiUrl));
  Serial.println("DATA: " + body);

  http.begin(client, apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  int code = http.POST(body);

  if (code > 0) {
    Serial.println("Response: " + String(code));
    Serial.println(http.getString());
  } else {
    Serial.println("POST FAILED: " + http.errorToString(code));
  }

  http.end();
}