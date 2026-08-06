let testRunning = false;
let speedChart = null;
let darkMode = false;
let apiAvailable = false;
let apiChecked = false;
const isGitHubPages = window.location.hostname.endsWith('.github.io') || window.location.protocol === 'file:';

// Safely access storage with fallback
function getStorage(key, defaultValue) {
    try {
        return localStorage.getItem(key) !== null ? localStorage.getItem(key) : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

function setStorage(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn('Storage not available:', e);
    }
}

let testResults = [];
try {
    const stored = getStorage('speedTestResults', '[]');
    testResults = JSON.parse(stored);
    if (!Array.isArray(testResults)) testResults = [];
} catch (e) {
    testResults = [];
}

darkMode = getStorage('darkMode', 'false') === 'true';

// Check if API is available
async function checkAPIAvailability() {
    if (isGitHubPages) {
        apiAvailable = false;
        apiChecked = true;
        return apiAvailable;
    }

    if (apiChecked) {
        return apiAvailable;
    }

    apiChecked = true;
    try {
        const response = await fetch(`/api/ping?_=${Date.now()}`, { signal: AbortSignal.timeout(2000), cache: 'no-store' });
        apiAvailable = response.ok;
    } catch (e) {
        apiAvailable = false;
    }
    return apiAvailable;
}

function isApiEnabled() {
    return apiAvailable && !isGitHubPages;
}


// Modern Speed Test with real server measurements
document.addEventListener('DOMContentLoaded', async () => {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = 'Checking server...';
    }

    loadHistory();
    initDarkMode();
    detectISP();

    await checkAPIAvailability();

    if (isGitHubPages) {
        showWarning('GitHub Pages can show the interface, but the full speed test requires the local Node server. Run npm start locally.');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Local server required';
        }
    } else if (!apiAvailable) {
        showWarning('Real-time testing needs the included Node server. Run npm start and open http://localhost:3000.');
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.textContent = 'Server unavailable';
        }
    } else {
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = 'Start Test';
        }
    }

    if (window.Chart) {
        initChart();
    } else {
        let attempts = 0;
        const waitForChart = setInterval(() => {
            if (window.Chart) {
                initChart();
                clearInterval(waitForChart);
            } else if (attempts++ > 30) {
                console.warn('Chart.js failed to load');
                clearInterval(waitForChart);
            }
        }, 100);
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.min.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration not available (insecure origin or static host)', err));
    }
});

function showWarning(message) {
    const warning = document.createElement('div');
    warning.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #ff9800; color: white; padding: 15px 20px; border-radius: 8px; z-index: 1000; max-width: 300px; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
    warning.textContent = message;
    document.body.appendChild(warning);
    setTimeout(() => warning.remove(), 8000);
}

// Dark mode toggle
function initDarkMode() {
    if (darkMode) {
        document.body.classList.add('dark-theme');
    }
    const toggle = document.getElementById('darkToggle');
    if (toggle) toggle.checked = darkMode;
}

function toggleDarkMode() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-theme');
    setStorage('darkMode', darkMode);
}

