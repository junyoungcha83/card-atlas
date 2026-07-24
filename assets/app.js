// 카드 도감 — 홈/덱, flip(책장 넘김)·slide(다음 카드), 딥링크(#world=3.1)
const BUILD = 'v42';   // 화면 표시 버전 — sw.js CACHE 번호와 같이 올릴 것
const APP = document.getElementById('app');
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── 이미지 업로드(R2 클라우드) · 편집 모드 ──
const IMG_API = 'https://card-atlas-img-api.junyoung-cha83.workers.dev';
let IMG_SET = new Set();       // 업로드된 slot 집합(서버 정본)
let EDIT = false;              // 편집 모드(+버튼 노출)
let _bust = Date.now();        // 캐시버스트(업로드/삭제 후 갱신)
const editToken = () => localStorage.getItem('ca-edit') || '';
// override 있으면 R2 URL, 없으면 기존 코드 경로(fallback)
function imgURL(slot, fallback){ return IMG_SET.has(slot) ? `${IMG_API}/api/img/${slot}?v=${_bust}` : (fallback||''); }
function loadImgSet(){ return fetch(IMG_API+'/api/img',{cache:'no-store'}).then(r=>r.json())
  .then(d=>{ IMG_SET = new Set((d.items||[]).map(x=>x.slot)); }).catch(()=>{}); }
