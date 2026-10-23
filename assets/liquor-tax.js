// 세계의 술 — 분류 사전(표준 명칭). 술 데이터(liquor.js)는 여기 id 만 쓴다.
// 이름을 바꿀 땐 여기만 고치면 된다. 새 국가·원료·주종은 여기에 추가한 뒤 데이터에서 id 로 연결한다.
//
// 구분 원칙(작업 지시서 3-2)
//  A. 계층형 분류 — LQ_REGIONS(대륙→국가), LQ_MATERIALS(원료 유형→원료), LQ_STYLES(주종→세부 주종)
//  B. 다중 선택 태그 — LQ_METHODS(제조 방식), LQ_TECH(발효·증류 기술), LQ_AGING(숙성), LQ_FLAVORS(향미), LQ_USES(음용 목적)
//  C. 개별 제품 정보 — 각 술 데이터의 legal·brands 등(여기엔 없음)

// ── 분류 2. 지역·국가 (대륙 → 국가). 국가는 계속 추가할 수 있다 ──
const LQ_REGIONS = [
  { id:'asia', name:'아시아', countries:[
    ['kr','한국','🇰🇷'],['cn','중국','🇨🇳'],['jp','일본','🇯🇵'],['in','인도','🇮🇳'],
    ['th','태국','🇹🇭'],['vn','베트남','🇻🇳'],['mn','몽골','🇲🇳']] },
  { id:'europe', name:'유럽', countries:[
    ['fr','프랑스','🇫🇷'],['it','이탈리아','🇮🇹'],['de','독일','🇩🇪'],['be','벨기에','🇧🇪'],
    ['sct','스코틀랜드','🏴'],['eng','잉글랜드','🏴'],['ie','아일랜드','🇮🇪'],['es','스페인','🇪🇸'],
    ['pt','포르투갈','🇵🇹'],['gr','그리스','🇬🇷'],['pl','폴란드','🇵🇱'],['cz','체코','🇨🇿']] },
  { id:'namerica', name:'북아메리카', countries:[['us','미국','🇺🇸'],['mx','멕시코','🇲🇽'],['ca','캐나다','🇨🇦'],['cu','쿠바','🇨🇺']] },
  { id:'samerica', name:'남아메리카', countries:[['ar','아르헨티나','🇦🇷'],['cl','칠레','🇨🇱'],['br','브라질','🇧🇷']] },
  { id:'africa', name:'아프리카', countries:[['et','에티오피아','🇪🇹']] },
  { id:'oceania', name:'오세아니아', countries:[['au','호주','🇦🇺'],['nz','뉴질랜드','🇳🇿']] },
];

// ── 분류 1. 제조 방식 (서로 배타적이지 않음 — 한 술에 여러 개) ──
const LQ_METHODS = {
  fermented:'발효주', distilled:'증류주', fortified:'강화주', infused:'침출주',
  aromatized:'가향주', liqueur:'리큐르', mixed:'혼합주·칵테일', compound:'기타 복합 제조',
};

// ── 분류 3. 원료 (원료 유형 → 원료) ──
const LQ_MATERIALS = [
  { id:'grain', name:'곡물', items:{ rice:'쌀', barley:'보리', wheat:'밀', sorghum:'수수', corn:'옥수수', rye:'호밀', millet:'기장', buckwheat:'메밀', grain:'곡물(기타·여러 곡물)' } },
  { id:'fruit', name:'과일', items:{ grape:'포도', apple:'사과', pear:'배', ume:'매실', bokbunja:'복분자', cherry:'체리', citrus:'감귤류', cashew_apple:'캐슈애플' } },
  { id:'sugar', name:'당질 원료', items:{ sugarcane:'사탕수수', molasses:'당밀', honey:'꿀' } },
  { id:'plant', name:'기타 식물성 원료', items:{ agave:'아가베', potato:'감자', sweet_potato:'고구마', palm_sap:'야자 수액', herb:'허브·약초', juniper:'주니퍼베리', anise:'아니스', coffee:'커피', coconut:'코코넛 수액', flower:'꽃(진달래 등)' } },
  { id:'dairy', name:'유제품', items:{ mare_milk:'말젖' } },
  { id:'mix', name:'복합 원료', items:{ spirits:'여러 술(칵테일 재료)', neutral:'주정(중성 알코올)' } },
];

