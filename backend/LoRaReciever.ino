// RXRXRXRX

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "SPIFFS.h"
#include "mbedtls/base64.h"

// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// LoRa Configuration
#define LORA_SCK 5
#define LORA_MISO 19
#define LORA_MOSI 27
#define LORA_CS 18
#define LORA_RST 14
#define LORA_DIO0 26
#define LORA_BAND 433000000   // 433 MHz full number
#define LORA_SYNC_WORD 0xF3

// WiFi Configuration
const char* ssid = "Chuy";
const char* password = "Chuy1234";
const char* serverName = "http://192.168.1.237:5000/insert_detection";

// Timing Constants
const unsigned long ALERT_DISPLAY_TIME = 5000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;
const unsigned long STATUS_UPDATE_INTERVAL = 1000;
const unsigned long RSSI_UPDATE_INTERVAL = 2000;

// Device Configuration
const String receiverID = "EcoSentry-Rx";
const String location = "Can-ayan, Bukidnon";

// Upload configuration (receiver will POST to this when it reassembles audio)
const char* uploadHost = "192.168.1.237"; // server IP (no internet at site)
const uint16_t uploadPort = 5000;
const char* uploadPath = "/api/detection/audio_upload";
const unsigned long UPLOAD_CHECK_INTERVAL = 15000; // check every 15s

unsigned long lastUploadCheck = 0;

// Receiver State
struct {
  uint32_t packetCount = 0;
  uint32_t validPackets = 0;
  uint32_t invalidPackets = 0;
  bool chainsawDetected = false;
  unsigned long lastAlertTime = 0;
  String lastAlertMessage = "";
  String ipAddress = "No IP";
  String wifiStatus = "Disconnected";
  int wifiRSSI = 0;
  unsigned long lastWifiRetry = 0;
  int lastRSSI = 0;
  float lastSNR = 0;
  unsigned long lastStatusUpdate = 0;
  unsigned long lastRSSIUpdate = 0;
  String lastMessage = "";
  String messageBuffer[3] = {"", "", ""};
  // GPS coordinates from alerts
  float lastLatitude = 0.0;
  float lastLongitude = 0.0;
  bool hasGpsData = false;
} rxState;

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println();
  Serial.println("================ EcoSentry Receiver ================");
  Serial.println("Board     : LoRa 433MHz (RX)");
  Serial.print  ("Location  : "); Serial.println(location);
  Serial.println("====================================================");

  initializeDisplay();
  displaySplashScreen();
  initializeLoRa();
  connectToWiFi();
  // Initialize SPIFFS for storing incoming file chunks
  if (!SPIFFS.begin(true)) {
    Serial.println("⚠️ SPIFFS mount failed");
  } else {
    Serial.println("✅ SPIFFS mounted");
  }
}

void loop() {
  unsigned long currentTime = millis();
  handleWiFiConnection(currentTime);
  handleLoRaPackets(currentTime);
  // Periodically check for completed incoming files and upload them
  if (currentTime - lastUploadCheck >= UPLOAD_CHECK_INTERVAL) {
    processIncomingFiles();
    lastUploadCheck = currentTime;
  }
  updateDisplay(currentTime);
  delay(10);
}

// ------------------- INCOMING FILE PROCESSING & UPLOAD -------------------

struct ChunkItem {
  int seq;
  int total;
  String b64;
};

