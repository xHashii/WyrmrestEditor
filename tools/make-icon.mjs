/**
 * Renders `resources/icons/icon.svg` into `icon.png` (1024²) without any
 * dependency on a system SVG rasteriser, so the app icon can be regenerated on
 * a bare machine (and in CI) with `npm run icon`.
 *
 * The renderer only needs the subset of SVG the icon actually uses — a rounded
 * rect, stroked cubic-bezier paths with round caps, and a circle — so it draws
 * by signed distance: exact edges, antialiased for free at any size.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG = path.join(ROOT, 'resources', 'icons', 'icon.svg');
const OUT = path.join(ROOT, 'resources', 'icons', 'icon.png');
const SIZE = Number(process.env.ICON_SIZE ?? 1024);
const SAMPLES = 3;

// --------------------------------------------------------------------------- svg
const readElements = (svg) => {
  const out = [];
  for (const tag of svg.match(/<(rect|path|circle)\b[^>]*\/>/g) ?? []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value]));
    out.push({ type: /<rect/.test(tag) ? 'rect' : /<circle/.test(tag) ? 'circle' : 'path', attrs });
  }
  return out;
};

/** Flatten `M x y C … L …` into polylines (bezier segments sampled, not solved). */
function pathPolylines(d, units = 1) {
  const commands = [...d.matchAll(/([MLCZ])([^MLCZ]*)/gi)].map(([, name, body]) => ({
    name: name.toUpperCase(),
    args: (body.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map((value) => Number(value) * units),
  }));
  const lines = [];
  let cursor = { x: 0, y: 0 };
  let start = cursor;
  for (const { name, args } of commands) {
    if (name === 'M') {
      cursor = { x: args[0], y: args[1] };
      start = cursor;
    } else if (name === 'L') {
      for (let i = 0; i + 1 < args.length; i += 2) {
        lines.push([[cursor.x, cursor.y], [args[i], args[i + 1]]]);
        cursor = { x: args[i], y: args[i + 1] };
      }
    } else if (name === 'C') {
      for (let i = 0; i + 5 < args.length; i += 6) {
        const p0 = cursor;
        const p1 = { x: args[i], y: args[i + 1] };
        const p2 = { x: args[i + 2], y: args[i + 3] };
        const p3 = { x: args[i + 4], y: args[i + 5] };
        const steps = 64;
        let previous = [p0.x, p0.y];
        const line = [];
        for (let step = 1; step <= steps; step++) {
          const t = step / steps;
          const mt = 1 - t;
          const point = [
            mt ** 3 * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t ** 3 * p3.x,
            mt ** 3 * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t ** 3 * p3.y,
          ];
          line.push([previous, point]);
          previous = point;
        }
        lines.push(...line);
        cursor = p3;
      }
    } else if (name === 'Z') {
      if (cursor.x !== start.x || cursor.y !== start.y) lines.push([[cursor.x, cursor.y], [start.x, start.y]]);
      cursor = start;
    }
  }
  return lines;
}

// --------------------------------------------------------------------------- sdf
const distToSegment = (px, py, [ax, ay], [bx, by]) => {
  const vx = bx - ax;
  const vy = by - ay;
  const length = vx * vx + vy * vy;
  const t = length ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / length)) : 0;
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};

const strokeDistance = (px, py, lines) => {
  let best = Infinity;
  for (const line of lines) best = Math.min(best, distToSegment(px, py, line[0], line[1]));
  return best;
};

/** Rounded box SDF: negative inside, zero on the edge. */
const roundedBoxDistance = (px, py, x, y, width, height, radius) => {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  const qx = Math.abs(px - (x + hw)) - (hw - r);
  const qy = Math.abs(py - (y + hh)) - (hh - r);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return Math.min(Math.max(qx, qy), 0) + outside - r;
};

// --------------------------------------------------------------------------- paint
const parseColor = (value) => {
  const hex = value.replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

const gradient = (stops, t) => {
  const at = Math.max(0, Math.min(1, t));
  for (let index = 1; index < stops.length; index++) {
    const [offset, color] = stops[index];
    if (at <= offset) {
      const [previousOffset, previousColor] = stops[index - 1];
      const local = (at - previousOffset) / Math.max(1e-6, offset - previousOffset);
      return previousColor.map((channel, i) => Math.round(channel + (color[i] - channel) * local));
    }
  }
  return stops[stops.length - 1][1];
};

const scale = SIZE / 512;
const coverage = (distance, edge) => Math.max(0, Math.min(1, 0.5 - distance / Math.max(1e-6, edge)));

const svg = fs.readFileSync(SVG, 'utf8');
const OUT_DEBUG = process.env.ICON_DEBUG === '1';
const gradientStops = new Map(
  [...svg.matchAll(/<linearGradient id="([^"]+)"[\s\S]*?<\/linearGradient>/g)].map(([, id]) => {
    const block = svg.slice(svg.indexOf(`id="${id}"`), svg.indexOf('</linearGradient>', svg.indexOf(`id="${id}"`)));
    const stops = [...block.matchAll(/<stop offset="([\d.]+)" stop-color="([^"]+)"/g)].map(([, offset, color]) => [
      Number(offset),
      parseColor(color),
    ]);
    return [id, stops];
  }),
);

