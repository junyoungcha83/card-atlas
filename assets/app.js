// 카드 도감 — 홈/덱, flip(책장 넘김)·slide(다음 카드), 딥링크(#world=3.1)
const BUILD = 'v14';   // 화면 표시 버전 — sw.js CACHE 번호와 같이 올릴 것
const APP = document.getElementById('app');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let KIND=null, LIST=[], PAGE=0;   // PAGE: 0..(len*2-1) — item=PAGE>>1, side=PAGE&1
const item = () => PAGE>>1;
const side = () => PAGE&1;

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
    return `<div class="cardface" style="${style}">
      <div class="k-head">
        ${t.emblemImg?`<img class="k-emb-img" src="${t.emblemImg}" alt="${esc(t.name)} 엠블렘">`:`<span class="k-emb">${t.emb}</span>`}
        <div class="c-title"><h2>${esc(t.name)}</h2><span class="c-en">${esc(t.city)} 연고</span></div>
        ${t.logoImg?`<img class="k-logo-img" src="${t.logoImg}" alt="${esc(t.name)} 로고">`:''}
      </div>
      <div class="info-grid">
        ${infoRow('연고지',t.city)}${infoRow('홈구장',t.stadium)}
        ${infoRow('수용인원',t.capacity)}${infoRow('마스코트',t.mascot)}
      </div>
      <div class="c-sec"><div class="k-duo">
        <div class="k-col">
          <div class="k-col-label">🏟️ 홈구장</div>
          ${t.stadiumImg ? `<img class="k-col-img cover" src="${t.stadiumImg}" alt="${esc(t.stadium)}">` : `<div class="k-ph">🏟️</div>`}
          <div class="k-cap">${esc(t.stadium)}<br><small>${esc(t.capacity)}</small></div>
        </div>
        <div class="k-col">
          <div class="k-col-label">🎽 마스코트</div>
          ${t.mascotImg ? `<img class="k-col-img contain" src="${t.mascotImg}" alt="${esc(t.mascot)}">` : `<div class="k-ph">${t.emb}</div>`}
          <div class="k-name">${esc(t.mascot)}</div>
        </div>
      </div></div>
      <div class="pageno">앞면 1/2 · 넘기면 역사 →</div>
    </div>`;
  }
  return `<div class="cardface backface" style="${style}">
    <div class="k-head sm">${t.emblemImg?`<img class="k-emb-img sm" src="${t.emblemImg}" alt="">`:`<span class="k-emb sm">${t.emb}</span>`}<h2>${esc(t.name)} <small>역사</small></h2>${t.logoImg?`<img class="k-logo-img sm" src="${t.logoImg}" alt="">`:''}</div>
    <div class="c-sec"><h3>🏆 우승</h3><p>${esc(t.titles)}</p></div>
    <div class="c-sec"><h3>🎖️ 수상·명장면</h3><ul class="bul">${t.awards.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
    <div class="c-sec"><h3>⭐ 대표 레전드</h3><div class="chips">${t.legends.map(l=>`<span>${esc(l)}</span>`).join('')}</div></div>
    <div class="c-sec"><h3>📖 구단의 역사</h3><ol class="timeline emb-tl">${(t.teamHistory||[]).map(e=>`<li>${esc(e)}</li>`).join('')}</ol></div>
    <div class="c-sec"><h3>🏷️ 구단 로고의 역사</h3><ol class="timeline emb-tl">${(t.emblems||[]).map(e=>`<li>${esc(e)}</li>`).join('')}</ol></div>
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

const faces = (data,s) => KIND==='world' ? faceCountry(data,s) : KIND==='kbo' ? faceKbo(data,s) : faceFoot(data,s);

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
  const total=LIST.length*2, np=PAGE+dir;
  if(np<0||np>=total) return;
  const same=(np>>1)===item();
  PAGE=np;
  if(same) flip(side()===1); else slideTo(dir);
  updateMeta(); hideHint();
}

function updateMeta(){
  const cnt=document.getElementById('count'); if(cnt) cnt.textContent=`${item()+1} / ${LIST.length}`;
  const p=document.getElementById('prev'), n=document.getElementById('next');
  if(p) p.disabled = PAGE<=0;
  if(n) n.disabled = PAGE>=LIST.length*2-1;
  const dots=document.getElementById('dots');
  if(dots) [...dots.children].forEach((d,i)=>d.classList.toggle('on', i===item()));
  history.replaceState(null,'',`#${KIND}=${item()}.${side()}`);
}
function hideHint(){ const h=document.getElementById('hint'); if(h) h.classList.add('gone'); }

function renderDeck(){
  APP.innerHTML=`
    <div class="bar">
      <button class="bar-btn" id="home">‹ 홈</button>
      <div class="bar-title">${KIND==='world'?'🌍 세계 국가':KIND==='kbo'?'⚾ KBO 구단':'<img class="bar-emb" src="assets/wc.png" alt=""> 월드컵'}</div>
      <div class="bar-count" id="count"></div>
    </div>
    <div class="deck" id="deck"><div class="slide" id="slide"></div></div>
    <div class="nav">
      <button class="nav-btn" id="prev">‹</button>
      <div class="dots" id="dots">${LIST.map((_,i)=>`<i${i===item()?' class="on"':''}></i>`).join('')}</div>
      <button class="nav-btn" id="next">›</button>
    </div>
    <div class="hint" id="hint">👉 옆으로 넘기면 <b>뒷면</b>, 한 번 더 넘기면 <b>다음 ${KIND==='kbo'?'구단':'나라'}</b></div>`;
  document.getElementById('home').onclick=()=>{ history.replaceState(null,'','#'); renderHome(); };
  document.getElementById('prev').onclick=()=>go(-1);
  document.getElementById('next').onclick=()=>go(1);
  const deck=document.getElementById('deck');
  deck.querySelectorAll('.dots i').forEach((d,i)=>d.onclick=()=>{ PAGE=i*2; buildCard(); updateMeta(); hideHint(); });
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
      <button class="home-card" data-k="world"><span class="hc-emo">🌍</span><b>세계 국가</b><small>20개국 · 기본정보 · 자연 · 역사</small></button>
      <button class="home-card" data-k="kbo"><span class="hc-emo">⚾</span><b>KBO 구단</b><small>10개 구단 · 정보 · 레전드 · 역사</small></button>
      <button class="home-card" data-k="foot"><img class="hc-emo hc-emo-img" src="assets/wc.png" alt="월드컵 트로피"><b>월드컵</b><small>48개국 · 월드컵 기록 · 레전드 · 위치</small></button>
    </div>`;
  APP.querySelectorAll('.home-card').forEach(b=> b.onclick=()=>openDeck(b.dataset.k));
}

function openDeck(kind, it=0, sd=0){
  KIND=kind; LIST = kind==='world'?COUNTRIES:kind==='kbo'?KBO:FOOT;
  PAGE = Math.min(Math.max(it,0), LIST.length-1)*2 + (sd?1:0);
  renderDeck();
}

function route(){
  const h=location.hash.slice(1);
  const m=h.match(/^(world|kbo|foot)(?:=(\d+)\.(\d+))?$/);
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
