# TODO

- [ ] Audit `script.js` for all `/api/*` fetch calls and current GitHub Pages gating.
- [ ] Update `script.js` to hard-disable all `/api/*` calls when `isGitHubPages` is true.
- [ ] Update `script.js` to set `apiAvailable=false` if API requests fail with 404 (and avoid repeated attempts).
- [ ] Add guards so code never reads `result.timestamp` / history fields when `result` is undefined.
- [ ] Rebuild `script.min.js` if needed.
- [ ] Verify by running locally (`npm start`) and (if possible) checking GitHub Pages behavior.

