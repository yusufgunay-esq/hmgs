/* ==========================================================================
   data.js — VERİ ERİŞİM KATMANI VE İNDEKSLER
   topics.js / questions.js global sabitleri okur, tek seferde indeksler.
   O(n) tam tarama yerine hazır Map'ler.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { loadMasterVault } from './vault-client.js';
import { setKitaplar } from './kitaplar.js';

/* examQ = ÖLÇÜLMÜŞ resmî dağılım (15 Eylül 2026'da KAYNAK DEĞİŞTİ).

   ÖNCEKİ KAYNAK YANLIŞTI. Bu tablo iki gerçek sınavın 238 sorusunun DERS
   ETİKETLERİNDEN türetilmişti. Ama o etiketlerin bir kısmı hatalı: ÖSYM blok
   sınırlarını kanunun adına göre değil konunun doğasına göre çiziyor, etiketleyici
   ise kanun adına bakmış. Ölçüm: 238 sorudan 11'i bulunduğu resmî blokla uyuşmuyor
   (ör. N26#46 simsarlık "borclar" etiketli ama Ticaret bloğunda; N26#115-117
   vatandaşlık/vize/tenfiz "milletlerarasi" etiketli ama MÖHUK bloğunda).
   Hatalı etiketten türetilen tablo 7 derste resmî dağılımdan sapıyordu.

   DOĞRU KAYNAK: HMGS Yönetmeliği (15 Ocak 2025 değişikliği) yüzde dağılımı.
   Aynı değerler `topics.js` → `SUBJECTS_DATA[].questionCount` alanında BİREBİR
   duruyor ve iki sınavın kitapçık numara aralıklarıyla da örtüşüyor. Tek
   doğruluk kaynağı o alandır; buradaki tablo onun aynasıdır ve
   `karma/test.mjs` ikisinin eşitliğini test eder.

   DÜZELTİLEN 7 DEĞER (etiketten türetilmiş → resmî):
     Borçlar          14 → 12      (2 ticari kurum yanlış derse yazılmıştı)
     Ticaret          11 → 12
     Vergi            5  → 3
     Vergi Usul       1  → 3
     Milletlerarası   5  → 3
     MÖHUK            1  → 3
     Genel Kamu       2  → 3

   NEDEN ÖNEMLİ: bu tablo karma setin ders payını belirler. Sapma doğrudan
   çalışma dağılımına geçiyordu — MÖHUK'un 115 sorusu havuzda dururken ders
   pratikte hiç gelmiyordu (pay 1/120). Düzeltmeden sonra 3/120. */
export const SUBJECTS = [

  { id: 'medeni_hukuk',        name: 'Medeni Hukuk',              tier: 1, examQ: 15 },
  { id: 'borclar_hukuku',      name: 'Borçlar Hukuku',            tier: 1, examQ: 12 },
  { id: 'hmk',                 name: 'Medeni Usul Hukuku (HMK)',  tier: 1, examQ: 12 },
  { id: 'ticaret_hukuku',      name: 'Ticaret Hukuku',            tier: 1, examQ: 12 },
  { id: 'ceza_hukuku',         name: 'Ceza Hukuku',               tier: 2, examQ: 9  },
  { id: 'anayasa_hukuku',      name: 'Anayasa Hukuku',            tier: 2, examQ: 6  },
  { id: 'idare_hukuku',        name: 'İdare Hukuku',              tier: 2, examQ: 6  },
  { id: 'icra_iflas',          name: 'İcra ve İflas Hukuku',      tier: 2, examQ: 6  },
  { id: 'cmk',                 name: 'Ceza Muhakemesi (CMK)',     tier: 2, examQ: 6  },
  { id: 'is_hukuku',           name: 'İş ve Sosyal Güvenlik',     tier: 2, examQ: 6  },
  { id: 'vergi_hukuku',        name: 'Vergi Hukuku',              tier: 3, examQ: 3  },
  { id: 'vergi_usul',          name: 'Vergi Usul Hukuku',         tier: 3, examQ: 3  },
  { id: 'milletlerarasi_hukuk',name: 'Milletlerarası Hukuk',      tier: 3, examQ: 3  },
  { id: 'mohuk',               name: 'Milletlerarası Özel Hukuk', tier: 3, examQ: 3  },
  { id: 'avukatlik',           name: 'Avukatlık Hukuku',          tier: 3, examQ: 3  },
  { id: 'anayasa_yargisi',     name: 'Anayasa Yargısı',           tier: 3, examQ: 3  },
  { id: 'iyuk',                name: 'İdari Yargılama Usulü',     tier: 3, examQ: 3  },
  { id: 'hukuk_felsefesi',     name: 'Hukuk Felsefesi ve Sos.',   tier: 3, examQ: 3  },
  { id: 'hukuk_tarihi',        name: 'Türk Hukuk Tarihi',         tier: 3, examQ: 3  },
  { id: 'genel_kamu',          name: 'Genel Kamu Hukuku',         tier: 3, examQ: 3  }
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map(s => [s.id, s]));
export const subjectName = id => (SUBJECT_BY_ID.get(id)?.name) || id || 'Bilinmeyen ders';

