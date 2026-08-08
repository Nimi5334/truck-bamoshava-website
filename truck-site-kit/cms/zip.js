/**
 * Minimal, dependency-free ZIP writer (browser only).
 *
 * Uses CompressionStream('deflate-raw') per entry when available, falling
 * back to STORE (uncompressed) on older browsers. No ZIP64 — fine at the
 * scale of a single site's files.
 */

let crcTable = null;
function getCrcTable() {
  if (crcTable) return crcTable;
  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}
function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = cs.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

const u16 = (n) => new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
const u32 = (n) => new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
const concat = (arrays) => {
  let total = 0;
  for (const a of arrays) total += a.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
};

function dosDateTime(d = new Date()) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((Math.max(0, d.getFullYear() - 1980)) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

/**
 * @param {{path:string, data:Uint8Array}[]} entries
 * @returns {Promise<Blob>}
 */
export async function zipFiles(entries) {
  const encoder = new TextEncoder();
  const canDeflate = typeof CompressionStream !== "undefined";
  const { time, date } = dosDateTime();
  const FLAG_UTF8 = 0x0800;

  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { path, data } of entries) {
    const nameBytes = encoder.encode(path.replace(/\\/g, "/").replace(/^\/+/, ""));
    const crc = crc32(data);
    let method = 0;
    let payload = data;
    if (canDeflate && data.length > 0) {
      try {
        const compressed = await deflateRaw(data);
        if (compressed.length < data.length) { method = 8; payload = compressed; }
      } catch { /* keep STORE */ }
    }

    const localHeader = concat([
      u32(0x04034b50), u16(20), u16(FLAG_UTF8), u16(method),
      u16(time), u16(date), u32(crc),
      u32(payload.length), u32(data.length),
      u16(nameBytes.length), u16(0),
      nameBytes,
    ]);
    localParts.push(localHeader, payload);

    centralParts.push(concat([
      u32(0x02014b50), u16(20), u16(20), u16(FLAG_UTF8), u16(method),
      u16(time), u16(date), u32(crc),
      u32(payload.length), u32(data.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset),
      nameBytes,
    ]));

    offset += localHeader.length + payload.length;
  }

  const centralDir = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralDir.length), u32(offset),
    u16(0),
  ]);

  return new Blob([...localParts, centralDir, eocd], { type: "application/zip" });
}
