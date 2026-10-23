#!/usr/bin/env node
// 세계의 술 데이터 점검 — 사람이 아니라 기계가 볼 수 있는 것만 본다.
//   node tools/check-liquor.mjs
// ERROR 가 있으면 종료 코드 1. (사실 여부는 출처를 보고 사람이 확인한다)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = {}; vm.createContext(ctx);
for (const f of ['assets/liquor-tax.js', 'assets/liquor.js']) vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx);
const T = vm.runInContext(`({ LQ_COUNTRY, LQ_REGIONS, LQ_METHODS, LQ_MATERIAL, LQ_STYLE_NAMES, LQ_STYLES, LQ_TECH_NAME, LQ_AGING, LQ_FLAVORS, LQ_USES, LQ_KINDS, LIQUORS })`, ctx);

const errors = [], warns = [];
const E = (id, m) => errors.push(`${id}: ${m}`), W = (id, m) => warns.push(`${id}: ${m}`);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const continents = new Set(T.LQ_REGIONS.map(r => r.id));

// 사전 자체 — 주종 묶음에 든 id 가 모두 이름을 가졌는지
for (const g of T.LQ_STYLES) for (const s of g.items) if (!T.LQ_STYLE_NAMES[s]) E(`사전 ${g.id}`, `주종 ${s} 이름 없음`);

const ids = new Set();
for (const d of T.LIQUORS) {
  const id = d.id || '(id 없음)';
  if (!/^[a-z][a-z0-9_]*$/.test(d.id || '')) E(id, 'id 형식(영문 소문자·숫자·_)');
  if (ids.has(d.id)) E(id, '같은 id 가 두 번 나옴'); ids.add(d.id);
  if (!T.LQ_KINDS[d.kind]) E(id, `kind 값 오류: ${d.kind}`);
  if (!d.name || !d.summary) E(id, '이름·한 문장 설명 필요');
  const chk = (arr, dict, label) => (arr || []).forEach(v => { if (!dict[v]) E(id, `${label}에 없는 값: ${v}`); });
  (d.origin && d.origin.countries || []).forEach(c => { if (!T.LQ_COUNTRY[c] && !continents.has(c)) E(id, `지역 사전에 없는 국가: ${c}`); });
  chk(d.methods, T.LQ_METHODS, '제조 방식'); chk(d.materials, T.LQ_MATERIAL, '원료'); chk(d.styles, T.LQ_STYLE_NAMES, '주종');
  chk(d.tech, T.LQ_TECH_NAME, '기술'); chk(d.aging && d.aging.methods, T.LQ_AGING, '숙성'); chk(d.flavors, T.LQ_FLAVORS, '향미'); chk(d.uses, T.LQ_USES, '음용 목적');
  if (!(d.methods || []).length) E(id, '제조 방식이 하나 이상 필요');
  if (!(d.styles || []).length) E(id, '주종이 하나 이상 필요');
  if ((d.flavors || []).length && !['general', 'style', 'product'].includes(d.flavorBasis)) E(id, '향미가 있으면 flavorBasis(general/style/product) 필요');
  if (d.abv) {
    const { min, max, unit, basis } = d.abv;
    if (unit !== '%') E(id, 'abv.unit 은 %');
    if (!['law', 'style', 'product', 'typical', 'measured'].includes(basis)) E(id, 'abv.basis 는 law/style/product/typical/measured');
    if (min == null && max == null) E(id, 'abv 에 min/max 중 하나는 필요(모르면 abv:null)');
    [min, max].forEach(v => { if (v != null && (typeof v !== 'number' || v < 0 || v > 100)) E(id, `abv 값 오류: ${v}`); });
    if (min != null && max != null && min > max) E(id, 'abv min > max');
  }
  if (d.kind === 'cocktail') {
    if (!d.recipe || !(d.recipe.items || []).length) E(id, '칵테일은 recipe.items 필요');
    if (!d.recipe || !d.recipe.method) E(id, '칵테일은 recipe.method 필요');
    (d.recipe && d.recipe.base || []).forEach(b => { if (!T.LQ_STYLE_NAMES[b]) E(id, `베이스 주종 사전에 없음: ${b}`); });
  } else if (d.recipe) W(id, '칵테일이 아닌데 recipe 가 있음');
  const src = d.sources || [];
  if (!src.length) E(id, '출처 없음');
  src.forEach((s, i) => {
    if (!s || !s.title) E(id, `출처 ${i + 1}: 이름 없음`);
    if (!s || !/^https?:\/\//.test(s.url || '')) E(id, `출처 ${i + 1}: 주소 없음`);
    if (!s || !DATE.test(s.checked || '')) E(id, `출처 ${i + 1}: 확인 날짜 없음`);
  });
  if (!d.abv && d.kind !== 'cocktail') W(id, '도수 미확인(화면에 정보 확인 필요)');   // 칵테일은 '재료·분량에 따라 다름'
}

const byKind = {}; T.LIQUORS.forEach(d => { byKind[d.kind] = (byKind[d.kind] || 0) + 1; });
console.log(`점검: ${T.LIQUORS.length}종 (${Object.entries(byKind).map(([k, n]) => `${T.LQ_KINDS[k]} ${n}`).join(' · ')}) · 오류 ${errors.length} · 경고 ${warns.length}`);
errors.forEach(m => console.log('  ERROR ' + m));
if (process.argv.includes('-v')) warns.forEach(m => console.log('  WARN  ' + m));
else if (warns.length) console.log(`  (경고 ${warns.length}건은 -v 로 보기 — 대부분 도수 미확인)`);
process.exit(errors.length ? 1 : 0);
