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
import { setVaultLabels, arsivLabel, denemeLabel } from './labels.js';

/* examQ = ÖLÇÜLMÜŞ resmî dağılım (15 Eylül 2026'da KAYNAK DEĞİŞTİ).

   ÖNCEKİ KAYNAK YANLIŞTI. Bu tablo iki arşiv sınavının 238 sorusunun DERS
   ETİKETLERİNDEN türetilmişti. Ama o etiketlerin bir kısmı hatalı: Arşiv sınavı blok
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
   (hepsi aynı kaynak grubundan); onlara dayanak UYDURULMAZ.

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
  const rawQuestions = (vaultData.questions || []).slice();
  const aiQuestions = readGlobal('QUESTIONS_AI_DATA', 'QUESTIONS_AI');
  const seen = new Set(rawQuestions.map(q => q.id));
  const extraAi = aiQuestions.filter(q => q && q.id && !seen.has(q.id));
  QUESTIONS = rawQuestions.concat(extraAi);
  setKitaplar(vaultData.kitaplar);   // kitap envanteri de ayni kapi: tek gecis noktasi

  // Drive kasasından gelen dinamik etiketleri bağla
  const labels = Object.assign({}, vaultData.examLabels || {});
  if (!Object.keys(labels).length && QUESTIONS.length) {
    QUESTIONS.forEach(q => {
      if (q.source && !labels[q.source] && q.sourceBadgeLabel) {
        labels[q.source] = q.sourceBadgeLabel.replace(/[📌🧩📕📖📝]/g, '').trim().split('·')[0].trim();
      }
    });
  }
  if (Object.keys(labels).length || vaultData.sections) {
    setVaultLabels({
      examLabels: labels,
      sections: vaultData.sections || null
    });
  }

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
  const baseQuestions = readGlobal('QUESTIONS_DATA', 'QUESTIONS').slice();
  const aiQuestions = readGlobal('QUESTIONS_AI_DATA', 'QUESTIONS_AI');
  const seen = new Set(baseQuestions.map(q => q.id));
  const extra = aiQuestions.filter(q => q && q.id && !seen.has(q.id));
  QUESTIONS = baseQuestions.concat(extra);

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

/* ==========================================================================
   HEDEF VE KATMAN
   ----------------------------------------------------------------------
   examTarget iki etiket taşıyor: 'hmgs_core' ve 'hmgs'.
   İkisi de HMGS havuzudur; tek ölçüt aşağıdaki isCoreTarget'tır.

   Katman (tier) sınav YAKINLIĞIDIR, zorluk değil. Dört katman:
     1 = çıkmış arşiv sorular   (category 'Çıkmış Sorular')
     2 = deneme setleri         (deneme kaynağı)
     3 = HMGS benzeri (AI)      (source ai_* / id hmgsai_*)
         MODEL ÖNCELİĞİ: Opus > Sonnet > Gemini > etiketsiz.
     4 = ileri düzey banka      (kalan sorular; HMGS'den daha derin düzey)
   Soru seçimi bu sıraya göre yapılır (engine.js: candidatesOf/secByTier).
   ========================================================================== */
export const TIER_REAL = 1, TIER_DENEME = 2, TIER_AI = 3, TIER_ADV = 4;

export function tierOf(q) {
  if (!q) return TIER_ADV;
  if (q.category === 'Çıkmış Sorular') return TIER_REAL;
  const src = String(q.source || '');
  if (/deneme/i.test(src) || /_d\d+_/i.test(String(q.id || ''))) return TIER_DENEME;
  if (/^(ai_|hmgsai)/i.test(src) || String(q.id).startsWith('hmgsai_')) return TIER_AI;
  return TIER_ADV;
}

/** HMGS benzeri (AI) sorular arasında model önceliği (küçük = önce).
 *  Kullanıcı kararı, 23 Eylül 2026: "ai sorularında da sıralama opus sonnet
 *  ve gemini olsun." Sorunun kendi `model` alanı ya da `examMeta.model`
 *  okunur (questions_ai.js: "Opus 5" / "Sonnet 5" / "3.8 Flash"). Yalnız
 *  TIER_AI içindeki sırayı belirler, katman DEĞİŞTİRMEZ. */
