import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function getBrowserExecutable() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No compatible browser (Google Chrome or Microsoft Edge) found on system.');
}

export function normalizeFacebookUrl(inputUrl) {
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'm.facebook.com' || parsed.hostname === 'mobile.facebook.com') {
      parsed.hostname = 'www.facebook.com';
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

async function safeEvaluate(p, fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await p.evaluate(fn);
    } catch (err) {
      if (err.message.includes('Execution context was destroyed') || err.message.includes('context')) {
        await new Promise(r => setTimeout(r, 800));
        continue;
      }
      throw err;
    }
  }
  return null;
}

/**
 * Extracts all photos from a Facebook post, album, or photo link.
 * @param {string} rawUrl 
 * @param {object} options 
 * @param {function} onProgress - Callback for real-time progress updates
 * @returns {Promise<{ images: Array, title: string, text: string, targetUrl: string, totalCount: number }>}
 */
export async function extractFacebookPhotos(rawUrl, options = {}, onProgress = () => {}) {
  const targetUrl = normalizeFacebookUrl(rawUrl);
  const maxWalkSteps = options.maxImages || 120;
  const executablePath = getBrowserExecutable();

  onProgress({ step: 'init', message: 'Launching browser engine...', percent: 10 });

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-infobars',
      '--window-size=1440,900'
    ]
  });

  const capturedMap = new Map(); // photoKey -> { id, url, width, height, source }
  const photoOrder = [];

  function addImage(photoId, url, width = 0, height = 0, source = 'unknown') {
    if (!url || typeof url !== 'string') return;
    const cleanUrl = url.replace(/\\/g, '');

    // Ignore static UI assets, emojis, reaction icons, and small profile avatars
    if (!cleanUrl.includes('fbcdn.net')) return;
    if (cleanUrl.includes('/rsrc.php') || cleanUrl.includes('/emoji.php') || cleanUrl.includes('/static.xx.')) return;
    if (cleanUrl.includes('/t39.30808-1/') || cleanUrl.includes('/p50x50/') || cleanUrl.includes('/s50x50/')) return;

    let key = photoId;
    if (!key) {
      const match = cleanUrl.match(/\/([0-9]+)_[0-9]+_[0-9]+_[an]\./);
      key = match ? match[1] : cleanUrl.split('?')[0];
    }

    const existing = capturedMap.get(key);
    const isHigherQuality = !existing ||
      (cleanUrl.includes('t39.30808-6') && !existing.url.includes('t39.30808-6')) ||
      ((width * height) > (existing.width * existing.height));

    if (isHigherQuality) {
      capturedMap.set(key, {
        id: key,
        url: cleanUrl,
        width: width || (existing ? existing.width : 0),
        height: height || (existing ? existing.height : 0),
        source
      });
      if (!photoOrder.includes(key)) {
        photoOrder.push(key);
      }
    }
  }

  function setupGraphQLListener(targetPage) {
    targetPage.on('response', async (response) => {
      const resUrl = response.url();
      if (resUrl.includes('/api/graphql/')) {
        try {
          const bodyText = await response.text();

          const largestRegex = /"id":"([0-9]+)".*?"largest_available_image":\{"uri":"([^"]+)"(?:,"width":(\d+),"height":(\d+))?/g;
          let match;
          while ((match = largestRegex.exec(bodyText)) !== null) {
            addImage(match[1], match[2], parseInt(match[3] || '0', 10), parseInt(match[4] || '0', 10), 'graphql-largest');
          }

          const imageRegex = /"id":"([0-9]+)".*?"image":\{"uri":"([^"]+)"(?:,"width":(\d+),"height":(\d+))?/g;
          while ((match = imageRegex.exec(bodyText)) !== null) {
            addImage(match[1], match[2], parseInt(match[3] || '0', 10), parseInt(match[4] || '0', 10), 'graphql');
          }
        } catch {}
      }
    });
  }

  try {
    let page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1440, height: 900 });
    setupGraphQLListener(page);

    onProgress({ step: 'navigating', message: 'Connecting to Facebook post...', percent: 20 });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Wait for redirect to settle if it was a share link
    if (targetUrl.includes('/share/')) {
      for (let i = 0; i < 15; i++) {
        if (!page.url().includes('/share/')) break;
        await new Promise(r => setTimeout(r, 200));
      }
    }
    await new Promise(r => setTimeout(r, 2000));

    // Dismiss cookie/login banners
    try {
      await safeEvaluate(page, () => {
        const closeButtons = Array.from(document.querySelectorAll(
          'div[aria-label="Close"], [role="button"][aria-label="Close"], [aria-label="Decline optional cookies"], [aria-label="Allow all cookies"]'
        ));
        for (const b of closeButtons) {
          try { b.click(); } catch {}
        }
      });
    } catch {}

    // Extract title & post text
    const pageMeta = (await safeEvaluate(page, () => {
      const title = document.title || '';
      let text = '';
      const textEl = document.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"], div[dir="auto"]');
      if (textEl) text = textEl.textContent || '';
      return { title, text };
    })) || { title: '', text: '' };

    // Check script tags for preloaded images
    onProgress({ step: 'parsing_scripts', message: 'Scanning preloaded media...', percent: 35 });
    const scriptImages = (await safeEvaluate(page, () => {
      const items = [];
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const s of scripts) {
        const text = s.textContent || '';
        if (!text.includes('scontent')) continue;
        const uriRegex = /"uri":"(https:[^"]+scontent[^"]+)"(?:,"width":(\d+),"height":(\d+))?/g;
        let m;
        while ((m = uriRegex.exec(text)) !== null) {
          items.push({
            url: m[1],
            width: m[2] ? parseInt(m[2], 10) : 0,
            height: m[3] ? parseInt(m[3], 10) : 0
          });
        }
      }
      return items;
    })) || [];

    for (const item of scriptImages) {
      addImage(null, item.url, item.width, item.height, 'ssr-script');
    }

    // 2. Discover clean photo viewer link from post
    onProgress({ step: 'discovering_viewer', message: 'Locating album and photo links...', percent: 45 });
    const cleanViewerLink = await safeEvaluate(page, () => {
      const anchors = Array.from(document.querySelectorAll('a[href*="/photo"], a[href*="photo.php"]'));
      for (const a of anchors) {
        try {
          const u = new URL(a.href);
          const fbid = u.searchParams.get('fbid');
          const set = u.searchParams.get('set');
          if (fbid && set) {
            return `https://www.facebook.com/photo/?fbid=${fbid}&set=${set}`;
          }
        } catch {}
      }
      return null;
    });

    const isAlreadyInViewer = targetUrl.includes('/photo/?fbid=') || targetUrl.includes('/photo.php?fbid=');
    const startViewerUrl = cleanViewerLink || (isAlreadyInViewer ? targetUrl : null);

    if (startViewerUrl) {
      onProgress({ step: 'opening_viewer', message: 'Opening dedicated photo viewer in fresh tab...', percent: 55 });
      
      let viewerPage = page;
      if (!isAlreadyInViewer) {
        await page.close().catch(() => {});
        viewerPage = await browser.newPage();
        await viewerPage.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        );
        await viewerPage.setViewport({ width: 1440, height: 900 });
        setupGraphQLListener(viewerPage);

        await viewerPage.goto(startViewerUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await new Promise(r => setTimeout(r, 2000));
      }

      // Dismiss any viewer dialogs
      try {
        await safeEvaluate(viewerPage, () => {
          document.querySelectorAll('[aria-label="Close"], [aria-label="Decline optional cookies"], [aria-label="Allow all cookies"]').forEach(b => {
            try { b.click(); } catch {}
          });
        });
      } catch {}

      // 3. Walk through all photos in the album/post
      onProgress({ step: 'walking_carousel', message: 'Walking through all album photos...', percent: 60 });

      let firstFbid = null;
      let unchangedUrlCount = 0;
      let lastUrl = '';

      for (let step = 0; step < maxWalkSteps; step++) {
        const currentUrl = viewerPage.url();
        const fbidMatch = currentUrl.match(/fbid=([0-9]+)/);
        const currentFbid = fbidMatch ? fbidMatch[1] : null;

        if (currentFbid) {
          if (firstFbid === null) {
            firstFbid = currentFbid;
          } else if (currentFbid === firstFbid && step > 2) {
            console.log(`Loop detected at step ${step} (returned to ${firstFbid}). Album walk complete!`);
            break;
          }
        }

        if (currentUrl === lastUrl && step > 0) {
          unchangedUrlCount++;
          if (unchangedUrlCount >= 3) {
            console.log(`URL stopped changing at step ${step}. Reached end of photos.`);
            break;
          }
        } else {
          unchangedUrlCount = 0;
          lastUrl = currentUrl;
        }

        // Grab current active high-res image from the viewer
        const activeImg = await safeEvaluate(viewerPage, () => {
          const imgs = Array.from(document.querySelectorAll('img[src*="scontent"]')).filter(img => {
            return !img.src.includes('/t39.30808-1/') && !img.src.includes('/rsrc.php');
          });
          if (imgs.length === 0) return null;
          const vc = imgs.find(img => img.getAttribute('data-visualcompletion') === 'media-vc-image');
          if (vc) return { src: vc.src, width: vc.naturalWidth, height: vc.naturalHeight };
          return { src: imgs[0].src, width: imgs[0].naturalWidth, height: imgs[0].naturalHeight };
        });

        if (activeImg) {
          addImage(currentFbid, activeImg.src, activeImg.width, activeImg.height, 'viewer-active');
        }

        onProgress({
          step: 'stepping',
          message: `Captured ${capturedMap.size} photos (navigating photo ${step + 1})...`,
          percent: Math.min(94, 60 + Math.floor((step / maxWalkSteps) * 34)),
          imageCount: capturedMap.size
        });

        // Click next photo button or press Right Arrow
        const clickedNext = await safeEvaluate(viewerPage, () => {
          const btn = document.querySelector('[aria-label="Next photo"], [aria-label="Next"], [aria-label="next"]');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        });

        if (!clickedNext) {
          await viewerPage.keyboard.press('ArrowRight');
        }

        await new Promise(r => setTimeout(r, 650));
      }
    }

    onProgress({ step: 'finalizing', message: 'Organizing photo gallery...', percent: 96 });

    const finalImages = [];
    const seenUrls = new Set();

    for (const key of photoOrder) {
      const item = capturedMap.get(key);
      if (item && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        finalImages.push({
          id: item.id,
          url: item.url,
          width: item.width,
          height: item.height,
          source: item.source,
          filename: `facebook_photo_${finalImages.length + 1}.jpg`
        });
      }
    }

    onProgress({
      step: 'complete',
      message: `Successfully extracted all ${finalImages.length} photos!`,
      percent: 100,
      imageCount: finalImages.length
    });

    return {
      title: pageMeta.title,
      text: pageMeta.text,
      targetUrl,
      images: finalImages,
      totalCount: finalImages.length
    };

  } finally {
    try {
      await browser.close();
    } catch {}
  }
}
