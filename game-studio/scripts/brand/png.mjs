// Tiny zero-dependency PNG re-encoder: decodes Chromium's 8-bit PNG screenshots and re-encodes them with
// per-row adaptive filtering + zlib level 9, dropping the alpha channel when the image is fully opaque.
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const paeth = (a, b, c) => {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('not a PNG');
  let off = 8, w, h, depth, ctype, interlace;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace || (ctype !== 6 && ctype !== 2)) throw new Error(`unsupported PNG (depth ${depth}, type ${ctype}, interlace ${interlace})`);
  const bpp = ctype === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const px = Buffer.alloc(w * h * 4);
  const prev = Buffer.alloc(stride), cur = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      const v = line[i];
      cur[i] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + b : f === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c)) & 255;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 4;
      px[d] = cur[s];
      px[d + 1] = cur[s + 1];
      px[d + 2] = cur[s + 2];
      px[d + 3] = bpp === 4 ? cur[s + 3] : 255;
    }
    cur.copy(prev);
  }
  return { w, h, px };
}

export function encodePng({ w, h, px }) {
  let opaque = true;
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 255) { opaque = false; break; }
  // Zero the color of fully transparent pixels so they compress to nothing.
  if (!opaque) for (let i = 0; i < px.length; i += 4) if (px[i + 3] === 0) px[i] = px[i + 1] = px[i + 2] = 0;
  const bpp = opaque ? 3 : 4, stride = w * bpp;
  const rows = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, d = y * stride + x * bpp;
      rows[d] = px[s];
      rows[d + 1] = px[s + 1];
      rows[d + 2] = px[s + 2];
      if (bpp === 4) rows[d + 3] = px[s + 3];
    }
  const out = Buffer.alloc(h * (stride + 1));
  const cand = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < h; y++) {
    const line = rows.subarray(y * stride, (y + 1) * stride);
    const prev = y ? rows.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    let best = 0, bestScore = Infinity;
    for (let f = 0; f < 5; f++) {
      const o = cand[f];
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? line[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
        const v = (line[i] - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
        o[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) (bestScore = score), (best = f);
    }
    out[y * (stride + 1)] = best;
    cand[best].copy(out, y * (stride + 1) + 1);
  }
  const z = [zlib.constants.Z_DEFAULT_STRATEGY, zlib.constants.Z_FILTERED]
    .map((strategy) => zlib.deflateSync(out, { level: 9, memLevel: 9, strategy }))
    .sort((a, b) => a.length - b.length)[0];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = opaque ? 2 : 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', z), chunk('IEND', Buffer.alloc(0))]);
}

export function optimizePng(buf) {
  const out = encodePng(decodePng(buf));
  return out.length < buf.length ? out : buf;
}
