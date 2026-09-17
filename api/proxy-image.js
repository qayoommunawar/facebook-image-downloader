export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method not allowed');
  }

  const imageUrl = req.query.url;

  if (!imageUrl) {
    return res.status(400).send('Missing url parameter');
  }

  try {
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.facebook.com/'
      }
    });

    if (!upstreamRes.ok) {
      return res
        .status(upstreamRes.status)
        .send('Failed to fetch upstream image');
    }

    const contentType =
      upstreamRes.headers.get('content-type') ||
      'image/jpeg';

    const buffer = Buffer.from(
      await upstreamRes.arrayBuffer()
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Cache-Control',
      'public, max-age=86400'
    );

    res.send(buffer);
  } catch (err) {
    console.error(
      'Image proxy error:',
      err.message
    );

    res.status(500).send('Proxy error');
  }
}