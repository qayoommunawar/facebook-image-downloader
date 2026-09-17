import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import { extractFacebookPhotos, normalizeFacebookUrl } from './extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Image Proxy to avoid CORS / referer issues when previewing Facebook CDN images
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.facebook.com/'
      }
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Failed to fetch upstream image');
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const buffer = Buffer.from(await upstreamRes.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('Image proxy error:', err.message);
    res.status(500).send('Proxy error');
  }
});

// Real-time extraction with Server-Sent Events (SSE)
app.get('/api/extract-stream', async (req, res) => {
  const rawUrl = req.query.url;
  const maxImages = parseInt(req.query.maxImages || '120', 10);

  if (!rawUrl) {
    return res.status(400).json({ error: 'Please provide a Facebook URL' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  function sendEvent(type, data) {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  try {
    sendEvent('progress', { step: 'start', message: 'Starting extraction engine...', percent: 5 });

    const result = await extractFacebookPhotos(rawUrl, { maxImages }, (progress) => {
      sendEvent('progress', progress);
    });

    sendEvent('complete', result);
    res.end();
  } catch (err) {
    console.error('Extraction stream error:', err);
    sendEvent('error', { message: err.message || 'Extraction failed' });
    res.end();
  }
});

// Standard JSON extraction endpoint
app.post('/api/extract', async (req, res) => {
  const { url, maxImages = 120 } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Please provide a Facebook URL' });
  }

  try {
    // console.log(`Starting extraction for: ${url}`);
    // const result = await extractFacebookPhotos(url, { maxImages });
    // res.json({ success: true, ...result });
    console.log(`Starting extraction for: ${url}`);

    const startTime = Date.now();

    const result = await extractFacebookPhotos(url, { maxImages });

    console.log(
        `Extraction finished in ${Date.now() - startTime}ms with ${result.totalCount} images`
      );

res.json({ success: true, ...result });
  } catch (err) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract images from Facebook post' });
  }
});

// Batch Download as ZIP
app.post('/api/download-zip', async (req, res) => {
  const { images, zipName } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'No images provided for download' });
  }

  const filename = (zipName || `facebook_photos_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = archiver('zip', {
    zlib: { level: 6 }
  });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).send({ error: 'ZIP creation error' });
    }
  });

  archive.pipe(res);

  console.log(`Packing ${images.length} images into ${filename}...`);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const imgUrl = typeof item === 'string' ? item : item.url;
    const imgName = (typeof item === 'object' && item.filename) ? item.filename : `photo_${i + 1}.jpg`;

    try {
      const response = await fetch(imgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.facebook.com/'
        }
      });

      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        archive.append(buffer, { name: imgName });
      } else {
        console.warn(`Failed to fetch image ${i + 1}: ${response.status}`);
      }
    } catch (e) {
      console.error(`Error downloading image ${i + 1} (${imgUrl}):`, e.message);
    }
  }

  await archive.finalize();
  console.log(`Finished streaming ${filename}`);
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Facebook Multi-Image Downloader is running!`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
