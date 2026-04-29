# 🚀 Internet Speed Test Application

A fast, lightweight, and fully deployable internet speed test application built with pure HTML, CSS, and JavaScript. No backend required!

## Features

✅ **Download Speed Testing** - Measures your download bandwidth  
✅ **Upload Speed Testing** - Estimates upload capability  
✅ **Ping Measurement** - Tests latency to servers  
✅ **Jitter Analysis** - Measures connection stability  
✅ **Test History** - Stores up to 20 recent test results in browser  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **No Backend Required** - Runs entirely in the browser  
✅ **Local Storage** - History persists across sessions  

## Project Structure

```
speed-test-app/
├── index.html          # Main HTML file
├── style.css           # Styling and animations
├── script.js           # Speed test logic
└── README.md           # This file
```

## How to Deploy

### Option 1: Simple Local Deployment
1. Download or clone this repository
2. Open `index.html` in any modern web browser
3. That's it! The app is ready to use

### Option 2: Deploy to GitHub Pages
1. Create a GitHub repository
2. Push these files to the repo
3. Go to Settings → Pages
4. Select "Deploy from a branch" and choose `main` branch
5. Your app is now live at `https://yourusername.github.io/repo-name/`

### Option 3: Deploy to Netlify
1. Go to [netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Connect your GitHub repo
4. Use these settings:
   - **Build command:** (leave empty)
   - **Publish directory:** . (current folder)
5. Deploy!

### Option 4: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Deploy (no build configuration needed)

### Option 5: Deploy to Any Web Host
1. FTP/SSH the files to your web hosting
2. Make sure `index.html` is in the root or a public folder
3. Access via your domain

### Option 6: Run Locally with Python (Quick Server)
```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

### Option 7: Run Locally with Node.js
```bash
# Install http-server globally
npm install -g http-server

# Run in the app directory
http-server

# Access at the provided URL (usually http://localhost:8080)
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

⚠️ Upload speed is simulated (requires backend server for real upload testing)  
⚠️ Results may vary based on actual network conditions  
⚠️ Cross-origin requests may be limited in some networks  
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
