/**
 * Simple Express server to serve the Speed Test application
 * Run with: npm install && npm start
 * Then open: http://localhost:3000
 */

const express = require('express');
const compression = require('compression');
const path = require('path');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
// Do not compress the test payloads: compressed zero-filled data would make a
// bandwidth test report the compression ratio instead of the connection speed.
app.use(compression({ filter: (req, res) => !req.path.startsWith('/api/') && compression.filter(req, res) }));
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve favicon to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.set('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='75' font-size='75'>⚡</text></svg>`);
});

// Ping endpoint for latency measurement
app.get('/api/ping', (req, res) => {
    res.json({ timestamp: Date.now() });
});

// Results endpoint (for sharing)
app.post('/api/results', express.json(), (req, res) => {
    const { id, ...result } = req.body;
    // In production, save to DB; here echo back
    res.json({ success: true, shareId: id || Date.now().toString(36) });
});

// Real upload test endpoint. Consume the request as a stream rather than
// buffering it through a body parser, so the browser measures an actual upload.
app.post('/api/test-upload', (req, res) => {
    let receivedBytes = 0;
    const startedAt = Date.now();
    req.on('data', chunk => { receivedBytes += chunk.length; });
    req.on('end', () => {
        res.set('Cache-Control', 'no-store');
        res.json({
            success: true,
            bytesReceived: receivedBytes,
            elapsedMs: Date.now() - startedAt
        });
    });
    req.on('error', () => res.status(400).json({ error: 'Upload interrupted' }));
});

// Packet loss test - send/receive 100 packets
app.post('/api/packet-loss', express.json(), (req, res) => {
    const packets = req.body.packets || [];
    const received = packets.length;
    const sent = 100;
    const lossPercent = ((sent - received) / sent * 100).toFixed(2);
    res.json({ lossPercent: parseFloat(lossPercent) });
});

// Real download test endpoint. Stream incompressible bytes and honor backpressure.
app.get('/api/download-test', (req, res) => {
    const sizeMB = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 25));
    const size = sizeMB * 1024 * 1024;
    res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*'
    });
    const chunk = Buffer.allocUnsafe(256 * 1024);
    for (let i = 0; i < chunk.length; i++) chunk[i] = (i * 31 + 17) & 0xff;
    let sent = 0;
    const send = () => {
        while (sent < size) {
            const bytes = Math.min(chunk.length, size - sent);
            sent += bytes;
            if (!res.write(bytes === chunk.length ? chunk : chunk.subarray(0, bytes))) {
                res.once('drain', send);
                return;
            }
        }
        res.end();
    };
    send();
});

