#!/usr/bin/env node
// 한국지리 지도 자동생성: 시도 GeoJSON → 지역별 SVG 2종
//   {code}_only.svg  : 해당 시도만 (fill #9aa3b8)
//   {code}_kr.svg     : 한국 전체에서 해당 시도만 강조 (#ffcf5a)
// 원본: tools/_provinces.json (southkorea-maps kostat/2018, gitignore)
//   node tools/build-geo-maps.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'tools', '_provinces.json');
const OUT = path.join(ROOT, 'assets', 'maps', 'geo');
fs.mkdirSync(OUT, { recursive: true });

const geo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const feats = geo.features;

const K = Math.cos(36 * Math.PI / 180);           // 경도 축소(등거리 왜곡 완화)
const px = ([lon, lat]) => [lon * K, lat];
const ringsOf = g => g.type === 'Polygon' ? g.coordinates
  : g.type === 'MultiPolygon' ? g.coordinates.flat() : [];

function bbox(list) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const f of list) for (const ring of ringsOf(f.geometry)) for (const p of ring) {
    const [x, y] = px(p); if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y;
  }
  return { minx: a, miny: b, maxx: c, maxy: d };
}
function mkProj(bb, maxDim, pad) {
  const sx = bb.maxx - bb.minx, sy = bb.maxy - bb.miny;
  const s = maxDim / Math.max(sx, sy);
  return { proj: ([x, y]) => [pad + (x - bb.minx) * s, pad + (bb.maxy - y) * s], W: sx * s + 2 * pad, H: sy * s + 2 * pad };
}
// 투영 + 점 솎아내기(EPS px 이하 간격 제거)로 경량화
function pathFor(f, proj, eps) {
  let d = '';
  for (const ring of ringsOf(f.geometry)) {
    const pts = ring.map(c => proj(px(c)));
    let last = null, kept = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0 || i === pts.length - 1 || !last || Math.hypot(p[0] - last[0], p[1] - last[1]) > eps) { kept.push(p); last = p; }
    }
    if (kept.length < 3) continue;
    kept.forEach((p, i) => { d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); });
    d += 'Z';
  }
  return d;
}
const svg = (W, H, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>\n`;

const ALL = bbox(feats);
let n = 0;
for (const f of feats) {
  const code = f.properties.code;
  // 단독
  {
    const { proj, W, H } = mkProj(bbox([f]), 480, 10);
    const d = pathFor(f, proj, 0.6);
    fs.writeFileSync(path.join(OUT, `${code}_only.svg`), svg(W, H, `<path d="${d}" fill="#9aa3b8" fill-rule="evenodd"/>`));
  }
  // 한국 속 강조
  {
    const { proj, W, H } = mkProj(ALL, 540, 12);
    const others = feats.filter(x => x !== f)
      .map(x => `<path d="${pathFor(x, proj, 0.7)}" fill="#2b3450" stroke="#4a5675" stroke-width="0.8" fill-rule="evenodd"/>`).join('');
    const tgt = `<path d="${pathFor(f, proj, 0.7)}" fill="#ffcf5a" stroke="#b8860b" stroke-width="1" fill-rule="evenodd"/>`;
    fs.writeFileSync(path.join(OUT, `${code}_kr.svg`), svg(W, H, others + tgt));
  }
  n++;
}
console.log(`생성 완료: ${n}개 시도 × 2 = ${n * 2}개 SVG → assets/maps/geo/`);