void processIncomingFiles() {
  Serial.println("[FILE] Scanning SPIFFS for incoming files...");
  File root = SPIFFS.open("/");
  if (!root) {
    Serial.println("[FILE] failed to open SPIFFS root");
    return;
  }

  File file = root.openNextFile();
  while (file) {
    String name = file.name();
    if (name.startsWith("/incoming_") && name.endsWith(".b64")) {
      Serial.println("[FILE] Found: " + name);
      // Read all lines and parse chunks
      std::vector<ChunkItem> chunks;
      file.seek(0);
      while (file.available()) {
        String line = file.readStringUntil('\n');
        line.trim();
        if (line.length() == 0) continue;
        if (line.startsWith("FILE|") || line.startsWith("FILE_END|")) {
          int a = line.indexOf('|');
          int b = line.indexOf('|', a + 1);
          int c = line.indexOf('|', b + 1);
          int d = line.indexOf('|', c + 1);
          if (a < 0 || b < 0 || c < 0 || d < 0) continue;
          String fileId = line.substring(a + 1, b);
          int seq = line.substring(b + 1, c).toInt();
          int total = line.substring(c + 1, d).toInt();
          String b64 = line.substring(d + 1);
          ChunkItem it; it.seq = seq; it.total = total; it.b64 = b64;
          chunks.push_back(it);
        }
      }

      if (chunks.size() == 0) {
        Serial.println("[FILE] no valid chunks in " + name);
        file = root.openNextFile();
        continue;
      }

      // Determine expected total
      int expectedTotal = chunks[0].total;
      for (size_t i = 0; i < chunks.size(); ++i) {
        if (chunks[i].total > expectedTotal) expectedTotal = chunks[i].total;
      }

      // Build map of seq -> b64
      std::vector<String> seqMap(expectedTotal);
      int got = 0;
      for (size_t i = 0; i < chunks.size(); ++i) {
        if (chunks[i].seq >= 0 && chunks[i].seq < expectedTotal) {
          if (seqMap[chunks[i].seq].length() == 0) {
            seqMap[chunks[i].seq] = chunks[i].b64;
            got++;
          }
        }
      }

      if (got < expectedTotal) {
        Serial.printf("[FILE] incomplete (%d/%d) - waiting for more chunks\n", got, expectedTotal);
        file = root.openNextFile();
        continue; // wait until all chunks arrived
      }

      // All chunks present - decode and write to a temp binary file
      // extract fileId from filename: /incoming_<fileId>.b64
      int u1 = name.indexOf('_');
      int u2 = name.lastIndexOf('.');
      String fileId = "unknown";
      if (u1 > 0 && u2 > u1) fileId = name.substring(u1 + 1, u2);
      String tmpPath = String("/upload_") + fileId + ".wav";

      File out = SPIFFS.open(tmpPath, FILE_WRITE);
      if (!out) {
        Serial.println("[FILE] Failed to open " + tmpPath + " for write");
        file = root.openNextFile();
        continue;
      }

      for (int i = 0; i < expectedTotal; ++i) {
        String &b64 = seqMap[i];
        size_t slen = b64.length();
        if (slen == 0) continue; // should not happen
        size_t dlen = (slen / 4) * 3 + 3;
        unsigned char* dbuf = (unsigned char*)malloc(dlen);
        if (!dbuf) {
          Serial.println("[FILE] malloc failed for base64 decode");
          out.close();
          SPIFFS.remove(tmpPath);
          break;
        }
        size_t olen = 0;
        int rc = mbedtls_base64_decode(dbuf, dlen, &olen, (const unsigned char*)b64.c_str(), slen);
        if (rc == 0 && olen > 0) {
          out.write(dbuf, olen);
        } else {
          Serial.printf("[FILE] base64 decode failed rc=%d\n", rc);
        }
        free(dbuf);
      }
      out.close();

      // Attempt upload
      bool ok = uploadFileToServer(tmpPath, fileId);
      if (ok) {
        // cleanup incoming and temp files
        Serial.println("[FILE] upload OK, cleaning up");
        SPIFFS.remove(name);
        SPIFFS.remove(tmpPath);
      } else {
        Serial.println("[FILE] upload failed, keeping files for retry");
      }
    }

    file = root.openNextFile();
  }
}

bool uploadFileToServer(const String &localPath, const String &fileId) {
  Serial.println("[UPLOAD] Starting upload for " + localPath);
  File f = SPIFFS.open(localPath, FILE_READ);
  if (!f) {
    Serial.println("[UPLOAD] failed to open file");
    return false;
  }

  size_t fileSize = f.size();
  String boundary = "----EcoSentryBoundary7";
  String pre = "--" + boundary + "\r\n";
   // use field name 'file' to match the Flask endpoint which expects 'file' in request.files
   pre += "Content-Disposition: form-data; name=\"file\"; filename=\"" + fileId + ".wav\"\r\n";
  pre += "Content-Type: audio/wav\r\n\r\n";
  String post = "\r\n--" + boundary + "\r\n";
  post += "Content-Disposition: form-data; name=\"device\"\r\n\r\n" + receiverID + "\r\n";
  post += "--" + boundary + "--\r\n";

  size_t contentLength = pre.length() + fileSize + post.length();

  WiFiClient client;
  if (!client.connect(uploadHost, uploadPort)) {
    Serial.println("[UPLOAD] Failed to connect to server");
    f.close();
    return false;
  }

  // Send HTTP request headers
  client.print(String("POST ") + uploadPath + " HTTP/1.1\r\n");
  client.print(String("Host: ") + uploadHost + ":" + uploadPort + "\r\n");
  client.print(String("Content-Type: multipart/form-data; boundary=") + boundary + "\r\n");
  client.print(String("Content-Length: ") + contentLength + "\r\n");
  client.print("Connection: close\r\n\r\n");

  // Send preamble
  client.print(pre);

  // Stream file bytes
  const size_t BUF_SZ = 1024;
  uint8_t buf[BUF_SZ];
  while (f.available()) {
    size_t r = f.read(buf, BUF_SZ);
    if (r > 0) client.write(buf, r);
    else break;
  }
  f.close();

  // Send postamble
  client.print(post);

  // Wait for server response (simple read)
  unsigned long timeout = millis() + 10000;
  while (client.connected() && millis() < timeout) {
    while (client.available()) {
      String line = client.readStringUntil('\n');
      line.trim();
      Serial.println("[UPLOAD] <- " + line);
      // quick success detection
      if (line.startsWith("HTTP/1.1 200") || line.startsWith("HTTP/1.0 200")) {
        // drain remainder
        while (client.available()) client.read();
        client.stop();
        return true;
      }
    }
  }

  client.stop();
  Serial.println("[UPLOAD] No successful HTTP response");
  return false;
}

