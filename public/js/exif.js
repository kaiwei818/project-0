// Reads camera details from a JPEG's EXIF data and turns them into one line:
//   "Sony A7 IV · 35mm · f/1.8 · 1/200s · ISO 100"
//
// What EXIF is: cameras hide a small table of facts inside every JPEG, right at
// the start of the file: camera maker and model, lens, shutter speed, aperture,
// and so on. Each fact has a numeric "tag" (0x010F means "Make", 0x829A means
// "ExposureTime", ...). The table uses the layout of the old TIFF image format.
//
// We only read the facts listed below. GPS and serial numbers are never read,
// and the photo files we upload contain no EXIF at all (see image-worker.js).

const TAGS = {
  make: 0x010f,
  model: 0x0110,
  exifPointer: 0x8769,    // where the second table (the "Exif IFD") starts
  exposureTime: 0x829a,
  fNumber: 0x829d,
  iso: 0x8827,
  focalLength: 0x920a,
};

// Sony names its cameras with codes ("ILCE-7M4"). These are the marketing names.
// Add more here if your camera shows a code.
const MODEL_NAMES = {
  "ILCE-1": "A1", "ILCE-1M2": "A1 II", "ILCE-9M3": "A9 III",
  "ILCE-7M2": "A7 II", "ILCE-7M3": "A7 III", "ILCE-7M4": "A7 IV", "ILCE-7M5": "A7 V",
  "ILCE-7RM3": "A7R III", "ILCE-7RM4": "A7R IV", "ILCE-7RM4A": "A7R IVA", "ILCE-7RM5": "A7R V",
  "ILCE-7SM3": "A7S III", "ILCE-7C": "A7C", "ILCE-7CM2": "A7C II", "ILCE-7CR": "A7CR",
  "ILCE-6100": "A6100", "ILCE-6400": "A6400", "ILCE-6600": "A6600", "ILCE-6700": "A6700",
  "ZV-E1": "ZV-E1", "ZV-E10": "ZV-E10", "ZV-E10M2": "ZV-E10 II",
};

// Makers write their names in different ways. Show them the way people say them.
const MAKER_NAMES = {
  sony: "Sony", canon: "Canon", "nikon corporation": "Nikon", nikon: "Nikon",
  fujifilm: "Fujifilm", "olympus corporation": "Olympus", "om digital solutions": "OM System",
  panasonic: "Panasonic", leica: "Leica", "leica camera ag": "Leica",
  ricoh: "Ricoh", "pentax corporation": "Pentax", hasselblad: "Hasselblad",
  apple: "Apple", "dji": "DJI", "samsung": "Samsung", "google": "Google",
};

// Returns the camera line, or "" when the file has no usable EXIF.
export async function readCameraInfo(file) {
  try {
    // EXIF sits at the start of the file; 256 KB is plenty, no need to read 25 MB.
    const bytes = new DataView(await file.slice(0, 256 * 1024).arrayBuffer());
    const facts = parseJpegExif(bytes);
    return facts ? formatCameraInfo(facts) : "";
  } catch {
    return ""; // unusual or damaged EXIF: just show nothing
  }
}

function parseJpegExif(view) {
  if (view.getUint16(0) !== 0xffd8) return null; // not a JPEG

  // A JPEG is a list of "segments". EXIF is the APP1 segment (marker FF E1)
  // that starts with the letters "Exif".
  let offset = 2;
  while (offset + 4 < view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (marker === 0xffe1 && readAscii(view, offset + 4, 4) === "Exif") {
      return parseTiff(view, offset + 10); // the TIFF table starts after "Exif\0\0"
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return null; // image data started: no EXIF
    offset += 2 + length;
  }
  return null;
}

function parseTiff(view, start) {
  // "II" = Intel byte order (little-endian), "MM" = Motorola (big-endian).
  const little = view.getUint16(start) === 0x4949;
  const u16 = (o) => view.getUint16(start + o, little);
  const u32 = (o) => view.getUint32(start + o, little);

  const facts = {};
  const readTable = (tableOffset, wanted) => {
    const count = u16(tableOffset);
    for (let i = 0; i < count; i++) {
      const entry = tableOffset + 2 + i * 12; // each entry is 12 bytes
      const tag = u16(entry);
      const name = wanted[tag];
      if (!name) continue;
      const type = u16(entry + 2);
      const items = u32(entry + 4);
      // Values of 4 bytes or less are stored in the entry; bigger ones elsewhere.
      const size = { 2: 1, 3: 2, 4: 4, 5: 8 }[type] * items;
      if (!size) continue; // a data type we do not need
      const valueAt = size <= 4 ? entry + 8 : u32(entry + 8);
      if (type === 2) facts[name] = readAscii(view, start + valueAt, items).replace(/\0+$/, "").trim();
      else if (type === 3) facts[name] = u16(valueAt);
      else if (type === 4) facts[name] = u32(valueAt);
      else if (type === 5) facts[name] = [u32(valueAt), u32(valueAt + 4)]; // a fraction: [top, bottom]
    }
  };

  const byTag = (names) => Object.fromEntries(names.map((n) => [TAGS[n], n]));
  readTable(u32(4), byTag(["make", "model", "exifPointer"]));
  if (facts.exifPointer) {
    readTable(facts.exifPointer, byTag(["exposureTime", "fNumber", "iso", "focalLength"]));
  }
  return facts;
}

function readAscii(view, offset, length) {
  let text = "";
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    text += String.fromCharCode(view.getUint8(offset + i));
  }
  return text;
}

// Turns the raw facts into "Sony A7 IV · 35mm · f/1.8 · 1/200s · ISO 100".
export function formatCameraInfo(facts) {
  const parts = [];

  const maker = MAKER_NAMES[(facts.make || "").toLowerCase()] || facts.make || "";
  let model = facts.model || "";
  model = MODEL_NAMES[model] || model;
  // Many cameras repeat the maker inside the model ("Canon EOS R5"); do not say it twice.
  if (maker && model.toLowerCase().startsWith(maker.toLowerCase())) model = model.slice(maker.length).trim();
  const camera = [maker, model].filter(Boolean).join(" ");
  if (camera) parts.push(camera);

  const value = (fraction) => (fraction && fraction[1] ? fraction[0] / fraction[1] : 0);

  const focal = value(facts.focalLength);
  if (focal) parts.push(`${Math.round(focal)}mm`);

  const aperture = value(facts.fNumber);
  if (aperture) parts.push(`f/${Number(aperture.toFixed(1))}`);

  const shutter = value(facts.exposureTime);
  if (shutter) {
    // Fast speeds as fractions (1/200s), slow ones in seconds (2s, 1.3s).
    parts.push(shutter < 1 ? `1/${Math.round(1 / shutter)}s` : `${Number(shutter.toFixed(1))}s`);
  }

  if (facts.iso) parts.push(`ISO ${facts.iso}`);

  return parts.join(" · ");
}