const elements = readElements(svg).map((element) => {
  const { attrs } = element;
  const fill = attrs.fill && attrs.fill !== 'none' ? attrs.fill : null;
  const stroke = attrs.stroke && attrs.stroke !== 'none' ? attrs.stroke : null;
  return {
    type: element.type,
    fill,
    stroke,
    strokeWidth: Number(attrs['stroke-width'] ?? 1) * scale,
    lines: element.type === 'path' ? pathPolylines(attrs.d ?? '', scale) : [],
    rect: element.type === 'rect'
      ? { x: Number(attrs.x) * scale, y: Number(attrs.y) * scale, w: Number(attrs.width) * scale, h: Number(attrs.height) * scale, r: Number(attrs.rx ?? 0) * scale }
      : null,
    circle: element.type === 'circle' ? { x: Number(attrs.cx) * scale, y: Number(attrs.cy) * scale, r: Number(attrs.r) * scale } : null,
    pathBox: element.type === 'path' ? pathBounds(attrs.d ?? '', scale) : null,
    opacity: Number(attrs.opacity ?? 1),
  };
});

/** Bounding box of the path, used to place gradient stops. */
function pathBounds(d, units = 1) {
  const points = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < points.length; i += 2) {
    minX = Math.min(minX, points[i]);
    maxX = Math.max(maxX, points[i]);
    minY = Math.min(minY, points[i + 1]);
    maxY = Math.max(maxY, points[i + 1]);
  }
  return { x: minX * units, y: minY * units, w: (maxX - minX) * units, h: (maxY - minY) * units };
}

const rgba = Buffer.alloc(SIZE * SIZE * 4);
const edge = Math.SQRT2 / SAMPLES;

/** Paint every element, in document order, onto a transparent pixel. */
function sample(x, y) {
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;
  for (const element of elements) {
    let alpha = 0;
    let color = [0, 0, 0];
    if (element.rect) {
      const distance = roundedBoxDistance(x, y, element.rect.x, element.rect.y, element.rect.w, element.rect.h, element.rect.r);
      if (element.fill) {
        alpha = coverage(distance, edge);
        color = paint(element.fill, element.rect, y);
      }
      if (element.stroke) {
        const ring = coverage(Math.abs(distance) - element.strokeWidth / 2, edge);
        if (ring > alpha) {
          alpha = ring;
          color = paint(element.stroke, element.rect, y);
        }
      }
    } else if (element.circle) {
      const distance = Math.hypot(x - element.circle.x, y - element.circle.y) - element.circle.r;
      alpha = coverage(distance, edge);
      color = paint(element.fill ?? element.stroke ?? '#ffffff', element.circle, y);
    } else if (element.stroke) {
      alpha = coverage(strokeDistance(x, y, element.lines) - element.strokeWidth / 2, edge);
      color = paint(element.stroke, element.pathBox ?? { y: 0, h: SIZE }, y);
    }
    if (alpha <= 0) continue;
    alpha *= element.opacity;
    const outA = alpha + a * (1 - alpha);
    if (outA > 0) {
      r = (color[0] * alpha + r * a * (1 - alpha)) / outA;
      g = (color[1] * alpha + g * a * (1 - alpha)) / outA;
      b = (color[2] * alpha + b * a * (1 - alpha)) / outA;
    }
    a = outA;
  }
  return [r, g, b, a];
}

for (let py = 0; py < SIZE; py++) {
  for (let px = 0; px < SIZE; px++) {
    let r = 0;
    let g = 0;
    let b = 0;
    let a = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const [sr, sg, sb, sa] = sample(px + (sx + 0.5) / SAMPLES, py + (sy + 0.5) / SAMPLES);
        r += sr;
        g += sg;
        b += sb;
        a += sa;
      }
    }
    const offset = (py * SIZE + px) * 4;
    const count = SAMPLES * SAMPLES;
    rgba[offset] = Math.min(255, Math.round(r / count));
    rgba[offset + 1] = Math.min(255, Math.round(g / count));
    rgba[offset + 2] = Math.min(255, Math.round(b / count));
    rgba[offset + 3] = Math.min(255, Math.round((a / count) * 255));
  }
}

/** Colour for a shape at a given y, honouring the SVG's vertical gradients. */
function paint(reference, box, y) {
  const id = /^url\(#(.+)\)$/.exec(reference)?.[1];
  if (!id) return parseColor(reference);
  const stops = gradientStops.get(id);
  if (!stops) return parseColor('#ffffff');
  const top = box?.y ?? 0;
  const height = box?.h ?? SIZE;
  return gradient(stops, (y - top) / Math.max(1, height));
}

// --------------------------------------------------------------------------- png
const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // truecolour + alpha
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let row = 0; row < SIZE; row++) {
  raw[row * (SIZE * 4 + 1)] = 0; // filter: none
  rgba.copy(raw, row * (SIZE * 4 + 1) + 1, row * SIZE * 4, (row + 1) * SIZE * 4);
}
let painted = 0;
for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) painted++;
console.log(`elements: ${elements.length}, painted ${painted} / ${SIZE * SIZE} px`);
if (OUT_DEBUG) {
  fs.writeFileSync('/tmp/icon-rgba.bin', rgba);
  const probe = (x, y) => [...rgba.slice((y * SIZE + x) * 4, (y * SIZE + x) * 4 + 4)].join(',');
  console.log(`probe centre: ${probe(SIZE >> 1, SIZE >> 1)} corner: ${probe(2, 2)} fire: ${probe(Math.round(SIZE * 0.6), Math.round(SIZE * 0.3))}`);
}
fs.writeFileSync(OUT, Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]));
console.log(`wrote ${path.relative(ROOT, OUT)} (${SIZE}x${SIZE})`);
