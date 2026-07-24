// 호환 shim — 실제 로직은 tools/build-geo-sub.mjs 로 이동했다.
// 기존 명령 `node scripts/build-geo-sub.mjs` 을 그대로 유지하기 위한 얇은 래퍼.
// (대상 모듈이 import.meta.url 로 ROOT 를 계산하므로 입력 tools/_provinces.json·_muni.json·출력 assets/maps/geo/ 는 불변)
import '../tools/build-geo-sub.mjs';
