// Facebook Multi-Image Downloader - Frontend Client

let currentImages = [];
let selectedIndices = new Set();
let currentLightboxIndex = 0;
let eventSource = null;

// DOM Elements
const extractForm = document.getElementById('extractForm');
const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const submitBtn = document.getElementById('submitBtn');

const progressSection = document.getElementById('progressSection');
const progressStatus = document.getElementById('progressStatus');
const progressDetail = document.getElementById('progressDetail');
const progressBar = document.getElementById('progressBar');
const progressPercentBadge = document.getElementById('progressPercentBadge');

const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const step4 = document.getElementById('step4');

const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');

const resultsSection = document.getElementById('resultsSection');
const resultTitle = document.getElementById('resultTitle');
const photoCountBadge = document.getElementById('photoCountBadge');
const selectAllBtn = document.getElementById('selectAllBtn');
const deselectAllBtn = document.getElementById('deselectAllBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const zipBtnText = document.getElementById('zipBtnText');
const postMetaCard = document.getElementById('postMetaCard');
const postTextSnippet = document.getElementById('postTextSnippet');
const photoGrid = document.getElementById('photoGrid');

// Lightbox Elements
const lightboxModal = document.getElementById('lightboxModal');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxDownloadBtn = document.getElementById('lightboxDownloadBtn');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Clipboard paste
  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        urlInput.focus();
      }
    } catch {
      urlInput.focus();
    }
  });

  // Sample chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      urlInput.value = chip.dataset.url;
      urlInput.focus();
    });
  });

  // Form submit
  extractForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;
    startExtraction(url);
  });

  // Selection actions
  selectAllBtn.addEventListener('click', () => {
    selectedIndices = new Set(currentImages.map((_, i) => i));
    updateSelectionUI();
  });

  deselectAllBtn.addEventListener('click', () => {
    selectedIndices.clear();
    updateSelectionUI();
  });

  downloadZipBtn.addEventListener('click', downloadSelectedZip);

  // Lightbox handlers
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxModal.querySelector('.lightbox-backdrop').addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', showPrevLightbox);
  lightboxNext.addEventListener('click', showNextLightbox);
  lightboxDownloadBtn.addEventListener('click', () => {
    if (currentImages[currentLightboxIndex]) {
      downloadSingleImage(currentImages[currentLightboxIndex]);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (lightboxModal.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPrevLightbox();
    if (e.key === 'ArrowRight') showNextLightbox();
  });
});

function setProgress(percent, status, detail, step) {
  progressBar.style.width = `${percent}%`;
  progressPercentBadge.textContent = `${percent}%`;
  if (status) progressStatus.textContent = status;
  if (detail) progressDetail.textContent = detail;

  // Step badges
  const steps = [step1, step2, step3, step4];
  steps.forEach(s => s.classList.remove('active', 'done'));

  if (step >= 1) step1.classList.add(step > 1 ? 'done' : 'active');
  if (step >= 2) step2.classList.add(step > 2 ? 'done' : 'active');
  if (step >= 3) step3.classList.add(step > 3 ? 'done' : 'active');
  if (step >= 4) step4.classList.add('done');
}

function startExtraction(url) {
  // Reset state
  errorAlert.classList.add('hidden');
  resultsSection.classList.add('hidden');
  progressSection.classList.remove('hidden');
  submitBtn.disabled = true;
  submitBtn.style.opacity = '0.7';

  setProgress(10, 'Initializing crawler...', 'Launching browser to load post', 1);

  if (eventSource) {
    eventSource.close();
  }

  const streamUrl = `/api/extract-stream?url=${encodeURIComponent(url)}&maxImages=120`;
  eventSource = new EventSource(streamUrl);

  eventSource.addEventListener('progress', (e) => {
    try {
      const data = JSON.parse(e.data);
      let stepNum = 1;
      if (data.step === 'navigating' || data.step === 'bypassing') stepNum = 1;
      else if (data.step === 'parsing_scripts' || data.step === 'initial_captured') stepNum = 2;
      else if (data.step === 'opening_viewer' || data.step === 'walking_carousel' || data.step === 'stepping') stepNum = 3;
      else if (data.step === 'finalizing' || data.step === 'complete') stepNum = 4;

      setProgress(data.percent || 30, data.message, `Captured: ${data.imageCount || 0} photos so far`, stepNum);
    } catch (err) {
      console.error(err);
    }
  });

  eventSource.addEventListener('complete', (e) => {
    try {
      const result = JSON.parse(e.data);
      eventSource.close();
      onExtractionSuccess(result);
    } catch (err) {
      onExtractionError('Failed to parse extraction results');
    }
  });

  eventSource.addEventListener('error', (e) => {
    console.warn('SSE stream notice, checking fallback...', e);
    eventSource.close();
    // Try fallback standard POST in case SSE dropped
    fallbackPostExtraction(url);
  });
}

async function fallbackPostExtraction(url) {
  try {
    setProgress(50, 'Extracting media...', 'Traversing post and photosets', 3);
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, maxImages: 120 })
    });
    const data = await res.json();
    if (data.success && data.images && data.images.length > 0) {
      onExtractionSuccess(data);
    } else {
      onExtractionError(data.error || 'No photos found in this post or link is inaccessible.');
    }
  } catch (err) {
    onExtractionError(err.message || 'Connection error while communicating with server.');
  }
}