// ------------------- DISPLAY -------------------

void initializeDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println("❌ OLED initialization failed!");
    while (true);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
}

void displaySplashScreen() {
  display.clearDisplay();

  // 🔹 Title (EcoSentry)
  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds("EcoSentry", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 6);
  display.println("EcoSentry");

  // 🔹 Subtitle (Receiver Module)
  display.setTextSize(1);
  display.getTextBounds("Receiver Module", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 30);
  display.println("Receiver Module");

  // 🔹 Footer info (version)
  display.getTextBounds("LoRa 433MHz v2.1", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 46);
  display.println("LoRa 433MHz v2.1");

  // 🔹 Separator line
  display.drawLine(10, 24, SCREEN_WIDTH - 10, 24, SSD1306_WHITE);

  // ❌ Removed the "© EcoSentry" footer for a cleaner, professional look

  display.display();
  delay(2500);

  // 🔹 Initializing screen
  display.clearDisplay();
  display.setTextSize(1);
  display.getTextBounds("System Initializing...", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 28);
  display.println("System Initializing...");
  display.display();
  delay(1500);
}


// ------------------- LORA -------------------

void initializeLoRa() {
  Serial.println("[INFO] Initializing LoRa radio...");
  showStatusDisplay("INITIALIZING", "Starting LoRa...");

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    displayErrorScreen("LoRa Init Failed!");
    while (true);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.enableCrc();

  Serial.println("[OK]   LoRa initialized successfully");
  Serial.println("[CONF] 433MHz | SF7 | BW125 | CR4/5");
  showStatusDisplay("READY", "Listening...");
}

void handleLoRaPackets(unsigned long currentTime) {
  int packetSize = LoRa.parsePacket();
  if (packetSize > 0) {
    rxState.packetCount++;
    String received = readLoRaPacket(packetSize);

    // If this is a file chunk forwarded raw, handle specially
    if (received.startsWith("FILE|") || received.startsWith("FILE_END|")) {
      Serial.println("📥 Received FILE packet");
      // Save raw chunk line to SPIFFS for later assembly
      // Format: FILE|<fileId>|<seq>|<total>|<b64_chunk>
      int firstSep = received.indexOf('|');
      int secondSep = received.indexOf('|', firstSep + 1);
      String fileId = "unknown";
      if (secondSep > firstSep) {
        fileId = received.substring(firstSep + 1, secondSep);
      }
      String path = "/incoming_" + fileId + ".b64";
      File f = SPIFFS.open(path, FILE_APPEND);
      if (f) {
        f.println(received);
        f.close();
        Serial.println("🗄️ Appended chunk to " + path);
      } else {
        Serial.println("❌ Failed to open " + path + " for append");
      }
      rxState.validPackets++;
    } else if (processReceivedPacket(received, currentTime)) {
      rxState.validPackets++;
      printPacketInfo(received, currentTime);
    } else {
      rxState.invalidPackets++;
    }

    if (currentTime - rxState.lastRSSIUpdate >= RSSI_UPDATE_INTERVAL) {
      rxState.lastRSSI = LoRa.packetRssi();
      rxState.lastSNR = LoRa.packetSnr();
      rxState.lastRSSIUpdate = currentTime;
    }
  }
}

String readLoRaPacket(int packetSize) {
  String received = "";
  while (LoRa.available()) {
    received += (char)LoRa.read();
  }
  received.trim();
  return received;
}

