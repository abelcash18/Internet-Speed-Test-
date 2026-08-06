# 🚀 Internet Speed Test Application

A fast, lightweight internet speed test application built with HTML, CSS, and JavaScript, backed by a small Node.js server for accurate upload and download measurement.

## Features

✅ **Download Speed Testing** - Measures your download bandwidth  
✅ **Upload Speed Testing** - Measures upload throughput with real request traffic  
✅ **Ping Measurement** - Tests latency to the local server  
✅ **Jitter Analysis** - Measures connection stability  
✅ **Packet Loss Estimate** - Tracks lost packets during a small packet test  
✅ **Test History** - Stores up to 20 recent test results in browser  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Local Storage** - Results persist across sessions  

> Note: The full speed test requires the included Node.js server. The interface can be hosted statically, but accurate measurements require running `npm start` locally.

## Project Structure

```
Internet-Speed-Test-/
├── index.html          # Main HTML file
├── style.css           # Styling and animations
├── script.js           # Speed test logic
├── server.js           # Node.js backend for real tests
├── sw.js               # Service worker for PWA caching
├── manifest.json       # PWA manifest
├── package.json        # Node dependencies and scripts
└── README.md           # This file
```

## How to Deploy

### Option 1: Simple Local Deployment
1. Download or clone this repository
2. Run `npm install` and then `npm start`
3. Open `http://localhost:3000` in a modern browser

### Option 2: Deploy to a Node.js host
The speed test needs its `server.js` endpoints, so deploy it to a host that runs
Node.js (for example Render, Railway, Fly.io, or a VPS). Static-only hosts such
as GitHub Pages cannot perform real upload and download measurements.

### Option 3: Deploy to GitHub Pages (interface only)
1. Create a GitHub repository
2. Push these files to the repo
3. Go to Settings → Pages
4. Select "Deploy from a branch" and choose `main` branch
5. Your app is now live at `https://yourusername.github.io/repo-name/`

### Option 4: Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repo
4. Use these settings:
   - **Build command:** (leave empty)
   - **Publish directory:** . (current folder)
5. Deploy!

### Option 5: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Deploy (no build configuration needed)

### Option 6: Deploy to Any Node.js Web Host
1. FTP/SSH the files to your web hosting
2. Make sure `index.html` is in the root or a public folder
3. Access via your domain

### Run Locally with Node.js
```bash
# Install project dependencies once
npm install

# Start the real-time test server
npm start
```

## How to Use

1. **Start Test** - Click the "Start Test" button
2. **Wait** - The app will measure ping, download, upload, and jitter
3. **View Results** - Results display immediately and are saved to history
4. **Check History** - Scroll down to see all previous test results
5. **Clear History** - Click "Clear" to remove all saved results

## How It Works

### Download Speed
- Tests by fetching an image file and measuring transfer time
- Calculates: (File Size × 8) / Duration = Mbps

### Upload Speed
- Simulates upload by creating test data
- Measures time to process the data

### Ping
- Measures round-trip time to reach Google's servers
- Multiple measurements are averaged for accuracy

### Jitter
- Measures variance in latency
- Lower jitter = more stable connection

### History Storage
- All results saved in browser's `localStorage`
- Automatically loads on page refresh
- Keeps last 20 test results

## Browser Support

✅ Chrome/Edge (Latest)  
✅ Firefox (Latest)  
✅ Safari (Latest)  
✅ Opera (Latest)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

### Change Colors
Edit the gradient in `style.css`:
```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Adjust Test Servers
Modify the URLs in `script.js`:
```javascript
const testUrl = 'https://your-server.com/large-file.zip';
```

### Change History Limit
In `script.js`, modify:
```javascript
if (testResults.length > 20) {  // Change 20 to desired number
```

## Limitations & Notes

⚠️ A local test measures the connection between your browser and your computer. Deploy the included Node server to a remote host to measure your internet route to that host.  
⚠️ Results may vary based on server location and current network conditions.  
⚠️ Best results when tested on a stable connection  

## API Integration (Optional)

To add real server support:

1. Create a backend that serves large files for download testing
2. Create an upload endpoint to accept file uploads
3. Update the URLs in `script.js`

Example backend endpoints:
- `GET /download/file.bin` - Returns a large file for download testing
- `POST /upload` - Accepts uploaded data for upload testing

## License

MIT License - Feel free to use and modify!

## Support

For issues or improvements, please create an issue or submit a pull request.

---

**Enjoy testing your internet speed!** 🚀# Internet-Speed-Test-