function onExtractionSuccess(data) {
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  progressSection.classList.add('hidden');

  currentImages = data.images || [];
  if (currentImages.length === 0) {
    onExtractionError('No downloadable photos found in this link. Ensure the post is public or contains photo attachments.');
    return;
  }

  // Pre-select all
  selectedIndices = new Set(currentImages.map((_, i) => i));

  // Update headers
  resultTitle.textContent = data.title ? `Post: ${data.title.substring(0, 50)}...` : 'Extracted Photos';
  photoCountBadge.textContent = `${currentImages.length} photos`;

  if (data.text) {
    postTextSnippet.textContent = `"${data.text}"`;
    postMetaCard.classList.remove('hidden');
  } else {
    postMetaCard.classList.add('hidden');
  }

  renderPhotoGrid();
  updateSelectionUI();
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function onExtractionError(msg) {
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
  progressSection.classList.add('hidden');
  errorMessage.textContent = msg;
  errorAlert.classList.remove('hidden');
}

function renderPhotoGrid() {
  photoGrid.innerHTML = '';

  currentImages.forEach((img, idx) => {
    const card = document.createElement('div');
    card.className = `photo-card ${selectedIndices.has(idx) ? 'selected' : ''}`;
    card.dataset.index = idx;

    // Use image proxy to guarantee load without CORS/referer headers
    const proxyThumb = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
    const dimText = (img.width && img.height) ? `${img.width} × ${img.height}` : 'High Res';

    card.innerHTML = `
      <div class="photo-thumb-container">
        <div class="photo-checkbox-wrapper">
          <input type="checkbox" class="photo-checkbox" ${selectedIndices.has(idx) ? 'checked' : ''} data-index="${idx}">
        </div>
        <img class="photo-thumb" src="${proxyThumb}" alt="Photo ${idx + 1}" loading="lazy">
        <div class="photo-badge">${dimText}</div>
      </div>
      <div class="photo-actions">
        <span class="photo-num">#${idx + 1}</span>
        <div class="photo-btns">
          <button type="button" class="action-icon-btn preview-btn" title="View full size" data-index="${idx}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
          <button type="button" class="action-icon-btn download-btn" title="Download this photo" data-index="${idx}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Click on thumbnail opens lightbox
    card.querySelector('.photo-thumb').addEventListener('click', () => openLightbox(idx));
    // Checkbox toggle
    const checkbox = card.querySelector('.photo-checkbox');
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      if (checkbox.checked) {
        selectedIndices.add(idx);
        card.classList.add('selected');
      } else {
        selectedIndices.delete(idx);
        card.classList.remove('selected');
      }
      updateSelectionUI();
    });

    // Preview button
    card.querySelector('.preview-btn').addEventListener('click', () => openLightbox(idx));

    // Download button
    card.querySelector('.download-btn').addEventListener('click', () => downloadSingleImage(img));

    photoGrid.appendChild(card);
  });
}

function updateSelectionUI() {
  const count = selectedIndices.size;
  zipBtnText.textContent = `Download Selected (${count}) as ZIP`;
  downloadZipBtn.disabled = count === 0;
  downloadZipBtn.style.opacity = count === 0 ? '0.5' : '1';

  // Sync checkboxes
  document.querySelectorAll('.photo-card').forEach(card => {
    const idx = parseInt(card.dataset.index, 10);
    const cb = card.querySelector('.photo-checkbox');
    if (selectedIndices.has(idx)) {
      card.classList.add('selected');
      if (cb) cb.checked = true;
    } else {
      card.classList.remove('selected');
      if (cb) cb.checked = false;
    }
  });
}

// Single Image Download
function downloadSingleImage(img) {
  const link = document.createElement('a');
  link.href = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
  link.download = img.filename || `facebook_photo_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download Batch ZIP
async function downloadSelectedZip() {
  if (selectedIndices.size === 0) return;

  const selectedImages = Array.from(selectedIndices)
    .sort((a, b) => a - b)
    .map(i => currentImages[i]);

  const originalText = zipBtnText.textContent;
  zipBtnText.textContent = `Generating ZIP (${selectedImages.length} photos)...`;
  downloadZipBtn.disabled = true;

  try {
    const res = await fetch('/api/download-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: selectedImages,
        zipName: `facebook_post_photos_${Date.now()}`
      })
    });

    if (!res.ok) throw new Error('Failed to generate ZIP');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facebook_post_photos_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (err) {
    alert('Failed to download ZIP archive: ' + err.message);
  } finally {
    zipBtnText.textContent = originalText;
    downloadZipBtn.disabled = false;
  }
}

// Lightbox modal logic
function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightboxContent();
  lightboxModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxModal.classList.add('hidden');
  document.body.style.overflow = '';
}

function showPrevLightbox() {
  if (currentLightboxIndex > 0) {
    currentLightboxIndex--;
    updateLightboxContent();
  } else {
    currentLightboxIndex = currentImages.length - 1;
    updateLightboxContent();
  }
}

function showNextLightbox() {
  if (currentLightboxIndex < currentImages.length - 1) {
    currentLightboxIndex++;
    updateLightboxContent();
  } else {
    currentLightboxIndex = 0;
    updateLightboxContent();
  }
}

function updateLightboxContent() {
  const img = currentImages[currentLightboxIndex];
  if (!img) return;
  lightboxImg.src = `/api/proxy-image?url=${encodeURIComponent(img.url)}`;
  lightboxCounter.textContent = `Photo ${currentLightboxIndex + 1} of ${currentImages.length} ${img.width ? `(${img.width} × ${img.height})` : ''}`;
}