function toggleEdit(){
  if(!EDIT){
    if(!editToken()){ const p=prompt('편집 비밀번호를 입력하세요 (사진 업로드용)'); if(!p) return; localStorage.setItem('ca-edit', p.trim()); }
    EDIT=true;
  } else EDIT=false;
  route();
}
// 슬라이드 렌더 후 [data-upslot] 요소에 +버튼(편집 모드) 부착
function decorateUploads(root){
  if(!EDIT || !root) return;
  root.querySelectorAll('[data-upslot]').forEach(el=>{
    if(el.querySelector(':scope > .up-ov')) return;
    const slot=el.dataset.upslot;
    el.classList.add('up-host');
    const ov=document.createElement('div'); ov.className='up-ov';
    ov.innerHTML=`<button class="up-add" title="사진 업로드">＋</button>`+(IMG_SET.has(slot)?`<button class="up-del" title="삭제">×</button>`:'');
    ov.querySelector('.up-add').onclick=e=>{ e.stopPropagation(); e.preventDefault(); pickUpload(slot); };
    const del=ov.querySelector('.up-del'); if(del) del.onclick=e=>{ e.stopPropagation(); e.preventDefault(); removeUpload(slot); };
    el.appendChild(ov);
  });
}
let _pendingSlot=null, _fileInput=null;
function fileInput(){
  if(_fileInput) return _fileInput;
  _fileInput=document.createElement('input'); _fileInput.type='file'; _fileInput.accept='image/*'; _fileInput.style.display='none';
  _fileInput.onchange=()=>{ const f=_fileInput.files[0]; _fileInput.value=''; if(f&&_pendingSlot) uploadImage(_pendingSlot,f); };
  document.body.appendChild(_fileInput); return _fileInput;
}
function pickUpload(slot){ _pendingSlot=slot; fileInput().click(); }
// 큰 사진은 캔버스로 축소(최대 변 1600px, JPEG) 후 업로드
function downscale(file, maxSide, q){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{ URL.revokeObjectURL(url);
      let w=img.naturalWidth, h=img.naturalHeight; const m=Math.max(w,h);
      if(m<=maxSide && file.size<=1.5*1024*1024){ res(file); return; }   // 이미 작으면 원본
      const sc=Math.min(1,maxSide/m); w=Math.round(w*sc); h=Math.round(h*sc);
      const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      cv.toBlob(b=>b?res(b):rej(new Error('blob')), 'image/jpeg', q);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('img')); };
    img.src=url;
  });
}
async function uploadImage(slot,file){
  const tok=editToken(); if(!tok){ alert('편집 비밀번호가 필요해요.'); return; }
  let blob=file; try{ blob=await downscale(file,1600,0.85); }catch(_){}
  try{
    const res=await fetch(`${IMG_API}/api/img/${slot}`,{method:'PUT',
      headers:{'Content-Type':blob.type||'image/jpeg','X-Edit-Token':tok}, body:blob});
    if(res.status===401){ alert('편집 비밀번호가 틀렸어요. 다시 켜서 입력해 주세요.'); localStorage.removeItem('ca-edit'); EDIT=false; route(); return; }
    if(res.status===413){ alert('사진 용량이 너무 커요 (8MB 초과).'); return; }
    if(!res.ok){ alert('업로드 실패 ('+res.status+')'); return; }
    IMG_SET.add(slot); _bust=Date.now(); route();
  }catch(e){ alert('업로드 실패 — 네트워크 오류'); }
}
async function removeUpload(slot){
  if(!confirm('이 사진을 삭제하고 기본 이미지로 되돌릴까요?')) return;
  const tok=editToken();
  try{ await fetch(`${IMG_API}/api/img/${slot}`,{method:'DELETE',headers:{'X-Edit-Token':tok}}); }catch(_){}
  IMG_SET.delete(slot); _bust=Date.now(); route();
}

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
        <div class="mapbox">${c.map?`<img class="c-map" src="assets/maps/${c.map}.svg" alt="${esc(c.name)} 지도" onerror="this.style.display='none'">`:''}<span class="mlabel">${esc(c.name)}</span></div>
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
    const embSlot='kbo-'+t.key+'-emblem', mascotSlot='kbo-'+t.key+'-mascot', uniSlot='kbo-'+t.key+'-uni', stadiumSlot='kbo-'+t.key+'-stadium';
    const embSrc=imgURL(embSlot, t.emblemImg);
    return `<div class="cardface" style="${style}">
      <div class="k-head" data-upslot="${embSlot}">
        ${embSrc?`<img class="k-emb-img" src="${embSrc}" alt="${esc(t.name)} 엠블렘">`:`<span class="k-emb">${t.emb}</span>`}
        <div class="c-title"><h2>${esc(t.name)}</h2><span class="c-en">${esc(t.city)} 연고</span></div>
        ${t.logoImg?`<img class="k-logo-img" src="${t.logoImg}" alt="${esc(t.name)} 로고">`:''}
      </div>
      <div class="info-grid k-info">
        ${infoRow('연고지',t.city)}${infoRow('홈구장',t.stadium)}${infoRow('수용인원',t.capacity)}
      </div>
      <div class="c-sec"><div class="k-duo">
        <div class="k-col" data-upslot="${stadiumSlot}">
          ${(function(){const src=imgURL(stadiumSlot,t.stadiumImg); return src?`<img class="k-col-img cover" src="${src}" alt="${esc(t.stadium)}" onerror="this.style.display='none';this.parentNode.insertAdjacentHTML('beforeend','<div class=\\'k-ph\\'>🏟️</div>')">`:`<div class="k-ph">🏟️</div>`;})()}
        </div>
        <div class="k-col" data-upslot="${mascotSlot}">
          ${(function(){const src=imgURL(mascotSlot,t.mascotImg); return src?`<img class="k-col-img contain" src="${src}" alt="${esc(mascotName)}" onerror="this.style.display='none'">`:`<div class="k-ph">${t.emb}</div>`;})()}
          <div class="k-name">${esc(mascotName)}</div>
        </div>
      </div></div>
      <div class="c-sec kb-uni" data-upslot="${uniSlot}">
        <img class="kb-uni-img" src="${imgURL(uniSlot,'assets/kbo/u_'+t.key+'.jpg')}" alt="${esc(t.name)} 유니폼" onerror="this.style.display='none';this.closest('.kb-uni').classList.add('empty')">
        <div class="kb-uni-labels"><span>${uniL}</span><span>${uniR}</span></div>
      </div>
      <div class="pageno">앞면 1/2 · 넘기면 역사 →</div>
    </div>`;
  }
  const embSrcB=imgURL('kbo-'+t.key+'-emblem', t.emblemImg);
  return `<div class="cardface backface" style="${style}">
    <div class="k-head sm">${embSrcB?`<img class="k-emb-img sm" src="${embSrcB}" alt="">`:`<span class="k-emb sm">${t.emb}</span>`}<h2>${esc(t.name)} <small>역사</small></h2>${t.logoImg?`<img class="k-logo-img sm" src="${t.logoImg}" alt="">`:''}</div>
    <div class="c-sec"><h3>🏆 우승</h3><p>${esc(t.titles)}</p></div>
    <div class="c-sec"><h3>🎖️ 수상·명장면</h3><ul class="bul">${t.awards.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
    <div class="c-sec"><h3>⭐ 대표 레전드</h3><div class="chips">${t.legends.map(l=>`<span>${esc(l)}</span>`).join('')}</div></div>
    <div class="c-sec"><h3>📖 구단의 역사</h3><ol class="timeline emb-tl">${(t.teamHistory||[]).map(e=>`<li>${esc(e)}</li>`).join('')}</ol></div>
    <div class="c-sec" data-upslot="kbo-${t.key}-emblemhist"><h3>🏷️ 구단 로고의 역사</h3>
      <img class="kb-eh-img" src="${imgURL('kbo-'+t.key+'-emblemhist','assets/kbo/eh_'+t.key+'.jpg')}" alt="${esc(t.name)} 엠블럼 변천사" onerror="this.style.display='none';var f=this.nextElementSibling;if(f)f.style.display='block'">
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
      <div class="c-head"><img class="wch-emo-img" src="assets/wc-trophy.svg" alt="FIFA 월드컵 트로피"><div class="c-title"><h2>월드컵 역사</h2><span class="c-en">1930 → 2022 · 22개 대회</span></div></div>
      <ol class="wc-toc">${WORLD_CUPS.map(w=>`
        <li>
          <div class="toc-l"><span class="no">${String(w.no).padStart(2,'0')}회</span> <span class="ti">${w.yr}년 ${esc(w.host)} 월드컵</span></div>
          <div class="re">🥇 ${esc(w.win)} · 🥈 ${esc(w.run)} · <span class="kor ${/위|16강|8강/.test(w.kor)?'good':''}">🇰🇷 ${esc(w.kor)}</span></div>
        </li>`).join('')}</ol>
      <div class="pageno">앞면 1/2 · 넘기면 기록 요약 →</div>
    </div>`;
  }
  return `<div class="cardface backface foot wchist">
    <div class="c-head sm"><img class="wch-emo-img" src="assets/wc-trophy.svg" alt="FIFA 월드컵 트로피"><h2>월드컵 <small>기록</small></h2></div>
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
// 이름 옆 역할 아이콘: 👑왕/군주 · ⚔️장군·무장 · 🔫독립운동가·의사 · 📖문인·시인·학자·문화
const ROLE_SETS = {
  '👑':[1,2,3,4,5,6,7,8,9,10,11,12,17,18,22,25,26,33,36,39,41,42,43,44,53,55],
  '⚔️':[13,14,20,24,30,48,51,52,68,70],
  '🔫':[59,60,61,62,65,66,67,69,71,72,73],
  '📖':[15,16,19,21,23,27,28,29,31,32,34,35,37,38,40,45,46,47,49,50,54,56,57,58,63,64,74],
};
function heroRole(h){ for(const ic in ROLE_SETS){ if(ROLE_SETS[ic].includes(h.id)) return ic; } return '📖'; }
// 사진: assets/heroes/{id}.jpg(.png). 없으면 '준비중' 빈칸 프레임.
function heroPhoto(h){
  const slot='hero-'+h.id;
  return `<div class="h-photo" data-upslot="${slot}">`+
    `<img src="${imgURL(slot,'assets/heroes/'+h.id+'.jpg')}" alt="${esc(h.n)}" `+
      `onerror="if(!this.dataset.p){this.dataset.p=1;this.src='assets/heroes/${h.id}.png'}else{this.style.display='none';this.nextElementSibling.style.display='flex'}">`+
    `<span class="h-photo-ph" style="display:none">📷<small>사진 준비중</small></span></div>`;
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
// 인물 카드: 1인 1장 — 프레임(사진+시대·나라·생몰) / 아래 업적·평가·한눈에
function faceHeroes(h){
  if(h && h.toc) return faceHeroesToc();
  const era = HERO_ERAS[h.k] || {label:'', c:'#556'};
  const no = 'No.'+String(h.id).padStart(2,'0');
  return `<div class="cardface hero" style="--tc:${era.c}">
    <div class="h-frame">
      <span class="h-icon">${heroRole(h)}</span>
      <span class="h-nm">${esc(h.n)}</span>
      <span class="h-no">${no}</span>
    </div>
    <div class="h-body-top">
      ${heroPhoto(h)}
      <div class="h-facts">
        <div class="fact"><span class="fl">시대</span><span class="fv">${esc(era.label)}</span></div>
        <div class="fact"><span class="fl">나라</span><span class="fv">${esc(h.nat)}</span></div>
        <div class="fact"><span class="fl">생몰</span><span class="fv">${esc(h.b)} ~ ${esc(h.d)}</span></div>
      </div>
    </div>
    <div class="c-sec"><h3>주요 업적 · 대표작</h3><p>${esc(h.a)}</p></div>
    <div class="c-sec"><h3>후대의 평가</h3><p>${esc(h.v)}</p></div>
    <div class="pageno">${no} · 옆으로 넘기면 다음 인물 →</div>
  </div>`;
}

const faces = (data,s) => KIND==='world' ? faceCountry(data,s)
  : KIND==='kbo' ? (data && data.stand ? faceKboStand(s) : faceKbo(data,s))
  : KIND==='heroes' ? faceHeroes(data,s)
  : KIND==='past' ? facePastCity(data)
  : (data && data.hist) ? faceWcHistory(s) : faceFoot(data,s);

// 과거도시 카드(단면)
function facePastCity(c){
  const T={ '통합':['🔗','통합'], '개명':['✏️','이름 바뀜'], '개명·통합':['✏️','개명·통합'], '승격':['⬆️','승격'], '편입':['➡️','편입'] };
  const [emo,lab]=T[c.type]||['🏚️',c.type];
  return `<div class="cardface past">
    <div class="c-head"><span class="past-emo">${emo}</span><div class="c-title"><h2>${esc(c.old)}</h2><span class="c-en">${esc(c.region)}</span></div></div>
    <div class="past-badge">${esc(lab)}${c.year&&c.year!=='—'?` · ${esc(c.year)}년`:''}</div>
    <div class="c-sec"><p>${esc(c.story)}</p></div>
    <div class="past-now">📍 지금은 <b>${esc(c.now)}</b></div>
    <div class="pageno">옆으로 넘기면 다음 도시 →</div>
  </div>`;
}

// ── 덱 렌더 ──
function buildCard(){
  const data=LIST[item()];
  const slide=document.getElementById('slide');
  slide.innerHTML=`<div class="card3d${side()?' flipped':''}">
    <div class="face front">${faces(data,0)}</div>
    <div class="face back">${faces(data,1)}</div>
  </div>`;
  hydrateMaps();
  decorateUploads(slide);
  bindPhotoZoom(slide);
}
// 카드 사진 클릭 → 전체화면 팝업(가로 긴 사진도 전체가 보이도록 contain)
function bindPhotoZoom(root){
  root.querySelectorAll('.h-photo img, .k-col-img, .kb-uni-img, .kb-eh-img').forEach(img=>{
    img.classList.add('zoomable');
    img.addEventListener('click', e=>{ e.stopPropagation(); openPhoto(img.currentSrc||img.getAttribute('src'), img.alt); });
  });
}
let _photoOpen=false;
function ensurePhotoViewer(){
  let v=document.getElementById('photoViewer');
  if(v) return v;
  v=document.createElement('div'); v.id='photoViewer'; v.className='photo-viewer hidden';
  v.innerHTML='<button class="pv-close" aria-label="닫기">✕</button><img alt="">';
  document.body.appendChild(v);
  v.addEventListener('click', e=>{ if(e.target===v || e.target.classList.contains('pv-close')) closePhotoBack(); });
  return v;
}
function openPhoto(src, alt){
  if(!src) return;
  const v=ensurePhotoViewer(), img=v.querySelector('img');
  img.src=src; img.alt=alt||'';
  v.classList.remove('hidden'); _photoOpen=true;
  history.pushState({photo:1},'');   // 뒤로가기/닫기로 팝업만 닫히도록
}
function closePhoto(){ if(!_photoOpen) return; _photoOpen=false; const v=document.getElementById('photoViewer'); if(v) v.classList.add('hidden'); }
function closePhotoBack(){ if(_photoOpen) history.back(); }
window.addEventListener('popstate', ()=>{ if(_photoOpen) closePhoto(); });
window.addEventListener('keydown', e=>{ if(e.key==='Escape') closePhotoBack(); });
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
      <div class="bar-title">${KIND==='world'?'🌍 세계 국가':KIND==='kbo'?'⚾ KBO 구단':KIND==='heroes'?'👑 한국위인전':KIND==='past'?'🏚️ 과거도시':'<img class="bar-emb" src="assets/wc-trophy.svg" alt=""> 월드컵'}</div>
      ${(KIND==='kbo'||KIND==='heroes')?`<button class="bar-btn edit-btn ${EDIT?'on':''}" id="editBtn" title="사진 편집">${EDIT?'✎ 편집중':'✎ 편집'}</button>`:''}
      <div class="bar-count" id="count"></div>
    </div>
    <div class="deck" id="deck"><div class="slide" id="slide"></div></div>
    <div class="nav">
      <button class="nav-btn" id="prev">‹</button>
      <div class="dots" id="dots">${LIST.map((_,i)=>`<i${i===item()?' class="on"':''}></i>`).join('')}</div>
      <button class="nav-btn" id="next">›</button>
    </div>
    <div class="hint" id="hint">${KIND==='past'?'👉 옆으로 넘기면 <b>다음 도시</b>':FLAT?'👉 옆으로 넘기면 <b>다음 인물</b> · 첫 장에서 <b>이름</b>을 누르면 바로 이동':`👉 옆으로 넘기면 <b>뒷면</b>, 한 번 더 넘기면 <b>다음 ${KIND==='kbo'?'구단':'나라'}</b>`}</div>`;
  document.getElementById('home').onclick=()=>history.back();
  const eb=document.getElementById('editBtn'); if(eb) eb.onclick=toggleEdit;
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
        <button class="home-card" data-k="world"><span class="hc-emo">🌍</span><b>세계 국가</b><small>48개국 · 기본정보 · 자연 · 역사</small></button>
        <button class="home-card" data-k="kbo"><span class="hc-emo">⚾</span><b>KBO 구단</b><small>10개 구단 · 정보 · 레전드 · 역사</small></button>
        <button class="home-card" data-k="foot"><img class="hc-emo hc-emo-img" src="assets/wc-trophy.svg" alt="월드컵 트로피"><b>월드컵</b><small>48개국 · 월드컵 기록 · 레전드 · 위치</small></button>
        <button class="home-card" data-k="heroes"><span class="hc-emo">👑</span><b>한국위인전</b><small>인물 · 시대 · 주요 업적</small></button>
        <button class="home-card" data-k="korhist"><span class="hc-emo">🇰🇷</span><b>한국역사</b><small>단군부터 대한민국까지</small></button>
        <button class="home-card" data-k="geo"><img class="hc-emo hc-emo-img" src="assets/maps/kr.svg" alt="한반도"><b>한국지리</b><small>전국 도·시·군·구 · 과거도시</small></button>
      </div>
    </div>`;
  APP.querySelectorAll('.home-card').forEach(b=> b.onclick=()=>nav(b.dataset.k));
}

const DECKS = { world:1, kbo:1, foot:1, heroes:1, past:1 };
const SOON_TITLE = { korhist:'🇰🇷 한국역사', geo:'🗺️ 한국지리' };
function comingSoon(kind){
  KIND=null;
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="home">‹ 홈</button><div class="bar-title">${SOON_TITLE[kind]||''}</div></div>
    <div class="soon"><div class="soon-emo">🚧</div><h2>준비 중입니다</h2><p>곧 채워질 예정이에요.</p></div>`;
  document.getElementById('home').onclick=()=>history.back();
  history.replaceState(null,'','#'+kind);
}

