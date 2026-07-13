// 카드 도감 — 홈/덱, flip(책장 넘김)·slide(다음 카드), 딥링크(#world=3.1)
const BUILD = 'v25';   // 화면 표시 버전 — sw.js CACHE 번호와 같이 올릴 것
const APP = document.getElementById('app');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let KIND=null, LIST=[], PAGE=0, FLAT=false;   // FLAT=단면 덱(위인전): 1인 1장, 플립 없음
const item = () => FLAT ? PAGE : PAGE>>1;      // 일반: item=PAGE>>1, side=PAGE&1
const side = () => FLAT ? 0 : (PAGE&1);
const pageCount = () => FLAT ? LIST.length : LIST.length*2;

// ── 카드 면(HTML) ──
function infoRow(k,v){ return `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`; }

// 역사카드 워터마크(대표 이미지/상징을 밝은 톤으로 중첩) 배치 스폿
const WM_SPOTS=[{t:'-4%',l:'-6%',s:155,r:-8},{t:'33%',l:'60%',s:175,r:9},{t:'62%',l:'-5%',s:150,r:-6},
  {t:'4%',l:'63%',s:120,r:7},{t:'70%',l:'54%',s:140,r:5},{t:'42%',l:'22%',s:195,r:-3}];
function watermark(c){
  const items = c.imgs ? c.imgs.map(v=>({img:v})) : (c.icons||[]).map(v=>({emoji:v}));
  return items.slice(0,WM_SPOTS.length).map((it,i)=>{ const s=WM_SPOTS[i];
    const pos=`top:${s.t};left:${s.l};transform:rotate(${s.r}deg)`;
    return it.img
      ? `<img class="wmi" src="${it.img}" style="${pos};width:${s.s}px" alt="" onerror="this.remove()">`
      : `<span class="wmi emoji" style="${pos};font-size:${s.s}px">${it.emoji}</span>`;
  }).join('');
}
// 등거리(2:1) 세계지도 위 위치 핀 좌표(%)
function pinStyle(c){ const x=((c.lng+180)/360*100).toFixed(1), y=((90-c.lat)/180*100).toFixed(1); return `left:${x}%;top:${y}%`; }

function faceCountry(c, s){
  if(!s){
    return `<div class="cardface">
      <div class="c-head">
        <img class="c-flag" src="https://flagcdn.com/w320/${c.flag}.png" alt="${esc(c.name)} 국기" onerror="this.style.visibility='hidden'">
        <div class="c-title"><h2>${esc(c.name)}</h2><span class="c-en">${esc(c.en)}</span></div>
      </div>
      <div class="map-duo">
        <div class="mapbox"><img class="c-map" src="assets/maps/${c.map}.svg" alt="${esc(c.name)} 지도" onerror="this.style.display='none'"><span class="mlabel">${esc(c.name)}</span></div>
        <div class="mapbox worldbox"><img class="c-world" src="assets/world.jpg" alt="세계 위치"><span class="pin" style="${pinStyle(c)}"></span><span class="mlabel">${esc(c.region.split(' · ')[0])}</span></div>
      </div>
      <div class="info-grid">
        ${infoRow('위치',c.region)}${infoRow('면적',c.area)}${infoRow('인구',c.pop)}
        ${infoRow('통화',c.currency)}${infoRow('종교',c.religion)}${infoRow('국가원수',c.gov)}
      </div>
      <div class="c-sec"><h3>🌿 자연환경</h3><p>${esc(c.nature)}</p></div>
      <div class="c-sec"><h3>🇰🇷 우리나라와의 관계</h3><p>${esc(c.korea)}</p></div>
      <div class="pageno">앞면 1/2 · 넘기면 역사 →</div>
    </div>`;
  }
  return `<div class="cardface backface">
    <div class="wm">${watermark(c)}</div>
    <div class="hbody">
      <div class="c-head sm">
        <img class="c-flag sm" src="https://flagcdn.com/w320/${c.flag}.png" alt="" onerror="this.style.visibility='hidden'">
        <h2>${esc(c.name)} <small>역사</small></h2>
      </div>
      <ol class="timeline">${c.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ol>
      <div class="pageno">뒷면 2/2 · 넘기면 다음 나라 →</div>
    </div>
  </div>`;
}

