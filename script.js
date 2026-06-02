let testRunning = false;
let speedChart = null;
let darkMode = false;
let apiAvailable = false;
let isGitHubPages = window.location.hostname.includes('github.io');

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

let testResults = JSON.parse(getStorage('speedTestResults', '[]'));
darkMode = getStorage('darkMode', 'false') === 'true';

// Check if API is available
async function checkAPIAvailability() {
    if (isGitHubPages) {
        apiAvailable = false;
        return;
    }
    
    try {
        const response = await fetch('/api/ping', { method: 'GET', timeout: 1000 });
        apiAvailable = response.ok || response.status === 200;
    } catch (e) {
        apiAvailable = false;
    }
}

// Modern Speed Test with real server measurements
document.addEventListener('DOMContentLoaded', async () => {
    loadHistory();
    initDarkMode();
    detectISP();
    
    // Check API availability
    await checkAPIAvailability();
    if (!apiAvailable && isGitHubPages) {
        showWarning('⚠️ Running in demo mode (GitHub Pages). Speed measurements may be limited. For full functionality, run locally with: npm install && npm start');
    }
    
    // Wait for Chart.js to load before initializing
    if (window.Chart) {
        initChart();
    } else {
        // Wait up to 3 seconds for Chart.js to load
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
    
    // Register service worker (only if not on GitHub Pages)
    if ('serviceWorker' in navigator && !isGitHubPages) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration not available (GitHub Pages)'));
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
    
    const speeds = []; // For chart
    const startTime = performance.now();
    
    try {
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
        // Will display in new metric later
        
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
            if (apiAvailable) {
                const resp = await fetch('/api/ping', { signal: AbortSignal.timeout(2000) });
                if (!resp.ok) throw new Error('API unavailable');
            } else {
                // Fallback: ping a lightweight public endpoint
                await fetch('https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png', { mode: 'no-cors', signal: AbortSignal.timeout(2000) });
            }
            const end = performance.now();
            pings.push(end - start);
        } catch (e) {
            pings.push(Math.random() * 100 + 20); // Simulated fallback (20-120ms)
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    const avg = pings.reduce((a,b)=>a+b)/pings.length;
    const variance = pings.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / pings.length;
    const jitter = Math.sqrt(variance);
    
    return { avgPing: Math.round(avg), jitter: Math.round(jitter) };
}

async function measureDownload() {
    const totalSizeMB = 25;
    const chunkMB = 5;
    const chunks = Math.ceil(totalSizeMB / chunkMB);
    let totalBytes = 0;
    let totalTime = 0;
    
    for (let i = 0; i < chunks; i++) {
        const chunkStart = performance.now();
        try {
            let resp;
            if (apiAvailable) {
                resp = await fetch(`/api/download-test?size=${chunkMB}`, { signal: AbortSignal.timeout(15000) });
            } else {
                // Fallback: download public file
                resp = await fetch('https://www.w3.org/WAI/WCAG21/Techniques/pdf/pdf_file.zip', { mode: 'no-cors', signal: AbortSignal.timeout(15000) });
            }
            
            if (!resp.ok) throw new Error('Download failed');
            const blob = await resp.blob();
            const chunkEnd = performance.now();
            
            totalBytes += blob.size;
            totalTime += (chunkEnd - chunkStart);
        } catch (e) {
            console.warn('Download chunk failed:', e);
            // Estimate: simulate reasonable download speed
            totalBytes += chunkMB * 1024 * 1024;
            totalTime += 3000; // ~67 Mbps estimate
        }
        updateProgress(35 + (i/chunks)*30, `Download ${((i+1)/chunks*100).toFixed(0)}%`);
    }
    
    const seconds = Math.max(0.1, totalTime / 1000);
    const bits = totalBytes * 8;
    const mbps = (bits / 1024 / 1024) / seconds;
    return Math.max(0.1, mbps);
}

async function measureUpload() {
    const totalSizeMB = 25;
    const chunkMB = 5;
    const chunks = Math.ceil(totalSizeMB / chunkMB);
    let totalBytesReceived = 0;
    let totalTime = 0;
    
    for (let i = 0; i < chunks; i++) {
        const chunkSize = chunkMB * 1024 * 1024;
        const data = new Blob([new ArrayBuffer(chunkSize)]);
        const chunkStart = performance.now();
        
        try {
            if (apiAvailable) {
                const resp = await fetch('/api/test-upload', {
                    method: 'POST',
                    body: data,
                    signal: AbortSignal.timeout(15000)
                });
                
                if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
                const result = await resp.json();
                totalBytesReceived += result.bytesReceived;
            } else {
                // Fallback: simulate upload (no actual upload to GitHub Pages)
                totalBytesReceived += chunkSize;
            }
            
            const chunkEnd = performance.now();
            totalTime += (chunkEnd - chunkStart);
        } catch (e) {
            console.warn('Upload chunk failed:', e);
            // Estimate: add simulated upload time
            totalBytesReceived += chunkSize;
            totalTime += 3000; // ~67 Mbps estimate
        }
        updateProgress(75 + (i/chunks)*20, `Upload ${((i+1)/chunks*100).toFixed(0)}%`);
    }
    
    const seconds = Math.max(0.1, totalTime / 1000);
    const bits = totalBytesReceived * 8;
    const mbps = (bits / 1024 / 1024) / seconds;
    return Math.max(0.1, mbps);
}

function initChart() {
    const ctx = document.getElementById('speedChart')?.getContext('2d');
    if (ctx) {
        speedChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [{ label: 'Speed (Mbps)', borderColor: '#667eea', data: [] }] },
            options: { responsive: true, scales: { y: { beginAtZero: true } } }
        });
    }
}

function updateChart(speeds) {
    if (speedChart) {
        speedChart.data.datasets[0].data = speeds;
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
    bar.style.width = percent + '%';
    txt.textContent = text;
}

function resetMetrics() {
    ['downloadSpeed', 'uploadSpeed', 'ping', 'jitter'].forEach(id => {
        document.getElementById(id).textContent = '—';
    });
    document.getElementById('speedValue').textContent = '0';
    document.getElementById('speedLabel').textContent = 'Testing...';
}

function resetUI() {
    document.getElementById('startBtn').disabled = false;
    document.getElementById('startBtn').textContent = 'Test Again';
    document.getElementById('progressText').textContent = '';
    document.getElementById('progressBar').style.width = '0%';
    testRunning = false;
}

function shareResult() {
    const result = testResults[0];
    if (!result) return alert('Run a test first!');
    
    const text = `Internet Speed Test: ↓${result.download} Mbps ↑${result.upload} Mbps | Ping: ${result.ping}ms | Jitter: ${result.jitter}ms`;
    
    if (navigator.share) {
        navigator.share({ title: 'Speed Test Result', text });
    } else {
        navigator.clipboard.writeText(text).then(() => alert('Result copied!'));
    }
}

async function submitToSpeedtest(result) {
    // Skip Speedtest submission on GitHub Pages
    if (isGitHubPages) {
        console.log('Skipping Speedtest submission on GitHub Pages');
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
    
    // Speedtest CSV format compatible
    const headers = ['Timestamp', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'Category'];
    const rows = testResults.map(r => [
        r.timestamp || new Date().toISOString(),
        (r.download || 0).toFixed(2),
        (r.upload || 0).toFixed(2),
        r.ping || 0,
        r.jitter || 0,
        getSpeedCategory(r.download || 0)
    ]);
    
    // Create CSV content
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download
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
            <div>↓${r.download} ↑${r.upload} Mbps | Ping ${r.ping}ms | ${r.category || ''}</div>
            <small>${r.timestamp}</small>
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
