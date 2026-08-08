const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

let mainWindow;
let backendServer;

function startBackendServer() {
  const backendApp = express();
  const PORT = 5555;

  backendApp.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));

  backendApp.use(express.json());
  backendApp.use(session({
    secret: process.env.SESSION_SECRET || 'outlook-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
  }));

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_REDIRECT_URI = 'http://localhost:5555/auth/google/callback';

  backendApp.get('/auth/google', (req, res) => {
    const scope = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'].join(' ');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    res.redirect(authUrl);
  });

  backendApp.get('/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
          code
        })
      });
      const tokenData = await tokenResponse.json();
      req.session.googleTokens = tokenData;
      res.send(`<script>window.location.href='http://localhost:3000?auth=success&service=google'</script>`);
    } catch (error) {
      res.send(`<script>window.location.href='http://localhost:3000?error=auth_failed'</script>`);
    }
  });

  const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
  const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
  const ZOOM_REDIRECT_URI = 'http://localhost:5555/auth/zoom/callback';

  backendApp.get('/auth/zoom', (req, res) => {
    const authUrl = `https://zoom.us/oauth/authorize?client_id=${ZOOM_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}`;
    res.redirect(authUrl);
  });

  backendApp.get('/auth/zoom/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const auth = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');
      const tokenResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(ZOOM_REDIRECT_URI)}`
      });
      const tokenData = await tokenResponse.json();
      req.session.zoomTokens = tokenData;
      res.send(`<script>window.location.href='http://localhost:3000?auth=success&service=zoom'</script>`);
    } catch (error) {
      res.send(`<script>window.location.href='http://localhost:3000?error=auth_failed'</script>`);
    }
  });

  const TEAMS_CLIENT_ID = process.env.TEAMS_CLIENT_ID;
  const TEAMS_CLIENT_SECRET = process.env.TEAMS_CLIENT_SECRET;
  const TEAMS_REDIRECT_URI = 'http://localhost:5555/auth/teams/callback';

  backendApp.get('/auth/teams', (req, res) => {
    const scope = ['Calendars.ReadWrite', 'OnlineMeetings.ReadWrite', 'offline_access'].join('%20');
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${TEAMS_CLIENT_ID}&redirect_uri=${encodeURIComponent(TEAMS_REDIRECT_URI)}&response_type=code&scope=${scope}`;
    res.redirect(authUrl);
  });

  backendApp.get('/auth/teams/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: TEAMS_CLIENT_ID,
          client_secret: TEAMS_CLIENT_SECRET,
          redirect_uri: TEAMS_REDIRECT_URI,
          grant_type: 'authorization_code',
          code
        }).toString()
      });
      const tokenData = await tokenResponse.json();
      req.session.teamsTokens = tokenData;
      res.send(`<script>window.location.href='http://localhost:3000?auth=success&service=teams'</script>`);
    } catch (error) {
      res.send(`<script>window.location.href='http://localhost:3000?error=auth_failed'</script>`);
    }
  });

  backendApp.get('/api/auth/status', (req, res) => {
    res.json({
      google: !!req.session.googleTokens,
      zoom: !!req.session.zoomTokens,
      teams: !!req.session.teamsTokens
    });
  });

  backendApp.post('/api/auth/logout/:service', (req, res) => {
    const { service } = req.params;
    if (service === 'google') delete req.session.googleTokens;
    if (service === 'zoom') delete req.session.zoomTokens;
    if (service === 'teams') delete req.session.teamsTokens;
    res.json({ success: true });
  });

  backendServer = backendApp.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (backendServer) backendServer.close();
    app.quit();
  });
}

app.on('ready', () => {
  startBackendServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