function faceKbo(t, s){
  const style=`--tc:${t.c1};--tc2:${t.c2}`;
  if(!s){
    // 마스코트 이름 = 파일명 '_' 뒤 글자 (m_철웅이 → 철웅이)
    const mascotName=(t.mascotImg||'').split('/').pop().replace(/\.[^.]+$/,'').split('_')[1]||'';
    // 유니폼 좌/우 라벨 — 기본 왼쪽 홈·오른쪽 원정, 키움·한화는 반대
    const uniSwap=(t.key==='kiwoom'||t.key==='hanwha');
    const uniL=uniSwap?'원정':'홈', uniR=uniSwap?'홈':'원정';
    return `<div class="cardface" style="${style}">
      <div class="k-head">
        ${t.emblemImg?`<img class="k-emb-img" src="${t.emblemImg}" alt="${esc(t.name)} 엠블렘">`:`<span class="k-emb">${t.emb}</span>`}
        <div class="c-title"><h2>${esc(t.name)}</h2><span class="c-en">${esc(t.city)} 연고</span></div>
        ${t.logoImg?`<img class="k-logo-img" src="${t.logoImg}" alt="${esc(t.name)} 로고">`:''}
      </div>
      <div class="info-grid k-info">
        ${infoRow('연고지',t.city)}${infoRow('홈구장',t.stadium)}${infoRow('수용인원',t.capacity)}
      </div>
      <div class="c-sec"><div class="k-duo">
        <div class="k-col">
          ${t.stadiumImg ? `<img class="k-col-img cover" src="${t.stadiumImg}" alt="${esc(t.stadium)}">` : `<div class="k-ph">🏟️</div>`}
        </div>
        <div class="k-col">
          ${t.mascotImg ? `<img class="k-col-img contain" src="${t.mascotImg}" alt="${esc(mascotName)}">` : `<div class="k-ph">${t.emb}</div>`}
          <div class="k-name">${esc(mascotName)}</div>
        </div>
      </div></div>
      <div class="c-sec kb-uni">
        <img class="kb-uni-img" src="assets/kbo/u_${t.key}.jpg" alt="${esc(t.name)} 유니폼" onerror="this.closest('.kb-uni').remove()">
        <div class="kb-uni-labels"><span>${uniL}</span><span>${uniR}</span></div>
      </div>
      <div class="pageno">앞면 1/2 · 넘기면 역사 →</div>
    </div>`;
  }
  return `<div class="cardface backface" style="${style}">
    <div class="k-head sm">${t.emblemImg?`<img class="k-emb-img sm" src="${t.emblemImg}" alt="">`:`<span class="k-emb sm">${t.emb}</span>`}<h2>${esc(t.name)} <small>역사</small></h2>${t.logoImg?`<img class="k-logo-img sm" src="${t.logoImg}" alt="">`:''}</div>
    <div class="c-sec"><h3>🏆 우승</h3><p>${esc(t.titles)}</p></div>
    <div class="c-sec"><h3>🎖️ 수상·명장면</h3><ul class="bul">${t.awards.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
    <div class="c-sec"><h3>⭐ 대표 레전드</h3><div class="chips">${t.legends.map(l=>`<span>${esc(l)}</span>`).join('')}</div></div>
    <div class="c-sec"><h3>📖 구단의 역사</h3><ol class="timeline emb-tl">${(t.teamHistory||[]).map(e=>`<li>${esc(e)}</li>`).join('')}</ol></div>
    <div class="c-sec"><h3>🏷️ 구단 로고의 역사</h3>
      <img class="kb-eh-img" src="assets/kbo/eh_${t.key}.jpg" alt="${esc(t.name)} 엠블럼 변천사" onerror="this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='block'">
      <ol class="timeline emb-tl" style="display:none">${(t.emblems||[]).map(e=>`<li>${esc(e)}</li>`).join('')}</ol></div>
    <div class="pageno">뒷면 2/2 · 넘기면 다음 구단 →</div>
  </div>`;
}

