// Shrinks one photo. This file runs as a "Web Worker": a background thread, so
// the heavy work (decoding a 25 MB file, resizing 24 million pixels) does not
// freeze the page. The page sends a file in, and this sends four small files back.
//
// Output for each photo:
//   small    800 px on the long edge, quality 0.80, no watermark  (grids on phones)
//   thumb   1200 px on the long edge, quality 0.85, no watermark  (grids on computers)
//   medium  2000 px on the long edge, quality 0.88, watermark     (viewer on phones)
//   display 3000 px on the long edge, quality 0.90, watermark     (viewer on computers)
// The browser picks the smallest one that still looks sharp on each screen
// (see "srcset" in set.js and lightbox.js), so phones download far less.
//
// Why these numbers: Retina screens have 2 to 3 real pixels per point. A phone
// is about 390 points wide, so it needs about 390 x 3 = 1170 pixels across. An
// upright photo at 2000 px is 1333 px wide: enough. (At 1600 px it would be only
// 1067 px wide, and the phone would pick the big 3000 px file instead.)
// 3000 px fills even a large 5K display.
// To change them, edit the values below. Only photos uploaded afterwards change.
//
// Drawing onto a canvas and saving it creates a brand new file, so ALL of the
// original's hidden data (EXIF: GPS location, camera serial number) is left behind.
// Before that, we read just the camera details we want to show (exif.js).

import { readCameraInfo } from "./exif.js";

const SIZES = {
  small: { edge: 800, quality: 0.8 },
  thumb: { edge: 1200, quality: 0.85 },
  medium: { edge: 2000, quality: 0.88 },
  display: { edge: 3000, quality: 0.9 },
};

self.onmessage = async (event) => {
  const { id, file, watermark } = event.data;
  try {
    const [images, cameraInfo] = await Promise.all([processPhoto(file, watermark), readCameraInfo(file)]);
    self.postMessage({ id, ...images, cameraInfo });
  } catch (err) {
    // Usually the browser ran out of memory for images (Safari has a strict
    // limit), or the file is damaged. The upload page retries it once by itself.
    self.postMessage({ id, error: `Could not process this photo (${err.message || err}).` });
  }
};

async function processPhoto(file, watermark) {
  // "from-image" applies the camera's rotation flag, so portrait shots stand upright.
  const original = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvases = {};
  try {
    // Each size is made from the next bigger one: much faster than starting
    // from the 6000 px original every time.
    canvases.display = shrink(original, SIZES.display.edge);
    original.close(); // free the ~100 MB of decoded pixels as early as possible
    canvases.medium = shrink(canvases.display, SIZES.medium.edge);
    canvases.thumb = shrink(canvases.medium, SIZES.thumb.edge);
    canvases.small = shrink(canvases.thumb, SIZES.small.edge);

    // Watermark only the two viewer sizes, after the smaller ones were copied.
    if (watermark) {
      drawWatermark(canvases.display, watermark);
      drawWatermark(canvases.medium, watermark);
    }

    const { width, height } = canvases.display; // read before freeing it below

    // One at a time keeps less memory in use than all at once.
    const blobs = {};
    for (const [name, { quality }] of Object.entries(SIZES)) {
      blobs[name] = await encode(canvases[name], quality);
      release(canvases[name]); // done with this size
    }
    return { ...blobs, width, height };
  } finally {
    original.close(); // safe to call twice
    Object.values(canvases).forEach(release);
  }
}

// A canvas keeps its pixels in memory until the browser gets around to cleaning
// up, which Safari does slowly. Shrinking it to 0 x 0 frees the memory at once.
// Without this, Safari ran out of image memory after a few large photos.
function release(canvas) {
  if (canvas) canvas.width = canvas.height = 0;
}

// Shrinking 6000 px straight down to 500 px skips most pixels and looks jagged.
// Halving step by step averages them properly, like a good photo editor does.
function shrink(source, longEdge) {
  const scale = Math.min(1, longEdge / Math.max(source.width, source.height));
  const targetWidth = Math.round(source.width * scale);
  const targetHeight = Math.round(source.height * scale);

  let current = source;
  while (current.width / 2 >= targetWidth) {
    const smaller = draw(current, Math.round(current.width / 2), Math.round(current.height / 2));
    if (current !== source) release(current); // the in-between step is no longer needed
    current = smaller;
  }
  const result = draw(current, targetWidth, targetHeight);
  if (current !== source) release(current);
  return result;
}

function draw(source, width, height) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

// Semi-transparent text in the bottom right corner, sized to the photo.
function drawWatermark(canvas, text) {
  const ctx = canvas.getContext("2d");
  const size = Math.round(Math.min(canvas.width, canvas.height) * 0.04);
  ctx.font = `600 ${size}px system-ui, -apple-system, "Helvetica Neue", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)"; // keeps it readable on bright skies
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(text, canvas.width - size, canvas.height - size);
}

// WebP is about 30% smaller than JPEG at the same quality. Safari cannot create
// WebP files, and quietly hands back a large PNG instead. We find out once, with
// a tiny test image, and then go straight to JPEG in browsers without WebP,
// instead of wasting time and memory making a big PNG for every photo.
let webpSupported;

async function encode(canvas, quality) {
  if (webpSupported === undefined) {
    const test = new OffscreenCanvas(2, 2);
    test.getContext("2d"); // a canvas must have a drawing context before it can be saved
    webpSupported = (await test.convertToBlob({ type: "image/webp" })).type === "image/webp";
  }
  return canvas.convertToBlob({ type: webpSupported ? "image/webp" : "image/jpeg", quality });
}
