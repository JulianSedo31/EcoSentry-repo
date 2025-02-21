#include <WiFi.h>
#include <WebServer.h>

const char* ssid = "realme 6i";
const char* password = "0987654321";
WebServer server(80);

void handleStatus() {
  server.send(200, "application/json", "{\"status\": \"Connected\"}");
}

void setup() {
  Serial.begin(9600);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }

  Serial.print("ESP32 IP Address: ");
  Serial.println(WiFi.localIP());

  // Define the route for status check
  server.on("/status", HTTP_GET, handleStatus);

  server.begin();
  Serial.println("ESP32 Server started!");
}

void loop() {
  server.handleClient();
}
