'use strict';

/* ============================================================
   CONFIG
   Swap these endpoints for your own server if you have one —
   any host that (a) serves a large file with permissive CORS
   for download, and (b) accepts a POST body with permissive
   CORS for upload, will work.
   ============================================================ */
const CONFIG = {
  downloadUrl: 'https://speed.cloudflare.com/__down?bytes=100000000',
  uploadUrl: 'https://speed.cloudflare.com/__up',
  pingUrl: 'https://speed.cloudflare.com/__down?bytes=0',
  downloadDurationMs: 7000,
  uploadDurationMs: 7000,
  uploadChunkBytes: 24 * 1024 * 1024, // 24MB payload
  pingSamples: 6,
  historyLimit: Infinity, // Stores every speed test indefinitely
};

const SCALES = {
  download: { breakpoints: [0, 5, 10, 25, 50, 100, 250, 500, 1000], unit: 'Mbps', varName: '--accent-down' },
  upload:   { breakpoints: [0, 2, 5, 10, 25, 50, 100, 250, 500],    unit: 'Mbps', varName: '--accent-up' },
  ping:     { breakpoints: [0, 10, 25, 50, 100, 200, 400],          unit: 'ms',   varName: '--accent-ping' },
};

/* ============================================================
   GAUGE — polar geometry helpers
   270° sweep, 0° = top (12 o'clock), clockwise, -135..135
   ============================================================ */
const CX = 160, CY = 160, R = 118;
const START_ANGLE = -135, END_ANGLE = 135;

function polarPoint(cx, cy, r, angleDeg) {
  const rad = angleDeg * (Math.PI / 180);
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const p1 = polarPoint(cx, cy, r, startAngle);
  const p2 = polarPoint(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

function valueToT(value, breakpoints) {
  const n = breakpoints.length - 1;
  if (value <= breakpoints[0]) return 0;
  if (value >= breakpoints[n]) return 1;
  for (let i = 0; i < n; i++) {
    const a = breakpoints[i], b = breakpoints[i + 1];
    if (value >= a && value <= b) {
      const local = (value - a) / (b - a);
      return (i + local) / n;
    }
  }
  return 1;
}

const svg = document.getElementById('gaugeSvg');
const tickLayer = document.getElementById('tickLayer');
const trackArc = document.getElementById('trackArc');
const progressArc = document.getElementById('progressArc');
const needleGroup = document.getElementById('needleGroup');
const sweepGroup = document.getElementById('sweepGroup');
const readoutNumber = document.getElementById('readoutNumber');
const readoutUnit = document.getElementById('readoutUnit');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

trackArc.setAttribute('d', describeArc(CX, CY, R, START_ANGLE, END_ANGLE));
progressArc.setAttribute('d', describeArc(CX, CY, R, START_ANGLE, END_ANGLE));
const ARC_LEN = progressArc.getTotalLength();
progressArc.style.strokeDasharray = `${ARC_LEN}`;
progressArc.style.strokeDashoffset = `${ARC_LEN}`;

let currentScaleKey = 'download';

function drawTicks(breakpoints) {
  tickLayer.innerHTML = '';
  const n = breakpoints.length - 1;
  breakpoints.forEach((val, i) => {
    const angle = START_ANGLE + (i / n) * (END_ANGLE - START_ANGLE);
    const outer = polarPoint(CX, CY, R + 12, angle);
    const inner = polarPoint(CX, CY, R + 2, angle);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', inner.x); line.setAttribute('y1', inner.y);
    line.setAttribute('x2', outer.x); line.setAttribute('y2', outer.y);
    line.setAttribute('class', 'tick-major');
    tickLayer.appendChild(line);

    const labelPos = polarPoint(CX, CY, R + 28, angle);
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', labelPos.x); text.setAttribute('y', labelPos.y + 4);
    text.setAttribute('class', 'tick-label');
    text.textContent = val;
    tickLayer.appendChild(text);

    if (i < n) {
      const midAngle = angle + (0.5 / n) * (END_ANGLE - START_ANGLE);
      const mOuter = polarPoint(CX, CY, R + 9, midAngle);
      const mInner = polarPoint(CX, CY, R + 2, midAngle);
      const mLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      mLine.setAttribute('x1', mInner.x); mLine.setAttribute('y1', mInner.y);
      mLine.setAttribute('x2', mOuter.x); mLine.setAttribute('y2', mOuter.y);
      mLine.setAttribute('class', 'tick-minor');
      tickLayer.appendChild(mLine);
    }
  });
}

function setGaugeScale(key) {
  currentScaleKey = key;
  const s = SCALES[key];
  drawTicks(s.breakpoints);
  readoutUnit.textContent = s.unit;
  svg.style.setProperty('--accent-current', `var(${s.varName})`);
  document.documentElement.style.setProperty('--accent-current', `var(${s.varName})`);
  document.documentElement.style.setProperty('--accent-current-soft', `var(${s.varName}-soft)`);
}

function setGaugeValue(value) {
  const s = SCALES[currentScaleKey];
  const t = valueToT(value, s.breakpoints);
  progressArc.style.strokeDashoffset = `${ARC_LEN * (1 - t)}`;
  const angle = START_ANGLE + t * (END_ANGLE - START_ANGLE);
  needleGroup.style.transform = `rotate(${angle}deg)`;
  readoutNumber.textContent = value >= 100 ? value.toFixed(0) : value.toFixed(1);
}

function setSweeping(active) {
  sweepGroup.classList.toggle('active', active);
  statusDot.classList.toggle('live', active);
}

function setStatus(msg) { statusText.textContent = msg; }

/* ============================================================
   THEME
   ============================================================ */
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
  setGaugeScale(currentScaleKey);
}

(function initTheme() {
  const saved = localStorage.getItem('signal_theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
})();

themeToggle.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  localStorage.setItem('signal_theme', next);
  applyTheme(next);
});