export function aiModelRank(q) {
  const m = String(q?.model || q?.examMeta?.model || '').toLowerCase();
  if (m.includes('opus')) return 0;
  if (m.includes('sonnet')) return 1;
  if (m.includes('gemini') || m.includes('flash')) return 2;
  return 3; // etiketsiz/bilinmeyen model — en sona
}

/** Soru HMGS havuzunda mı? 'hmgs_core' ve 'hmgs' aynı havuzdadır. */
export const isCoreTarget = q => !!q && String(q.examTarget || '').startsWith('hmgs');

export const topicsOf = id => topicsBySubject.get(id) || [];
export const questionsOf = (id, scope = 'all') => {
  const list = questionsBySubject.get(id) || [];
  if (scope === 'core') return list.filter(isCoreTarget);
  return list;
};
export const questionsOfTopic = (id, scope = 'all') => {
  const list = questionsByTopic.get(id) || [];
  if (scope === 'core') return list.filter(isCoreTarget);
  return list;
};
export const questionsOfTopics = (ids = [], scope = 'all') => {
  const set = new Set(ids);
  const out = [];
  for (const id of set) {
    const qs = questionsByTopic.get(id) || [];
    for (const q of qs) {
      if (scope === 'all' || isCoreTarget(q)) out.push(q);
    }
  }
  return out;
};

export function filterQuestions(pool, scope = 'core') {
  if (scope === 'all') return pool;
  return pool.filter(isCoreTarget);
}

/** HMGS Benzeri (AI Üretimi) soruları döndürür. */
export function aiQuestions(subjectId = null) {
  const list = QUESTIONS.filter(q => /ai_|ai-|hmgsai/i.test(String(q.source || '')) || String(q.id).startsWith('hmgsai_'));
  if (subjectId) return list.filter(q => q.subjectId === subjectId);
  return list;
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

/* ==========================================================================
   DENEME = ÖLÇÜM, GÖRÜLMEMİŞ SORU ÖNCE — 22 Eylül 2026 (kullanıcı talimatı)
   "Denemede daha önce görmediğim sorular gelmeli, akışta çıkanlar gelmesin;
   deneme beni daha iyi ölçer." Akışta cevabı görülmüş soru denemede bilgiyi
   değil hatırlamayı ölçer, net şişer. O yüzden her ders payı önce HİÇ
   görülmemiş sorulardan doldurulur. Ders tükendiyse sessizce eksik kalmaz:
   görülmüş sorulardan en ESKİ görülen önce alınır (unutmaya en yakın olan,
   ölçümü en az kirleten) ve kaç tane olduğu sonuçta yazılır.
   `seen`: Map(qId → son cevap zamanı ms). Verilmezse eski davranış.
   ========================================================================== */
function freshFirst(pool, seen) {
  if (!seen || !seen.size) return { list: shuffle(pool) };
  const fresh = [], old = [];
  pool.forEach(q => (seen.has(q.id) ? old : fresh).push(q));
  old.sort((a, b) => seen.get(a.id) - seen.get(b.id));
  return { list: shuffle(fresh).concat(old) };
}

/** Bir setteki daha önce görülmüş soru sayısı (sonuç ekranı için). */
export function countSeen(questions, seen) {
  if (!seen || !seen.size) return 0;
  return questions.filter(q => seen.has(q.id)).length;
}

/**
 * Arşiv sınav dağılımına göre deneme seti kurar.
 * Havuz yetersizse eksiği rapor eder — sessizce dolgu yapmaz.
 */
export function buildExamSet(onlyTagged = false, scope = 'core', seen = null) {
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
    const take = freshFirst(rawPool, seen).list.slice(0, s.examQ);
    if (take.length < s.examQ) shortfall.push({ subject: s.name, want: s.examQ, got: take.length });
    picked.push(...take);
  });
  return { questions: shuffle(picked), shortfall, seenCount: countSeen(picked, seen) };
}

/**
 * HMGS Benzeri (AI) havuzundan resmi dağılıma göre 120 soruluk deneme seti kurar.
 * 20 resmi ders dağılımına sadık kalınır, eksik kalan birkaç soru çekirdek havuzdan tamamlanır.
 * Sıra: görülmemiş HMGS benzeri → görülmemiş çekirdek dolgu → görülmüş (en eski önce).
 */
