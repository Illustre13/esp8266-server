// // ─────────────────────────────────────────────────
// // Smart Safety Helmet — ESP8266 Controller Unit
// // HC-05 (master) receives from STM32's HC-06 (slave)
// // ─────────────────────────────────────────────────
// #include <SoftwareSerial.h>
// #include <ESP8266WiFi.h>
// #include <ESP8266HTTPClient.h>
// #include <WiFiClient.h>

// // ── AP credentials ────────────────────────────────
// const char* ap_ssid     = "HelmetMonitor";
// const char* ap_password = "helmet123";

// // ── Server URL ────────────────────────────────────
// const char* apiUrl = "http://192.168.4.2:3000/api/data";

// // ── HC-05 on D5(RX) / D6(TX) ─────────────────────
// SoftwareSerial hc05(D5, D6);  // ← renamed from hc06

// // ── Sensor data ───────────────────────────────────
// float temperature = 0, humidity = 0, gas = 0;
// float latitude    = 0, longitude = 0;
// int   heartRate   = 0, alertFlag = 0;
// String incoming   = "";
// unsigned long lastPost = 0;
// const long    POST_INTERVAL = 3000;

// // ── Forward declarations ──────────────────────────
// void readHC05();
// void postData();

// // ─────────────────────────────────────────────────
// void setup() {
//   Serial.begin(115200);
//   hc05.begin(9600);  // ← change this if baud test showed different rate
//   delay(1000);

//   Serial.println("\nStarting Access Point...");
//   WiFi.mode(WIFI_AP);
//   WiFi.softAP(ap_ssid, ap_password);

//   IPAddress apIP = WiFi.softAPIP();
//   Serial.println("AP started!");
//   Serial.println("Network  : " + String(ap_ssid));
//   Serial.println("Password : " + String(ap_password));
//   Serial.println("ESP8266 IP: " + apIP.toString());
//   Serial.println("Waiting for HC-05 to connect to HC-06...");
//   Serial.println("HC-05 LED should go SOLID when connected.");
// }

// // ─────────────────────────────────────────────────
// void loop() {
//   readHC05();  // ← renamed

//   if (millis() - lastPost >= POST_INTERVAL) {
//     if (WiFi.softAPgetStationNum() > 0) {
//       postData();
//     } else {
//       Serial.println("Waiting for PC to connect to HelmetMonitor...");
//     }
//     lastPost = millis();
//   }
// }

// // ── Parse incoming BT data ────────────────────────
// // Expected format: T:24.2,H:70.3,G:1121,HR:75,AL:0,LAT:0.0,LON:0.0\n
// void readHC05() {
//   while (hc05.available()) {  // ← renamed
//     char c = hc05.read();     // ← renamed
//     if (c == '\n') {
//       incoming.trim();
//       if (incoming.length() > 5) {
//         Serial.println("BT RX: " + incoming);  // ← clearer label
//         float t=0,h=0,g=0,lat=0,lon=0;
//         int   hr=0,al=0;
//         int parsed = sscanf(incoming.c_str(),
//           "T:%f,H:%f,G:%f,HR:%d,AL:%d,LAT:%f,LON:%f",
//           &t,&h,&g,&hr,&al,&lat,&lon);

//         if (parsed == 7) {  // ← only update if all 7 fields parsed OK
//           temperature = t; humidity  = h;
//           gas         = g; heartRate = hr;
//           alertFlag   = al; latitude = lat;
//           longitude   = lon;
//           Serial.println("Parsed OK — Temp:" + String(t) +
//                          " Hum:" + String(h) +
//                          " Gas:" + String(g) +
//                          " HR:"  + String(hr));
//         } else {
//           Serial.println("Parse FAILED (got " + String(parsed) + "/7 fields) — bad format?");
//         }
//       }
//       incoming = "";
//     } else if (c != '\r') {  // ← ignore \r so \r\n lines work too
//       incoming += c;
//     }
//   }
// }

// // ── POST JSON to Next.js ──────────────────────────
// void postData() {
//   WiFiClient client;
//   HTTPClient http;

//   String body = "{";
//   body += "\"id\":\"Helmet-1\",";
//   body += "\"temp\":"  + String(temperature, 1) + ",";
//   body += "\"hum\":"   + String(humidity, 1)    + ",";
//   body += "\"gas\":"   + String(gas, 0)         + ",";
//   body += "\"hr\":"    + String(heartRate)       + ",";
//   body += "\"alert\":" + String(alertFlag)       + ",";
//   body += "\"lat\":"   + String(latitude, 6)     + ",";
//   body += "\"lon\":"   + String(longitude, 6);
//   body += "}";

//   Serial.println("POSTing: " + body);

//   http.begin(client, apiUrl);
//   http.addHeader("Content-Type", "application/json");
//   http.setTimeout(5000);

//   int code = http.POST(body);
//   if (code > 0) {
//     Serial.println("Response " + String(code) + ": " + http.getString());
//   } else {
//     Serial.println("POST failed: " + http.errorToString(code));
//   }
//   http.end();
// }
#include <SoftwareSerial.h>

SoftwareSerial hc05(D5, D6);  // D5=RX, D6=TX

void setup() {
  Serial.begin(38400);   // PC side
  hc05.begin(38400);     // HC-05 AT mode baud
}

void loop() {
  // PC → HC-05
  if (Serial.available()) {
    hc05.write(Serial.read());
  }
  // HC-05 → PC
  if (hc05.available()) {
    Serial.write(hc05.read());
  }
}