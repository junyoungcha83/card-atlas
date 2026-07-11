// 카드 도감 — 홈/덱, flip(책장 넘김)·slide(다음 카드), 딥링크(#world=3.1)
const APP = document.getElementById('app');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let KIND=null, LIST=[], PAGE=0;   // PAGE: 0..(len*2-1) — item=PAGE>>1, side=PAGE&1
const item = () => PAGE>>1;
const side = () => PAGE&1;

// ── 카드 면(HTML) ──
function infoRow(k,v){ return `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`; }

function faceCountry(c, s){
  if(!s){
    return `<div class="cardface">
      <div class="c-head">
        <img class="c-flag" src="https://flagcdn.com/w320/${c.flag}.png" alt="${esc(c.name)} 국기" onerror="this.style.visibility='hidden'">
        <div class="c-title"><h2>${esc(c.name)}</h2><span class="c-en">${esc(c.en)}</span></div>
      </div>
      <img class="c-map" src="assets/maps/${c.map}.svg" alt="${esc(c.name)} 지도" onerror="this.style.display='none'">
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
    <div class="c-head sm">
      <img class="c-flag sm" src="https://flagcdn.com/w320/${c.flag}.png" alt="" onerror="this.style.visibility='hidden'">
      <h2>${esc(c.name)} <small>역사</small></h2>
    </div>
    <ol class="timeline">${c.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ol>
    <div class="pageno">뒷면 2/2 · 넘기면 다음 나라 →</div>
  </div>`;
}

function faceKbo(t, s){
  const style=`--tc:${t.c1};--tc2:${t.c2}`;
  if(!s){
    return `<div class="cardface" style="${style}">
      <div class="k-head">
        <span class="k-emb">${t.emb}</span>
        <div class="c-title"><h2>${esc(t.name)}</h2><span class="c-en">${esc(t.city)} 연고</span></div>
      </div>
      <div class="info-grid">
        ${infoRow('연고지',t.city)}${infoRow('홈구장',t.stadium)}
        ${infoRow('수용인원',t.capacity)}${infoRow('마스코트',t.mascot)}
      </div>
      <div class="c-sec"><h3>⭐ 대표 레전드</h3><div class="chips">${t.legends.map(l=>`<span>${esc(l)}</span>`).join('')}</div></div>
      <div class="pageno">앞면 1/2 · 넘기면 역사 →</div>
    </div>`;
  }
  return `<div class="cardface backface" style="${style}">
    <div class="k-head sm"><span class="k-emb sm">${t.emb}</span><h2>${esc(t.name)} <small>역사</small></h2></div>
    <div class="c-sec"><h3>📅 창단</h3><p>${esc(t.founded)}</p></div>
    <div class="c-sec"><h3>🏆 우승</h3><p>${esc(t.titles)}</p></div>
    <div class="c-sec"><h3>🎖️ 수상·명장면</h3><ul class="bul">${t.awards.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
    <div class="c-sec"><h3>📖 팀 이야기</h3><p>${esc(t.story)}</p></div>
    <div class="pageno">뒷면 2/2 · 넘기면 다음 구단 →</div>
  </div>`;
}

const faces = (data,s) => KIND==='world' ? faceCountry(data,s) : faceKbo(data,s);

// ── 덱 렌더 ──
function buildCard(){
  const data=LIST[item()];
  const slide=document.getElementById('slide');
  slide.innerHTML=`<div class="card3d${side()?' flipped':''}">
    <div class="face front">${faces(data,0)}</div>
    <div class="face back">${faces(data,1)}</div>
  </div>`;
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
      <div class="bar-title">${KIND==='world'?'🌍 세계 국가':'⚾ KBO 구단'}</div>
      <div class="bar-count" id="count"></div>
    </div>
    <div class="deck" id="deck"><div class="slide" id="slide"></div></div>
    <div class="nav">
      <button class="nav-btn" id="prev">‹</button>
      <div class="dots" id="dots">${LIST.map((_,i)=>`<i${i===item()?' class="on"':''}></i>`).join('')}</div>
      <button class="nav-btn" id="next">›</button>
    </div>
    <div class="hint" id="hint">👉 옆으로 넘기면 <b>뒷면(역사)</b>, 한 번 더 넘기면 <b>다음 ${KIND==='world'?'나라':'구단'}</b></div>`;
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
      <h1>📚 카드 도감</h1>
      <p class="home-sub">카드를 옆으로 넘기면 뒷면(역사)이 나오고,<br>한 번 더 넘기면 다음 카드로 넘어가요.</p>
      <button class="home-card" data-k="world"><span class="hc-emo">🌍</span><b>세계 국가</b><small>20개국 · 기본정보 · 자연 · 역사</small></button>
      <button class="home-card" data-k="kbo"><span class="hc-emo">⚾</span><b>KBO 구단</b><small>10개 구단 · 정보 · 레전드 · 역사</small></button>
    </div>`;
  APP.querySelectorAll('.home-card').forEach(b=> b.onclick=()=>openDeck(b.dataset.k));
}

function openDeck(kind, it=0, sd=0){
  KIND=kind; LIST = kind==='world'?COUNTRIES:KBO;
  PAGE = Math.min(Math.max(it,0), LIST.length-1)*2 + (sd?1:0);
  renderDeck();
}

function route(){
  const h=location.hash.slice(1);
  const m=h.match(/^(world|kbo)(?:=(\d+)\.(\d+))?$/);
  if(m) openDeck(m[1], m[2]?+m[2]:0, m[3]?+m[3]:0);
  else renderHome();
}
window.addEventListener('hashchange', route);
route();

// 서비스워커
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
