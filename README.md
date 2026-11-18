# Smart Agriculture Monitoring System

A full-stack mini project that monitors farm field conditions and controls irrigation automatically or manually.

## Features
- Live readings: soil moisture, temperature, humidity, soil pH, light level
- Auto irrigation: turns on when soil moisture drops below 35% or temperature exceeds 40°C
- Manual override for irrigation control
- Reading history table
- REST API for integration with real sensors

## Tech Stack
- Backend: Node.js, Express
- Frontend: HTML, CSS, JavaScript (Fetch API)

## Setup
```bash
npm install
npm start
```
Open http://localhost:3000

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sensors | Latest sensor reading |
| GET | /api/history | Last 50 readings |
| GET | /api/status | Mode, irrigation state, thresholds |
| POST | /api/irrigation | Body: `{"mode":"auto"\|"manual"}` or `{"mode":"manual","on":true}` |

## Notes
Sensor values are simulated. To use real hardware, replace `readSensors()` in `server.js` with calls to your sensor drivers or an IoT gateway (e.g., Arduino/ESP32 over serial or MQTT).