async function startTest() {
    if (testRunning) return;
    
    testRunning = true;
    const btn = document.getElementById('startBtn');
    btn.disabled = true;
    btn.textContent = 'Testing...';
    
    resetMetrics();
    updateProgress(0, 'Initializing...');
    
    try {
        await checkAPIAvailability();
        if (!isApiEnabled()) {
            throw new Error('Real-time test server is unavailable. Start the app with npm start.');
        }
        const speeds = []; // For chart
        const startTime = performance.now();
        // Phase 1: Ping + Jitter (10 samples)
        updateProgress(15, 'Measuring ping...');
        const pingData = await measurePingJitter();
        document.getElementById('ping').textContent = pingData.avgPing + ' ms';
        document.getElementById('jitter').textContent = pingData.jitter + ' ms';
        speeds.push({time: 0, speed: 0});
        
        // Phase 2: Download (25MB total, chunks)
        updateProgress(35, 'Download test...');
        const download = await measureDownload();
        document.getElementById('downloadSpeed').textContent = download.toFixed(2) + ' Mbps';
        speeds.push({time: (performance.now() - startTime)/1000, speed: download});
        
// Phase 3: Upload (25MB)
        updateProgress(75, 'Upload test...');
        const upload = await measureUpload();
        document.getElementById('uploadSpeed').textContent = upload.toFixed(2) + ' Mbps';
        speeds.push({time: (performance.now() - startTime)/1000, speed: upload});
        
        // Phase 4: Packet Loss
        updateProgress(90, 'Packet loss test...');
        const packetLoss = await measurePacketLoss();
        document.getElementById('packetLoss').textContent = packetLoss.lossPercent.toFixed(2) + ' %';
        
        // Finalize
        updateProgress(100, 'Complete!');
        const mainSpeed = (download + upload) / 2;
        document.getElementById('speedValue').textContent = mainSpeed.toFixed(1);
        document.getElementById('speedLabel').textContent = getSpeedCategory(mainSpeed);
        
        updateChart(speeds);
        
        // Save result
        const result = {
            download: download.toFixed(2),
            upload: upload.toFixed(2),
            ping: pingData.avgPing,
            jitter: pingData.jitter,
            packetLoss: packetLoss.lossPercent,
            timestamp: new Date().toLocaleString(),
            category: getSpeedCategory(download)
        };
        saveResult(result);
        loadHistory();
        
        // Submit to Speedtest API
        updateProgress(100, 'Submitting results...');
        await submitToSpeedtest(result);

        
        setTimeout(resetUI, 2000);
        
    } catch (error) {
        console.error('Test error:', error);
        document.getElementById('speedLabel').textContent = 'Error: ' + error.message;
        setTimeout(resetUI, 2000);
    }
}

async function measurePingJitter() {
    const pings = [];
    const iterations = 10;
    
    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
            const resp = await fetch(`/api/ping?_=${Date.now()}-${i}`, { signal: AbortSignal.timeout(2000), cache: 'no-store' });
            if (!resp.ok) throw new Error('Ping request failed');
            const end = performance.now();
            pings.push(end - start);
        } catch (e) {
            throw new Error('Unable to measure ping. Check the test server connection.');
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    const avg = pings.reduce((a,b)=>a+b)/pings.length;
    const variance = pings.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pings.length;
    const jitter = Math.sqrt(variance);
    
    return { avgPing: Math.round(avg), jitter: Math.round(jitter) };
}

async function measureDownload() {
    const sizeMB = 25;
    const expectedBytes = sizeMB * 1024 * 1024;
    const started = performance.now();
    const response = await fetch(`/api/download-test?size=${sizeMB}&_=${Date.now()}`, {
        signal: AbortSignal.timeout(30000), cache: 'no-store'
    });
    if (!response.ok || !response.body) throw new Error('Download test failed');
    const reader = response.body.getReader();
    let bytes = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        const elapsed = Math.max(0.05, (performance.now() - started) / 1000);
        const current = (bytes * 8 / 1024 / 1024) / elapsed;
        document.getElementById('downloadSpeed').textContent = current.toFixed(2) + ' Mbps';
        updateProgress(35 + Math.min(30, (bytes / expectedBytes) * 30), `Downloading… ${current.toFixed(1)} Mbps`);
    }
    const elapsed = Math.max(0.05, (performance.now() - started) / 1000);
    return (bytes * 8 / 1024 / 1024) / elapsed;
}

