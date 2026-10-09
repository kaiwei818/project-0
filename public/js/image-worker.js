// Shrinks one photo. This file runs as a "Web Worker": a background thread, so
// the heavy work (decoding a 25 MB file, resizing 24 million pixels) does not
// freeze the page. The page sends a file in, and this sends two small files back.
//
// Output for each photo:
//   thumb    about 500 px on the long edge, quality 0.75, no watermark
//   display  about 2000 px on the long edge, quality 0.80, with the watermark
//
// Drawing onto a canvas and saving it creates a brand new file, so ALL of the
// original's hidden data (EXIF: GPS location, camera serial number) is left behind.

const THUMB_EDGE = 500;
const DISPLAY_EDGE = 2000;

self.onmessage = async (event) => {
  const { id, file, watermark } = event.data;
  try {
    self.postMessage({ id, ...(await processPhoto(file, watermark)) });
  } catch (err) {
    self.postMessage({ id, error: `Could not read this image (${err.message}).` });
  }
};

async function processPhoto(file, watermark) {
  // "from-image" applies the camera's rotation flag, so portrait shots stand upright.
  const original = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const display = shrink(original, DISPLAY_EDGE);
    // Make the thumbnail from the display version (much faster than from the
    // original), before the watermark goes on.
    const thumb = shrink(display, THUMB_EDGE);
    if (watermark) drawWatermark(display, watermark);

    const [thumbBlob, displayBlob] = await Promise.all([
      encode(thumb, 0.75),
      encode(display, 0.8),
    ]);
    return { thumb: thumbBlob, display: displayBlob, width: display.width, height: display.height };
  } finally {
    original.close(); // free the ~100 MB of decoded pixels right away
  }
}

// Shrinking 6000 px straight down to 500 px skips most pixels and looks jagged.
// Halving step by step averages them properly, like a good photo editor does.
function shrink(source, longEdge) {
  const scale = Math.min(1, longEdge / Math.max(source.width, source.height));
  const targetWidth = Math.round(source.width * scale);
  const targetHeight = Math.round(source.height * scale);

  let current = source;
  while (current.width / 2 >= targetWidth) {
    current = draw(current, Math.round(current.width / 2), Math.round(current.height / 2));
  }
  return draw(current, targetWidth, targetHeight);
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
// WebP files, and quietly hands back a PNG instead, so we check and fall back to JPEG.
async function encode(canvas, quality) {
  const webp = await canvas.convertToBlob({ type: "image/webp", quality });
  if (webp.type === "image/webp") return webp;
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}
