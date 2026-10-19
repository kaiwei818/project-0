// Packs several files into one .zip, entirely in the browser (nothing is sent
// anywhere). Used by the toolkit's "Download all" button.
//
// The files are stored as they are, without compressing them again: JPEGs are
// already compressed, so zipping them would only cost time and save nothing.
// That keeps this small enough to write by hand instead of adding a library.
// (Format: "ZIP File Format Specification" by PKWARE, the "stored" method.)

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

// The checksum every zip entry carries, so unzipping can detect damage.
function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Zip files store the time the old MS-DOS way.
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

// files: [{ name, blob }]. Returns one Blob of type application/zip.
export async function makeZip(files) {
  const encoder = new TextEncoder();
  const { time, day } = dosDateTime(new Date());
  const parts = [];
  const central = [];
  let offset = 0;

  for (const { name, blob } of files) {
    const nameBytes = encoder.encode(name);
    const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
    const size = blob.size;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // "local file header" signature
    local.setUint16(4, 20, true);         // version needed to extract (2.0)
    local.setUint16(6, 0x0800, true);     // flag: file names are UTF-8 (Chinese names work)
    local.setUint16(8, 0, true);          // method 0: stored, not compressed
    local.setUint16(10, time, true);
    local.setUint16(12, day, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);      // compressed size
    local.setUint32(22, size, true);      // original size (the same: stored)
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);         // no extra field
    parts.push(local, nameBytes, blob);   // the Blob itself, not a copy of its bytes

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true); // "central directory" signature
    entry.setUint16(4, 20, true);         // made by version 2.0
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, time, true);
    entry.setUint16(14, day, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, size, true);
    entry.setUint32(24, size, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);    // where this file's local header starts
    central.push(entry, nameBytes);

    offset += 30 + nameBytes.length + size;
    if (offset > 0xffffffff) throw new Error("Over 4 GB: download fewer photos at a time.");
  }

  const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);     // "end of central directory" signature
  end.setUint16(8, files.length, true);   // entries on this disk
  end.setUint16(10, files.length, true);  // entries in total
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);        // where the central directory starts

  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
