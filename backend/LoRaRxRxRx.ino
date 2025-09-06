// RXRXRXRX

#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

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
const char* ssid = "PLDT_Home_464D8_5G";
const char* password = "pldthome";
const char* serverName = "http://192.168.1.237:5000/insert_detection";

// Timing Constants
const unsigned long ALERT_DISPLAY_TIME = 5000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;
const unsigned long STATUS_UPDATE_INTERVAL = 1000;
const unsigned long RSSI_UPDATE_INTERVAL = 2000;

// Device Configuration
const String receiverID = "EcoSentry-Rx";
const String location = "Can-ayan, Bukidnon";

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
}

void loop() {
  unsigned long currentTime = millis();
  handleWiFiConnection(currentTime);
  handleLoRaPackets(currentTime);
  updateDisplay(currentTime);
  delay(10);
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

    if (processReceivedPacket(received, currentTime)) {
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
