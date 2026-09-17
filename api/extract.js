import { extractFacebookPhotos } from '../extractor.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, maxImages = 120 } = req.body || {};

  if (!url) {
    return res.status(400).json({
      error: 'Please provide a Facebook URL'
    });
  }

  try {
    console.log(`Starting extraction for: ${url}`);

    const result = await extractFacebookPhotos(url, {
      maxImages
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error('Extraction error:', err);

    return res.status(500).json({
      error: err.message || 'Failed to extract images from Facebook post'
    });
  }
}