const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Thresholds for automatic irrigation
const THRESHOLDS = { soilMoistureMin: 35, tempMax: 40 };
const MAX_HISTORY = 50;

let state = {
  irrigationOn: false,
  mode: "auto", // "auto" or "manual"
  current: null,
  history: [],
};

// Simulated field sensors (replace with real hardware readings in production)
function readSensors() {
  const prev = state.current;
  const drift = (v, min, max, step) =>
    Math.min(max, Math.max(min, v + (Math.random() - 0.5) * step));

  const reading = {
    timestamp: new Date().toISOString(),
    soilMoisture: +drift(prev ? prev.soilMoisture : 45, 10, 80, 6).toFixed(1),
    temperature: +drift(prev ? prev.temperature : 28, 15, 45, 2).toFixed(1),
    humidity: +drift(prev ? prev.humidity : 60, 30, 95, 4).toFixed(1),
    ph: +drift(prev ? prev.ph : 6.5, 5, 8, 0.2).toFixed(2),
    lightLevel: Math.round(drift(prev ? prev.lightLevel : 600, 0, 1000, 80)),
  };

  if (state.mode === "auto") {
    state.irrigationOn =
      reading.soilMoisture < THRESHOLDS.soilMoistureMin ||
      reading.temperature > THRESHOLDS.tempMax;
  }
  if (state.irrigationOn) {
    reading.soilMoisture = +Math.min(80, reading.soilMoisture + 3).toFixed(1);
  }
  reading.irrigationOn = state.irrigationOn;

  state.current = reading;
  state.history.push(reading);
  if (state.history.length > MAX_HISTORY) state.history.shift();
}

readSensors();
setInterval(readSensors, 5000);

// API routes
app.get("/api/sensors", (req, res) => res.json(state.current));

app.get("/api/history", (req, res) => res.json(state.history));

app.get("/api/status", (req, res) =>
  res.json({ mode: state.mode, irrigationOn: state.irrigationOn, thresholds: THRESHOLDS })
);

app.post("/api/irrigation", (req, res) => {
  const { mode, on } = req.body || {};
  if (mode && !["auto", "manual"].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'auto' or 'manual'" });
  }
  if (mode) state.mode = mode;
  if (typeof on === "boolean") {
    if (state.mode !== "manual") {
      return res.status(400).json({ error: "switch to manual mode first" });
    }
    state.irrigationOn = on;
  }
  res.json({ mode: state.mode, irrigationOn: state.irrigationOn });
});

app.listen(PORT, () =>
  console.log(`Smart Agriculture running at http://localhost:${PORT}`)
);