export function buildAiExamSet(seen = null) {
  const picked = [];
  const shortfall = [];
  const notAi = q => !String(q.source || '').includes('ai') && !String(q.id).startsWith('hmgsai_');
  const isSeen = q => !!(seen && seen.has(q.id));
  SUBJECTS.forEach(s => {
    const aiPool = aiQuestions(s.id);
    let nonAi = questionsOf(s.id, 'core').filter(notAi);
    if (nonAi.length < s.examQ) nonAi = questionsOf(s.id, 'all').filter(notAi);
    const oldest = (a, b) => seen.get(a.id) - seen.get(b.id);
    const ordered = shuffle(aiPool.filter(q => !isSeen(q)))
      .concat(shuffle(nonAi.filter(q => !isSeen(q))))
      .concat(seen ? aiPool.filter(isSeen).sort(oldest) : [])
      .concat(seen ? nonAi.filter(isSeen).sort(oldest) : []);
    const take = ordered.slice(0, s.examQ);
    if (take.length < s.examQ) {
      shortfall.push({ subject: s.name, want: s.examQ, got: take.length });
    }
    picked.push(...take);
  });
  return { questions: shuffle(picked), shortfall, seenCount: countSeen(picked, seen) };
}

/**
 * Akıllı Algoritmik Deneme Sınavı Kurucu:
 * Resmi 20 ders dağılımına (SUBJECTS, toplam 120 soru) birebir sadık kalır.
 * Her ders kotası, kullanıcının kesin talimatı olan katman hiyerarşisiyle doldurulur:
 *   1. Kullanıcının HİÇ GÖRMEDİĞİ sorular önceliklidir (!seen.has(q.id)).
 *   2. Katman Sırası (Tier):
 *      - Tier 1: Gerçek HMGS Çıkmış Soruları (category === 'Çıkmış Sorular' veya source hmgs_*)
 *      - Tier 2: HMGS Denemeleri (source deneme_*)
 *      - Tier 3: Yapay Zeka HMGS Soruları (questions_ai / source ai_* veya id hmgsai_*)
 *      - Tier 4: Soru Bankaları ve Çalışma Havuzu
 *   3. Bir derste görülmemiş soru kalmadıysa, yine aynı katman sırasıyla
 *      en eski çözülen (unutmaya en yakın) sorulardan tamamlanarak 120 soru firesiz kurulur.
 *
 * @param {Map<string, number>|Set<string>|null} seen
 * @returns {{ questions: Array, shortfall: Array, stats: Object }}
 */
export function buildAlgorithmicExamSet(seen = null) {
  const picked = [];
  const shortfall = [];
  const stats = {
    unseen: 0,
    seen: 0,
    tier1: 0, // Gerçek HMGS
    tier2: 0, // HMGS Denemeleri
    tier3: 0, // Yapay Zeka
    tier4: 0  // Soru Bankası
  };

  const isSeen = q => {
    if (!seen) return false;
    if (seen instanceof Map || seen instanceof Set) return seen.has(q.id);
    return false;
  };

  const seenTime = q => {
    if (seen instanceof Map) return seen.get(q.id) || 0;
    return 0;
  };

  SUBJECTS.forEach(s => {
    const rawPool = questionsOf(s.id, 'all');

    const t1Unseen = [], t2Unseen = [], t3Unseen = [], t4Unseen = [];
    const t1Seen = [], t2Seen = [], t3Seen = [], t4Seen = [];

    rawPool.forEach(q => {
      const t = tierOf(q);
      const seenStatus = isSeen(q);
      if (!seenStatus) {
        if (t === TIER_REAL) t1Unseen.push(q);
        else if (t === TIER_DENEME) t2Unseen.push(q);
        else if (t === TIER_AI) t3Unseen.push(q);
        else t4Unseen.push(q);
      } else {
        if (t === TIER_REAL) t1Seen.push(q);
        else if (t === TIER_DENEME) t2Seen.push(q);
        else if (t === TIER_AI) t3Seen.push(q);
        else t4Seen.push(q);
      }
    });

    t3Unseen.sort((a, b) => aiModelRank(a) - aiModelRank(b));
    t3Seen.sort((a, b) => {
      const rA = aiModelRank(a), rB = aiModelRank(b);
      if (rA !== rB) return rA - rB;
      return seenTime(a) - seenTime(b);
    });

    const oldest = (a, b) => seenTime(a) - seenTime(b);

    const orderedPool = [
      ...shuffle(t1Unseen),
      ...shuffle(t2Unseen),
      ...t3Unseen,
      ...shuffle(t4Unseen),
      ...t1Seen.sort(oldest),
      ...t2Seen.sort(oldest),
      ...t3Seen,
      ...t4Seen.sort(oldest)
    ];

    const take = orderedPool.slice(0, s.examQ);
    if (take.length < s.examQ) {
      shortfall.push({ subject: s.name, want: s.examQ, got: take.length });
    }

    take.forEach(q => {
      if (isSeen(q)) stats.seen++;
      else stats.unseen++;

      const t = tierOf(q);
      if (t === TIER_REAL) stats.tier1++;
      else if (t === TIER_DENEME) stats.tier2++;
      else if (t === TIER_AI) stats.tier3++;
      else stats.tier4++;
    });

    picked.push(...take);
  });

  return { questions: picked, shortfall, stats };
}

