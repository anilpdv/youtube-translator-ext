# Permissions Policy

The extension declares only the minimum set of permissions necessary for core operation.

## Declared Permissions

- `storage`: Required to store user settings, display preferences, and cache metadata locally on the user's device.
- `tabs`: Required to detect the active YouTube watch tab and communicate translation state between the popup UI and the active content script.

## Host Permissions

- `*://*.youtube.com/*`: Required for content script injection and direct timedtext caption track fetching on YouTube watch pages.
- `https://generativelanguage.googleapis.com/*`: Required for direct background HTTPS calls to Google Gemini API endpoints when user-configured.
- `http://localhost:11434/*` & `http://127.0.0.1:11434/*`: Optional permissions utilized for local Ollama endpoints when enabled.

## Security Constraints
- `<all_urls>` is strictly prohibited.
- `unsafe-eval` and remote code execution are strictly prohibited.
- Content scripts only run on YouTube domains.
