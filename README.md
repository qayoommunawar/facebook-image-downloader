# Facebook Multi-Image & Album Downloader

A full-stack web application that takes any Facebook post, album, or share link and downloads **all embedded images**—including the hidden, scrollable photos that Facebook conceals behind the 4–5 photo collage in the feed.

---

## Features

- **Unlocks Hidden Photos**: Automatically detects multi-photo posts where only up to 5 photos are shown in the feed grid, opens the photo viewer, and programmatically steps through the carousel (`ArrowRight`) to reveal all hidden photos.
- **GraphQL & SSR Interceptor**: Intercepts background `/api/graphql/` queries and server-side Relay JSON script tags to capture photos in their highest available resolutions (e.g. 2048px+).
- **Batch ZIP Download**: Pack all or selected photos into a clean `.zip` archive on the fly and stream directly to your computer.
- **Individual Download & Fullscreen Lightbox**: Zoom in on any photo before downloading or download individual photos directly.
- **Anti-Hotlinking Proxy**: Built-in `/api/proxy-image` route to bypass Facebook referer checks for reliable image previews.
- **Real-Time Live Progress**: Uses Server-Sent Events (SSE) to display step-by-step progress as the automated browser navigates and uncovers photos.

---

## Quick Start

### 1. Requirements
- Node.js (v18+)
- Google Chrome or Microsoft Edge installed on Windows

### 2. Run the App
From this folder (`C:\Users\hp\.gemini\antigravity\scratch\fb-image-downloader`):

```bash
npm start
```

Then open your browser at:
```
http://localhost:3000
```

### 3. Usage
1. Copy the link of any Facebook post (or click one of the sample buttons).
2. Click **Extract Photos**.
3. Watch the real-time progress as visible and hidden photos are extracted.
4. Click **Download All as ZIP** or pick individual photos to download!