// 대륙별 지도 crop(viewBox) — worldmap.svg(1000x507, 로빈슨) 기준
const CONTI = {
  eu:{ name:'유럽',       vb:'400 20 185 155' },
  as:{ name:'아시아',     vb:'560 40 335 215' },
  af:{ name:'아프리카',   vb:'430 150 210 270' },
  sa:{ name:'남아메리카', vb:'235 205 200 285' },
  na:{ name:'북·중미',    vb:'70 20 320 240' },
  oc:{ name:'오세아니아', vb:'760 250 200 175' },
};
function faceFoot(t, s){
  if(!s){
    return `<div class="cardface foot">
      <div class="c-head">
        <img class="c-flag" src="https://flagcdn.com/w320/${t.flag}.png" alt="${esc(t.n)} 국기" onerror="this.style.visibility='hidden'">
        <div class="c-title"><h2>${esc(t.n)}</h2><span class="c-en">${esc(t.conf)}</span></div>
        ${t.cf?`<img class="conf-emb" src="assets/conf/${t.cf}.png" alt="${esc(t.conf)} 연맹" onerror="this.style.display='none'">`:''}
        <img class="nat-emb" src="assets/nat/${t.flag}.png" alt="${esc(t.n)} 축구협회" onerror="this.remove()">
      </div>
      <div class="fmap" data-iso="${t.iso}" data-vb="${CONTI[t.cont].vb}"><span class="fmap-label">${CONTI[t.cont].name}</span></div>
      <div class="info-grid">
        ${infoRow('소속 연맹', t.conf)}${infoRow('월드컵 출전', t.apps)}
      </div>
      <div class="c-sec"><h3>🏆 최고 성적</h3><p>${esc(t.best)}</p></div>
      <div class="c-sec"><h3>📊 역대 월드컵 성적</h3>
        <div class="wc-results">${(t.wc||[]).map(r=>`<span class="${/우승|준우승|3위|4위/.test(r)?'hi':''}">${esc(r)}</span>`).join('')||'<span class="wc-none">본선 기록 없음</span>'}</div>
      </div>
      <div class="pageno">앞면 1/2 · 넘기면 레전드 선수 →</div>
    </div>`;
  }
  return `<div class="cardface backface foot">
    <div class="c-head sm"><img class="c-flag sm" src="https://flagcdn.com/w320/${t.flag}.png" alt="" onerror="this.style.visibility='hidden'"><h2>${esc(t.n)} <small>레전드</small></h2></div>
    <div class="c-sec"><h3>⭐ 레전드 선수</h3>
      <div class="legend-list">${t.legends.map(l=>`<button class="legend-item" data-q="${esc(l)}"><span>${esc(l)}</span><i>ⓘ 사진·이력</i></button>`).join('')}</div>
      <p class="legend-hint">선수를 누르면 사진과 이력을 볼 수 있어요 (출처: 위키백과)</p>
    </div>
    <div class="pageno">뒷면 2/2 · 넘기면 다음 나라 →</div>
  </div>`;
}

// 월드컵 역사 카드(덱 첫 장): 1930~2022 전 대회 우승·준우승·한국 성적
function faceWcHistory(s){
  if(!s){
    return `<div class="cardface foot wchist">
      <div class="c-head"><span class="wch-emo">🏆</span><div class="c-title"><h2>월드컵 역사</h2><span class="c-en">1930 → 2022 · 22개 대회</span></div></div>
      <ol class="wc-toc">${WORLD_CUPS.map(w=>`
        <li>
          <div class="toc-l"><span class="no">${String(w.no).padStart(2,'0')}회</span> <span class="ti">${w.yr}년 ${esc(w.host)} 월드컵</span></div>
          <div class="re">🥇 ${esc(w.win)} · 🥈 ${esc(w.run)} · <span class="kor ${/위|16강|8강/.test(w.kor)?'good':''}">🇰🇷 ${esc(w.kor)}</span></div>
        </li>`).join('')}</ol>
      <div class="pageno">앞면 1/2 · 넘기면 기록 요약 →</div>
    </div>`;
  }
  return `<div class="cardface backface foot wchist">
    <div class="c-head sm"><span class="wch-emo">🏆</span><h2>월드컵 <small>기록</small></h2></div>
    <div class="c-sec"><h3>👑 최다 우승국</h3><div class="chips">${['브라질 5회','독일 4회','이탈리아 4회','아르헨티나 3회','우루과이 2회','프랑스 2회','잉글랜드 1회','스페인 1회'].map(x=>`<span>${x}</span>`).join('')}</div></div>
    <div class="c-sec"><h3>🇰🇷 대한민국</h3><p>1954년 첫 출전 · 통산 11회 출전 · 최고 성적 <b>4위(2002)</b> · 원정 첫 16강(2010)</p></div>
    <div class="c-sec"><h3>ℹ️ 참고</h3><p>서독은 통일 전 독일(1954·1974·1990 우승)이에요. 2002년은 대한민국·일본 공동 개최였어요.</p></div>
    <div class="pageno">뒷면 2/2 · 넘기면 아르헨티나 →</div>
  </div>`;
}

