#include <SPI.h>
#include <LoRa.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ───────────────────────────────
// OLED Configuration
// ───────────────────────────────
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ───────────────────────────────
// LoRa Configuration (TTGO LoRa32 v1.6.1 – 433MHz)
// ───────────────────────────────
#define LORA_SCK  5
#define LORA_MISO 19
#define LORA_MOSI 27
#define LORA_CS   18
#define LORA_RST  14
#define LORA_DIO0 26
#define LORA_BAND 433000000   // 433 MHz full number
#define LORA_SYNC_WORD 0xF3

// ───────────────────────────────
// Timing Configuration
// ───────────────────────────────
const unsigned long SEND_INTERVAL = 2000;
const unsigned long RETRY_INTERVAL = 10000;
const unsigned long DISPLAY_UPDATE_INTERVAL = 500;  // smoother refresh

// ───────────────────────────────
// Device Configuration
// ───────────────────────────────
const String transmitterID = "EcoSentry-Tx";
const String location = "Can-ayan, Bukidnon";

// ───────────────────────────────
// Transmission State
// ───────────────────────────────
struct {
  uint32_t packetCount = 0;
  uint32_t failedCount = 0;
  bool isConnected = false;
  bool isTransmitting = false;
  unsigned long nextSendTime = 0;
  unsigned long nextRetryTime = 0;
  uint8_t retryCount = 0;
  String lastMessage = "";
} txState;

// ───────────────────────────────
// Setup
// ───────────────────────────────
void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("\n\n🌳 EcoSentry Transmitter | LoRa 433MHz");
  Serial.println("---------------------------------------");
  Serial.print("Location   : "); Serial.println(location);
  Serial.println("---------------------------------------");

  initializeDisplay();
  displaySplashScreen();
  initializeLoRa();
}

// ───────────────────────────────
// Main Loop
// ───────────────────────────────
void loop() {
  unsigned long currentTime = millis();

  if (!txState.isConnected) {
    handleDisconnectedState(currentTime);
    return;
  }

  handleSerialInput(currentTime);

  // ✅ Auto send every SEND_INTERVAL
  if (currentTime >= txState.nextSendTime && !txState.isTransmitting) {
    String heartbeat = "PING #" + String(txState.packetCount + 1);
    sendPacket(heartbeat, currentTime);
  }

  // Update OLED every 1s
  if (currentTime % DISPLAY_UPDATE_INTERVAL < 50) {
    updateDisplay(currentTime);
  }
}

// ───────────────────────────────
// Display Functions
// ───────────────────────────────
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

  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds("EcoSentry", 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 6);
  display.println("EcoSentry");

  display.setTextSize(1);
  display.setCursor(20, 30);
  display.println("Transmitter Module");

  display.setCursor(25, 46);
  display.println("LoRa 433MHz v2.1");

  display.drawLine(10, 24, SCREEN_WIDTH - 10, 24, SSD1306_WHITE);
  display.display();
  delay(2500);

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(20, 28);
  display.println("System Initializing...");
  display.display();
  delay(1500);
}

void drawHeader() {
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(transmitterID);
  display.print(" | 433MHz");
  display.drawFastHLine(0, 10, SCREEN_WIDTH, SSD1306_WHITE);
}

void updateDisplay(unsigned long currentTime) {
  display.clearDisplay();
  drawHeader();

  display.setCursor(0, 14);
  display.print("Status: ");
  display.println(txState.isConnected ? "READY" : "DISCONNECTED");

  display.setCursor(0, 24);
  display.print("Sent/Fail: ");
  display.print(txState.packetCount);
  display.print("/");
  display.println(txState.failedCount);

  display.setCursor(0, 34);
  display.print("Last: ");
  if (txState.lastMessage.length() > 0) {
    String brief = txState.lastMessage.substring(0, 12);
    // Show GPS indicator for alert messages
    if (txState.lastMessage.startsWith("ALERT,CHAINSAW,")) {
      display.print("GPS Alert");
    } else {
      display.print(brief);
    }
  } else {
    display.print("None");
  }

  display.setCursor(0, 44);
  display.print("Next: ");
  if (txState.nextSendTime > currentTime) {
    unsigned long secs = (txState.nextSendTime - currentTime) / 1000;
    display.print(secs);
    display.print("s");
  } else {
    display.print("Now");
  }

  display.setCursor(64, 54);
  display.print("SF7 BW125");

  display.display();
}

// ───────────────────────────────
// LoRa Functions
// ───────────────────────────────
void initializeLoRa() {
  Serial.println("\n🔊 Initializing LoRa radio...");
  // Use TTGO LoRa32 v1.6.1 SPI pin mapping
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("❌ LoRa initialization failed!");
    txState.isConnected = false;
    txState.nextRetryTime = millis() + RETRY_INTERVAL;
    return;
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.enableCrc();
  LoRa.setTxPower(20, 1); // 20 dBm on PA_BOOST for SX1276/78

  Serial.println("✅ LoRa initialized successfully!");
  Serial.println("📶 Config: 433MHz | SF7 | BW125 | CR4/5");

  txState.isConnected = true;
  txState.nextSendTime = millis() + SEND_INTERVAL;
}

void sendPacket(String message, unsigned long currentTime) {
  txState.isTransmitting = true;
  txState.packetCount++;
  txState.lastMessage = message;

  String packet = "PKT#" + String(txState.packetCount) + "|" + transmitterID + "|" + message;

  LoRa.beginPacket();
  LoRa.print(packet);
  int result = LoRa.endPacket();   // ✅ blocking

  if (result == 1) {
    txState.nextSendTime = currentTime + SEND_INTERVAL;

    Serial.println();
    Serial.println("📤 Transmission Report");
    Serial.println("---------------------------------------");
    Serial.print("Packet No. : "); Serial.println(txState.packetCount);
    Serial.print("From       : "); Serial.println(transmitterID);
    Serial.print("Content    : "); Serial.println(message);
    Serial.println("Status     : ✅ Sent Successfully");
    Serial.println("---------------------------------------");
  } else {
    Serial.println("❌ Transmission Failed → Retrying...");
    txState.failedCount++;
    txState.retryCount++;
    txState.isConnected = false;
    txState.nextRetryTime = currentTime + RETRY_INTERVAL;
  }

  txState.isTransmitting = false;
}

// ───────────────────────────────
// Serial Input Handling
// ───────────────────────────────
void handleSerialInput(unsigned long currentTime) {
  if (Serial.available() > 0 && !txState.isTransmitting) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    if (input.length() > 0) {
      Serial.println("📥 Input Received → " + input);
      
      // Check if this is a GPS alert message
      if (input.startsWith("ALERT,CHAINSAW,")) {
        Serial.println("🚨 GPS Alert detected - sending immediately");
        sendPacket(input, currentTime);
      } else {
        sendPacket(input, currentTime);
      }
    }
  }
}

// ───────────────────────────────
// Disconnection Handling
// ───────────────────────────────
void handleDisconnectedState(unsigned long currentTime) {
  if (currentTime >= txState.nextRetryTime) {
    initializeLoRa();
  } else {
    unsigned long secondsLeft = (txState.nextRetryTime - currentTime) / 1000;
    display.clearDisplay();
    drawHeader();
    display.setCursor(0, 20);
    display.println("CONNECTION LOST");
    display.setCursor(0, 35);
    display.print("Retry in: ");
    display.print(secondsLeft);
    display.println("s");
    display.setCursor(0, 50);
    display.print("Attempt: ");
    display.print(txState.retryCount);
    display.display();
  }
}
