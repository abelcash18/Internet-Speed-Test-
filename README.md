# Signal — Internet Speed Test

A single-page, browser-based internet speed test with a live radial gauge, ping/jitter, download/upload, and a local history log.

## Run it
Just open `index.html` in a browser — no build step, no dependencies. For best results (and to avoid any local file:// restrictions some browsers apply to fonts/requests), serve it over a simple local server, e.g.:

```
npx serve .
# or
python3 -m http.server 8080
```

## How the test works
- **Ping**: sends several tiny requests and times the round trip, discarding the first (connection warm-up) and averaging the rest. Jitter is the standard deviation of those samples.
- **Download**: streams a large file and tracks bytes received over time via `XMLHttpRequest` progress events, both live (for the gauge) and as a final average.
- **Upload**: generates a random payload in-browser and POSTs it, tracking bytes sent via `xhr.upload.onprogress`.
- Each phase runs for a few seconds, then the app moves to the next.

By default it uses Cloudflare's public speed-test endpoints (`speed.cloudflare.com/__down` and `/__up`), which are designed to be called from any origin. If those are ever unreachable from your network (corporate proxy, ad blocker, offline), the app shows a clear "test failed" state rather than a fake number.

## Bring your own server
Open `script.js` and edit the `CONFIG` object at the top:

```js
const CONFIG = {
  downloadUrl: '...',  // any large file with permissive CORS
  uploadUrl: '...',    // any endpoint that accepts POST with permissive CORS
  pingUrl: '...',      // a small/empty response for latency sampling
  ...
};
```

## Customizing
- Colors, type, and spacing are all CSS custom properties at the top of `styles.css` (`:root` for dark, `html[data-theme="light"]` for light).
- Gauge scale steps (the tick marks) live in the `SCALES` object in `script.js` — edit the `breakpoints` arrays to change the range for download, upload, or ping.
- History is stored in `localStorage` under `signal_history` (last 20 runs) and `signal_theme` for the theme preference.

## Files
- `index.html` — structure
- `styles.css` — design tokens, layout, theming
- `script.js` — gauge rendering, test engine, history, theme toggle