// ── 나의 도시 (한국지리 > 나의 도시) ──
// svgMaps: 이미 생성된 지도(assets/maps/geo/*.svg). oldSlot: 옛 지도 이미지 업로드(R2) 슬롯.
const MY_CITIES = {
  masan: {
    emoji:'⚓', title:'마산시', tileSub:'옛 마산 (합포·회원)',
    sub:'통합 전 옛 마산시', badge:'2010 창원 통합',
    svgMaps:[{src:'38113_only.svg',label:'마산합포구'},{src:'38114_only.svg',label:'마산회원구'}],
    oldSlot:'mycity-masan-old',
    info:[['옛 행정구역','마산시 (2010 폐지)'],['현재','창원시 마산합포구·마산회원구'],['통합','2010년 창원·마산·진해'],['상징','3·15 의거 · 마산항']],
    history:['개항장 마산은 경남을 대표하던 항구·공업 도시였어요.','옛 마산은 3·15 의거(1960)가 일어난 민주화의 도시예요.','2010년 창원·마산·진해가 합쳐 통합 창원시가 되며 마산시는 사라졌어요.','지금은 마산합포구·마산회원구로 이름이 남아 있어요.'],
  },
  cheongju: {
    emoji:'🖨️', title:'청주시', tileSub:'통합 청주 (흥덕 포함)',
    sub:'청원군과 통합한 청주', badge:'2014 청원 통합',
    svgMaps:[{src:'cheongju_only.svg',label:'청주시'},{src:'cheongju_up.svg',label:'충북 안에서'},{src:'33043_only.svg',label:'흥덕구'}],
    oldSlot:'mycity-cheongju-old',
    info:[['행정구역','청주시 (충북)'],['구','상당 · 서원 · 흥덕 · 청원'],['통합','2014년 청주시 + 청원군'],['상징','직지 · 고인쇄']],
    history:['세계에서 가장 오래된 금속활자 「직지」를 만든 인쇄의 도시예요.','2014년 청주시와 청원군이 하나로 통합됐어요.','흥덕구는 오송 바이오단지가 있는 인구 최다 구예요.','청주국제공항이 있어요.'],
  },
  icheon: {
    emoji:'🌾', title:'이천시', tileSub:'경기 남동부',
    sub:'구 없는 쌀·도자기의 고장', badge:'경기도',
    svgMaps:[{src:'icheon_only.svg',label:'이천시'},{src:'icheon_up.svg',label:'경기 안에서'}],
    oldSlot:'mycity-icheon-old',
    info:[['행정구역','이천시 (경기)'],['유형','시 (구 없음)'],['청 소재지','중리동'],['상징','이천쌀 · 도자기']],
    history:['질 좋은 "이천쌀"로 유명한 고장이에요.','도자기 축제로도 잘 알려져 있어요.','구가 없이 읍·면·동으로 이뤄져 있어요.'],
  },
  yongsan: {
    emoji:'🚆', title:'용산구', tileSub:'서울특별시',
    sub:'서울 한복판, 교통·군사 요지', badge:'서울특별시',
    svgMaps:[{src:'11_only.svg',label:'서울특별시'}],
    oldSlot:'mycity-yongsan-old',
    info:[['행정구역','서울특별시 용산구'],['상징','용산역 · 이태원'],['특징','한강 ~ 남산 사이']],
    history:['서울역·용산역이 있는 교통의 중심이에요.','이태원 등 국제적인 동네가 있어요.','옛 미군기지 터가 용산공원으로 바뀌고 있어요.'],
  },
  mapo: {
    emoji:'🌉', title:'마포구', tileSub:'서울특별시',
    sub:'한강·홍대의 문화 중심', badge:'서울특별시',
    svgMaps:[{src:'11_only.svg',label:'서울특별시'}],
    oldSlot:'mycity-mapo-old',
    info:[['행정구역','서울특별시 마포구'],['상징','홍대 · 상암 DMC'],['특징','한강 북서쪽']],
    history:['옛 마포나루가 있던 한강 포구 지역이에요.','홍대 앞은 젊음과 예술의 거리예요.','상암 DMC에 방송·미디어 기업이 모여 있어요.'],
  },
};
const MY_CITY_ORDER = ['masan','cheongju','icheon','yongsan','mapo'];