/* ============================================================
   HISTORY
   ============================================================ */
const historyBody = document.getElementById('historyBody');
const clearHistoryBtn = document.getElementById('clearHistory');

function loadHistory() {
  try { return JSON.parse(localStorage.getItem('signal_history') || '[]'); }
  catch { return []; }
}

function saveHistory(list) {
  const sliceLimit = CONFIG.historyLimit === Infinity ? list.length : CONFIG.historyLimit;
  localStorage.setItem('signal_history', JSON.stringify(list.slice(0, sliceLimit)));
}

function renderHistory() {
  const list = loadHistory();
  if (!list || !list.length) {
    historyBody.innerHTML = `<tr class="history-empty-row"><td colspan="5">No tests yet — run one above and it'll show up here.</td></tr>`;
  } else {
    historyBody.innerHTML = list.map(r => {
      const recordTime = r?.time ?? r?.timestamp ?? Date.now();
      const download = r?.download ?? 0;
      const upload = r?.upload ?? 0;
      const ping = r?.ping ?? 0;
      const jitter = r?.jitter ?? 0;

      return `
        <tr>
          <td>${new Date(recordTime).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
          <td>${download.toFixed(1)} Mbps</td>
          <td>${upload.toFixed(1)} Mbps</td>
          <td>${ping.toFixed(0)} ms</td>
          <td>${jitter.toFixed(1)} ms</td>
        </tr>
      `;
    }).join('');
  }
  renderSparkline('downSpark', list.map(r => r?.download ?? 0).reverse());
  renderSparkline('upSpark', list.map(r => r?.upload ?? 0).reverse());
}

function renderSparkline(svgId, values) {
  const el = document.getElementById(svgId);
  el.innerHTML = '';
  if (values.length < 2) return;
  const max = Math.max(...values, 1);
  const min = 0;
  const w = 100, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return [x, y];
  });
  const linePath = 'M ' + pts.map(p => p.join(',')).join(' L ');
  const fillPath = linePath + ` L ${w},${h} L 0,${h} Z`;
  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fill.setAttribute('d', fillPath);
  fill.setAttribute('class', 'fill');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', linePath);
  el.appendChild(fill);
  el.appendChild(line);
}

