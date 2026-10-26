// The tiny blurry preview shown while a photo loads (see migrations/0010).
//
// The photo is boiled down to a grid of colors, 8 on its long edge (8 x 5 for
// most landscape photos), saved as a tiny BMP picture in a "data:" address:
// about 200 characters of text in the page itself, so it needs no extra
// download. style.css stretches and blurs it, which gives the soft color
// layout of the photo, like a "BlurHash". (WebP or JPEG would be 3 times
// bigger at this size: their file headers alone are larger than the pixels.)
//
// Used by the upload worker (new photos) and by the admin set page (older
// photos), in a worker or on a page alike.

const EDGE = 8;

// The same check the server makes: only a small image "data:" address.
export const PLACEHOLDER_PATTERN = /^data:image\/(bmp|webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
export const PLACEHOLDER_MAX = 1200;

// source: anything that can be drawn (an image, a bitmap, a canvas).
export async function makePlaceholder(source, width, height) {
  const scale = EDGE / Math.max(width, height);
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  // Shrink in two steps, so each color is an average of its area, not one dot.
  const middle = draw(source, Math.min(width, w * 8), Math.min(height, h * 8));
  const small = draw(middle, w, h);
  const pixels = small.getContext("2d").getImageData(0, 0, w, h).data;
  const uri = `data:image/bmp;base64,${btoa(bmp(pixels, w, h))}`;
  return uri.length <= PLACEHOLDER_MAX ? uri : "";
}

function draw(source, w, h) {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return canvas;
}

// A 24-bit BMP file, as a string of bytes: a 54-byte header, then the rows
// from the bottom up, blue-green-red, each row padded to 4 bytes.
function bmp(rgba, w, h) {
  const rowSize = Math.ceil((w * 3) / 4) * 4;
  const size = 54 + rowSize * h;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42; bytes[1] = 0x4d; // "BM"
  view.setUint32(2, size, true);
  view.setUint32(10, 54, true); // where the pixels start
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, w, true);
  view.setInt32(22, h, true);
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // bits per pixel
  view.setUint32(34, rowSize * h, true);
  for (let y = 0; y < h; y++) {
    const row = 54 + (h - 1 - y) * rowSize;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      bytes[row + x * 3] = rgba[i + 2];
      bytes[row + x * 3 + 1] = rgba[i + 1];
      bytes[row + x * 3 + 2] = rgba[i];
    }
  }
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return text;
}