/**
 * v3 standardında sayılan görsel tipleri.
 * TEK DOĞRULUK KAYNAĞI MOTORDUR: bir tip yalnızca HMGSV3 onu gerçekten
 * çizebiliyorsa v3 sayılır. Aksi halde "ilan edilmiş ama boş kutu basan"
 * konular istatistikte tamam görünür — 25 Tem'de tam bu tuzağa düşüldü.
 * Motor yüklenmemişse bilinen listeye düşülür (yalnızca sayım için).
 */
const V3_FALLBACK = [
  'decision_sim', 'drag_classify', 'time_slider', 'calculator',
  'scene_story', 'scene_simulator', 'guess_table', 'step_reveal', 'interactive_hierarchy',
  'family_tree', 'fill_slots', 'predict_then_explore'
];

export function isV3(kind) {
  if (!kind) return false;
  const eng = typeof window !== 'undefined' ? window.HMGSV3 : null;
  if (eng && typeof eng.supports === 'function') return eng.supports(kind);
  return V3_FALLBACK.includes(kind);
}

/** Geriye dönük uyum: `V3_TYPES.has(x)` çağrıları çalışmaya devam eder. */
export const V3_TYPES = { has: isV3 };

export let TOPICS = [];

export let QUESTIONS = [];

export const topicById = new Map();
export const topicsBySubject = new Map();
export const questionsBySubject = new Map();
export const questionsByTopic = new Map();
export const questionById = new Map();
export const questionsByTarget = new Map();

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
}

/* ==========================================================================
   SORU DÜZEYİ MEVZUAT DAYANAĞI TÜRETİMİ (konu → soru)

   Ölçüm (14 Eylül 2026, data/hmgs_vault.json): 3065 sorunun 2455'inde
   legalBasis alanı YOK. Konu kartlarında ise 124/124 dolu ve dizi hâlinde
   (["TMK m. 8", "TMK m. 9", …]). Eksik soruların gerekçe metninden madde
   çıkarmak işe yaramıyor: yalnızca 35/2455 (%1,4) gerekçesinde madde
   referansı geçiyor. Doğru kaynak sorunun kendi topicId'si — join 2301
   soruyu kapsıyor, 0 boşta kalıyor. Kalan 154 kayıtta topicId null
   (hepsi muessir_2026_cikmis); onlara dayanak UYDURULMAZ.

   Birleştirme bilinçli olarak burada, tüm veri yollarının geçtiği
   populateData'da yapılır: loadMasterVault() önce globals'a (questions.js),
   sonra IndexedDB'ye, sonra Drive kopyasına bakar — üçü de buradan geçer.
   Yalnızca vault JSON'unu düzeltmek dağıtım kopyasını düzeltir ama
   questions.js yolunu boşta bırakırdı.

   ui.js'teki groupLegalRefs ile AYNI sıkıştırma uygulanır: konu dizisini ham
   kopyalamak ortalama 133, en kötü 511 karakterlik künye üretiyordu, hedef
   ise satır sınırı olmayan bir çip (`.feedback .basis` → inline-block). Kanun
   adı bir kez yazılır, maddelerin yalnızca numarası toplanır. Kopyanın
   sebebi: ui.js'i veri katmanına bağlamak, render katmanındaki bir imza
   değişikliğini tüm uygulamanın import hatasına çevirirdi.
   ========================================================================== */

