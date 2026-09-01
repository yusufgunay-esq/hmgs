/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   store.js — VERSİYONLU KALICI DURUM + TELEMETRİ
   İlke: ham cevap kaydı asla silinmez. Şema değişirse migrate edilir.
   Türetilmiş her metrik (başarı, hız, mastery) bu ham kayıttan hesaplanır.
   ========================================================================== */

const KEY = 'hmgs_studio_v1';
const SCHEMA = 1;

/** Sınav: 2026-HMGS/2 */
export const EXAM_DATE = new Date('2026-09-27T10:15:00');
/** 120 soru, yanlış cezası yok → net = doğru sayısı. Baraj 70 puan = 84 doğru. */
export const EXAM_TOTAL = 120;
export const PASS_CORRECT = 84;
/** Soru başına hedef süre (saniye). Otomatikleşme eşiği. */
export const TARGET_SEC = 75;

function blank() {
  return {
    schemaVersion: SCHEMA,
    createdAt: new Date().toISOString(),
    /** Ham cevap günlüğü — her cevap bir satır, asla üzerine yazılmaz. */
    answers: [],
    /** Aralıklı tekrar durumu: qId → { box, dueAt, lapses, lastAt } */
    srs: {},
    /** Tamamlanan denemeler */
    exams: [],
    /** Pratik seansı özetleri (ders/konu bazlı küçük & karma testler) —
        `exams`in küçük hâli. Ham `answers` kaydına EKtir, onu değiştirmez.
        HMGS_Takip_App'e otomatik aktarım için kullanılır (bkz. store.js saveSession). */
    sessions: [],
    /** Okunan konular: topicId → { firstAt, lastAt, count } */
    topics: {},
    /** Pratik alanı günlüğü — üretilmiş vakaların hücre hücre sonucu.
        `answers`dan ayrı tutulur çünkü burada bir soru id'si yok, üretilmiş
        bir vaka var (bkz. studio/js/gen/). Ham günlük, asla üzerine yazılmaz. */
    drills: [],
    /** Devam eden deneme (yarıda kalırsa geri dönülebilir) */
    examInProgress: null,
    settings: { dailyTarget: 40 }
  };
}

let S = blank();

/* ---------- yükleme / kaydetme ---------- */

function migrate(raw) {
  if (!raw || typeof raw !== 'object') return blank();
  const base = blank();
  return {
    ...base,
    ...raw,
    answers: Array.isArray(raw.answers) ? raw.answers : [],
    srs: raw.srs && typeof raw.srs === 'object' ? raw.srs : {},
    exams: Array.isArray(raw.exams) ? raw.exams : [],
    sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
    topics: raw.topics && typeof raw.topics === 'object' ? raw.topics : {},
    drills: Array.isArray(raw.drills) ? raw.drills : [],
    settings: { ...base.settings, ...(raw.settings || {}) }
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) S = migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('[store] okunamadı, temiz başlangıç:', e);
    S = blank();
  }
  return S;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.error('[store] yazılamadı:', e);
  }
}

export function state() { return S; }

export function hardReset() {
  S = blank();
  save();
}

/** Ham veriyi dışa aktar — AI koçun okuyacağı format. */
export function exportJSON() {
  return JSON.stringify({ ...S, exportedAt: new Date().toISOString() }, null, 2);
}

/* ---------- TELEMETRİ: her cevap kaydedilir ---------- */

/**
 * @param {object} q      soru nesnesi
 * @param {string|null} chosen  seçilen şık ('A'..'E') veya null = boş
 * @param {number} ms     soruya harcanan süre (ms)
 * @param {string} mode   'practice' | 'exam' | 'review' | 'flow'
 */
export function recordAnswer(q, chosen, ms, mode) {
  const prior = S.answers.filter(a => a.qId === q.id).length;
  const row = {
    qId: q.id,
    subjectId: q.subjectId || null,
    topicId: q.topicId || null,
    chosen: chosen,
    correctKey: q.correct,
    ok: chosen === q.correct,
    ms: Math.max(0, Math.round(ms)),
    attempt: prior + 1,
    mode,
    at: new Date().toISOString()
  };
  S.answers.push(row);
  return row;
}

/**
 * Pratik alanında doldurulan bir hücreyi kaydeder.
 * @param {object} d { gen, seed, kalip, topicId, subjectId, slot, chosen, answer, ok, ms }
 */
export function recordDrill(d) {
  const row = {
    gen: d.gen,                    // hangi üreteç ('miras' gibi)
    seed: d.seed,                  // vaka tohumu — vaka aynen yeniden kurulabilir
    kalip: d.kalip || null,        // vakanın alt tipi (altsoy/halefiyet/…)
    topicId: d.topicId || null,
    subjectId: d.subjectId || null,
    slot: d.slot,                  // hangi hücre
    chosen: d.chosen,
    answer: d.answer,
    ok: !!d.ok,
    ms: Math.max(0, Math.round(d.ms || 0)),
    at: new Date().toISOString()
  };
  S.drills.push(row);
  return row;
}

/** Pratik alanı özeti: üreteç bazında doğru/toplam ve zayıf kalıplar. */
export function drillStats(gen) {
  const rows = gen ? S.drills.filter(d => d.gen === gen) : S.drills;
  const byKalip = {};
  rows.forEach(d => {
    const k = d.kalip || '—';
    byKalip[k] = byKalip[k] || { n: 0, ok: 0 };
    byKalip[k].n++; if (d.ok) byKalip[k].ok++;
  });
  return {
    n: rows.length,
    ok: rows.filter(d => d.ok).length,
    byKalip,
    /** En çok yanılınan kalıplar — "zorlandığın senaryolar" paneli için. */
    zayif: Object.entries(byKalip)
      .filter(([, v]) => v.n >= 2 && v.ok / v.n < 0.7)
      .sort((a, b) => (a[1].ok / a[1].n) - (b[1].ok / b[1].n))
      .map(([k, v]) => ({ kalip: k, n: v.n, acc: v.ok / v.n }))
  };
}

export function markTopicRead(topicId) {
  if (!topicId) return;
  const now = new Date().toISOString();
  const t = S.topics[topicId] || { firstAt: now, count: 0 };
  t.lastAt = now;
  t.count += 1;
  S.topics[topicId] = t;
}

export function saveExam(result) {
  S.exams.push(result);
  S.examInProgress = null;
}

/**
 * Pratik seansı (küçük/karma test) bitince özetini kaydeder. `saveExam`in
 * küçük hâli — result şekli için bkz. views/practice.js finalizeSession().
 */
export function saveSession(result) {
  S.sessions.push(result);
}

/* ---------- türetilmiş okumalar ---------- */

export function answersFor(qId) { return S.answers.filter(a => a.qId === qId); }

export function daysLeft() {
  return Math.max(0, Math.ceil((EXAM_DATE - new Date()) / 86400000));
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function answersToday() {
  const k = todayKey();
  return S.answers.filter(a => a.at.slice(0, 10) === k);
}

/** Kaç gün üst üste çalışıldı. */
export function streak() {
  const days = new Set(S.answers.map(a => a.at.slice(0, 10)));
  if (days.size === 0) return 0;
  let n = 0;
  const d = new Date();
  // Bugün henüz çalışılmadıysa seriyi dünden saymaya başla.
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function lastExam() { return S.exams.length ? S.exams[S.exams.length - 1] : null; }