async function measureUpload() {
    const sizeMB = 25;
    const bytes = sizeMB * 1024 * 1024;
    const payload = new Uint8Array(bytes);
    for (let i = 0; i < payload.length; i += 4096) payload[i] = i & 0xff;
    const started = performance.now();
    const response = await fetch(`/api/test-upload?_=${Date.now()}`, {
        method: 'POST', body: payload, signal: AbortSignal.timeout(30000), cache: 'no-store',
        headers: { 'Content-Type': 'application/octet-stream' }
    });
    if (!response.ok) throw new Error('Upload test failed');
    const result = await response.json();
    if (result.bytesReceived !== bytes) throw new Error('Upload was interrupted');
    const elapsed = Math.max(0.05, (performance.now() - started) / 1000);
    const speed = (bytes * 8 / 1024 / 1024) / elapsed;
    document.getElementById('uploadSpeed').textContent = speed.toFixed(2) + ' Mbps';
    updateProgress(95, `Uploading… ${speed.toFixed(1)} Mbps`);
    return speed;
}

function initChart() {
    const ctx = document.getElementById('speedChart')?.getContext('2d');
    if (ctx) {
        speedChart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Speed (Mbps)',
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102,126,234,0.15)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    data: []
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Seconds' },
                        ticks: { precision: 0 }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Mbps' }
                    }
                }
            }
        });
    }
}

function updateChart(speeds) {
    if (speedChart) {
        speedChart.data.datasets[0].data = speeds.map(point => ({ x: point.time, y: point.speed }));
        speedChart.update('none');
    }
}

function getSpeedCategory(speed) {
    if (speed < 5) return 'Very Slow 🐌';
    if (speed < 25) return 'Slow 🐢';
    if (speed < 100) return 'Good ✅';
    return 'Excellent ⚡';
}

function updateProgress(percent, text) {
    const bar = document.getElementById('progressBar');
    const txt = document.getElementById('progressText');
    if (bar) bar.style.width = `${percent}%`;
    if (txt) txt.textContent = text;
}

function resetMetrics() {
    ['downloadSpeed', 'uploadSpeed', 'ping', 'jitter', 'packetLoss'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    const speedValue = document.getElementById('speedValue');
    const speedLabel = document.getElementById('speedLabel');
    if (speedValue) speedValue.textContent = '0';
    if (speedLabel) speedLabel.textContent = 'Testing...';
}

function resetUI() {
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.textContent = 'Test Again';
    }
    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = '';
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = '0%';
    testRunning = false;
}

function shareResult() {
    const result = testResults[0];
    if (!result) return alert('Run a test first!');

    const text = `Internet Speed Test: ↓${result.download || 0} Mbps ↑${result.upload || 0} Mbps | Ping: ${result.ping || 0}ms | Jitter: ${result.jitter || 0}ms`;

    
    if (navigator.share) {
        navigator.share({ title: 'Speed Test Result', text });
    } else {
        navigator.clipboard.writeText(text).then(() => alert('Result copied!'));
    }
}

async function submitToSpeedtest(result) {
    if (!result || typeof result !== 'object') return;
    
    // Also require API availability (backend server)
    if (!apiAvailable) {
        return;
    }
    
    try {

        // Submit to local server endpoint which handles Speedtest API
        const response = await fetch('/api/submit-to-speedtest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                downloadSpeed: parseFloat(result.download),
                uploadSpeed: parseFloat(result.upload),
                ping: result.ping,
                jitter: result.jitter,
                timestamp: result.timestamp
            }),
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.speedTestUrl) {
                console.log('Speedtest result:', data.speedTestUrl);
                // Store share link in result
                result.speedTestUrl = data.speedTestUrl;
                saveResult(result);
            }
        }
    } catch (error) {
        console.warn('Could not submit to Speedtest:', error);
        // Continue even if Speedtest submission fails
    }
}

