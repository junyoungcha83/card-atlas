// 앱 셸 오프라인 캐시. 캐시 이름 바꾸면 옛 캐시 자동 폐기.
const CACHE = 'card-atlas-v9';
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
const KBO_IMGS = ['jamsil','gocheok','ssg','kt','samsung','sajik','kia','nc','hanwha','m_doosan','m_kiwoom','m_kt','m_nc','m_ssg']
  .map(n => `./assets/kbo/${n}.jpg`)
  .concat(['e_doosan','e_lg','e_kiwoom','e_ssg','e_kt','e_samsung','e_lotte','e_kia','e_nc'].map(n => `./assets/kbo/${n}.png`));
const CORE = ['./','./index.html','./assets/app.css','./assets/app.js','./assets/data.js','./manifest.webmanifest','./assets/icon.svg',
  './assets/world.jpg','./assets/worldmap.svg',
  './assets/kr/hunmin.jpg','./assets/kr/semicon.jpg','./assets/kr/goguryeo.png','./assets/kr/dangun.jpg','./assets/kr/geobukseon.jpg','./assets/kr/ahn.jpg',
  ...KBO_IMGS];
const MAP_CODES = ['kr','us','jp','cn','gb','fr','de','it','es','ru','ca','au','in','br','mx','eg','za','sa','th','vn'];
const MAPS = MAP_CODES.map(c => `./assets/maps/${c}.svg`);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE).catch(()=>{});
    await Promise.all(MAPS.map(u => c.add(u).catch(()=>{})));
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