// ── 분류 4. 주종·세부 유형 — 같은 id 가 여러 묶음에 들어갈 수 있다(교차 분류) ──
const LQ_STYLE_NAMES = {
  red:'레드 와인', white:'화이트 와인', rose:'로제 와인', sparkling:'스파클링 와인', fortified_wine:'강화 와인', aromatized_wine:'가향 와인', wine:'와인',
  lager:'라거', pilsner:'필스너', helles:'헬레스', ale:'에일', ipa:'IPA', stout:'스타우트', porter:'포터', wheat:'밀맥주', lambic:'람빅·자연발효 맥주', sour:'사워 맥주',
  whisky:'위스키', brandy:'브랜디', vodka:'보드카', gin:'진', rum:'럼', tequila:'데킬라', mezcal:'메스칼', baijiu:'백주', soju:'소주', shochu:'쇼추', awamori:'아와모리',
  grappa:'그라파', cachaca:'카샤사', armagnac:'아르마냑', cognac:'코냑', calvados:'칼바도스', ouzo:'우조', tsipouro:'치푸로', feni:'페니',
  makgeolli:'막걸리', yakju:'약주', cheongju:'청주', soju_trad:'증류식 소주', soju_diluted:'희석식 소주', fruit_wine_kr:'과실주(한국)',
  huangjiu:'황주', mijiu:'미주', sake:'사케(니혼슈)', mirin:'미린', kr_trad_spirit:'한국 전통 증류주', kr_trad_ferm:'한국 전통 발효주', umeshu:'우메슈', doburoku:'도부로쿠', airag:'아이락', rice_wine:'쌀 발효주', palm_wine:'야자주',
  port:'포트', sherry:'셰리', madeira:'마데이라', vdn:'뱅 두 나튀렐', marsala:'마르살라', vermouth:'베르무트',
  limoncello:'리몬첼로', amaro:'아마로', chartreuse:'샤르트뢰즈', benedictine:'베네딕틴', kahlua:'칼루아', herbal_liqueur:'허브·과일 리큐르',
  cider:'사이다(사과 발효주)', tej:'테지', local_ferm:'지역 전통 발효주',
  negroni:'네그로니', martini:'마티니', mojito:'모히토', daiquiri:'다이키리', mai_tai:'마이타이', americano:'아메리카노', spritz:'스프리츠', cocktail:'기타 칵테일',
};
const LQ_STYLES = [
  { id:'g_wine', name:'와인', emoji:'🍷', items:['wine','red','white','rose','sparkling','fortified_wine','aromatized_wine','vermouth'] },
  { id:'g_beer', name:'맥주', emoji:'🍺', items:['lager','pilsner','helles','ale','ipa','stout','porter','wheat','lambic','sour'] },
  { id:'g_spirit', name:'증류주', emoji:'🥃', items:['whisky','brandy','vodka','gin','rum','tequila','mezcal','baijiu','soju','shochu','awamori','grappa','cachaca','armagnac','cognac','calvados','ouzo','tsipouro','feni','kr_trad_spirit'] },
  { id:'g_asian', name:'아시아 전통주', emoji:'🍶', items:['makgeolli','yakju','cheongju','soju_trad','soju_diluted','fruit_wine_kr','baijiu','huangjiu','mijiu','sake','shochu','awamori','umeshu','doburoku','mirin','airag','rice_wine','palm_wine','kr_trad_spirit','kr_trad_ferm'] },
  { id:'g_fortified', name:'강화주', emoji:'🍇', items:['port','sherry','madeira','vdn','marsala'] },
  { id:'g_liqueur', name:'리큐르·가향주', emoji:'🌿', items:['limoncello','amaro','chartreuse','benedictine','kahlua','umeshu','vermouth','herbal_liqueur'] },
  { id:'g_other', name:'기타 발효주', emoji:'🍯', items:['cider','tej','palm_wine','local_ferm'] },
  { id:'g_cocktail', name:'칵테일', emoji:'🍸', items:['negroni','martini','mojito','daiquiri','mai_tai','americano','spritz','cocktail'] },
];

