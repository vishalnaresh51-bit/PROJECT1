const $ = (id) => document.getElementById(id);
let historyData = [];
let currentMode = "auto";
let currentPump = false;
let chartValues = [];

function setText(id, value) { $(id).textContent = value ?? "--"; }
function timeLabel(value) {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function drawChart() {
  const canvas = $("moistureChart");
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, rect.width * dpr);
  canvas.height = Math.max(1, rect.height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height, pad = {l:28,r:10,t:12,b:22};
  const values = chartValues.slice(-20);
  ctx.clearRect(0,0,w,h);
  ctx.font = '9px "DM Sans"';
  for (let v=0; v<=100; v+=25) {
    const y = pad.t + (h-pad.t-pad.b)*(1-v/100);
    ctx.strokeStyle = "#edf1ed"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
    ctx.fillStyle = "#9aa69d"; ctx.fillText(String(v),3,y+3);
  }
  if (!values.length) return;
  const x = i => pad.l + (values.length===1 ? 0 : i*(w-pad.l-pad.r)/(values.length-1));
  const y = v => pad.t + (h-pad.t-pad.b)*(1-v/100);
  ctx.beginPath();
  values.forEach((v,i)=> i ? ctx.lineTo(x(i),y(v)) : ctx.moveTo(x(i),y(v)));
  ctx.lineWidth=2.5; ctx.strokeStyle="#4b9b68"; ctx.stroke();
  ctx.lineTo(x(values.length-1),h-pad.b); ctx.lineTo(x(0),h-pad.b); ctx.closePath();
  ctx.fillStyle="rgba(75,155,104,.10)"; ctx.fill();
  values.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),3,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#4b9b68";ctx.lineWidth=2;ctx.stroke();});
}
function renderReading(data) {
  if (!data) return;
  setText("moisture", Number(data.soilMoisture).toFixed(1));
  setText("temperature", Number(data.temperature).toFixed(1));
  setText("humidity", Number(data.humidity).toFixed(1));
  setText("ph", Number(data.ph).toFixed(2));
  setText("lightLevel", Math.round(data.lightLevel));
  $("moistureBar").style.width = Math.max(0,Math.min(100,Number(data.soilMoisture))) + "%";
  $("moistureStatus").textContent = data.soilMoisture < 35 ? "LOW" : data.soilMoisture > 65 ? "HIGH" : "GOOD";
  $("lastUpdated").textContent = "Updated at " + timeLabel(data.timestamp);
  if (typeof data.irrigationOn === "boolean") currentPump = data.irrigationOn;
  renderPump();
}
function renderPump() {
  $("pumpStatus").textContent = currentPump ? "Pump is running" : "Pump is off";
  $("pumpDescription").textContent = currentPump ? "Water is being supplied to the field." : "No irrigation is running right now.";
  $("pumpDot").classList.toggle("on", currentPump);
  $("pumpSymbol").classList.toggle("on", currentPump);
  $("pumpToggle").classList.toggle("on", currentPump);
}
function renderHistory(rows) {
  const body = $("historyBody");
  if (!Array.isArray(rows) || !rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="empty">No readings available yet.</td></tr>';
    return;
  }
  body.innerHTML = rows.slice(-8).reverse().map(r => `<tr>
    <td>${timeLabel(r.timestamp)}</td><td>${Number(r.soilMoisture).toFixed(1)}%</td>
    <td>${Number(r.temperature).toFixed(1)}°C</td><td>${Number(r.humidity).toFixed(1)}%</td>
    <td>${Number(r.ph).toFixed(2)}</td><td>${Math.round(r.lightLevel)} lx</td>
    <td><span class="pill ${r.irrigationOn ? "on":"off"}">${r.irrigationOn ? "ON":"OFF"}</span></td></tr>`).join("");
}
async function api(path, options) {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  return response.json();
}
async function loadDashboard() {
  try {
    const [sensor, history, status] = await Promise.all([
      api("/api/sensors"), api("/api/history"), api("/api/status")
    ]);
    renderReading(sensor);
    historyData = history;
    chartValues = history.map(r => Number(r.soilMoisture));
    renderHistory(history);
    currentMode = status.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("selected", b.dataset.mode === currentMode));
    $("pumpToggle").disabled = currentMode !== "manual";
    $("manualHint").textContent = currentMode === "manual" ? "You can now switch the pump on or off" : "Switch to manual mode to control the pump";
    $("apiNotice").textContent = "Connected to project sensor API · values are simulated";
    $("apiNotice").style.color = "#4b8b5c";
    $("chartCount").textContent = `${chartValues.length} points`;
    drawChart();
  } catch (error) {
    $("apiNotice").textContent = "Cannot connect to the API. Check that the Vercel deployment is running the Node.js server.";
    $("apiNotice").style.color = "#bd7651";
    $("lastUpdated").textContent = "Sensor connection unavailable";
  }
}
async function updateIrrigation(payload) {
  try {
    const result = await api("/api/irrigation", {
      method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)
    });
    currentMode = result.mode; currentPump = result.irrigationOn;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("selected", b.dataset.mode === currentMode));
    $("pumpToggle").disabled = currentMode !== "manual";
    $("manualHint").textContent = currentMode === "manual" ? "You can now switch the pump on or off" : "Switch to manual mode to control the pump";
    renderPump(); $("apiNotice").textContent = "Irrigation settings updated successfully.";
  } catch (error) {
    $("apiNotice").textContent = "Could not update irrigation. Please try again.";
  }
}
document.querySelectorAll(".mode-btn").forEach(btn => btn.addEventListener("click", () => updateIrrigation({mode:btn.dataset.mode})));
$("pumpToggle").addEventListener("click", () => {
  if (currentMode === "manual") updateIrrigation({mode:"manual",on:!currentPump});
});
$("refreshBtn").addEventListener("click", loadDashboard);
window.addEventListener("resize", drawChart);
loadDashboard();
setInterval(loadDashboard, 5000);