/**
 * Akıllı Deneme öncesi genel havuz ve görülmemiş soru özeti döndürür.
 */
export function getAlgorithmicExamPreview(seen = null) {
  const isSeen = q => {
    if (!seen) return false;
    if (seen instanceof Map || seen instanceof Set) return seen.has(q.id);
    return false;
  };
  let totalAvailable = 0;
  let unseenAvailable = 0;
  let t1Unseen = 0, t2Unseen = 0, t3Unseen = 0, t4Unseen = 0;

  QUESTIONS.forEach(q => {
    totalAvailable++;
    const s = isSeen(q);
    if (!s) {
      unseenAvailable++;
      const t = tierOf(q);
      if (t === TIER_REAL) t1Unseen++;
      else if (t === TIER_DENEME) t2Unseen++;
      else if (t === TIER_AI) t3Unseen++;
      else t4Unseen++;
    }
  });

  return { totalAvailable, unseenAvailable, t1Unseen, t2Unseen, t3Unseen, t4Unseen };
}

/* ==========================================================================
   ARŞİV SORULARI
   `category === 'Çıkmış Sorular'` olan sorular. Erişim ve listeleme katmanı.
   ========================================================================== */

// Arşiv sınavı etiketleri labels.js'te tutulur (giriş durumuna göre maskelenir).
// data.js bu modülü import etmez; çevirme çağıran tarafın sorumluluğundadır.

export const isPastExam = q => q.category === 'Çıkmış Sorular' || /^hmgs_\d+/i.test(String(q.source || ''));

/** Tüm gerçek sınav soruları, kaynağa göre filtrelenebilir. Sınav numarasına göre sıralı (orijinal sırayla). */
export function pastExamQuestions(sourceId = null) {
  return QUESTIONS
    .filter(q => isPastExam(q) && (!sourceId || q.source === sourceId))
    .sort((a, b) => (a.qNumber || 0) - (b.qNumber || 0));
}

/** Mevcut arşiv sınavlarının listesi; yalnızca ham id ve count döndürür. */
export function pastExamList() {
  const bySource = new Map();
  QUESTIONS.forEach(q => {
    if (!isPastExam(q)) return;
    if (!bySource.has(q.source)) bySource.set(q.source, 0);
    bySource.set(q.source, bySource.get(q.source) + 1);
  });
  return [...bySource.entries()]
    .map(([id, count]) => ({ id, label: arsivLabel(id), count }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/** Deneme seti — deneme kaynaklı sorular, deneme numarasına göre. */
export function denemeSetList() {
  const bySource = new Map();
  QUESTIONS.forEach(q => {
    const src = String(q.source || '');
    if (!/deneme/i.test(src)) return;
    if (!bySource.has(src)) bySource.set(src, 0);
    bySource.set(src, bySource.get(src) + 1);
  });

  return [...bySource.entries()]
    .map(([id, count]) => ({ id, label: denemeLabel(id), count }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Deneme seti soruları, orijinal soru sırasıyla (qNumber). */
export function denemeSetQuestions(sourceId = null) {
  return QUESTIONS
    .filter(q => /deneme/i.test(String(q.source || '')) && (!sourceId || q.source === sourceId))
    .sort((a, b) => (a.qNumber || 0) - (b.qNumber || 0));
}
