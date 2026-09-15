import fs from 'fs';

async function testApi() {
  console.log('Testing /api/extract...');
  const extractRes = await fetch('http://127.0.0.1:3000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://www.facebook.com/NASA',
      maxImages: 10
    })
  });

  const extractData = await extractRes.json();
  console.log('Extraction status:', extractRes.status);
  console.log('Total images found:', extractData.totalCount);
  if (!extractData.images || extractData.images.length === 0) {
    console.error('No images returned!');
    process.exit(1);
  }

  const sampleImages = extractData.images.slice(0, 3);
  console.log('Sample images:', sampleImages);

  console.log('\nTesting /api/download-zip with 3 images...');
  const zipRes = await fetch('http://127.0.0.1:3000/api/download-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: sampleImages,
      zipName: 'test_bundle'
    })
  });

  console.log('ZIP response status:', zipRes.status);
  const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
  console.log('ZIP buffer size in bytes:', zipBuffer.length);
  
  // Verify PK zip header (bytes 0x50 0x4B)
  if (zipBuffer[0] === 0x50 && zipBuffer[1] === 0x4B) {
    console.log('SUCCESS: Valid ZIP archive received!');
  } else {
    console.error('FAILURE: Not a valid ZIP file header.');
    process.exit(1);
  }

  // Also test /api/proxy-image
  console.log('\nTesting /api/proxy-image...');
  const proxyUrl = `http://127.0.0.1:3000/api/proxy-image?url=${encodeURIComponent(sampleImages[0].url)}`;
  const proxyRes = await fetch(proxyUrl);
  console.log('Proxy status:', proxyRes.status, 'Content-Type:', proxyRes.headers.get('content-type'));
  const proxyBuf = Buffer.from(await proxyRes.arrayBuffer());
  console.log('Proxy image bytes:', proxyBuf.length);

  if (proxyRes.ok && proxyBuf.length > 1000) {
    console.log('SUCCESS: Proxy image fetched correctly!');
  } else {
    console.error('FAILURE: Proxy image failed.');
  }
}

testApi().catch(console.error);