const DERIVED_BASIS_MAX = 72;   // çip tek satırda kalsın

/** legalBasis'i (metin veya dizi) temiz künye kalemlerine çevirir. */
function asRefList(raw) {
  if (!raw) return [];
  const out = [];
  for (const chunk of (Array.isArray(raw) ? raw : [raw])) {
    for (const part of String(chunk).split(/[,;]/)) {
      const s = part.trim();
      if (s) out.push(s);
    }
  }
  return out;
}

/** Künyeyi gruplayıp kırpar — ui.groupLegalRefs ile aynı algoritma. */
function groupBasis(refs, max = DERIVED_BASIS_MAX) {
  const order = [];
  const byLaw = new Map();
  const prose = [];

  for (const item of refs) {
    // "TMK m. 8" · "4857 sk m. 2/4" · "1982 AY m. 13-15"
    const m = /^([^—–]{0,40}?)\s*\bm\.\s*(\d[\w\/.\-]*)$/i.exec(item);
    if (m) {
      const law = m[1].trim() || '—';
      const art = m[2].trim();
      if (!byLaw.has(law)) { byLaw.set(law, []); order.push(law); }
      const list = byLaw.get(law);
      if (!list.includes(art)) list.push(art);
    } else {
      prose.push(item);
    }
  }

  const groups = order.map(law => `${law} m. ${byLaw.get(law).join(', ')}`);
  const statute = /(sayılı|Kanun|Anayasa|\bAY\b|Sözleşme|\bsk\b|Tüzük|Yönetmelik|KHK)/i;
  const cites = prose.filter(p => p.length <= 45 && statute.test(p));
  const joined = [...groups, ...cites].join(' · ');

  // Boş dönüş BİLİNÇLİ: konunun legalBasis'ı yalnızca doktrin/künye içeriyorsa
  // soruya dayanak YAZILMAZ. Ölçülen etki: 116 soru — tpc_felsefe_001/002/003
  // (112) ve tpc_genel_kamu_001 (4). O konuların legalBasis'ı "Thomas Aquinas —
  // Lex Aeterna", "Hugo Grotius — De Jure Belli ac Pacis (1625)" gibi eser
  // adlarıdır; bunları mevzuat künyesi gibi basmak öğrenciye olmayan bir kanun
  // dayanağı gösterir (AGENTS.md §0.2/4). Doktrin şeritte okunur, rozette değil.
  //
  // tpc_genel_kamu_001 neden listeye dahil: tek madde biçimli kalemi
  // "1982 Anayasası m. 6 (…) & m. 80 (…)" doktrin metniyle AYNI kalemde durur ve
  // bu rozet ETİKETSİZ basılır (.feedback .basis, studio.css:831) — Rousseau/Locke
  // sorusunun altında o kalem sanki o sorunun dayanağıymış gibi okunur. Kalemin
  // kazandırdığı 4 soru, riske ettiği yanlış atfı karşılamıyor.
  // ui.groupLegalRefs de aynı konuda bu kalemi yüzeye çıkarmaz (doktrin
  // betimlemesine düşer) — yani '' dönüşü, uygulamanın başka yerinde GÖSTERİLEN
  // bir kanunu gizlemiyor. ui.js KONU kartıdır, burası SORU künyesidir.
  if (!joined) return '';

  if (joined.length <= max) return joined;

  // Bütçe aşıldı: maddeler ORTADAN kesilmez (yanlış atıf riski), kuyruk
  // düşer ve görünür bir "…" bırakılır. Uzun betimleyici kalemler (Hukuk
  // Felsefesi, Genel Kamu) zaten şerit değil içerik malzemesidir.
  const cut = joined.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  const head = (sp > max * 0.6 ? cut.slice(0, sp) : cut)
    .replace(/\s*[,;·]\s*$/, '').trim();
  return head ? head + '…' : joined.slice(0, max);
}

/**
 * Konu düzeyindeki legalBasis'ı soruya taşır.
 * Soru kendi künyesini taşıyorsa DOKUNMAZ; topicId yoksa uydurmaz.
 */
