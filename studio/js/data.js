/* ==========================================================================
   data.js — VERİ ERİŞİM KATMANI VE İNDEKSLER
   topics.js / questions.js global sabitleri okur, tek seferde indeksler.
   O(n) tam tarama yerine hazır Map'ler.
   ========================================================================== */

export const SUBJECTS = [
  { id: 'medeni_hukuk',        name: 'Medeni Hukuk',              tier: 1, examQ: 15 },
  { id: 'borclar_hukuku',      name: 'Borçlar Hukuku',            tier: 1, examQ: 12 },
  { id: 'ticaret_hukuku',      name: 'Ticaret Hukuku',            tier: 1, examQ: 12 },
  { id: 'hmk',                 name: 'Medeni Usul Hukuku (HMK)',  tier: 1, examQ: 12 },
  { id: 'ceza_hukuku',         name: 'Ceza Hukuku',               tier: 2, examQ: 9  },
  { id: 'anayasa_hukuku',      name: 'Anayasa Hukuku',            tier: 2, examQ: 6  },
  { id: 'idare_hukuku',        name: 'İdare Hukuku',              tier: 2, examQ: 6  },
  { id: 'icra_iflas',          name: 'İcra ve İflas Hukuku',      tier: 2, examQ: 6  },
  { id: 'cmk',                 name: 'Ceza Muhakemesi (CMK)',     tier: 2, examQ: 6  },
  { id: 'is_hukuku',           name: 'İş ve Sosyal Güvenlik',     tier: 2, examQ: 6  },
  { id: 'anayasa_yargisi',     name: 'Anayasa Yargısı',           tier: 3, examQ: 3  },
  { id: 'iyuk',                name: 'İdari Yargılama Usulü',     tier: 3, examQ: 3  },
  { id: 'vergi_hukuku',        name: 'Vergi Hukuku',              tier: 3, examQ: 3  },
  { id: 'vergi_usul',          name: 'Vergi Usul Hukuku',         tier: 3, examQ: 3  },
  { id: 'avukatlik',           name: 'Avukatlık Hukuku',          tier: 3, examQ: 3  },
  { id: 'hukuk_felsefesi',     name: 'Hukuk Felsefesi ve Sos.',   tier: 3, examQ: 3  },
  { id: 'hukuk_tarihi',        name: 'Türk Hukuk Tarihi',         tier: 3, examQ: 3  },
  { id: 'milletlerarasi_hukuk',name: 'Milletlerarası Hukuk',      tier: 3, examQ: 3  },
  { id: 'mohuk',               name: 'Milletlerarası Özel Hukuk', tier: 3, examQ: 3  },
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

import { loadMasterVault } from './vault-client.js';

export let TOPICS = [];
export let QUESTIONS = [];

export const topicById = new Map();
export const topicsBySubject = new Map();
export const questionsBySubject = new Map();
export const questionsByTopic = new Map();
export const questionById = new Map();

function push(map, key, val) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(val);
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

  topicById.clear();
  topicsBySubject.clear();
  questionsBySubject.clear();
  questionsByTopic.clear();
  questionById.clear();

  TOPICS.sort((a, b) => (a.order || 0) - (b.order || 0));

  TOPICS.forEach(t => {
    topicById.set(t.id, t);
    push(topicsBySubject, t.subjectId, t);
  });
  QUESTIONS.forEach(q => {
    questionById.set(q.id, q);
    push(questionsBySubject, q.subjectId, q);
    if (q.topicId && topicById.has(q.topicId)) push(questionsByTopic, q.topicId, q);
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
  const rep = {
    topics: TOPICS.length,
    questions: QUESTIONS.length,
    orphanQuestions: orphans.length,
    brokenTopicIds: broken.length,
    emptySubjects: emptySubjects.map(s => s.name),
    untaggedDifficulty: untagged.length,
    v3Topics: TOPICS.length - legacyTopics.length,
    legacyTopics: legacyTopics.length
  };
  console.info('[veri bütünlüğü]', rep);
  return rep;
}

export const topicsOf = id => topicsBySubject.get(id) || [];
export const questionsOf = id => questionsBySubject.get(id) || [];
export const questionsOfTopic = id => questionsByTopic.get(id) || [];
export const questionsOfTopics = (ids = []) => {
  const set = new Set(ids);
  const out = [];
  for (const id of set) {
    const qs = questionsByTopic.get(id) || [];
    out.push(...qs);
  }
  return out;
};

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
export function buildExamSet(onlyTagged = false) {
  const picked = [];
  const shortfall = [];
  SUBJECTS.forEach(s => {
    let rawPool = questionsOf(s.id);
    if (onlyTagged) {
      rawPool = rawPool.filter(q => q.topicId && topicById.has(q.topicId));
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
