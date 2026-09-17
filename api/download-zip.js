import archiver from 'archiver';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { images, zipName } = req.body || {};

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({
      error: 'No images provided for download'
    });
  }

  const filename =
    (zipName || `facebook_photos_${Date.now()}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_') + '.zip';

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}"`
  );

  const archive = archiver('zip', {
    zlib: { level: 6 }
  });

  archive.on('error', (err) => {
    console.error('Archive error:', err);

    if (!res.headersSent) {
      res.status(500).json({
        error: 'ZIP creation error'
      });
    }
  });

  archive.pipe(res);

  console.log(`Packing ${images.length} images into ${filename}...`);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];

    const imgUrl =
      typeof item === 'string'
        ? item
        : item.url;

    const imgName =
      typeof item === 'object' && item.filename
        ? item.filename
        : `photo_${i + 1}.jpg`;

    if (!imgUrl) {
      continue;
    }

    try {
      const response = await fetch(imgUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://www.facebook.com/'
        }
      });

      if (response.ok) {
        const buffer = Buffer.from(
          await response.arrayBuffer()
        );

        archive.append(buffer, {
          name: imgName
        });
      } else {
        console.warn(
          `Failed to fetch image ${i + 1}: ${response.status}`
        );
      }
    } catch (err) {
      console.error(
        `Error downloading image ${i + 1}:`,
        err.message
      );
    }
  }

  await archive.finalize();
}