// ── 분류 5. 발효·증류 기술 — 실제로 확인된 것만 데이터에 넣는다 ──
const LQ_TECH = [
  { id:'ferm', name:'발효 방식', items:{ single_ferm:'단일 발효', parallel:'병행복발효', spontaneous:'자연발효', mixed_ferm:'혼합 발효', second_bottle:'병 속 2차 발효', second_tank:'탱크 속 2차 발효(샤르마 방식)' } },
  { id:'agent', name:'발효제', items:{ yeast:'효모', nuruk:'누룩', koji:'코지(입국)', qu:'곡(麴, 중국 발효제)', grain_starter:'기타 곡물 발효제' } },
  { id:'still', name:'증류 방식·장치', items:{ pot:'단식 증류', double:'2회 증류', continuous:'연속식 증류', copper_pot:'구리 포트 스틸', column:'컬럼 스틸' } },
  { id:'other', name:'기타 공정', items:{ filtration:'여과·정제', infusion:'침출·향미 추출', blending:'혼합·블렌딩', mutage:'발효 중 주정 첨가(뮤타주)', solid_ferm:'고체 발효' } },
];

// ── 분류 6. 숙성·저장 방식 (기간·용기는 술 데이터의 다른 칸) ──
const LQ_AGING = {
  unaged:'비숙성', oak:'오크통 숙성', other_wood:'기타 목재통', earthenware:'도자기·항아리', bottle:'병 숙성',
  oxidative:'산화 숙성', heated:'가열 숙성', solera:'솔레라 방식', biological:'플로르(효모막) 숙성', traditional:'기타 전통 숙성', varies:'제품별로 다름',
};

// ── 분류 8. 향미 (일반적 특성인지 제품 시음인지는 술 데이터의 flavorBasis 로 구분) ──
const LQ_FLAVORS = {
  apple:'사과', pear:'배', berry:'베리', citrus:'감귤', tropical:'열대과일', dried_fruit:'말린 과일',
  floral:'꽃', grain:'곡물', honey:'꿀', herbal:'허브', spice:'향신료', nutty:'견과류', oak:'오크',
  vanilla:'바닐라', smoky:'훈연', earthy:'흙·미네랄', yeasty:'효모·발효 향', roasted:'로스팅(커피·초콜릿)', hoppy:'홉',
  sweet:'단맛', sour:'산미', bitter:'쓴맛', umami:'감칠맛', body:'묵직한 바디',
};

// ── 분류 9. 음용·활용 목적 ──
const LQ_USES = {
  aperitif:'식전주', with_meal:'식중주', digestif:'식후주', pairing:'음식 페어링',
  cocktail_base:'칵테일 베이스', cooking:'조리용', ritual:'전통 의례·축제', other:'기타',
};

// 술 종류 구분 — 일반 유형과 개별 제품, 칵테일을 섞지 않는다(지시서 7·8장)
const LQ_KINDS = { type:'술의 유형', product:'개별 제품', cocktail:'칵테일' };

// ── 조회 도우미 ──
const LQ_COUNTRY = {}; const LQ_CONTINENT_OF = {};
LQ_REGIONS.forEach(r => r.countries.forEach(([id,name,flag]) => { LQ_COUNTRY[id] = { id, name, flag, continent:r.id }; LQ_CONTINENT_OF[id] = r.id; }));
const LQ_MATERIAL = {}; LQ_MATERIALS.forEach(g => Object.entries(g.items).forEach(([id,name]) => { LQ_MATERIAL[id] = { id, name, group:g.id }; }));
const LQ_TECH_NAME = {}; LQ_TECH.forEach(g => Object.assign(LQ_TECH_NAME, g.items));