function deriveBasis(q) {
  const own = q.legalBasis;
  if (typeof own === 'string' ? own.trim() : own) return;

  const t = q.topicId ? topicById.get(q.topicId) : null;
  if (!t) return;

  const refs = asRefList(t.legalBasis);
  if (!refs.length) return;

  const s = groupBasis(refs);
  if (!s) return;

  q.legalBasis = s;                 // string — consumer'lar esc(q.legalBasis) bekliyor
  q.legalBasisSource = 'topic';     // türetilmiş: denetlenebilir kalsın
}

/**
 * Klasik script'teki `const X = [...]` global lexical scope'a gider ama
 * window'a otomatik BAĞLANMAZ. Bu yüzden iki yoldan da deniyoruz:
 * önce window özelliği, sonra çıplak global. Sessiz boş dizi dönmüyoruz.
 */
function readGlobal(...names) {
  for (const n of names) {
    if (typeof window !== 'undefined' && Array.isArray(window[n])) return window[n];
  }
  // Çıplak global (window'a bağlanmamış top-level const)
  for (const n of names) {
    try {
      const v = new Function(`return typeof ${n} !== 'undefined' ? ${n} : undefined;`)();
      if (Array.isArray(v)) return v;
    } catch (e) { /* yok */ }
  }
  return [];
}

export function populateData(vaultData) {
  TOPICS = (vaultData.topics || []).slice();
  QUESTIONS = (vaultData.questions || []).slice();
  setKitaplar(vaultData.kitaplar);   // kitap envanteri de ayni kapi: tek gecis noktasi

  topicById.clear();
  topicsBySubject.clear();
  questionsBySubject.clear();
  questionsByTopic.clear();
  questionById.clear();
  questionsByTarget.clear();

  TOPICS.sort((a, b) => (a.order || 0) - (b.order || 0));

  TOPICS.forEach(t => {
    topicById.set(t.id, t);
    push(topicsBySubject, t.subjectId, t);
  });
  QUESTIONS.forEach(q => {
    deriveBasis(q);   // konu künyesini soruya taşı (soru doluysa dokunmaz)
    questionById.set(q.id, q);
    push(questionsBySubject, q.subjectId, q);
    if (q.topicId && topicById.has(q.topicId)) push(questionsByTopic, q.topicId, q);
    const target = q.examTarget || 'hmgs_core';
    push(questionsByTarget, target, q);
  });

  return integrity();
}

export async function initDataAsync() {
  const res = await loadMasterVault();

  if (res.needAuth || (!res.questions.length && !res.topics.length)) {
    return { needAuth: true, questions: 0, topics: 0 };
  }

  const rep = populateData(res);
  rep.source = res.source;
  rep.syncedAt = res.syncedAt;
  return rep;
}

export function initData() {
  TOPICS = readGlobal('TOPICS_DATA', 'TOPICS').slice();
  QUESTIONS = readGlobal('QUESTIONS_DATA', 'QUESTIONS').slice();

  if (!TOPICS.length && !QUESTIONS.length) {
    return { questions: 0, topics: 0, needAsync: true };
  }

  return populateData({ topics: TOPICS, questions: QUESTIONS });
}


/** Veri bütünlüğü raporu — konsola yazılır, ilerleme ekranında gösterilir. */
export function integrity() {
  const orphans = QUESTIONS.filter(q => !q.topicId || !topicById.has(q.topicId));
  const broken = QUESTIONS.filter(q => q.topicId && !topicById.has(q.topicId));
  const emptySubjects = SUBJECTS.filter(s => !(questionsBySubject.get(s.id) || []).length);
  const untagged = QUESTIONS.filter(q => !q.difficulty || q.difficulty === 'etiketsiz');
  const legacyTopics = TOPICS.filter(t => !V3_TYPES.has(t.visualType));
  const derivedBasis = QUESTIONS.filter(q => q.legalBasisSource === 'topic').length;
  const missingBasis = QUESTIONS.filter(q => !q.legalBasis).length;
  const rep = {
    topics: TOPICS.length,
    questions: QUESTIONS.length,
    orphanQuestions: orphans.length,
    brokenTopicIds: broken.length,
    emptySubjects: emptySubjects.map(s => s.name),
    untaggedDifficulty: untagged.length,
    v3Topics: TOPICS.length - legacyTopics.length,
    legacyTopics: legacyTopics.length,
    // Mevzuat dayanağı: derivedBasis konudan türetildi (2185); missingBasis hâlâ
    // boş (270 = 154 topicId'siz + 116 doktrin konusu). Uydurma yok, sessiz kayıp yok.
    derivedBasis,
    missingBasis
  };
  console.info('[veri bütünlüğü]', rep);
  return rep;
}