// ── KBO 덱 첫 장(순위 카드) — 탭: 순위 / 나의팀 ──
// '순위' 탭: 프로 원년(1982)~작년(2025) 한국시리즈 우승·준우승 (나의 팀은 강조)
const KBO_MY_RE = /한화|롯데|NC|KT/;   // 나의 팀 이름 매칭(한화·롯데·NC·KT)
function kbsRankHTML(){
  const rows = KBO_CHAMPS.map(([yr,win,run])=>{
    const w=KBO_MY_RE.test(win)?' my':'', r=KBO_MY_RE.test(run)?' my':'';
    return `<tr><td class="yr">${yr}</td><td class="win${w}">🥇 ${esc(win)}</td><td class="run${r}">🥈 ${esc(run)}</td></tr>`;
  }).join('');
  return `<table class="kbs-table rank"><thead><tr><th>연도</th><th>우승</th><th>준우승</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="kbs-note">노란색 = 나의 팀(한화·롯데·NC·KT)이 우승/준우승한 해</p>`;
}
// '나의팀' 탭: 한화·NC·KT·롯데의 연도별 정규시즌 순위 (창단 전 '-')
function kbsMyteamHTML(){
  const order=['한화','NC','KT','롯데'], cols=KBO_MYTEAM.cols;
  const idx=order.map(n=>cols.indexOf(n));   // 표시 순서 → row 내 위치(연도 다음)
  const head=order.map(n=>`<th>${esc(n)}</th>`).join('');
  const body=KBO_MYTEAM.rows.map(r=>{
    const tds=idx.map(i=>{ const v=r[1+i]; const c=v==='-'?' na':(v==='1'?' first':''); return `<td class="${c.trim()}">${esc(v)}</td>`; }).join('');
    return `<tr><td class="yr">${r[0]}</td>${tds}</tr>`;
  }).join('');
  return `<table class="kbs-table myteam"><thead><tr><th>연도</th>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="kbs-note">숫자 = 정규시즌 순위 · <b>1</b> = 정규시즌 1위 · '-' = 창단(1군) 전<br>롯데 1982~ · 한화 1986~ · NC 2013~ · KT 2015~</p>`;
}
function faceKboStand(s){
  if(!s){
    return `<div class="cardface kbs">
      <div class="c-head"><span class="k-emb">⚾</span><div class="c-title"><h2>KBO 순위</h2><span class="c-en">프로 원년 1982 → 2025</span></div></div>
      <div class="kbs-tabs" role="tablist">
        <button class="kbs-tab on" type="button" data-tab="rank">순위</button>
        <button class="kbs-tab" type="button" data-tab="myteam">나의팀</button>
      </div>
      <div class="kbs-body" id="kbsBody" data-cur="rank">${kbsRankHTML()}</div>
      <div class="pageno">앞면 1/2 · 넘기면 통산 우승 →</div>
    </div>`;
  }
  return `<div class="cardface backface kbs">
    <div class="c-head sm"><span class="k-emb sm">🏆</span><h2>KBO <small>통산 우승</small></h2></div>
    <div class="c-sec"><h3>👑 통산 한국시리즈 우승 (연고 승계 포함)</h3>
      <ol class="kbs-titles">${KBO_TITLE_COUNT.map(([n,c])=>`<li><span class="tn">${esc(n)}</span><span class="tc">${c}회</span></li>`).join('')}</ol></div>
    <div class="c-sec"><h3>ℹ️ 나의 팀</h3><p>한화 이글스 · NC 다이노스 · KT 위즈 · 롯데 자이언츠 — 앞면 '나의팀' 탭에서 연도별 정규시즌 순위를 볼 수 있어요.</p></div>
    <div class="pageno">뒷면 2/2 · 넘기면 두산 베어스 →</div>
  </div>`;
}