function downloadCSV() {
    if (!testResults.length) return alert('No test results to export!');

    const headers = ['Timestamp', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'Packet Loss (%)', 'Category'];
    const rows = testResults.map(r => {
        const timestamp = r.timestamp || new Date().toISOString();
        const download = parseFloat(r.download) || 0;
        const upload = parseFloat(r.upload) || 0;
        const ping = parseInt(r.ping, 10) || 0;
        const jitter = parseInt(r.jitter, 10) || 0;
        const packetLoss = typeof r.packetLoss !== 'undefined' ? parseFloat(r.packetLoss).toFixed(2) : '';
        const category = r.category || getSpeedCategory(download);
        return [timestamp, download.toFixed(2), upload.toFixed(2), ping, jitter, packetLoss, category];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speedtest-results-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function saveResult(result) {
    testResults.unshift(result);
    if (testResults.length > 20) testResults = testResults.slice(0,20);
    setStorage('speedTestResults', JSON.stringify(testResults));
}

function loadHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    
    list.innerHTML = testResults.length ? testResults.map(r => `
        <div class="history-item">
            <div>↓${r.download} ↑${r.upload} Mbps | Ping ${r.ping}ms | Jitter ${r.jitter}ms | Loss ${typeof r.packetLoss !== 'undefined' ? Number(r.packetLoss).toFixed(2) : '—'}%</div>
            <small>${r.timestamp || ''}</small>
            ${r.speedTestUrl ? `<div style="margin-top: 5px;"><a href="${r.speedTestUrl}" target="_blank" style="color: #667eea; text-decoration: none; font-size: 12px;">🔗 View on Speedtest</a></div>` : ''}
        </div>

    `).join('') : '<p class="no-history">No tests yet</p>';
}

function clearHistory() {
    if (confirm('Clear history?')) {
        testResults = [];
        setStorage('speedTestResults', JSON.stringify(testResults));
        loadHistory();
    }
}

async function measurePacketLoss() {
    const packets = [];
    for (let i = 0; i < 100; i++) {
        packets.push({ id: i, timestamp: Date.now() });
    }
    try {
        const resp = await fetch('/api/packet-loss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packets })
        });
        
        if (!resp.ok) {
            throw new Error(`Packet loss test failed: ${resp.status}`);
        }
        return await resp.json();
    } catch {
        return { lossPercent: 0 };
    }
}

async function detectISP(enrichmentData = null) {
    performance.mark('isp-start');
    try {
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-cache' });
        const geoData = await res.json();
        
        if (enrichmentData) {
            // Display enrichment data if available
            const brand = enrichmentData.display?.brand || 'Unknown';
            const technology = enrichmentData.display?.technology?.toUpperCase() || '';
            const downloadMbps = enrichmentData.display?.provisioned?.downloadMbps || '—';
            const uploadMbps = enrichmentData.display?.provisioned?.uploadMbps || '—';
            const type = enrichmentData.type || '';
            
            document.getElementById('serverInfo').textContent = 
                `ISP: ${brand} | ${technology}${type ? ' (' + type + ')' : ''} | ↓${downloadMbps} ↑${uploadMbps} Mbps`;
            document.getElementById('ipInfo').textContent = 
                `IP: ${geoData.ip} | Lat: ${enrichmentData.location?.latitude?.toFixed(2) || geoData.latitude}, Lon: ${enrichmentData.location?.longitude?.toFixed(2) || geoData.longitude}`;
        } else {
            // Fallback to basic IP info
            document.getElementById('serverInfo').textContent = `ISP: ${geoData.org || 'Unknown'}`;
            document.getElementById('ipInfo').textContent = 
                `IP: ${geoData.ip} | Location: ${geoData.city}, ${geoData.country_name}`;
        }
    } catch (err) {
        console.warn('ISP detection failed:', err);
        document.getElementById('serverInfo').textContent = 'ISP: Detecting...';
        document.getElementById('ipInfo').textContent = 'IP: Detecting...';
    }
    performance.mark('isp-end');
    performance.measure('ISP Detection', 'isp-start', 'isp-end');
}

// Web Vitals polyfill for older browsers
if (!('web-vitals' in window)) {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/web-vitals';
    document.head.appendChild(script);
}