export const topicsOf = id => topicsBySubject.get(id) || [];
export const questionsOf = (id, scope = 'all') => {
  const list = questionsBySubject.get(id) || [];
  if (scope === 'core') return list.filter(q => q.examTarget === 'hmgs_core');
  return list;
};
export const questionsOfTopic = (id, scope = 'all') => {
  const list = questionsByTopic.get(id) || [];
  if (scope === 'core') return list.filter(q => q.examTarget === 'hmgs_core');
  return list;
};
export const questionsOfTopics = (ids = [], scope = 'all') => {
  const set = new Set(ids);
  const out = [];
  for (const id of set) {
    const qs = questionsByTopic.get(id) || [];
    for (const q of qs) {
      if (scope === 'all' || q.examTarget === 'hmgs_core') out.push(q);
    }
  }
  return out;
};

export function filterQuestions(pool, scope = 'core') {
  if (scope === 'all') return pool;
  return pool.filter(q => q.examTarget === 'hmgs_core');
}

/** Deterministik olmayan karıştırma (Fisher-Yates). */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Gerçek sınav dağılımına göre deneme seti kurar.
 * Havuz yetersizse eksiği rapor eder — sessizce dolgu yapmaz.
 */
export function buildExamSet(onlyTagged = false, scope = 'core') {
  const picked = [];
  const shortfall = [];
  SUBJECTS.forEach(s => {
    let rawPool = questionsOf(s.id, scope);
    if (onlyTagged) {
      rawPool = rawPool.filter(q => q.topicId && topicById.has(q.topicId));
    }
    if (rawPool.length < s.examQ && scope === 'core') {
      rawPool = questionsOf(s.id, 'all');
      if (onlyTagged) {
        rawPool = rawPool.filter(q => q.topicId && topicById.has(q.topicId));
      }
    }
    const pool = shuffle(rawPool);
    const take = pool.slice(0, s.examQ);
    if (take.length < s.examQ) shortfall.push({ subject: s.name, want: s.examQ, got: take.length });
    picked.push(...take);
  });
  return { questions: shuffle(picked), shortfall };
}

/* ==========================================================================
   GERÇEK ÇIKMIŞ SORULAR
   `category === 'Çıkmış Sorular'` (source: hmgs_2026_nisan, hmgs_2025_eylul)
   — resmi HMGS sınavlarından, uydurma/pekiştirme değil. questions.js'teki
   veri zaten bunu işaretliyor; burada sadece erişim/etiket katmanı var.
   ========================================================================== */

const PAST_EXAM_LABELS = {
  hmgs_2026_nisan: 'HMGS Nisan 2026',
  hmgs_2025_eylul: 'HMGS Eylül 2025'
};

export const isPastExam = q => q.category === 'Çıkmış Sorular';

/** Tüm çıkmış sorular, kaynağa göre filtrelenebilir. Sınav numarasına göre sıralı (orijinal sırayla). */
export function pastExamQuestions(sourceId = null) {
  return QUESTIONS
    .filter(q => isPastExam(q) && (!sourceId || q.source === sourceId))
    .sort((a, b) => (a.qNumber || 0) - (b.qNumber || 0));
}

/** Mevcut çıkmış sınavların listesi — veri neyi içeriyorsa onu gösterir, sabit liste yazılmaz. */
export function pastExamList() {
  const bySource = new Map();
  QUESTIONS.forEach(q => {
    if (!isPastExam(q)) return;
    if (!bySource.has(q.source)) bySource.set(q.source, 0);
    bySource.set(q.source, bySource.get(q.source) + 1);
  });
  return [...bySource.entries()]
    .map(([id, count]) => ({ id, label: PAST_EXAM_LABELS[id] || id, count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'tr'));
}