// worldmap.svg 로드 후 .fmap에 대륙(회색)+해당국(초록) 지도 주입
let MAP_SVG = null;
fetch('assets/worldmap.svg').then(r=>r.text()).then(txt=>{
  const doc = new DOMParser().parseFromString(txt, 'image/svg+xml');
  MAP_SVG = doc.querySelector('svg'); hydrateMaps();
}).catch(()=>{});
function hydrateMaps(){
  if(!MAP_SVG) return;
  document.querySelectorAll('.fmap').forEach(box=>{
    if(box.querySelector('svg')) return;
    const svg = MAP_SVG.cloneNode(true);
    const vb = box.dataset.vb; svg.setAttribute('viewBox', vb);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    const p = vb.split(' ').map(Number), vbAR = p[2]/p[3];
    const boxAR = (box.clientWidth||440)/(box.clientHeight||190);
    if(vbAR >= boxAR){ svg.style.width='100%'; svg.style.height='auto'; }   // viewBox 비율에 맞춰 요소 크기 → 밖 영역 렌더 방지
    else { svg.style.height='100%'; svg.style.width='auto'; }
    let el; try { el = svg.getElementById(box.dataset.iso); } catch(_){}
    if(el) el.classList.add('on');
    box.insertBefore(svg, box.firstChild);
  });
}

// ── 한국위인전 카드 ──
function heroPortrait(h, sm){
  return `<span class="h-emb${sm?' sm':''}">`+
    `<img src="assets/heroes/${h.id}.jpg" alt="${esc(h.n)}" `+
      `onerror="if(!this.dataset.p){this.dataset.p=1;this.src='assets/heroes/${h.id}.png'}else{this.style.display='none';this.nextElementSibling.style.display='grid'}">`+
    `<span class="h-face" style="display:none">${h.e}</span></span>`;
}
// 첫 장: 시대별 인물 목차(시간순) — 이름 클릭 시 해당 카드로 이동
function faceHeroesToc(){
  const groups={};
  HEROES.forEach((h,j)=>{ (groups[h.k]=groups[h.k]||[]).push({h,i:j+1}); });  // i = LIST 인덱스(목차가 0번)
  const secs = Object.keys(HERO_ERAS).filter(k=>groups[k]).map(k=>{
    const era=HERO_ERAS[k];
    const names = groups[k].map(({h,i})=>
      `<button class="toc-name" data-i="${i}" style="--tc:${era.c}"><span class="tn-no">${String(h.id).padStart(2,'0')}</span>${esc(h.n)}</button>`
    ).join('');
    return `<div class="toc-sec">
      <div class="toc-era"><span class="toc-dot" style="background:${era.c}"></span>${esc(era.label)}<span class="toc-cnt">${groups[k].length}명</span></div>
      <div class="toc-list">${names}</div>
    </div>`;
  }).join('');
  return `<div class="cardface toc">
    <div class="c-head"><span class="k-emb">👑</span><div class="c-title"><h2>한국위인전</h2><span class="c-en">고조선 → 일제강점기 · 74인</span></div></div>
    <p class="toc-hint">이름을 누르면 그 인물 카드로 바로 이동해요. (옆으로 넘겨도 돼요)</p>
    ${secs}
    <div class="pageno">넘기면 첫 인물 →</div>
  </div>`;
}
// 인물 카드: 1인 1장(초상·업적·평가·한눈에 모두 앞면)
function faceHeroes(h){
  if(h && h.toc) return faceHeroesToc();
  const era = HERO_ERAS[h.k] || {label:'', c:'#556'};
  const no = 'No.'+String(h.id).padStart(2,'0');
  return `<div class="cardface" style="--tc:${era.c}">
    <div class="h-head">
      ${heroPortrait(h,false)}
      <div class="c-title"><h2>${esc(h.n)}</h2><span class="c-en">${esc(era.label)} · ${esc(h.nat)}</span></div>
      <span class="h-no">${no}</span>
    </div>
    <div class="c-sec"><h3>📜 주요 업적 · 대표작</h3><p>${esc(h.a)}</p></div>
    <div class="c-sec"><h3>⭐ 후대의 평가</h3><p>${esc(h.v)}</p></div>
    <div class="c-sec"><h3>🕘 한눈에</h3><div class="chips"><span>${esc(era.label)}</span><span>${esc(h.nat)}</span><span>생몰 ${esc(h.b)} ~ ${esc(h.d)}</span></div></div>
    <div class="pageno">${no} · 옆으로 넘기면 다음 인물 →</div>
  </div>`;
}

