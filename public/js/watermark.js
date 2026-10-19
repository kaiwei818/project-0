// Drawing the watermark onto a canvas. Shared by the upload page's worker
// (image-worker.js) and the admin toolkit (toolkit-worker.js), so both look
// exactly the same. Sizes are relative to the picture, so a watermark on a
// 6000 px original looks the same as on a 1200 px thumbnail.
//
// style:    "full"  repeated diagonally across the whole photo
//           "small" one line in the bottom-right corner
// strength: "strong" or "light" (full style only)
export function drawWatermark(canvas, text, style = "full", strength = "strong") {
  if (!text) return;
  if (style === "small") drawCornerWatermark(canvas, text);
  else drawTiledWatermark(canvas, text, strength);
}

// A repeating diagonal pattern of the watermark text over the whole photo,
// like stock photo sites use. Cropping or retouching one corner does not remove
// it. White letters with a thin dark outline show on both bright and dark photos.
const WATERMARK_STYLES = {
  strong: { fill: "rgba(255, 255, 255, 0.34)", stroke: "rgba(0, 0, 0, 0.22)", size: 0.045 },
  light: { fill: "rgba(255, 255, 255, 0.2)", stroke: "rgba(0, 0, 0, 0.12)", size: 0.06 },
};

export function drawTiledWatermark(canvas, text, strength) {
  const style = WATERMARK_STYLES[strength];
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  // Letter size relative to the photo, so every size looks the same.
  const size = Math.max(10, Math.round(Math.min(width, height) * style.size));

  ctx.save();
  ctx.font = `500 ${size}px system-ui, -apple-system, "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = Math.max(1, size * 0.05);

  // Turn the drawing surface 30 degrees around the centre, then fill a grid
  // big enough to still cover the corners after turning.
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  const stepX = ctx.measureText(text).width + size * 3;
  const stepY = size * 4;
  const reach = Math.hypot(width, height) / 2 + stepX;
  for (let row = 0, y = -reach; y <= reach; y += stepY, row++) {
    const shift = row % 2 ? stepX / 2 : 0; // stagger every other row, like brickwork
    for (let x = -reach - shift; x <= reach; x += stepX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}

// The "small" style: one line of text in the bottom-right corner, sized
// relative to the photo so it looks the same at every size.
export function drawCornerWatermark(canvas, text) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const size = Math.max(10, Math.round(Math.max(width, height) * 0.018));
  const margin = Math.round(size * 1.2);
  ctx.save();
  ctx.font = `500 ${size}px system-ui, -apple-system, "Helvetica Neue", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText(text, width - margin, height - margin);
  ctx.restore();
}