bool processReceivedPacket(String packet, unsigned long currentTime) {
  if (packet.length() == 0) return false;

  rxState.messageBuffer[2] = rxState.messageBuffer[1];
  rxState.messageBuffer[1] = rxState.messageBuffer[0];
  rxState.messageBuffer[0] = packet;
  rxState.lastMessage = packet;

  String lowerMsg = packet;
  lowerMsg.toLowerCase();
  bool detection = lowerMsg.indexOf("chainsaw") >= 0;

  // Parse GPS coordinates from ALERT,CHAINSAW,lat,lon format
  if (detection && packet.startsWith("ALERT,CHAINSAW,")) {
    int firstComma = packet.indexOf(',', 14); // After "ALERT,CHAINSAW,"
    int secondComma = packet.indexOf(',', firstComma + 1);
    
    if (firstComma > 0 && secondComma > firstComma) {
      String latStr = packet.substring(14, firstComma);
      String lonStr = packet.substring(firstComma + 1, secondComma);
      
      if (latStr != "NOFIX" && lonStr != "NOFIX") {
        rxState.lastLatitude = latStr.toFloat();
        rxState.lastLongitude = lonStr.toFloat();
        rxState.hasGpsData = true;
      }
    }
  }

  if (detection) {
    rxState.chainsawDetected = true;
    rxState.lastAlertTime = currentTime;
    rxState.lastAlertMessage = packet;
    sendDetectionToServer(packet);
  }

  return true;
}

// ------------------- WIFI -------------------

void handleWiFiConnection(unsigned long currentTime) {
  if (WiFi.status() != WL_CONNECTED) {
    rxState.wifiStatus = "Disconnected";
    if (currentTime - rxState.lastWifiRetry >= WIFI_RETRY_INTERVAL) {
      connectToWiFi();
      rxState.lastWifiRetry = currentTime;
    }
  } else {
    rxState.wifiStatus = "Connected";
    rxState.wifiRSSI = WiFi.RSSI();
  }
}

void connectToWiFi() {
  Serial.println("[INFO] Connecting to WiFi...");
  showStatusDisplay("NETWORK", "Connecting...");

  WiFi.disconnect(true);
  WiFi.begin(ssid, password);

  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < 10000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    rxState.ipAddress = WiFi.localIP().toString();
    rxState.wifiRSSI = WiFi.RSSI();
    Serial.println();
    Serial.println("[OK]   WiFi connected");
    Serial.print("[NET]  IP Address: ");
    Serial.println(rxState.ipAddress);
    showStatusDisplay("NETWORK", "Connected");
  } else {
    Serial.println();
    Serial.println("[ERR]  WiFi connection failed");
    showStatusDisplay("NETWORK", "Failed");
  }
}

// ------------------- SERVER -------------------

void sendDetectionToServer(String message) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ Cannot send to server - WiFi disconnected");
    return;
  }

  HTTPClient http;
  http.begin(serverName);
  http.addHeader("Content-Type", "application/json");

  DynamicJsonDocument doc(512); // Increased size for GPS data
  doc["device"] = receiverID;
  doc["location"] = location;
  doc["detection"] = message;
  doc["rssi"] = rxState.lastRSSI;
  doc["snr"] = rxState.lastSNR;
  
  // Add GPS coordinates if available
  if (rxState.hasGpsData) {
    doc["latitude"] = rxState.lastLatitude;
    doc["longitude"] = rxState.lastLongitude;
  }

  String jsonData;
  serializeJson(doc, jsonData);

  Serial.println("[HTTP] POST " + String(serverName));
  Serial.println("[HTTP] Body: " + jsonData);
  int httpCode = http.POST(jsonData);

  if (httpCode > 0) {
    Serial.print("[HTTP] Response: ");
    Serial.println(httpCode);
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("[HTTP] Payload: " + payload);
    }
  } else {
    Serial.print("[ERR]  HTTP Error: ");
    Serial.println(httpCode);
  }

  http.end();
}

// ------------------- DISPLAY UPDATE -------------------

void updateDisplay(unsigned long currentTime) {
  if (rxState.chainsawDetected && currentTime - rxState.lastAlertTime < ALERT_DISPLAY_TIME) {
    displayAlertScreen(currentTime);
  } else {
    rxState.chainsawDetected = false;
    if (currentTime - rxState.lastStatusUpdate >= STATUS_UPDATE_INTERVAL) {
      displayMainScreen(currentTime);
      rxState.lastStatusUpdate = currentTime;
    }
  }
}