const faces = (data,s) => KIND==='world' ? faceCountry(data,s)
  : KIND==='kbo' ? (data && data.stand ? faceKboStand(s) : faceKbo(data,s))
  : KIND==='heroes' ? faceHeroes(data,s)
  : (data && data.hist) ? faceWcHistory(s) : faceFoot(data,s);

// ── 덱 렌더 ──
function buildCard(){
  const data=LIST[item()];
  const slide=document.getElementById('slide');
  slide.innerHTML=`<div class="card3d${side()?' flipped':''}">
    <div class="face front">${faces(data,0)}</div>
    <div class="face back">${faces(data,1)}</div>
  </div>`;
  hydrateMaps();
}
const curCard = () => { const s=document.getElementById('slide'); return s?s.firstElementChild:null; };

function flip(toBack){ const c=curCard(); if(c) c.classList.toggle('flipped', toBack); }
function slideTo(dir){
  const s=document.getElementById('slide');
  s.style.transition='transform .26s ease, opacity .26s';
  s.style.transform=`translateX(${-dir*38}%)`; s.style.opacity='0';
  setTimeout(()=>{
    buildCard();
    s.style.transition='none'; s.style.transform=`translateX(${dir*38}%)`; s.style.opacity='0';
    void s.offsetWidth;                                  // reflow
    s.style.transition='transform .26s ease, opacity .26s';
    s.style.transform='translateX(0)'; s.style.opacity='1';
  },260);
}

function go(dir){
  const np=PAGE+dir;
  if(np<0||np>=pageCount()) return;
  if(FLAT){ PAGE=np; slideTo(dir); }         // 단면: 항상 다음 카드로 슬라이드
  else { const same=(np>>1)===item(); PAGE=np; if(same) flip(side()===1); else slideTo(dir); }
  updateMeta(); hideHint();
}

function updateMeta(){
  const cnt=document.getElementById('count'); if(cnt) cnt.textContent=`${item()+1} / ${LIST.length}`;
  const p=document.getElementById('prev'), n=document.getElementById('next');
  if(p) p.disabled = PAGE<=0;
  if(n) n.disabled = PAGE>=pageCount()-1;
  const dots=document.getElementById('dots');
  if(dots) [...dots.children].forEach((d,i)=>d.classList.toggle('on', i===item()));
  history.replaceState(null,'',`#${KIND}=${item()}.${side()}`);
}
function hideHint(){ const h=document.getElementById('hint'); if(h) h.classList.add('gone'); }

function renderDeck(){
  APP.innerHTML=`
    <div class="bar">
      <button class="bar-btn" id="home">‹ 홈</button>
      <div class="bar-title">${KIND==='world'?'🌍 세계 국가':KIND==='kbo'?'⚾ KBO 구단':KIND==='heroes'?'👑 한국위인전':'<img class="bar-emb" src="assets/wc.png" alt=""> 월드컵'}</div>
      <div class="bar-count" id="count"></div>
    </div>
    <div class="deck" id="deck"><div class="slide" id="slide"></div></div>
    <div class="nav">
      <button class="nav-btn" id="prev">‹</button>
      <div class="dots" id="dots">${LIST.map((_,i)=>`<i${i===item()?' class="on"':''}></i>`).join('')}</div>
      <button class="nav-btn" id="next">›</button>
    </div>
    <div class="hint" id="hint">${FLAT?'👉 옆으로 넘기면 <b>다음 인물</b> · 첫 장에서 <b>이름</b>을 누르면 바로 이동':`👉 옆으로 넘기면 <b>뒷면</b>, 한 번 더 넘기면 <b>다음 ${KIND==='kbo'?'구단':'나라'}</b>`}</div>`;
  document.getElementById('home').onclick=()=>{ history.replaceState(null,'','#'); renderHome(); };
  document.getElementById('prev').onclick=()=>go(-1);
  document.getElementById('next').onclick=()=>go(1);
  const deck=document.getElementById('deck');
  deck.querySelectorAll('.dots i').forEach((d,i)=>d.onclick=()=>{ PAGE=FLAT?i:i*2; buildCard(); updateMeta(); hideHint(); });
  // 스와이프
  let sx=0, sy=0, tracking=false;
  deck.addEventListener('pointerdown', e=>{ sx=e.clientX; sy=e.clientY; tracking=true; });
  deck.addEventListener('pointerup', e=>{ if(!tracking) return; tracking=false;
    const dx=e.clientX-sx, dy=e.clientY-sy;
    if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)) go(dx<0?1:-1);
  });
  buildCard(); updateMeta();
}

