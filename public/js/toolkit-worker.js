// Watermarks one original photo at full size, for the admin toolkit
// (admin-toolkit.js). Runs as a Web Worker, so the page stays responsive.
//
// Everything happens on your computer: the original and the result never leave
// it. Nothing is uploaded or stored online.
//
// In:  { id, file, text, style, strength, quality, maxEdge }
//      maxEdge 0 means "keep the original size".
// Out: { id, blob, preview, width, height } or { id, error }

import { drawWatermark } from "./watermark.js";

self.onmessage = async (event) => {
  const { id, file, text, style, strength, quality, maxEdge } = event.data;
  let bitmap;
  let canvas;
  try {
    // "from-image" turns portrait shots upright, using the camera's rotation flag.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = maxEdge ? Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height)) : 1;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";
    // White behind the photo: a transparent PNG would otherwise turn black as a JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    drawWatermark(canvas, text, style, strength);

    // JPEG: every program, phone, and website accepts it.
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });

    // A small copy for the list on the page, so the page does not have to
    // decode the full-size result just to show a thumbnail.
    const previewScale = Math.min(1, 480 / Math.max(width, height));
    const small = new OffscreenCanvas(Math.round(width * previewScale), Math.round(height * previewScale));
    const smallCtx = small.getContext("2d");
    smallCtx.imageSmoothingQuality = "high";
    smallCtx.drawImage(canvas, 0, 0, small.width, small.height);
    const preview = await small.convertToBlob({ type: "image/jpeg", quality: 0.8 });

    self.postMessage({ id, blob, preview, width, height });
  } catch (err) {
    self.postMessage({
      id,
      error: `Could not process this photo (${err.message || err}). Very large photos can run out of memory, especially in Safari: try "Longest side: 6000 px".`,
    });
  } finally {
    bitmap?.close();
    if (canvas) canvas.width = canvas.height = 0; // free the memory at once
  }
};
