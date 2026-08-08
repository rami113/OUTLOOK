# OUTLOOK - Unified Communication Hub

A professional desktop application for managing Google Meet, Zoom, and Microsoft Teams all in one place.

## Features

- 🎥 Google Meet Integration
- 📹 Zoom Integration
- 💬 Microsoft Teams Integration
- 🔐 OAuth Authentication
- 🎨 Beautiful UI
- ⚡ One-Click EXE

## Quick Start

### Prerequisites
- Windows 10+
- Node.js 18+

### Build from Source

```bash
npm install
npm run build
npm run electron-build-win
```

Result: `dist/OUTLOOK.exe`

### Download Pre-Built

Go to **Actions** → Latest workflow → **Artifacts** → Download OUTLOOK

## Getting OAuth Credentials

### Google
1. https://console.cloud.google.com
2. Create project → Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Redirect URI: `http://localhost:5555/auth/google/callback`

### Zoom
1. https://marketplace.zoom.us
2. Create OAuth App
3. Redirect URI: `http://localhost:5555/auth/zoom/callback`

### Microsoft Teams
1. https://portal.azure.com
2. App registrations → New
3. Redirect URI: `http://localhost:5555/auth/teams/callback`

## License

MIT
