# 🚀 Quick Start Guide

## Fastest Way to Start (No Installation)

### On Windows:
```cmd
cd C:\Users\User\speed-test-app
python -m http.server 8000
```
Then open: **http://localhost:8000**

### On Mac/Linux:
```bash
cd ~/speed-test-app
python3 -m http.server 8000
```
Then open: **http://localhost:8000**

---

## With Node.js (Optional)

```bash
npm install
npm start
```
Then open: **http://localhost:3000**

---

## Direct Deployment (No Server Needed)

1. **Just open the file** - Double-click `index.html` in your file explorer
2. **Or use VS Code** - Install Live Server extension, right-click `index.html`, select "Open with Live Server"

---

## Deploy Online in 5 Minutes

### GitHub Pages (Free)
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/speed-test.git
git push -u origin main
```
Then enable GitHub Pages in repository settings. Your app is live!

### Netlify (Free)
1. Drag and drop the folder to [netlify.com/drop](https://netlify.com/drop)
2. Get a live URL instantly!

### Vercel (Free)
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repo
4. Deploy!

---

## Features

- ✅ No backend required - runs in browser
- ✅ Test download, upload, ping, and jitter
- ✅ Save test history automatically
- ✅ Works on all devices (mobile, tablet, desktop)
- ✅ Beautiful responsive design
- ✅ Instant deployment

---

## Files Included

```
index.html    → Main application page
style.css     → Beautiful styling
script.js     → Speed test logic
server.js     → Optional Express server
package.json  → Node.js configuration
README.md     → Full documentation
QUICKSTART.md → This file
```

---

## Common Issues

**Q: "File not accessible" error?**  
A: Open it through a local server (Python/Node.js), not by opening the file directly.

**Q: Speed test not working?**  
A: Check your internet connection and try again. Some corporate networks may block tests.

**Q: History not saving?**  
A: Make sure browser allows localStorage. Check privacy settings.

---

## Next Steps

- Customize the design by editing `style.css`
- Modify test parameters in `script.js`
- Add your logo to the header
- Deploy to your favorite hosting

Enjoy! 🎉