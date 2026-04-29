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
app.use(compression());
app.use(cors());
app.use(express.static(__dirname));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ limit: '50mb', type: '*/*' })); // For upload measurements

// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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

// Real upload test endpoint - measures bytes received and time
app.post('/api/test-upload', (req, res) => {
    const receivedBytes = req.body.length;
    const receivedTime = Date.now();
    
    res.json({ 
        success: true,
        bytesReceived: receivedBytes,
        receivedTime: receivedTime,
        serverTime: Date.now()
    });
});

// Packet loss test - send/receive 100 packets
app.post('/api/packet-loss', express.json(), (req, res) => {
    const packets = req.body.packets || [];
    const received = packets.length;
    const sent = 100;
    const lossPercent = ((sent - received) / sent * 100).toFixed(2);
    res.json({ lossPercent: parseFloat(lossPercent) });
});

// Real download test endpoint - multiple chunks possible
app.get('/api/download-test', (req, res) => {
    const sizeMB = parseInt(req.query.size) || 25; // MB
    const size = sizeMB * 1024 * 1024;
    const buffer = Buffer.alloc(size);
    
    res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': size,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
    });
    
    const startTime = Date.now();
    res.write(buffer, () => {
        const endTime = Date.now();
        console.log(`Download ${sizeMB}MB served in ${(endTime - startTime)}ms`);
    });
    
    res.end();
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Speed Test Application running at http://localhost:${PORT}\n`);
    console.log('Press Ctrl+C to stop the server\n');
});