// CSV export endpoint
app.post('/api/export-csv', express.json(), (req, res) => {
    const results = req.body.results || [];
    
    if (!results.length) {
        return res.status(400).json({ error: 'No results to export' });
    }
    
    // Speedtest CSV format compatible
    const headers = 'Timestamp,Download (Mbps),Upload (Mbps),Ping (ms),Jitter (ms),Category\n';
    const rows = results.map(r => {
        const timestamp = r.timestamp || new Date().toISOString();
        const download = (r.download || 0).toFixed(2);
        const upload = (r.upload || 0).toFixed(2);
        const ping = r.ping || 0;
        const jitter = r.jitter || 0;
        const category = r.category || 'Unknown';
        return `"${timestamp}","${download}","${upload}","${ping}","${jitter}","${category}"`;
    }).join('\n');
    
    const csv = headers + rows;
    res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="speedtest-results-${new Date().toISOString().slice(0,10)}.csv"`
    });
    res.send(csv);
});

// Submit results endpoint (optional - for cloud storage)
app.post('/api/submit-results', express.json(), (req, res) => {
    const { download, upload, ping, jitter, timestamp, location, isp } = req.body;
    
    // In production, save to database
    const result = {
        id: Date.now().toString(36),
        download,
        upload,
        ping,
        jitter,
        timestamp: timestamp || new Date().toISOString(),
        location,
        isp,
        submittedAt: new Date().toISOString()
    };
    
    console.log('Result submitted:', result);
    res.json({ 
        success: true, 
        resultId: result.id,
        message: 'Results saved successfully'
    });
});

// Submit to Speedtest API
app.post('/api/submit-to-speedtest', express.json(), async (req, res) => {
    const { downloadSpeed, uploadSpeed, ping, jitter, timestamp } = req.body;
    
    try {
        // Generate result data compatible with Speedtest format
        const resultId = Date.now().toString(36);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const queryParams = new URLSearchParams({
            download: downloadSpeed.toFixed(2),
            upload: uploadSpeed.toFixed(2),
            ping: ping,
            jitter: jitter
        });
        const shareUrl = `${baseUrl}/results/${resultId}?${queryParams.toString()}`;
        
        const speedTestResult = {
            timestamp: timestamp || new Date().toISOString(),
            download: downloadSpeed,
            upload: uploadSpeed,
            ping: ping,
            jitter: jitter,
            resultId: resultId,
            url: shareUrl
        };
        
        console.log('Speedtest result generated:', speedTestResult);
        
        // Return shareable URL (or submit to actual Speedtest API if you have credentials)
        res.json({
            success: true,
            speedTestUrl: speedTestResult.url,
            resultId: resultId,
            data: speedTestResult
        });
    } catch (error) {
        console.error('Error submitting to Speedtest:', error);
        res.status(400).json({ error: 'Failed to submit to Speedtest', message: error.message });
    }
});

// Results display page
app.get('/results/:resultId', (req, res) => {
    const { resultId } = req.params;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Speed Test Result ${resultId}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            .result-card {
                background: white;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 500px;
            }
            .result-card h1 {
                color: #667eea;
                margin: 0 0 10px 0;
                font-size: 28px;
            }
            .metric {
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                padding: 20px 0;
                border-top: 1px solid #eee;
                border-bottom: 1px solid #eee;
            }
            .metric-item {
                flex: 1;
            }
            .metric-label {
                font-size: 12px;
                color: #999;
                text-transform: uppercase;
                margin-bottom: 5px;
            }
            .metric-value {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }
            .timestamp {
                color: #999;
                font-size: 12px;
                margin-top: 20px;
            }
            .share-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 30px;
            }
            .share-btn {
                padding: 10px 20px;
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                text-decoration: none;
                display: inline-block;
            }
            .share-btn:hover {
                background: #764ba2;
            }
        </style>
    </head>
    <body>
        <div class="result-card">
            <h1>⚡ Your Speed Test Results</h1>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Download</div>
                    <div class="metric-value" id="download">—</div>
                    <div style="font-size: 12px; color: #999;">Mbps</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Upload</div>
                    <div class="metric-value" id="upload">—</div>
                    <div style="font-size: 12px; color: #999;">Mbps</div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Ping</div>
                    <div class="metric-value" id="ping">—</div>
                    <div style="font-size: 12px; color: #999;">ms</div>
                </div>
            </div>
            <div class="metric">
                <div class="metric-item">
                    <div class="metric-label">Jitter</div>
                    <div class="metric-value" id="jitter">—</div>
                    <div style="font-size: 12px; color: #999;">ms</div>
                </div>
            </div>
            <div class="timestamp">Result ID: ${resultId}</div>
            <div class="share-buttons">
                <button class="share-btn" onclick="shareResult()">📱 Share</button>
                <button class="share-btn" onclick="copyLink()">📋 Copy Link</button>
            </div>
        </div>
        <script>
            // Parse query params if results passed in URL
            const params = new URLSearchParams(window.location.search);
            document.getElementById('download').textContent = params.get('download') || '—';
            document.getElementById('upload').textContent = params.get('upload') || '—';
            document.getElementById('ping').textContent = params.get('ping') || '—';
            document.getElementById('jitter').textContent = params.get('jitter') || '—';
            
            function shareResult() {
                const text = \`Speed Test Result: ↓\${params.get('download') || 0} ↑\${params.get('upload') || 0} Mbps | Ping: \${params.get('ping') || 0}ms\`;
                if (navigator.share) {
                    navigator.share({ title: 'Speed Test Result', text });
                } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied!');
                }
            }
            
            function copyLink() {
                navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        </script>
    </body>
    </html>
    `;
    
    res.send(htmlContent);
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Speed Test Application running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop the server\n');
});