function renderHome(){
  KIND=null;
  APP.innerHTML=`
    <div class="home">
      <h1>📚 카드 도감 <sup class="ver">${BUILD}</sup></h1>
      <p class="home-sub">카드를 옆으로 넘기면 뒷면(역사)이 나오고,<br>한 번 더 넘기면 다음 카드로 넘어가요.</p>
      <div class="home-grid">
        <button class="home-card" data-k="world"><span class="hc-emo">🌍</span><b>세계 국가</b><small>20개국 · 기본정보 · 자연 · 역사</small></button>
        <button class="home-card" data-k="kbo"><span class="hc-emo">⚾</span><b>KBO 구단</b><small>10개 구단 · 정보 · 레전드 · 역사</small></button>
        <button class="home-card" data-k="foot"><img class="hc-emo hc-emo-img" src="assets/wc.png" alt="월드컵 트로피"><b>월드컵</b><small>48개국 · 월드컵 기록 · 레전드 · 위치</small></button>
        <button class="home-card" data-k="heroes"><span class="hc-emo">👑</span><b>한국위인전</b><small>인물 · 시대 · 주요 업적</small></button>
        <button class="home-card" data-k="korhist"><span class="hc-emo">🇰🇷</span><b>한국역사</b><small>단군부터 대한민국까지</small></button>
        <button class="home-card" data-k="geo"><img class="hc-emo hc-emo-img" src="assets/maps/kr.svg" alt="한반도"><b>한국지리</b><small>전국 도·시·군·구</small></button>
      </div>
    </div>`;
  APP.querySelectorAll('.home-card').forEach(b=> b.onclick=()=>openDeck(b.dataset.k));
}

