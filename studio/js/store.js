/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   store.js — VERSİYONLU KALICI DURUM + TELEMETRİ
   İlke: ham cevap kaydı asla silinmez. Şema değişirse migrate edilir.
   Türetilmiş her metrik (başarı, hız, mastery) bu ham kayıttan hesaplanır.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

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
    /** Koçun bugün için atadığı Stüdyo işi — odevler.js yazar, engine okur.
        { date:'YYYY-MM-DD', questions:sayı, quizTasks:sayı, readingTasks:sayı,
          totalTasks:sayı, source:'/api/claude-tasks', at:ISO }
        Yoksa null: hedef o zaman Stüdyo'nun kendi tabanından türetilir. */
    plan: null,
    settings: { dailyTarget: 40, theme: 'system', fontSize: 'normal' }
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

let stateChangeCallbacks = [];
let autoSyncTimer = null;

export function onStateChange(cb) {
  if (typeof cb === 'function') stateChangeCallbacks.push(cb);
}

export function replaceState(newState) {
  S = migrate(newState);
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    console.error('[store] replaceState yazılamadı:', e);
  }
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    if (stateChangeCallbacks.length > 0) {
      clearTimeout(autoSyncTimer);
      autoSyncTimer = setTimeout(() => {
        stateChangeCallbacks.forEach(cb => {
          try { cb(S); } catch (err) { console.warn('[store] onStateChange hatası:', err); }
        });
      }, 4000);
    }
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
 * @param {object} q          soru nesnesi
 * @param {string|null} chosen seçilen şık ('A'..'E') veya null = boş
 * @param {number} ms         soruya harcanan AKTİF süre (ms). seans.js'in
 *   duraksatmalı saatinden gelir: sekme gizliyken ve kullanıcı boştayken
 *   geçen zaman bu sayıya girmez. Ham (duvar) süre flags.rawMs'tedir.
 * @param {string} mode       'practice' | 'exam' | 'review' | 'flow'
 * @param {object} [flags]    davranış sinyalleri { usedElim, askedGemini, logicGuess }
 *   logicGuess: cevaptan ÖNCE ipucu istendiyse true — bu satır SRS'te olduğu gibi
 *   mastery/hız hesaplarında da bağımsız bir "çözüm" sayılmaz (bkz. engine.js computeMastery).
 */
export function recordAnswer(q, chosen, ms, mode, flags = {}) {
  const prior = S.answers.filter(a => a.qId === q.id).length;
  const row = {
    qId: q.id,
    subjectId: q.subjectId || null,
    topicId: q.topicId || null,
    chosen: chosen,
    correctKey: q.correct,
    ok: chosen === q.correct,
    logicGuess: !!flags.logicGuess,
    attentionError: false,
    usedElim: !!flags.usedElim,
    elimTrap: !!flags.elimTrap,
    dilemma5050: !!flags.dilemma5050,
    eliminatedOptions: Array.isArray(flags.eliminatedOptions) && flags.eliminatedOptions.length ? flags.eliminatedOptions : undefined,
    askedGemini: !!flags.askedGemini,
    ms: Math.max(0, Math.round(ms)),
    // rawMs: soru ekranda kaldığı toplam süre. idleMs: bunun boşa geçen
    // kısmı; ms + idleMs = rawMs. Eski kayıtlarda bu iki alan yoktur,
    // okuyan taraf yokluğunu ms ile doldurur.
    rawMs: Number.isFinite(flags.rawMs) ? Math.max(0, Math.round(flags.rawMs)) : undefined,
    idleMs: Number.isFinite(flags.idleMs) ? Math.max(0, Math.round(flags.idleMs)) : undefined,
    attempt: prior + 1,
    mode,
    // set: hangi kapıdan girildi (ör. 'srs', 'sure', 'inatci', 'odev', 'deadlines').
    // mode kaba sınıftır (practice/review/flow/exam); rota.js günün adımlarını
    // bununla sayar. Yoksa alan hiç yazılmaz.
    set: flags.set || undefined,
    at: new Date().toISOString()
  };
  if (row.rawMs === undefined) delete row.rawMs;
  if (row.idleMs === undefined) delete row.idleMs;
  if (row.set === undefined) delete row.set;
  if (row.elimTrap === false) delete row.elimTrap;
  if (row.dilemma5050 === false) delete row.dilemma5050;
  if (row.eliminatedOptions === undefined) delete row.eliminatedOptions;
  S.answers.push(row);
  return row;
}

/**
 * Son verilen cevabın mantık/konu-eksik bayrağını günceller.
 * @param {boolean} flag
 */
export function markLastAnswerLogic(flag = true) {
  if (!S.answers.length) return null;
  const last = S.answers[S.answers.length - 1];
  last.logicGuess = !!flag;
  save();
  return last;
}

