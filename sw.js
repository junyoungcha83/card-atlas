// 앱 셸 오프라인 캐시. 캐시 이름 바꾸면 옛 캐시 자동 폐기.
const CACHE = 'card-atlas-v14';
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
const KBO_IMGS = ['jamsil','gocheok','ssg','kt','samsung','sajik','kia','nc','hanwha','m_doosan','m_kiwoom','m_kt','m_nc','m_ssg']
  .map(n => `./assets/kbo/${n}.jpg`)
  .concat(['e_doosan','e_lg','e_kiwoom','e_ssg','e_kt','e_samsung','e_lotte','e_kia','e_nc'].map(n => `./assets/kbo/${n}.png`));
const CORE = ['./','./index.html','./assets/app.css','./assets/app.js','./assets/data.js','./manifest.webmanifest','./assets/icon.svg',
  './assets/world.jpg','./assets/worldmap.svg','./assets/legends.js',
  './assets/kr/hunmin.jpg','./assets/kr/semicon.jpg','./assets/kr/goguryeo.png','./assets/kr/dangun.jpg','./assets/kr/geobukseon.jpg','./assets/kr/ahn.jpg',
  ...KBO_IMGS];
const MAP_CODES = ['kr','us','jp','cn','gb','fr','de','it','es','ru','ca','au','in','br','mx','eg','za','sa','th','vn'];
const MAPS = MAP_CODES.map(c => `./assets/maps/${c}.svg`);
const CONF_IMGS=['uefa','conmebol','concacaf','afc','caf'].map(n=>`./assets/conf/${n}.png`);
const LEGEND_IMGS=['./assets/legends/l0.jpg','./assets/legends/l1.jpg','./assets/legends/l11.jpg','./assets/legends/l12.jpg','./assets/legends/l13.jpg','./assets/legends/l14.jpg','./assets/legends/l15.jpg','./assets/legends/l16.jpg','./assets/legends/l17.jpg','./assets/legends/l18.jpg','./assets/legends/l19.jpg','./assets/legends/l2.jpg','./assets/legends/l24.jpg','./assets/legends/l27.jpg','./assets/legends/l28.jpg','./assets/legends/l3.jpg','./assets/legends/l30.jpg','./assets/legends/l31.jpg','./assets/legends/l32.png','./assets/legends/l33.jpg','./assets/legends/l35.jpg','./assets/legends/l36.jpg','./assets/legends/l39.jpg','./assets/legends/l45.jpg','./assets/legends/l46.jpg','./assets/legends/l47.jpg','./assets/legends/l48.jpg','./assets/legends/l49.jpg','./assets/legends/l5.jpg','./assets/legends/l50.jpg','./assets/legends/l52.jpg','./assets/legends/l53.jpg','./assets/legends/l54.jpg','./assets/legends/l55.jpg','./assets/legends/l56.jpg','./assets/legends/l57.jpg','./assets/legends/l59.png','./assets/legends/l6.jpg','./assets/legends/l61.jpg','./assets/legends/l63.jpg','./assets/legends/l66.jpg','./assets/legends/l68.jpg','./assets/legends/l69.jpg','./assets/legends/l70.jpg','./assets/legends/l71.jpg','./assets/legends/l76.jpg','./assets/legends/l77.jpg','./assets/legends/l79.jpg','./assets/legends/l80.jpg','./assets/legends/l83.jpg','./assets/legends/l86.jpg','./assets/legends/l9.jpg','./assets/legends/l90.jpg','./assets/legends/l91.jpg','./assets/legends/l92.jpg','./assets/legends/l94.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE).catch(()=>{});
    await Promise.all(MAPS.map(u => c.add(u).catch(()=>{})));
    await Promise.all(LEGEND_IMGS.map(u => c.add(u).catch(()=>{})));
    await Promise.all(CONF_IMGS.map(u => c.add(u).catch(()=>{})));
  }));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// 같은 출처는 네트워크 우선+캐시. 국기(flagcdn)는 캐시 우선(오프라인 대비).
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'flagcdn.com') {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{}); return res;
    }).catch(()=>r)));
    return;
  }
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{}); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