void displayMainScreen(unsigned long currentTime) {
  display.clearDisplay();
  drawHeader();

  // ✅ WiFi status + RSSI
  display.setCursor(0, 15);
  display.print("WiFi: ");
  display.print(rxState.wifiStatus);
  if (rxState.wifiStatus == "Connected") {
    display.print(" ");
    display.print(rxState.wifiRSSI);
    display.println("dBm");
  } else {
    display.println();
  }

  // ✅ IP address (safe buffer size, prevent broken chars)
  display.setCursor(0, 25);
  display.print("IP: ");
  if (rxState.ipAddress.length() > 0) {
    char ipBuffer[20];  // bigger buffer
    rxState.ipAddress.toCharArray(ipBuffer, sizeof(ipBuffer));
    display.println(ipBuffer);
  } else {
    display.println("No IP");
  }

  // ✅ Packets info
  display.setCursor(0, 35);
  display.print("Packets: ");
  display.print(rxState.validPackets);
  display.print("/");
  display.println(rxState.packetCount);

  // ✅ Last received message (safe buffer)
  display.setCursor(0, 45);
  display.print("Last Msg: ");
  if (rxState.lastMessage.length() > 0) {
    char msgBuffer[20];  // bigger buffer
    rxState.lastMessage.substring(0, 19).toCharArray(msgBuffer, sizeof(msgBuffer));
    display.println(msgBuffer);
  } else {
    display.println("None");
  }

  display.display();
}


void drawHeader() {
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(receiverID);
  display.print(" | 433MHz");
  display.drawFastHLine(0, 10, SCREEN_WIDTH, SSD1306_WHITE);
}

void displayAlertScreen(unsigned long currentTime) {
  display.clearDisplay();
  display.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, SSD1306_INVERSE);
  display.setTextSize(2);
  display.setCursor(10, 5);
  display.println("⚠️ ALERT!");
  display.setTextSize(1);
  display.setCursor(5, 30);
  display.println("CHAINSAW DETECTED!");
  
  // Show GPS coordinates if available
  if (rxState.hasGpsData) {
    display.setCursor(5, 40);
    display.print("GPS: ");
    display.print(rxState.lastLatitude, 6);
    display.print(",");
    display.print(rxState.lastLongitude, 6);
  } else {
    display.setCursor(5, 40);
    display.print("PKT#");
    display.print(rxState.packetCount);
    display.print(" RSSI:");
    display.print(rxState.lastRSSI);
    display.print("dBm");
  }
  
  display.setCursor(5, 50);
  display.print("Time: ");
  display.print((currentTime - rxState.lastAlertTime) / 1000);
  display.print("s ago");
  display.display();
}

void showStatusDisplay(String status, String message) {
  display.clearDisplay();
  drawHeader();
  display.setCursor(0, 15);
  display.print(status);
  display.print(": ");
  display.println(message);
  display.display();
}

void displayErrorScreen(String message) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("ERROR:");
  display.setTextSize(2);
  display.setCursor(0, 20);
  display.println(message);
  display.display();
  while(true) { delay(1000); }
}

// ------------------- DEBUG -------------------

void printPacketInfo(String packet, unsigned long currentTime) {
  // Attempt to parse sender and content from pattern: PKT#<n>|<sender>|<message>
  String pktNum = "";
  String sender = "";
  String content = packet;
  int firstSep = packet.indexOf('|');
  int secondSep = packet.indexOf('|', firstSep + 1);
  if (firstSep > 0 && secondSep > firstSep) {
    pktNum = packet.substring(0, firstSep);
    sender = packet.substring(firstSep + 1, secondSep);
    content = packet.substring(secondSep + 1);
  }

  Serial.println();
  Serial.println("--- Reception Report --------------------------------");
  Serial.print  ("Packet   : "); Serial.print(pktNum.length() ? pktNum : String("#") + String(rxState.packetCount)); Serial.println();
  Serial.print  ("From     : "); Serial.println(sender.length() ? sender : "Unknown");
  Serial.print  ("RSSI/SNR : "); Serial.print(rxState.lastRSSI); Serial.print(" dBm / "); Serial.print(rxState.lastSNR, 1); Serial.println(" dB");
  Serial.print  ("Content  : "); Serial.println(content);
  
  // Show GPS coordinates if available
  if (rxState.hasGpsData) {
    Serial.print  ("GPS      : "); Serial.print(rxState.lastLatitude, 6); Serial.print(", "); Serial.println(rxState.lastLongitude, 6);
  }
  
  if (rxState.chainsawDetected) {
    Serial.println("Alert    : CHAINSAW DETECTED (submitted to server)");
  }
  Serial.println("------------------------------------------------------");
}