/**
 * Son verilen yanlış cevabı "dikkat hatası" olarak etiketler/kaldırır.
 * SRS'i değiştirmez — yalnızca analitik sinyal.
 * @param {boolean} flag
 */
export function markLastAnswerAttention(flag = true) {
  if (!S.answers.length) return null;
  const last = S.answers[S.answers.length - 1];
  last.attentionError = !!flag;
  save();
  return last;
}

/**
 * Deneme sinavindaki belirli bir sorunun yanlis cevabini dikkat hatasi olarak etiketler veya kaldirir.
 * @param {string} qId
 * @param {boolean} flag
 * @param {string} [examAt]
 */
export function markExamAnswerAttention(qId, flag = true, examAt = null) {
  if (!S.answers.length) return null;
  for (let i = S.answers.length - 1; i >= 0; i--) {
    const a = S.answers[i];
    if (a.qId === qId && a.mode === 'exam') {
      if (!examAt || !a.at || a.at.startsWith(examAt.slice(0, 10)) || Math.abs(new Date(a.at) - new Date(examAt)) < 3600000) {
        a.attentionError = !!flag;
        save();
        return a;
      }
    }
  }
  for (let i = S.answers.length - 1; i >= 0; i--) {
    const a = S.answers[i];
    if (a.qId === qId && a.mode === 'exam') {
      a.attentionError = !!flag;
      save();
      return a;
    }
  }
  return null;
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
 * Takip Uygulamasından gelen denemeleri içeri aktarır.
 * Mükerrerliği önler, kronolojik sıralar ve durumu kaydeder.
 */
export function importTakipExams(list) {
  if (!Array.isArray(list) || !list.length) return false;
  let added = 0;
  list.forEach(ex => {
    const exists = S.exams.some(e => {
      if (e.id && ex.id) return String(e.id) === String(ex.id);
      return e.at && ex.at && e.at.slice(0, 16) === ex.at.slice(0, 16) && e.label === ex.label;
    });
    if (!exists) {
      S.exams.push(ex);
      added++;
    }
  });
  if (added > 0) {
    S.exams.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
    save();
  }
  return added > 0;
}

/**
 * Pratik seansı (küçük/karma test) bitince özetini kaydeder. `saveExam`in
 * küçük hâli — result şekli için bkz. views/practice.js finalizeSession().
 */
export function saveSession(result) {
  S.sessions.push(result);
}

/**
 * Veritabaninda soru cevap anahtarlari veya icerikleri guncellendiginde,
 * kullanicinin gecmis cevaplarini (S.answers), aralikli tekrarini (S.srs) ve
 * tamamlanmis deneme sonuclarini (S.exams) geriye donuk olarak otomatik duzeltir.
 *
 * Ornegin: Deneme 1 Soru 5'te kullanicinin verdigi dogru cevap
 * ('A') eski hatali cevap anahtari ('C') yuzunden yanlis sayilmissa; bu fonksiyon
 * soruyu dogruya ceker, neti 63'ten 64'e yukseltir, yanlisi 54'ten 53'e dusurur,
 * puani yeniden hesaplar ve durumu kalici olarak kaydeder.
 *
 * @param {Map<string, object>} questionMap
 * @returns {boolean} Degisiklik yapildiysa true
 */
export function reconcilePastData(questionMap) {
  if (!questionMap || typeof questionMap.get !== 'function' || !questionMap.size) return false;
  let changed = false;

  // 1. Ham cevap gunlugu (S.answers)
  if (Array.isArray(S.answers)) {
    for (const a of S.answers) {
      if (!a.qId || !questionMap.has(a.qId)) continue;
      const q = questionMap.get(a.qId);
      if (q && q.correct) {
        if (a.correctKey !== q.correct) {
          a.correctKey = q.correct;
          const wasOk = a.ok;
          a.ok = (a.chosen === q.correct);
          if (a.ok !== wasOk) changed = true;
        }
      }
    }
  }

  // 2. SRS Tekrar durumu (S.srs)
  if (S.srs && typeof S.srs === 'object') {
    for (const [qId, cur] of Object.entries(S.srs)) {
      if (!questionMap.has(qId)) continue;
      const q = questionMap.get(qId);
      const ansList = (S.answers || []).filter(a => a.qId === qId);
      if (ansList.length > 0 && ansList.every(a => a.ok)) {
        if (cur.lapses > 0 || cur.box === 0) {
          cur.box = 4;
          cur.lapses = 0;
          cur.dueN = null;
          cur.dueAt = null;
          delete cur.dropped;
          changed = true;
        }
      }
    }
  }

  // 3. Tamamlanan denemeler (S.exams)
  if (Array.isArray(S.exams)) {
    for (const ex of S.exams) {
      if (!ex) continue;
      const reviewMap = new Map();
      if (Array.isArray(ex.review)) {
        ex.review.forEach(r => {
          if (r && r.qId) reviewMap.set(r.qId, r);
        });
      }

      if (Array.isArray(ex.map)) {
        let recalcNeeded = false;

        // Incelemedeki sorularin dogrulugunu ve iceriklerini guncelle
        for (const [qId, r] of reviewMap.entries()) {
          if (!questionMap.has(qId)) continue;
          const q = questionMap.get(qId);
          if (!q) continue;

          if (q.explanation && r.explanation !== q.explanation) r.explanation = q.explanation;
          if (q.legalBasis && r.legalBasis !== q.legalBasis) r.legalBasis = q.legalBasis;
          if (q.stem && r.stem !== q.stem) r.stem = q.stem;
          if (Array.isArray(q.options) && r.options !== q.options) r.options = q.options;

          if (q.correct && r.correct !== q.correct) {
            r.correct = q.correct;
            const nowOk = (r.chosen !== null && r.chosen === q.correct);
            if (r.ok !== nowOk) {
              r.ok = nowOk;
              recalcNeeded = true;
            }
          }
        }

        // Harita uzerindeki kovalari (b) guncelle ve metrik farklarini uygula
        for (let i = 0; i < ex.map.length; i++) {
          const m = ex.map[i];
          if (!m || !m.qId || !questionMap.has(m.qId)) continue;
          const q = questionMap.get(m.qId);
          const r = reviewMap.get(m.qId);
          const oldB = m.b;

          if (r) {
            if (r.ok && (oldB === 'kavram' || oldB === 'eksik')) {
              // Eskiden yanlis sayilan soru artik dogru!
              const newB = r.doubt ? 'sans' : 'ok';
              m.b = newB;
              r.bucket = newB;

              ex.correct = (ex.correct || 0) + 1;
              ex.wrong = Math.max(0, (ex.wrong || 0) - 1);
              ex.net = ex.correct;
              const totalQ = ex.total || ex.map.length || 120;
              ex.points = Math.round((ex.correct / totalQ) * 1000) / 10;
              ex.pass = (ex.correct >= 84);

              if (oldB === 'kavram') ex.kavram = Math.max(0, (ex.kavram || 0) - 1);
              if (oldB === 'eksik') ex.eksik = Math.max(0, (ex.eksik || 0) - 1);
              if (newB === 'sans') ex.sans = (ex.sans || 0) + 1;

              if (Array.isArray(ex.wrongIds)) {
                ex.wrongIds = ex.wrongIds.filter(id => id !== m.qId);
              }
              if (newB === 'ok' && Array.isArray(ex.repeatIds)) {
                ex.repeatIds = ex.repeatIds.filter(id => id !== m.qId);
              }

              if (q && q.subjectId && ex.bySubject && ex.bySubject[q.subjectId]) {
                ex.bySubject[q.subjectId].correct = (ex.bySubject[q.subjectId].correct || 0) + 1;
                ex.bySubject[q.subjectId].wrong = Math.max(0, (ex.bySubject[q.subjectId].wrong || 0) - 1);
              }
              const tid = q.topicId || `__untagged__${q.subjectId}`;
              if (ex.byTopic && ex.byTopic[tid]) {
                ex.byTopic[tid].correct = (ex.byTopic[tid].correct || 0) + 1;
              }

              recalcNeeded = true;
            } else if (!r.ok && (oldB === 'ok' || oldB === 'sans') && r.chosen !== null) {
              // Eskiden dogru sayilan soru artik yanlis
              const newB = r.doubt ? 'eksik' : 'kavram';
              m.b = newB;
              r.bucket = newB;

              ex.correct = Math.max(0, (ex.correct || 0) - 1);
              ex.wrong = (ex.wrong || 0) + 1;
              ex.net = ex.correct;
              const totalQ = ex.total || ex.map.length || 120;
              ex.points = Math.round((ex.correct / totalQ) * 1000) / 10;
              ex.pass = (ex.correct >= 84);

              if (oldB === 'sans') ex.sans = Math.max(0, (ex.sans || 0) - 1);
              if (newB === 'kavram') ex.kavram = (ex.kavram || 0) + 1;
              if (newB === 'eksik') ex.eksik = (ex.eksik || 0) + 1;

              if (Array.isArray(ex.wrongIds) && !ex.wrongIds.includes(m.qId)) {
                ex.wrongIds.push(m.qId);
              }
              if (Array.isArray(ex.repeatIds) && !ex.repeatIds.includes(m.qId)) {
                ex.repeatIds.push(m.qId);
              }

              if (q && q.subjectId && ex.bySubject && ex.bySubject[q.subjectId]) {
                ex.bySubject[q.subjectId].correct = Math.max(0, (ex.bySubject[q.subjectId].correct || 0) - 1);
                ex.bySubject[q.subjectId].wrong = (ex.bySubject[q.subjectId].wrong || 0) + 1;
              }
              const tid = q.topicId || `__untagged__${q.subjectId}`;
              if (ex.byTopic && ex.byTopic[tid]) {
                ex.byTopic[tid].correct = Math.max(0, (ex.byTopic[tid].correct || 0) - 1);
              }

              recalcNeeded = true;
            }
          } else if (oldB === 'kavram' || oldB === 'eksik') {
            const ans = (S.answers || []).filter(a => a.qId === m.qId);
            const lastAns = ans.length ? ans[ans.length - 1] : null;
            if (lastAns && lastAns.chosen === q.correct) {
              m.b = 'ok';
              ex.correct = (ex.correct || 0) + 1;
              ex.wrong = Math.max(0, (ex.wrong || 0) - 1);
              ex.net = ex.correct;
              const totalQ = ex.total || ex.map.length || 120;
              ex.points = Math.round((ex.correct / totalQ) * 1000) / 10;
              ex.pass = (ex.correct >= 84);

              if (oldB === 'kavram') ex.kavram = Math.max(0, (ex.kavram || 0) - 1);
              if (oldB === 'eksik') ex.eksik = Math.max(0, (ex.eksik || 0) - 1);

              if (Array.isArray(ex.wrongIds)) {
                ex.wrongIds = ex.wrongIds.filter(id => id !== m.qId);
              }
              if (Array.isArray(ex.repeatIds)) {
                ex.repeatIds = ex.repeatIds.filter(id => id !== m.qId);
              }

              if (q && q.subjectId && ex.bySubject && ex.bySubject[q.subjectId]) {
                ex.bySubject[q.subjectId].correct = (ex.bySubject[q.subjectId].correct || 0) + 1;
                ex.bySubject[q.subjectId].wrong = Math.max(0, (ex.bySubject[q.subjectId].wrong || 0) - 1);
              }
              recalcNeeded = true;
            }
          }
        }

        if (recalcNeeded) {
          // Temiz dogrulari (doubt olmayan ok'lari) review dizisinden kaldir:
          if (Array.isArray(ex.review)) {
            ex.review = ex.review.filter(r => !(r.ok && !r.doubt));
          }
          changed = true;
        }
      }
    }
  }

  if (changed) {
    save();
  }
  return changed;
}

/* ---------- türetilmiş okumalar ---------- */

export function answersFor(qId) { return S.answers.filter(a => a.qId === qId); }

/**
 * Sınava kalan TAKVİM günü (çarşamba → pazar = 4). Eskiden saat farkının
 * tavanıydı; sabah 04:00'te 5, öğlen 4 diyordu ve üst şerit ile Bugün
 * rotası aynı anda farklı sayı gösteriyordu. Sınav günü 0.
 */
export function daysLeft() {
  // Gün, cevap günlüğüyle aynı ölçekten (todayKey) sayılır: gece 01:00'de
  // çalışma günü henüz dönmediyse kalan gün de dönmez.
  const a = Date.parse(todayKey() + 'T00:00:00Z');
  const b = Date.UTC(EXAM_DATE.getFullYear(), EXAM_DATE.getMonth(), EXAM_DATE.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
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

/**
 * Bugünün koç planı — yalnızca BUGÜNE ait kayıt geçerli sayılır. Dünün planı
 * ekranda hedef olarak görünmeye devam ederse kullanıcı bitmiş bir işin
 * peşinden koşar.
 */
export function getDailyPlan() {
  const p = S.plan;
  if (!p || typeof p !== 'object') return null;
  if (p.date !== todayKey()) return null;
  if (!Number.isFinite(p.questions) || p.questions <= 0) return null;
  return p;
}

/** odevler.js koç görevlerini çektikten sonra çağırır. */
export function setDailyPlan({ questions, quizTasks = 0, readingTasks = 0, totalTasks = 0, source = '' }) {
  S.plan = {
    date: todayKey(),
    questions: Math.round(questions),
    quizTasks, readingTasks, totalTasks, source,
    at: new Date().toISOString()
  };
  return S.plan;
}

/**
 * Cevap kaydından bağımsız, doğrudan hedef sayısı verilir. Test ve dış
 * çağrılar için; günlük kullanımda plan akışı geçerlidir.
 */
export function setDailyTarget(n) {
  S.settings.dailyTarget = Math.max(1, Math.round(n));
  save();
}

export function getSettings() {
  return S.settings || { dailyTarget: 40, theme: 'system', fontSize: 'normal' };
}

export function updateSettings(partial) {
  S.settings = { ...(S.settings || {}), ...partial };
  save();
  return S.settings;
}