// ── 한국지리 (계층 드릴다운) ──
function renderGeoIndex(){
  KIND='geo';
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="home">‹ 홈</button><div class="bar-title">🗺️ 한국지리</div><div class="bar-count">17개 시·도</div></div>
    <div class="geo-index">
      ${GEO_GROUPS.map(g=>`<div class="geo-grp"><h3>${esc(g.label)}</h3><div class="geo-grid">${
        g.codes.map(code=>{ const r=GEO_SIDO[code]; return `<button class="geo-tile" data-code="${code}">
          <img src="assets/maps/geo/${code}_only.svg" alt="" loading="lazy">
          <b>${esc(r.name)}</b><small>${esc(r.type)}</small></button>`; }).join('')
      }</div></div>`).join('')}
      <div class="geo-grp"><h3>📍 나의 도시</h3><div class="geo-grid">${
        MY_CITY_ORDER.map(id=>{ const c=MY_CITIES[id]; return `<button class="geo-tile" data-mycity="${id}">
          <span class="tile-emo">${c.emoji||'📍'}</span><b>${esc(c.title)}</b><small>${esc(c.tileSub||'')}</small></button>`; }).join('')
      }</div></div>
      <div class="geo-grp"><h3>그 밖에</h3><div class="geo-grid">
        <button class="geo-tile" id="geoPast"><span class="tile-emo">🏚️</span><b>과거도시</b><small>사라진·통합·개명</small></button>
      </div></div>
    </div>
    <div class="hint">👉 지역을 누르면 <b>지도·인구·역사</b>가 나와요</div>`;
  document.getElementById('home').onclick=()=>history.back();
  APP.querySelectorAll('.geo-tile[data-code]').forEach(b=>b.onclick=()=>nav('geo='+b.dataset.code));
  APP.querySelectorAll('.geo-tile[data-mycity]').forEach(b=>b.onclick=()=>nav('mycity='+b.dataset.mycity));
  const gp=document.getElementById('geoPast'); if(gp) gp.onclick=()=>nav('past');
}
function renderGeoRegion(code){
  const r=GEO_SIDO[code]; if(!r){ renderGeoIndex(); return; }
  KIND='geo';
  const people=(r.people&&r.people.length)?`<div class="c-sec"><h3>🧑 주요 인물</h3><div class="chips">${r.people.map(p=>`<span>${esc(p)}</span>`).join('')}</div></div>`:'';
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="back">‹ 목록</button><div class="bar-title">🗺️ ${esc(r.full)}</div></div>
    <div class="geo-detail">
      <div class="geo-maps">
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${code}_only.svg" alt="${esc(r.name)} 지도"><span class="mlabel">${esc(r.name)}</span></div>
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${code}_kr.svg" alt="전국에서 ${esc(r.name)} 위치"><span class="mlabel">전국 위치</span></div>
      </div>
      <div class="info-grid">
        ${infoRow('행정구역',r.full)}${infoRow('유형',r.type)}${infoRow('청 소재지',r.seat)}
        ${infoRow('넓이',r.area)}${infoRow('인구',r.pop)}${infoRow('위치',r.region)}
      </div>
      <div class="c-sec"><h3>📖 역사 · 이슈</h3><ol class="timeline">${r.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>
      ${people}
      ${(r.cities&&r.cities.length)
        ? `<div class="c-sec"><h3>🏙️ 시 · 군</h3><div class="geo-grid sub">${r.cities.map(cs=>{const c=GEO_CITY[cs];return `<button class="geo-tile" data-city="${cs}"><img src="assets/maps/geo/${cs}_only.svg" alt="" loading="lazy"><b>${esc(c.name)}</b><small>${esc(c.type)}</small></button>`;}).join('')}</div><div class="geo-more" style="margin-top:8px">그 외 시·군은 다음 업데이트에서 추가돼요.</div></div>`
        : `<div class="geo-more">🏙️ 시·군·구 상세 소개는 다음 업데이트에서 추가돼요.</div>`}
    </div>`;
  document.getElementById('back').onclick=()=>history.back();
  APP.querySelectorAll('.geo-tile[data-city]').forEach(b=>b.onclick=()=>nav('geo='+b.dataset.city));
  window.scrollTo(0,0);
}
function renderGeoCity(slug){
  const c=GEO_CITY[slug]; if(!c){ renderGeoIndex(); return; }
  KIND='geo';
  const parent=GEO_SIDO[c.parent];
  const people=(c.people&&c.people.length)?`<div class="c-sec"><h3>🧑 주요 인물</h3><div class="chips">${c.people.map(p=>`<span>${esc(p)}</span>`).join('')}</div></div>`:'';
  const gus=(c.gus&&c.gus.length)?`<div class="c-sec"><h3>🏘️ 구</h3><div class="geo-grid sub">${c.gus.map(g=>{const gg=GEO_GU[g];return `<button class="geo-tile" data-gu="${g}"><img src="assets/maps/geo/${g}_only.svg" alt="" loading="lazy"><b>${esc(gg.name)}</b><small>${esc(gg.type)}</small></button>`;}).join('')}</div></div>`:'';
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="back">‹ ${esc(parent.name)}</button><div class="bar-title">🏙️ ${esc(c.full)}</div></div>
    <div class="geo-detail">
      <div class="geo-maps">
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${slug}_only.svg" alt="${esc(c.name)} 지도"><span class="mlabel">${esc(c.name)}</span></div>
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${slug}_up.svg" alt="${esc(parent.name)}에서 ${esc(c.name)} 위치"><span class="mlabel">${esc(parent.name)} 안에서</span></div>
      </div>
      <div class="info-grid">
        ${infoRow('행정구역',c.full)}${infoRow('유형',c.type)}${infoRow('청 소재지',c.seat)}
        ${infoRow('넓이',c.area)}${infoRow('인구',c.pop)}${infoRow('위치',c.region)}
      </div>
      <div class="c-sec"><h3>📖 역사 · 이슈</h3><ol class="timeline">${c.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>
      ${people}
      ${gus || (c.type.includes('구 없음')?'<div class="geo-more">이천시는 구가 없이 읍·면·동으로 이뤄져 있어요.</div>':'')}
    </div>`;
  document.getElementById('back').onclick=()=>history.back();
  APP.querySelectorAll('.geo-tile[data-gu]').forEach(b=>b.onclick=()=>nav('geo='+b.dataset.gu));
  window.scrollTo(0,0);
}
function renderGeoGu(code){
  const g=GEO_GU[code]; if(!g){ renderGeoIndex(); return; }
  KIND='geo';
  const city=GEO_CITY[g.parent];
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="back">‹ ${esc(city.name)}</button><div class="bar-title">🏘️ ${esc(g.full)}</div></div>
    <div class="geo-detail">
      <div class="geo-maps">
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${code}_only.svg" alt="${esc(g.name)} 지도"><span class="mlabel">${esc(g.name)}</span></div>
        <div class="mapbox"><img class="c-map" src="assets/maps/geo/${code}_up.svg" alt="${esc(city.name)}에서 ${esc(g.name)} 위치"><span class="mlabel">${esc(city.name)} 안에서</span></div>
      </div>
      <div class="info-grid">
        ${infoRow('행정구역',g.full)}${infoRow('유형',g.type)}${infoRow('넓이',g.area)}${infoRow('인구',g.pop)}
      </div>
      <div class="c-sec"><h3>📖 특징</h3><ol class="timeline">${g.history.map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>
    </div>`;
  document.getElementById('back').onclick=()=>history.back();
  window.scrollTo(0,0);
}

// ── 나의 도시 상세 ──
// 나의 도시 — 수기 메모(R2 클라우드 동기화 + 로컬 캐시). 이미지 API에 JSON 슬롯으로 저장.
const NOTES_SLOT='mycity_notes';
let CITY_NOTES={};
function loadCityNotes(){
  try{ CITY_NOTES = JSON.parse(localStorage.getItem('ca-mycity-notes')||'{}')||{}; }catch(_){ CITY_NOTES={}; }
  return fetch(`${IMG_API}/api/img/${NOTES_SLOT}?v=${Date.now()}`,{cache:'no-store'})
    .then(r=> r.ok ? r.json() : null)
    .then(o=>{ if(o && typeof o==='object' && !Array.isArray(o)){ CITY_NOTES={...CITY_NOTES, ...o};
      try{ localStorage.setItem('ca-mycity-notes', JSON.stringify(CITY_NOTES)); }catch(_){} } })
    .catch(()=>{});
}
function saveCityNotes(){
  try{ localStorage.setItem('ca-mycity-notes', JSON.stringify(CITY_NOTES)); }catch(_){}
  const tok=editToken(); if(!tok){ alert('편집 비밀번호가 필요해요 (✎ 편집 켜기).'); return; }
  fetch(`${IMG_API}/api/img/${NOTES_SLOT}`,{method:'PUT',
    headers:{'Content-Type':'application/json','X-Edit-Token':tok}, body:JSON.stringify(CITY_NOTES)})
    .then(res=>{ if(res.status===401){ alert('편집 비밀번호가 틀렸어요. 다시 켜서 입력해 주세요.'); localStorage.removeItem('ca-edit'); EDIT=false; route(); } })
    .catch(()=>alert('메모 저장 실패 — 네트워크 오류'));
}
function renderMyCity(id){
  const c=MY_CITIES[id]; if(!c){ renderGeoIndex(); return; }
  KIND='geo';
  const notes=CITY_NOTES[id]||[];
  const notesSec=`<div class="c-sec"><h3>📝 나의 메모${EDIT?` <button class="mc-add" id="mcAdd" type="button">＋ 내용 추가</button>`:''}</h3>`
    +(notes.length
      ? `<ol class="timeline mc-notes">${notes.map((t,i)=>`<li>${esc(t)}${EDIT?` <button class="mc-del" data-i="${i}" type="button" title="삭제">×</button>`:''}</li>`).join('')}</ol>`
      : `<div class="geo-more">${EDIT?'＋ 내용 추가 로 나만의 설명을 적어 보세요.':'✎ 편집 을 켜면 나만의 설명을 추가할 수 있어요.'}</div>`)
    +`</div>`;
  const svgCells=(c.svgMaps||[]).map(m=>
    `<div class="mapbox"><img class="c-map" src="assets/maps/geo/${m.src}" alt="${esc(m.label)} 지도" loading="lazy"><span class="mlabel">${esc(m.label)}</span></div>`).join('');
  const oldHas=IMG_SET.has(c.oldSlot);
  const oldCell=`<div class="mapbox oldmap" data-upslot="${esc(c.oldSlot)}">
      ${oldHas
        ? `<img class="c-map" src="${imgURL(c.oldSlot,'')}" alt="${esc(c.title)} 옛 지도">`
        : `<div class="oldmap-ph"><span class="oh-emo">🗺️</span><b>옛 지도</b><small>✎ 편집 켜고 ＋로 추가</small></div>`}
      <span class="mlabel">옛 지도</span></div>`;
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="back">‹ 한국지리</button><div class="bar-title">${c.emoji||'📍'} ${esc(c.title)}</div>
      <button class="bar-btn edit-btn ${EDIT?'on':''}" id="editBtn" title="옛 지도 편집">${EDIT?'✎ 편집중':'✎ 편집'}</button></div>
    <div class="geo-detail">
      ${c.sub?`<div class="mycity-sub">${esc(c.sub)}${c.badge?`<span class="mc-badge">${esc(c.badge)}</span>`:''}</div>`:''}
      <div class="geo-maps">${svgCells}${oldCell}</div>
      <div class="info-grid">${(c.info||[]).map(kv=>infoRow(kv[0],kv[1])).join('')}</div>
      <div class="c-sec"><h3>📖 이야기</h3><ol class="timeline">${(c.history||[]).map(h=>`<li>${esc(h)}</li>`).join('')}</ol></div>
      ${notesSec}
    </div>`;
  document.getElementById('back').onclick=()=>history.back();
  const eb=document.getElementById('editBtn'); if(eb) eb.onclick=toggleEdit;
  decorateUploads(APP);
  const addBtn=document.getElementById('mcAdd');
  if(addBtn) addBtn.onclick=()=>{ const t=prompt('추가할 내용을 입력하세요'); if(t&&t.trim()){ (CITY_NOTES[id]=CITY_NOTES[id]||[]).push(t.trim()); saveCityNotes(); renderMyCity(id); } };
  APP.querySelectorAll('.mc-del').forEach(b=>b.onclick=()=>{ const arr=CITY_NOTES[id]; if(arr){ arr.splice(+b.dataset.i,1); if(!arr.length) delete CITY_NOTES[id]; saveCityNotes(); renderMyCity(id); } });
  window.scrollTo(0,0);
}

// ── 한국역사 (① 시대별 역사 · ② 왕 계보) ──
function khEraHTML(){
  return `<div class="era-list">${KH_ERAS.map(e=>`
    <div class="era-card">
      <button class="era-head" type="button">
        <span class="era-emo">${e.emoji}</span>
        <span class="era-tt"><b>${esc(e.name)}</b><small>${esc(e.period)}</small></span>
        <span class="era-caret">▾</span>
      </button>
      <div class="era-sum">${esc(e.summary)}</div>
      <div class="era-body">
        <ol class="timeline">${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>
        ${(e.keywords&&e.keywords.length)?`<div class="chips">${e.keywords.map(k=>`<span>${esc(k)}</span>`).join('')}</div>`:''}
      </div>
    </div>`).join('')}</div>`;
}
function khDynHTML(){
  return `<div class="geo-grid">${KH_DYN_ORDER.map(id=>{ const d=KH_DYN[id]; return `
    <button class="geo-tile" data-dyn="${id}"><span class="tile-emo">${d.emoji}</span><b>${esc(d.name)}</b><small>${esc(d.period)}</small></button>`; }).join('')}</div>
    <div class="hint">👉 나라를 누르면 <b>대수·이름·재위연도</b> 계보가 나와요</div>`;
}
function renderKorHist(tab){
  KIND='korhist';
  tab = (tab==='dyn') ? 'dyn' : 'era';
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="home">‹ 홈</button><div class="bar-title">🇰🇷 한국역사</div></div>
    <div class="kh-wrap">
      <div class="kbs-tabs" role="tablist">
        <button class="kbs-tab ${tab==='era'?'on':''}" type="button" data-khtab="era">📖 시대별 역사</button>
        <button class="kbs-tab ${tab==='dyn'?'on':''}" type="button" data-khtab="dyn">👑 왕 계보</button>
      </div>
      <div class="kh-body" id="khBody">${tab==='era'?khEraHTML():khDynHTML()}</div>
    </div>`;
  document.getElementById('home').onclick=()=>history.back();
  function wireBody(){
    APP.querySelectorAll('.era-card .era-head').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
    APP.querySelectorAll('.geo-tile[data-dyn]').forEach(b=>b.onclick=()=>nav('khking='+b.dataset.dyn));
  }
  APP.querySelectorAll('.kbs-tab').forEach(t=>t.onclick=()=>{
    const which=t.dataset.khtab;
    APP.querySelectorAll('.kbs-tab').forEach(x=>x.classList.toggle('on',x===t));
    document.getElementById('khBody').innerHTML = which==='era'?khEraHTML():khDynHTML();
    history.replaceState(null,'','#korhist'+(which==='dyn'?'=dyn':''));
    wireBody();
  });
  wireBody();
  window.scrollTo(0,0);
}
function renderKorDynasty(id){
  const d=KH_DYN[id]; if(!d){ renderKorHist('dyn'); return; }
  KIND='korhist';
  APP.innerHTML=`
    <div class="bar"><button class="bar-btn" id="back">‹ 왕 계보</button><div class="bar-title">${d.emoji} ${esc(d.name)}</div><div class="bar-count">${d.kings.length}대</div></div>
    <div class="geo-detail">
      <div class="kh-sub">${esc(d.period)}${d.note?` · ${esc(d.note)}`:''}</div>
      <ol class="king-list">${d.kings.map(k=>`
        <li class="king-row">
          <span class="king-n">${k.n}대</span>
          <span class="king-name">${esc(k.name)}</span>
          <span class="king-reign">${esc(k.reign)}</span>
          ${k.note?`<span class="king-note">${esc(k.note)}</span>`:''}
        </li>`).join('')}</ol>
    </div>`;
  document.getElementById('back').onclick=()=>history.back();
  window.scrollTo(0,0);
}

// 앞으로 이동: 히스토리에 새 항목을 쌓고 해당 화면 렌더(뒤로가기로 이전 단계 복귀)
function nav(hash){ history.pushState(null,'','#'+hash); route(); }

function openDeck(kind, it=0, sd=0){
  if(kind==='geo'){ renderGeoIndex(); return; }
  if(!DECKS[kind]){ comingSoon(kind); return; }
  KIND=kind; FLAT = (kind==='heroes' || kind==='past');
  LIST = kind==='world'?COUNTRIES : kind==='kbo'?[{stand:true,n:'KBO 순위'}].concat(KBO) : kind==='heroes'?[{toc:true}].concat(HEROES) : kind==='past'?PAST_CITIES : [{hist:true,n:'월드컵 역사'}].concat(FOOT);
  it = Math.min(Math.max(it,0), LIST.length-1);
  PAGE = FLAT ? it : it*2 + (sd?1:0);
  renderDeck();
}

function route(){
  const h=location.hash.slice(1);
  const gm=h.match(/^geo(?:=([a-z0-9]+))?$/i);
  if(gm){ const x=gm[1];
    if(!x) renderGeoIndex();
    else if(GEO_SIDO[x]) renderGeoRegion(x);
    else if(typeof GEO_CITY!=='undefined' && GEO_CITY[x]) renderGeoCity(x);
    else if(typeof GEO_GU!=='undefined' && GEO_GU[x]) renderGeoGu(x);
    else renderGeoIndex();
    return; }
  const mc=h.match(/^mycity(?:=([a-z]+))?$/i);
  if(mc){ if(mc[1] && MY_CITIES[mc[1]]) renderMyCity(mc[1]); else renderGeoIndex(); return; }
  const kh=h.match(/^korhist(?:=([a-z]+))?$/i);
  if(kh){ renderKorHist(kh[1]||'era'); return; }
  const kd=h.match(/^khking=([a-z]+)$/i);
  if(kd){ if(typeof KH_DYN!=='undefined' && KH_DYN[kd[1]]) renderKorDynasty(kd[1]); else renderKorHist('dyn'); return; }
  const m=h.match(/^(world|kbo|foot|heroes|past)(?:=(\d+)\.(\d+))?$/);
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
Promise.all([loadImgSet(), loadCityNotes()]).then(route);   // 사진 목록 + 도시 메모 로드 후 렌더

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