clearHistoryBtn.addEventListener('click', () => {
  localStorage.removeItem('signal_history');
  renderHistory();
});

renderHistory();

/* ============================================================
   TEST ENGINE
   ============================================================ */
const startBtn = document.getElementById('startBtn');
const ctaLabel = document.getElementById('ctaLabel');
const downVal = document.getElementById('downVal');
const upVal = document.getElementById('upVal');
const pingVal = document.getElementById('pingVal');
const jitterVal = document.getElementById('jitterVal');
const cards = {
  download: document.querySelector('.metric-card[data-metric="download"]'),
  upload: document.querySelector('.metric-card[data-metric="upload"]'),
  ping: document.querySelector('.metric-card[data-metric="ping"]'),
};

function setActiveCard(key) {
  Object.values(cards).forEach(c => c.classList.remove('active'));
  if (key) cards[key].classList.add('active');
}

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stdev(arr) {
  const m = mean(arr);
  return arr.length ? Math.sqrt(mean(arr.map(v => (v - m) ** 2))) : 0;
}

async function runPingTest() {
  setGaugeScale('ping');
  setActiveCard('ping');
  setStatus('Measuring ping…');
  setSweeping(true);
  const samples = [];
  for (let i = 0; i < CONFIG.pingSamples; i++) {
    const t0 = performance.now();
    try {
      await fetch(`${CONFIG.pingUrl}&_=${Date.now()}${i}`, { cache: 'no-store' });
      const rtt = performance.now() - t0;
      if (i > 0) samples.push(rtt);
      setGaugeValue(rtt);
      pingVal.textContent = rtt.toFixed(0);
    } catch (e) {
      throw new Error('ping');
    }
  }
  setSweeping(false);
  const avg = mean(samples);
  const jitter = stdev(samples);
  setGaugeValue(avg);
  pingVal.textContent = avg.toFixed(0);
  jitterVal.textContent = jitter.toFixed(1);
  return { ping: avg, jitter };
}

function runXhrMeasured({ method, url, body, durationMs, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    
    const t0 = performance.now();
    let finished = false;

    const progressTarget = method === 'GET' ? xhr : xhr.upload;
    progressTarget.onprogress = (e) => {
      const elapsed = performance.now() - t0;
      const loaded = e?.loaded ?? 0;
      onProgress(loaded, elapsed);
    };

    const finish = (bytes = 0) => {
      if (finished) return;
      finished = true;
      const elapsed = performance.now() - t0;
      resolve({ bytes, elapsedMs: elapsed });
    };

    xhr.onerror = () => { if (!finished) { finished = true; reject(new Error('network')); } };
    xhr.onabort = () => { /* handled via timer finish() */ };
    xhr.onload = (e) => finish(e?.loaded ?? 0);

    const timer = setTimeout(() => {
      try { xhr.abort(); } catch {}
    }, durationMs);

    xhr.onloadend = () => clearTimeout(timer);
    xhr.send(body || null);
  });
}

async function runDownloadTest() {
  setGaugeScale('download');
  setActiveCard('download');
  setStatus('Testing download…');
  setSweeping(true);
  let lastLoaded = 0, lastT = 0, finalMbps = 0;

  await runXhrMeasured({
    method: 'GET',
    url: `${CONFIG.downloadUrl}&_=${Date.now()}`,
    durationMs: CONFIG.downloadDurationMs,
    onProgress: (loaded, elapsedMs) => {
      const dt = (elapsedMs - lastT) / 1000;
      const dBytes = loaded - lastLoaded;
      if (dt > 0.05) {
        const instMbps = (dBytes * 8) / dt / 1_000_000;
        setGaugeValue(Math.max(instMbps, 0));
        lastLoaded = loaded; 
        lastT = elapsedMs;
      }
      finalMbps = (loaded * 8) / (elapsedMs / 1000) / 1_000_000;
      downVal.textContent = finalMbps.toFixed(1);
    },
  }).catch(() => { throw new Error('download'); });

  setSweeping(false);
  setGaugeValue(finalMbps);
  downVal.textContent = finalMbps.toFixed(1);
  return finalMbps;
}