const DECKS = { world:1, kbo:1, foot:1, heroes:1 };
const SOON_TITLE = { korhist:'🇰🇷 한국역사', geo:'🗺️ 한국지리' };
function comingSoon(kind){
  KIND=null;
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="home">‹ 홈</button><div class="bar-title">${SOON_TITLE[kind]||''}</div></div>
    <div class="soon"><div class="soon-emo">🚧</div><h2>준비 중입니다</h2><p>곧 채워질 예정이에요.</p></div>`;
  document.getElementById('home').onclick=()=>{ history.replaceState(null,'','#'); renderHome(); };
  history.replaceState(null,'','#'+kind);
}

function openDeck(kind, it=0, sd=0){
  if(!DECKS[kind]){ comingSoon(kind); return; }
  KIND=kind; FLAT = (kind==='heroes');
  LIST = kind==='world'?COUNTRIES : kind==='kbo'?[{stand:true,n:'KBO 순위'}].concat(KBO) : kind==='heroes'?[{toc:true}].concat(HEROES) : [{hist:true,n:'월드컵 역사'}].concat(FOOT);
  it = Math.min(Math.max(it,0), LIST.length-1);
  PAGE = FLAT ? it : it*2 + (sd?1:0);
  renderDeck();
}

function route(){
  const h=location.hash.slice(1);
  const m=h.match(/^(world|kbo|foot|heroes|korhist|geo)(?:=(\d+)\.(\d+))?$/);
  if(m) openDeck(m[1], m[2]?+m[2]:0, m[3]?+m[3]:0);
  else renderHome();
}
// 레전드 선수 클릭 → 위키백과 사진·이력 모달
function openLegend(q){
  let ov=document.getElementById('lmodal');
  if(!ov){
    ov=document.createElement('div'); ov.id='lmodal'; ov.className='lmodal';
    ov.innerHTML='<div class="lbox"><button class="lclose" aria-label="닫기">✕</button><div class="lbody"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click',e=>{ if(e.target===ov) ov.style.display='none'; });
    ov.querySelector('.lclose').onclick=()=>{ ov.style.display='none'; };
  }
  const body=ov.querySelector('.lbody'); ov.style.display='flex';
  const render=(title,img,bio)=>{
    body.innerHTML='<h3>'+esc(title)+'</h3>'+
      (img?'<img class="lphoto" src="'+esc(img)+'" alt="">':'')+
      (bio?'<p class="ltext">'+esc(bio)+'</p>':'<p class="lmuted">이력 정보가 없어요.</p>')+
      '<a class="llink" href="https://ko.wikipedia.org/wiki/'+encodeURIComponent(title)+'" target="_blank" rel="noopener">위키백과에서 더 보기 →</a>'+
      '<p class="lcredit">사진·글 출처: 위키백과 (CC BY-SA)</p>';
  };
  const L = (typeof LEGENDS!=='undefined' && LEGENDS[q]) ? LEGENDS[q] : null;
  if(L && (L.bio || L.img)){ render(L.t||q, L.img||'', L.bio||''); return; }  // 오프라인(로컬) 우선
  body.innerHTML='<p class="lmuted">불러오는 중…</p>';                          // 로컬에 없으면 온라인 폴백
  const url='https://ko.wikipedia.org/w/api.php?action=query&prop=extracts%7Cpageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=360&redirects=1&format=json&origin=*&titles='+encodeURIComponent(q);
  fetch(url).then(r=>r.json()).then(d=>{
    const pages=(d.query&&d.query.pages)||{}, p=Object.values(pages)[0]||{};
    const title=p.title||q, img=(p.thumbnail&&p.thumbnail.source)||''; let ex=(p.extract||'').replace(/\s+/g,' ').trim();
    if(!ex&&!img){ body.innerHTML='<h3>'+esc(q)+'</h3><p class="lmuted">위키백과에서 정보를 찾지 못했어요.</p>'; return; }
    if(ex.length>700) ex=ex.slice(0,700)+'…';
    render(title,img,ex);
  }).catch(()=>{ body.innerHTML='<h3>'+esc(q)+'</h3><p class="lmuted">불러오기 실패 — 인터넷 연결을 확인하세요.</p>'; });
}
document.addEventListener('click', e=>{ const b=e.target.closest&&e.target.closest('.legend-item'); if(b){ e.preventDefault(); openLegend(b.dataset.q); } });
// 위인전 목차 이름 클릭 → 해당 인물 카드로 이동
document.addEventListener('click', e=>{
  const b=e.target.closest&&e.target.closest('.toc-name'); if(!b||KIND!=='heroes') return;
  PAGE = FLAT ? +b.dataset.i : (+b.dataset.i)*2;
  buildCard(); updateMeta(); hideHint();
});
// KBO 첫 장 순위/나의팀 탭 전환
document.addEventListener('click', e=>{
  const tb=e.target.closest&&e.target.closest('.kbs-tab'); if(!tb) return;
  const body=document.getElementById('kbsBody'); if(!body || body.dataset.cur===tb.dataset.tab) return;
  tb.parentElement.querySelectorAll('.kbs-tab').forEach(x=>x.classList.toggle('on', x===tb));
  body.dataset.cur=tb.dataset.tab;
  body.innerHTML = tb.dataset.tab==='rank' ? kbsRankHTML() : kbsMyteamHTML();
});

window.addEventListener('hashchange', route);
route();

// 서비스워커
if('serviceWorker' in navigator){
  const hadController = !!navigator.serviceWorker.controller;   // 첫 방문(최초 제어권 획득)엔 새로고침 안 함
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', ()=>{
    if(!hadController || refreshing) return;
    refreshing = true; location.reload();                       // 새 버전 활성화 시 자동 새로고침
  });
  navigator.serviceWorker.register('sw.js').then(reg=>{
    reg.update();
    setInterval(()=>reg.update(), 60*1000);                      // 주기적으로 새 버전 확인
  }).catch(()=>{});
}