function randomBlob(sizeBytes) {
  const chunkSize = 65536;
  const chunk = new Uint8Array(chunkSize);
  crypto.getRandomValues(chunk);
  
  const parts = [];
  let remaining = sizeBytes;
  while (remaining > 0) {
    const currentSize = Math.min(remaining, chunkSize);
    parts.push(chunk.subarray(0, currentSize));
    remaining -= currentSize;
  }
  return new Blob(parts, { type: 'application/octet-stream' });
}

async function runUploadTest() {
  setGaugeScale('upload');
  setActiveCard('upload');
  setStatus('Preparing upload…');
  setSweeping(true);
  const blob = randomBlob(CONFIG.uploadChunkBytes);
  setStatus('Testing upload…');

  let lastLoaded = 0, lastT = 0, finalMbps = 0;

  await runXhrMeasured({
    method: 'POST',
    url: CONFIG.uploadUrl,
    body: blob,
    durationMs: CONFIG.uploadDurationMs,
    onProgress: (loaded, elapsedMs) => {
      const dt = (elapsedMs - lastT) / 1000;
      const dBytes = loaded - lastLoaded;
      if (dt > 0.05) {
        const instMbps = (dBytes * 8) / dt / 1_000_000;
        setGaugeValue(Math.max(instMbps, 0));
        lastLoaded = loaded; 
        lastT = elapsedMs;
      }
      finalMbps = (loaded * 8) / (elapsedMs / 1000) / 1_000_000;
      upVal.textContent = finalMbps.toFixed(1);
    },
  }).catch(() => { throw new Error('upload'); });

  setSweeping(false);
  setGaugeValue(finalMbps);
  upVal.textContent = finalMbps.toFixed(1);
  return finalMbps;
}

let testRunning = false;

async function runFullTest() {
  if (testRunning) return;
  testRunning = true;
  startBtn.disabled = true;
  startBtn.classList.add('running');
  ctaLabel.textContent = 'Testing…';
  downVal.textContent = '—'; upVal.textContent = '—'; pingVal.textContent = '—'; jitterVal.textContent = '—';

  const record = { time: Date.now(), download: 0, upload: 0, ping: 0, jitter: 0 };
  let hasFailed = false;

  try {
    const { ping, jitter } = await runPingTest();
    record.ping = ping;
    record.jitter = jitter;

    const download = await runDownloadTest();
    record.download = download;

    const upload = await runUploadTest();
    record.upload = upload;

    setStatus('Done');
  } catch (err) {
    hasFailed = true;
    setStatus('Test incomplete — saved partial results');
  } finally {
    // Record into local storage regardless of full or partial completion
    const list = loadHistory();
    list.unshift(record);
    saveHistory(list);
    renderHistory();

    setSweeping(false);
    setActiveCard(null);
    testRunning = false;
    startBtn.disabled = false;
    startBtn.classList.remove('running');
    ctaLabel.textContent = 'Run again';
    setTimeout(() => { 
      if (!testRunning && !hasFailed) setStatus('Ready when you are'); 
    }, 2600);
  }
}

startBtn.addEventListener('click', runFullTest);

/* Initial paint */
setGaugeScale('download');
setGaugeValue(0);

function processEvent(timestamp) {
  console.log("Processing event at:", timestamp);
}

function wrappedEmit(event) {
  if (!event || typeof event.timestamp === "undefined") {
    console.warn("Missing timestamp in event:", event);
    return;
  }
  // Safe usage
  processEvent(event.timestamp);
}

const otherData = {
  timestamp: Date.now(),
  value: "example"
};

console.log(otherData.timestamp);

wrappedEmit({
  timestamp: Date.now(),
  ...otherData
});
