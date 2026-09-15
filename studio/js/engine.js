/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   engine.js — ÖĞRENME MOTORU
   Üç parça:
     1. SRS   → aralıklı geri getirme (Leitner 1-3-7-14-30)
     2. Mastery → otomatikleşme skoru (doğruluk × hız)
     3. Coach → "şimdi ne yapmalı" tek karar fonksiyonu
   Hepsi store.js'teki ham cevap günlüğünden beslenir.
   ========================================================================== */

import { state, TARGET_SEC, PASS_CORRECT, daysLeft, answersToday, lastExam, todayKey } from './store.js';
import { SUBJECTS, questionsOf, questionById, topicsOf, topicById, questionsOfTopic, shuffle } from './data.js';

/* ==========================================================================
   1. SRS — ARALIKLI GERİ GETİRME
   Kutu aralıkları gün cinsinden. Yanlış → kutu 0'a döner, yarın tekrar.
   Kutu 5 = mezun (bir daha sıraya girmez, sadece deneme sınavında çıkar).
   ========================================================================== */

export const BOXES = [1, 3, 7, 14, 30];

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  x.setHours(4, 0, 0, 0); // sabah 04:00 → "yarın" gün değişiminde net olsun
  return x;
}

/** Cevaptan sonra SRS durumunu güncelle. Dönen not kullanıcıya gösterilir. */
export function scheduleAfterAnswer(qId, ok, logicGuess = false) {
  const S = state();
  const cur = S.srs[qId] || { box: 0, lapses: 0, dueAt: null, lastAt: null };
  const now = new Date();

  if (ok && !logicGuess) {
    cur.box = Math.min(cur.box + 1, BOXES.length);
  } else {
    cur.box = 0;
    if (!ok) cur.lapses += 1;
  }
  cur.lastAt = now.toISOString();

  if (cur.box >= BOXES.length) {
    cur.dueAt = null; // mezun
  } else {
    cur.dueAt = addDays(now, BOXES[cur.box]).toISOString();
  }
  S.srs[qId] = cur;

  if (cur.box >= BOXES.length) return { box: cur.box, note: 'Bu soru mezun oldu (tekrar sırasından çıktı).' };
  if (!ok) return { box: 0, note: `Yarın tekrar sorulacak. (${cur.lapses}. kez takıldın)` };
  if (logicGuess) return { box: 0, note: 'Yarın tekrar sorulacak. (Mantıkla çözüldü, konu açıklarında)' };
  return { box: cur.box, note: `${BOXES[cur.box]} gün sonra tekrar sorulacak.` };
}

/** Mantıkla çözülen soruyu SRS'te kutu 0'a çekerek tekrar havuzuna alır. */
export function reScheduleAsLogic(qId, flag = true) {
  return scheduleAfterAnswer(qId, true, flag);
}


/** Bugün vadesi gelmiş (veya geçmiş) sorular. */
export function dueQuestions(now = new Date()) {
  const S = state();
  const out = [];
  for (const [qId, r] of Object.entries(S.srs)) {
    if (!r.dueAt) continue;
    if (new Date(r.dueAt) <= now) {
      const q = questionById.get(qId);
      if (q) out.push({ q, srs: r });
    }
  }
  // En çok takılınan, en eski vadeli önce
  out.sort((a, b) => (b.srs.lapses - a.srs.lapses) || (new Date(a.srs.dueAt) - new Date(b.srs.dueAt)));
  return out;
}

/** Hiç görülmemiş sorular (bir derste veya genelde). */
export function unseenQuestions(subjectId = null) {
  const S = state();
  const seen = new Set(S.answers.map(a => a.qId));
  const pool = subjectId ? questionsOf(subjectId) : [...questionById.values()];
  return pool.filter(q => !seen.has(q.id));
}

export function srsSummary() {
  const S = state();
  const rows = Object.values(S.srs);
  return {
    tracked: rows.length,
    due: dueQuestions().length,
    graduated: rows.filter(r => r.box >= BOXES.length).length,
    struggling: rows.filter(r => r.lapses >= 2 && r.box < 2).length
  };
}

/* ==========================================================================
   2. MASTERY — OTOMATİKLEŞME SKORU
   skor = doğruluk × hız faktörü
   hız faktörü = hedef süre / medyan süre  (1'de sınırlanır — hızlı olmak bonus değil, şart)
   Durum: 🔴 eforlu · 🟡 bilinçli · 🟢 otomatik
   ========================================================================== */

function median(nums) {
  if (!nums.length) return 0;
  const a = nums.slice().sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/**
 * Bir cevap kümesinden mastery hesapla.
 * Aynı soru birden fazla çözüldüyse SON denemeler esas alınır
 * (ilk hatayı sonsuza kadar cezalandırmak öğrenmeyi görmezden gelmek olur).
 */
function computeMastery(rows) {
  if (!rows.length) return { state: 'none', score: 0, acc: 0, medianSec: 0, n: 0 };

  const lastByQ = new Map();
  rows.forEach(r => lastByQ.set(r.qId, r)); // günlük kronolojik → son kazanır
  const last = [...lastByQ.values()];

  const acc = last.filter(r => r.ok).length / last.length;
  const medSec = median(last.map(r => r.ms / 1000).filter(s => s > 1 && s < 900));
  const speed = medSec > 0 ? Math.min(1, TARGET_SEC / medSec) : 0;
  const score = acc * speed;

  let st;
  if (last.length < 5) st = 'thin';                              // yeterli veri yok
  else if (acc >= 0.85 && medSec <= TARGET_SEC) st = 'auto';     // 🟢 otomatik
  else if (acc >= 0.70) st = 'aware';                            // 🟡 bilinçli
  else st = 'effort';                                            // 🔴 eforlu

  return { state: st, score, acc, medianSec: medSec, n: last.length };
}

export function subjectMastery(subjectId) {
  return computeMastery(state().answers.filter(a => a.subjectId === subjectId));
}

export function topicMastery(topicId) {
  return computeMastery(state().answers.filter(a => a.topicId === topicId));
}

export function allSubjectMastery() {
  return SUBJECTS.map(s => ({ ...s, mastery: subjectMastery(s.id), pool: questionsOf(s.id).length }));
}

export const MASTERY_LABEL = {
  none:   { txt: 'Hiç çözülmedi', dot: 'grey',  chip: '' },
  thin:   { txt: 'Veri az',       dot: 'grey',  chip: '' },
  effort: { txt: 'Eforlu',        dot: 'red',   chip: 'red' },
  aware:  { txt: 'Bilinçli',      dot: 'amber', chip: 'amber' },
  auto:   { txt: 'Otomatik',      dot: 'green', chip: 'green' }
};

/** Kanayan alt konular: en çok hata yapılan topicId'ler. */
export function bleedingTopics(limit = 6) {
  const S = state();
  const agg = new Map();
  S.answers.forEach(a => {
    if (!a.topicId) return;
    const r = agg.get(a.topicId) || { topicId: a.topicId, n: 0, wrong: 0 };
    r.n++; if (!a.ok) r.wrong++;
    agg.set(a.topicId, r);
  });
  return [...agg.values()]
    .filter(r => r.n >= 2 && r.wrong > 0)
    .map(r => ({ ...r, rate: r.wrong / r.n, topic: topicById.get(r.topicId) }))
    .filter(r => r.topic)
    .sort((a, b) => (b.rate - a.rate) || (b.wrong - a.wrong))
    .slice(0, limit);
}

/**
 * Kanayan ETİKETLER — kişiselleştirilmiş zorluk sinyali.
 * Statik `difficulty` alanı yazarın öznel görüşüdür ve havuzun %67'sinde
 * boş; onun yerine SRS/telemetriden TÜRETİLEN, kullanıcıya özel bir sinyal:
 * "bu etiketli sorularda gerçekten sen zorlanıyorsun" (bkz. STUDIO_YAPILACAKLAR §P0).
 * Etiketler questions.js'teki `tags` alanından gelir (soru başına 1-2 etiket:
 * mevzuat maddesi + konu kavramı). Cevap kaydı etiket taşımaz — soruyla o an
 * birleştirilir, böylece etiketler sonradan zenginleştirilse geçmiş veri de
 * otomatik güncel kalır.
 */
export function bleedingTags(limit = 8) {
  const S = state();
  const agg = new Map();
  S.answers.forEach(a => {
    const q = questionById.get(a.qId);
    const tags = q && Array.isArray(q.tags) ? q.tags : [];
    tags.forEach(tag => {
      const r = agg.get(tag) || { tag, n: 0, wrong: 0, lastAt: a.at };
      r.n++; if (!a.ok) r.wrong++;
      if (a.at > r.lastAt) r.lastAt = a.at;
      agg.set(tag, r);
    });
  });
  return [...agg.values()]
    .filter(r => r.n >= 2 && r.wrong > 0)
    .map(r => ({ ...r, rate: r.wrong / r.n }))
    .sort((a, b) => (b.rate - a.rate) || (b.wrong - a.wrong))
    .slice(0, limit);
}

/* ==========================================================================
   2b. SINAV TEŞHİSİ — gerçek deneme sonucundan okur
   İlke: localStorage'daki ham veriye (answers[] + exams[]) ek ölçüm toplamadan
   bakar. Çıktı net cinsindendir ("31 net açık", "HMK 6 net sızdırıyor") —
   "dikkat et" değil. Bu, koçun ve Bugün/İlerleme ekranlarının tek doğruluk
   kaynağıdır; bayat /api/profil'e bağlı değildir.
   ========================================================================== */

/**
 * Son denemeden net açığı ve soru başına tempo.
 * @returns {{net:number,correct:number,total:number,gap:number,pace:number,at:string,pass:boolean}|null}
 */
export function examGap() {
  const ex = lastExam();
  if (!ex) return null;
  const correct = ex.correct ?? ex.net ?? 0;
  const net = ex.net ?? correct;
  const gap = Math.max(0, PASS_CORRECT - net);
  const durationSec = (ex.durationMs || 0) / 1000;
  const pace = ex.total ? Math.round(durationSec / ex.total) : 0;
  return { net, correct, total: ex.total || 0, gap, pace, at: ex.at, pass: !!ex.pass };
}

/**
 * Son denemedeki en çok net sızdıran dersler.
 * Sızıntı = examQ × (1 − isabet): sınavda o dersten beklenen net kaybı.
 * Sıralama sabit değil, her çağrıda gerçek veriden hesaplanır.
 */
export function worstExamSubjects(limit = 5) {
  const ex = lastExam();
  if (!ex || !ex.bySubject) return [];
  const rows = [];
  for (const s of SUBJECTS) {
    const b = ex.bySubject[s.id];
    if (!b || !b.total) continue;
    const acc = b.correct / b.total;
    const leak = s.examQ * (1 - acc);
    rows.push({
      id: s.id, name: s.name, examQ: s.examQ,
      total: b.total, correct: b.correct, blank: b.blank || 0,
      acc, leak
    });
  }
  return rows.sort((a, b) => b.leak - a.leak).slice(0, limit);
}

/**
 * Hızlı+yanlış (YANLIS-KANI) ve tekrar-hatası sinyalleri — ham cevap günlüğünden.
 * Sınav ve pratik cevapları AYNI günlükte; ms gerçek ölçümdür (exam.js E.times[i]).
 *   fastWrong  : < %60 hedef süre VE yanlış → "hızlı tahmin, bilmediğini bilmeme"
 *   slowWrong  : > 1.5× hedef süre VE yanlış → "uzun düşünüp yanlış, bilgi eksiği"
 *   repeatWrong: aynı soruya 2+ denemede yanlış → "öğrenilmemiş, takılma kalıcı"
 *   fastCorrect: < %60 hedef VE doğru → "gerçek otomatikleşme" (iyi)
 */
export function answerQualitySignals() {
  const S = state();
  const rows = S.answers || [];
  if (!rows.length) {
    return { n: 0, fastWrongN: 0, fastWrongRate: 0, slowWrongN: 0, repeatWrongN: 0, fastCorrectN: 0 };
  }
  const fastCut = TARGET_SEC * 0.6;      // 45 sn
  const slowCut = TARGET_SEC * 1.5;      // 112 sn
  const fastWrong = rows.filter(a => !a.ok && (a.ms / 1000) < fastCut);
  const slowWrong = rows.filter(a => !a.ok && (a.ms / 1000) > slowCut);
  const repeatWrong = rows.filter(a => !a.ok && (a.attempt || 1) >= 2);
  const fastCorrect = rows.filter(a => a.ok && (a.ms / 1000) < fastCut);
  return {
    n: rows.length,
    fastWrongN: fastWrong.length,
    fastWrongRate: fastWrong.length / rows.length,
    slowWrongN: slowWrong.length,
    repeatWrongN: repeatWrong.length,
    fastCorrectN: fastCorrect.length
  };
}

/* ==========================================================================
   3. COACH — "ŞİMDİ NE YAPMALI"
   Tek karar döndürür. Kullanıcının seçim yapmasına gerek kalmaz.
   Öncelik sırası bilişsel gerekçeyle sabittir:
     1. Vadesi gelen tekrarlar  (geri getirme aralığı kaçarsa unutma başlar)
     2. Baz ölçüm yoksa deneme  (nerede olduğunu bilmeden strateji kurulamaz)
     3. En zayıf ağırlıklı ders  (sınav puanına en çok etki eden açık)
     4. Hiç dokunulmamış içerik  (kapsama boşluğu)
     5. Bakım dozu              (her şey yeşilse hızı koru)
   ========================================================================== */

/**
 * Bugün Stüdyo'da çözülmesi gereken soru sayısı.
 *
 * TEK KAYNAK İLKESİ: koç bugün için ödev atadıysa (odevler.js → setDailyPlan)
 * hedef o planın Stüdyo'da çözülecek soru toplamıdır. Koçun taahhüdü
 * (günde 200 soru) ekranda bir hedef gibi gösterilemez: o taahhüdün bir kısmı
 * fiziki kitapta kağıda çözülüyor ve Stüdyo o kısmı göremiyor. Plan yoksa
 * Stüdyo kendi ölçekli tabanına düşer — uydurma bir sayı gösterilmez.
 *
 * @returns {{value:number, source:'plan'|'base', plan:object|null}}
 */
export function dailyTargetInfo() {
  const S = state();
  const plan = S.plan && S.plan.date === todayKey() && S.plan.questions > 0 ? S.plan : null;
  if (plan) return { value: plan.questions, source: 'plan', plan };

  const d = daysLeft();
  const base = S.settings.dailyTarget || 40;
  if (d <= 7) return { value: Math.round(base * 1.5), source: 'base', plan: null };
  if (d <= 21) return { value: Math.round(base * 1.25), source: 'base', plan: null };
  return { value: base, source: 'base', plan: null };
}

export function dailyTarget() {
  return dailyTargetInfo().value;
}

export function todayProgress() {
  const rows = answersToday();
  const info = dailyTargetInfo();
  const target = info.value;
  return {
    solved: rows.length,
    correct: rows.filter(r => r.ok).length,
    target,
    targetSource: info.source,
    plan: info.plan,
    pct: Math.min(100, Math.round((rows.length / target) * 100))
  };
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

/**
 * @returns {{kind:string, title:string, why:string, cta:string, action:object, alts:Array}}
 */
export function nextAction() {
  const d = daysLeft();
  const due = dueQuestions();
  const gaps = karmaGaps();

  // --- 1. Baz ölçüm: deneme yoksa her şeyden önce gelir ---
  const last = lastExam();
  const examAge = daysSince(last?.at);
  const enoughPool = [...questionById.values()].length >= 100;
  if (enoughPool && (!last || (examAge > 7 && d > 3))) {
    return {
      kind: 'exam',
      title: last ? 'Yeni bir deneme zamanı' : 'Önce bir deneme çöz',
      why: last
        ? `Son denemenden ${Math.round(examAge)} gün geçti. Netin ölçülmediği sürece bütün tahminler ölçülmemiş bir sabite dayanıyor.`
        : 'Henüz hiç denemen yok. Net tahminlerinin tamamı varsayım; bir deneme girdiğin an hepsi yeniden hesaplanır. 120 soru, tek oturum, boş bırakmadan.',
      cta: '120 soruluk denemeyi başlat',
      action: { view: 'exam', mode: 'start' },
      alts: buildAlts(['karma', 'review'])
    };
  }

  // --- 2. Karma set: varsayılan çalışma biçimi ---
  // Ders bazlı mod artık öneri sırasında yok. Sınav karışık soruyor; ayırt etme
  // işi yalnız harmanlanmış sette çalışılıyor. Vadesi gelen tekrarlar da bu
  // setin içine giriyor, ayrı mod açmaya gerek kalmıyor.
  const count = d <= 7 ? 30 : 20;
  const w = karmaWeights().filter(r => r.weight > 0).sort((a, b) => b.weight - a.weight);
  const lead = w[0];
  const fresh = w.filter(r => r.fresh).length;

  // Deneme ölçümü varsa ve baraj altındaysa, neden metni net açığıyla açılır.
  // Kural: sayı net cinsindendir; koç "31 net açık" der, "dikkat et" demez.
  const gapInfo = examGap();
  const worst = gapInfo && gapInfo.gap > 0 ? worstExamSubjects(2) : [];
  const gapLead = gapInfo && gapInfo.gap > 0
    ? `Son deneme netin ${gapInfo.net} — 84 için ${gapInfo.gap} net açık`
      + (worst.length
        ? `; en çok ${worst[0].name} sızdırıyor (sınavda ${worst[0].examQ} soru, isabet %${Math.round(worst[0].acc * 100)})`
        : '')
      + '. '
    : '';

  let why;
  if (due.length >= 5 && fresh > 0) {
    why = gapLead + `Set ${Math.min(due.length, Math.floor(count * KARMA_DUE_SHARE))} tekrar sorusuyla açılıyor, kalanı yeni malzeme. Hiç açmadığın ${fresh} ders var; bunlar ilk temasta blok hâlinde geliyor, tanıdıktan sonra harmana karışıyor.`;
  } else if (fresh > 0) {
    why = gapLead + `Hiç açmadığın ${fresh} ders var ve sınavın yarısından fazlası oralarda. Set ağırlığı ölçülmüş sınav dağılımından geliyor; en çok pay ${lead ? lead.name : '—'} tarafında.`;
  } else {
    why = gapLead + `Karışık set. Ders adı cevabı verene kadar gizli; sınavda da yazmıyor, hangi kuralın uygulanacağını kendin seçeceksin.`;
  }

  return {
    kind: 'karma',
    title: `${count} soruluk karma set`,
    why,
    cta: `Karma seti başlat (${count} soru)`,
    action: { view: 'practice', mode: 'karma', count },
    alts: buildAlts(['exam', 'review']).concat(
      gaps.length ? [{ label: `Kâğıtta kalan ${gaps.length} ders`, action: { view: 'progress' } }] : []
    )
  };
}

function buildAlts(kinds) {
  const map = {
    karma:  { label: 'Karma set',      action: { view: 'practice', mode: 'karma', count: 20 } },
    review: { label: 'Tekrarları çöz', action: { view: 'practice', mode: 'review', count: 20 } },
    exam:   { label: 'Deneme sınavı',  action: { view: 'exam', mode: 'start' } },
    new:    { label: 'Yeni sorular',   action: { view: 'practice', mode: 'unseen', count: 15 } }
  };
  return kinds.map(k => map[k]).filter(Boolean);
}

/* ==========================================================================
   4. KARMA SET — sınavın kendi biçimi
   ----------------------------------------------------------------------
   Neden ders bazlı değil: sınav 120 soruyu karışık soruyor. Ders ders
   çalışıldığında hangi kuralın uygulanacağı sorunun ÜSTÜNDE yazılı olur;
   sınavda yazmaz. Ayırt etme işi ancak harmanlanmış sette çalışılır
   (Brunmair & Richter 2019 meta-analizi, 59 çalışma: kural uygulamada
   g = 0,34 — mütevazı ama gerçek; düz metin ezberinde yok).
   AMA harmanlama edinimin YERİNE geçmez: hiç görülmemiş bir derste tek tek
   dağıtılmış sorular tahmine döner. Bu yüzden ilk temas blok hâlinde verilir
   (KARMA_ACQ_BLOCK), ders tanındıktan sonra harmana karışır.

   Bir set üç parçadan kurulur:
     1. Vadesi gelen tekrarlar (en çok %30) — ayrı "tekrar seansı" yok,
        yanlışlar setin içinde geri gelir. Mod değiştirmek gerekmez.
     2. Ölçülmüş sınav ağırlığına göre dağıtılmış yeni sorular.
     3. Sırası: aynı ders yan yana gelmez (edinim bloğu hariç).

   Ders payı = examQ × (0,6 × kapsam açığı + 0,4 × isabet açığı)
     kapsam açığı : o dersten kaç soru görüldü / görülmesi gereken
     isabet açığı : ölçülen isabet düştükçe pay büyür, hiç veri yoksa tam pay
   Bilinmeyen ders en yüksek önceliği alır; bu bir karar değil, dünkü
   aritmetiğin sonucu: hiç açılmamış dersler sınavın 64 sorusu.
   ========================================================================== */

/** Setin en fazla bu kadarı vadesi gelen tekrar olur. */
export const KARMA_DUE_SHARE = 0.30;
/** Hiç açılmamış derste ilk temas kaç soruluk blok hâlinde verilir. */
export const KARMA_ACQ_BLOCK = 4;
/** Bu sayıdan az soru çözülmüş ders "henüz edinilmemiş" sayılır. */
export const KARMA_ACQ_THRESHOLD = 5;
/** Sınavdaki her soru için hedeflenen kapsam (kaç soru görülmeli). */
export const KARMA_COVER_PER_EXAMQ = 4;
/** Ders payında kapsam açığının payı; kalanı isabet açığının. KARAR, ölçüm değil. */
export const KARMA_COVER_W = 0.6;
/** Havuz, sınav payının bu katını taşıyamıyorsa ders karma sette kısılır. */
export const KARMA_SERVE_PER_EXAMQ = 8;
/** Bir sette en fazla kaç derse edinim bloğu verilir. */
export const KARMA_MAX_BLOCKS = 2;

/** Ders bazında ham cevap sayacı: { seen, correct }. */
function subjectCounts() {
  const S = state();
  const m = new Map();
  for (const a of S.answers) {
    const r = m.get(a.subjectId) || { seen: 0, correct: 0 };
    r.seen++; if (a.ok) r.correct++;
    m.set(a.subjectId, r);
  }
  return m;
}

/**
 * Her ders için karma payı ağırlığı. Havuzu olmayan ders ağırlık almaz
 * (ona kâğıttan çalışılacak — bkz. karmaGaps).
 */
export function karmaWeights() {
  const counts = subjectCounts();
  return SUBJECTS.map(s => {
    const pool = questionsOf(s.id).length;
    const c = counts.get(s.id) || { seen: 0, correct: 0 };
    const coverTarget = Math.max(1, s.examQ * KARMA_COVER_PER_EXAMQ);
    const coverGap = 1 - Math.min(1, c.seen / coverTarget);
    const acc = c.seen >= 5 ? c.correct / c.seen : null;
    // Hiç veri yoksa açık tam sayılır: bilmediğin ders en riskli derstir.
    const accGap = acc === null ? 1 : Math.max(0.12, 1 - acc);
    // İki açık ÇARPILMAZ, toplanır. Çarpım, kapsamı dolmuş ama isabeti düşük
    // dersi sıfıra yaklaştırıyordu: HMK (61 soru görülmüş, isabet %72, sınavda
    // 12 soru) 40 soruluk sette hiç çıkmıyordu. Oysa iki açıktan HERHANGİ BİRİ
    // tek başına çalışma sebebidir. Kapsam ağır basıyor çünkü bu aşamada
    // sınavın yarısından fazlası hiç açılmamış derslerde; kapsam kapandıkça
    // ağırlık kendiliğinden isabete kayıyor.
    const need = KARMA_COVER_W * coverGap + (1 - KARMA_COVER_W) * accGap;
    // Havuz ne kadarını gerçekten taşıyabiliyor? Sınavda 11 soru eden Ticaret'in
    // bankada 14 sorusu var; ağırlığı tek başına examQ'dan gelirse uygulama o 14
    // soruyu ilk setlerde harcayıp dersi "çalışıldı" sanıyor. Taşıyamadığı dersi
    // kısar, kâğıda bırakır (karmaGaps bunu ekranda söylüyor).
    const serve = Math.min(1, pool / Math.max(1, s.examQ * KARMA_SERVE_PER_EXAMQ));
    const thin = pool < s.examQ * 2;
    const weight = pool === 0 ? 0 : s.examQ * need * serve;
    return { ...s, pool, seen: c.seen, acc, coverGap, accGap, serve, thin, weight, fresh: c.seen < KARMA_ACQ_THRESHOLD };
  });
}

/**
 * Sınav payını taşıyacak havuzu OLMAYAN dersler.
 * Bunlar sessizce düşmez; uygulamada "bu ders kâğıtta" diye yazılır.
 * Eşik: havuz, sınav payının iki katından azsa o dersi karma set taşıyamaz.
 */
export function karmaGaps() {
  return karmaWeights()
    .filter(s => s.pool < s.examQ * 2)
    .map(s => ({ id: s.id, name: s.name, examQ: s.examQ, pool: s.pool }))
    .sort((a, b) => b.examQ - a.examQ);
}

/** Bir dersten seçilebilir sorular: önce hiç görülmemiş, sonra takılınanlar. */
function candidatesOf(subjectId, excludeIds, scope = 'core') {
  const S = state();
  const seenIds = new Set(S.answers.map(a => a.qId));
  let pool = questionsOf(subjectId, scope).filter(q => !excludeIds.has(q.id));
  if (!pool.length && scope === 'core') {
    pool = questionsOf(subjectId, 'all').filter(q => !excludeIds.has(q.id));
  }
  const unseen = [];
  const shaky = [];
  for (const q of pool) {
    if (!seenIds.has(q.id)) { unseen.push(q); continue; }
    const r = S.srs[q.id];
    // Mezun olmuş ya da kutusu ilerlemiş ve vadesi gelmemiş soruyu tekrar sormayız.
    if (r && r.box >= 2) continue;
    shaky.push(q);
  }
  return shuffle(unseen).concat(shuffle(shaky));
}

/** Ağırlıkları tam sayı kotaya çevir (en büyük kalan yöntemi). */
function allocate(rows, total) {
  const sum = rows.reduce((a, r) => a + r.weight, 0);
  if (sum <= 0 || total <= 0) return new Map();
  const exact = rows.map(r => ({ id: r.id, v: (r.weight / sum) * total }));
  const out = new Map(exact.map(e => [e.id, Math.floor(e.v)]));
  let left = total - [...out.values()].reduce((a, b) => a + b, 0);
  exact.sort((a, b) => (b.v - Math.floor(b.v)) - (a.v - Math.floor(a.v)));
  for (let i = 0; left > 0 && i < exact.length; i++, left--) {
    out.set(exact[i].id, out.get(exact[i].id) + 1);
  }
  return out;
}

/**
 * Aynı ders yan yana gelmesin diye dağıt. Edinim blokları bölünmez:
 * blok tek bir öğe gibi yerleştirilir, içi bitişik kalır.
 */
function interleave(groups) {
  // groups: [{ subjectId, items:[q], block:bool }]
  const units = [];
  for (const g of groups) {
    if (g.block) units.push({ subjectId: g.subjectId, items: g.items });
    else g.items.forEach(q => units.push({ subjectId: g.subjectId, items: [q] }));
  }
  const bySubj = new Map();
  units.forEach(u => {
    if (!bySubj.has(u.subjectId)) bySubj.set(u.subjectId, []);
    bySubj.get(u.subjectId).push(u);
  });
  const out = [];
  let lastSubj = null;
  while (bySubj.size) {
    // En çok kalanı olan ve son konulandan farklı dersi seç.
    let pick = null;
    let best = -1;
    for (const [sid, arr] of bySubj) {
      if (sid === lastSubj && bySubj.size > 1) continue;
      if (arr.length > best) { best = arr.length; pick = sid; }
    }
    if (pick === null) pick = [...bySubj.keys()][0];
    const arr = bySubj.get(pick);
    const unit = arr.shift();
    out.push(...unit.items);
    lastSubj = pick;
    if (!arr.length) bySubj.delete(pick);
  }
  return out;
}

/**
 * Karma set kur.
 * @returns {{questions:Array, plan:Array, due:number, gaps:Array}}
 */
export function buildKarmaSet(count = 20, scope = 'core') {
  const used = new Set();
  const picked = [];

  // --- 1. Vadesi gelen tekrarlar ---
  const dueCap = Math.floor(count * KARMA_DUE_SHARE);
  const due = dueQuestions().slice(0, dueCap);
  due.forEach(d => { used.add(d.q.id); });
  const dueGroups = due.map(d => ({ subjectId: d.q.subjectId, items: [d.q], block: false }));

  // --- 2. Kalan pay: ölçülmüş sınav ağırlığına göre yeni malzeme ---
  const remaining = count - due.length;
  const rows = karmaWeights().filter(r => r.weight > 0);
  const quota = allocate(rows, remaining);

  const newGroups = [];
  let deficit = 0;
  let blocksLeft = KARMA_MAX_BLOCKS;
  // Ağırlığı yüksek ders önce seçilsin ki edinim bloğu en çok gereken derse gitsin.
  rows.sort((a, b) => b.weight - a.weight);
  for (const r of rows) {
    let want = quota.get(r.id) || 0;
    if (!want) continue;
    // Havuzu zaten yetmeyen dersin kıt sorularını sete dağıtmayız: seti bir
    // örnekle işaretler, gerisi kâğıtta kalır.
    if (r.thin) want = Math.min(want, 1);
    // Hiç açılmamış derste ilk temas blok hâlinde verilir; tek soru tahmine
    // döner. Ama set blok yığınına dönmesin diye set başına en fazla
    // KARMA_MAX_BLOCKS ders blok alır — yoksa "karma" adı altında yine
    // ders ders çalışmış oluyoruz.
    const block = r.fresh && !r.thin && blocksLeft > 0;
    if (block) { want = Math.max(want, Math.min(KARMA_ACQ_BLOCK, r.pool)); blocksLeft--; }
    const cands = candidatesOf(r.id, used, scope).slice(0, want);
    cands.forEach(q => used.add(q.id));
    if (cands.length < want) deficit += want - cands.length;
    if (cands.length) newGroups.push({ subjectId: r.id, items: cands, block: block && cands.length > 1 });
  }

  const all = interleave(dueGroups.concat(newGroups));
  picked.push(...all.slice(0, Math.max(1, count)));

  // Plan: kullanıcıya değil, ekrandaki özet ve teste.
  const planMap = new Map();
  picked.forEach(q => planMap.set(q.subjectId, (planMap.get(q.subjectId) || 0) + 1));
  const plan = [...planMap.entries()]
    .map(([id, n]) => ({ id, name: (SUBJECTS.find(s => s.id === id) || {}).name || id, n }))
    .sort((a, b) => b.n - a.n);

  return { questions: picked, plan, due: due.length, gaps: karmaGaps(), deficit };
}

/* ==========================================================================
   NET / PUAN HESABI
   HMGS: yanlış cezası yok → net = doğru sayısı. Puan = doğru/120 × 100.
   ========================================================================== */

export function scoreOf(correct, total = 120) {
  const pts = (correct / total) * 100;
  return { net: correct, points: Math.round(pts * 10) / 10, pass: correct >= PASS_CORRECT };
}

/* ==========================================================================
   AKIŞ MODU — SONU OLMAYAN, SEANS ÖZETİYLE BÖLÜNMEYEN SORU AKIŞI
   ----------------------------------------------------------------------
   Kullanıcı "flow moduna geçmek istiyorum, uygulamadan çıkmak istemiyorum"
   dedi. Sorun içerik kalitesi değil, her gün açıp çözmek (PROFIL_MOTORU_PLANI
   §2.4: 44 günün 29'u sıfır, 11 gündür kayıt yok). Bu katman o boşluğu kapatır.

   İLKELER:
     - Soru seçimi UYDURULMAZ: kanıtlanmış buildKarmaSet (ölçülmüş sınav
       dağılımı + kapsam/isabet açığı) haddelenen bir kaynağa çevrilir.
     - Yanlıştan sonra aynı kuraldan bir kardeş soru kısa bir gecikmeyle
       (FLOW_REINFORCE_DELAY) geri gelir — hata sonrası pekiştirme.
     - Akış skoru türetilmiştir (uydurma puan değil): son cevapların doğruluğu
       × tempo × kesintisizlik. Cevaplar answers[]'ta zaten duruyor; bu fonk.
       yalnızca OKUR, şema eklemez.
   ========================================================================== */

/** Kuyruk bu eşiğin altına düşünce yeniden doldurulur. */
export const FLOW_REFILL_AT = 8;
/** Her dolumda çekilen soru sayısı. */
export const FLOW_BATCH = 16;
/** Yanlıştan sonra pekiştirme sorusu kaç pozisyon sonra gelir. */
export const FLOW_REINFORCE_DELAY = 2;
/** Akış skorunun baktığı son cevap penceresi. */
export const FLOW_WINDOW = 10;
/** "Kesintisiz" sayılan iki cevap arası saniye. */
export const FLOW_GAP_SEC = 8;

/**
 * Akış kuyruğu için bir parti soru üret. buildKarmaSet'in ince sarmalayıcısı:
 * vadesi gelen SRS tekrarları önce, kalanı ölçülmüş sınav ağırlığına göre,
 * aynı ders yan yana gelmeden. Tek doğruluk kaynağı karma motorudur.
 */
export function flowFeed(count = FLOW_BATCH, scope = 'core') {
  return buildKarmaSet(count, scope);
}

/**
 * Yanlış yapılan sorudan sonra aynı kuralın bir kardeşini döndürür.
 * Tercih sırası: aynı konu (topicId) → aynı ders. Yakın zamanda sorulanlar
 * (excludeIds) ve sorunun kendisi dışlanır. Aday yoksa null (pekiştirme yok,
 * uydurma yok).
 */
export function flowReinforce(q, excludeIds = new Set()) {
  if (!q) return null;
  const seen = new Set(excludeIds);
  seen.add(q.id);
  let pool = q.topicId ? questionsOfTopic(q.topicId, 'all') : [];
  if (!pool.length) pool = questionsOf(q.subjectId, 'all');
  const cands = pool.filter(x => !seen.has(x.id));
  return shuffle(cands)[0] || null;
}

/**
 * Akış skoru 0–1. Uydurma XP değil, Csikszentmihalyi'nin akış tanımının
 * (net hedef + zorluk≈beceri + anında geri bildirim) sayısal karşılığı:
 *   score = doğruluk(son N) × tempo faktörü × kesintisizlik faktörü
 * Doğruluk ana taşıyıcı; tempo ve kesintisizlik akışı inceltir ama ezmez.
 * @param {Array|null} rows  Cevap kayıtları; null ise state().answers okunur.
 */
export function flowScore(rows = null) {
  const all = rows == null ? state().answers : rows;
  if (!all || !all.length) return { score: 0, acc: 0, tempo: 0, continuity: 1, label: 'idle', n: 0 };

  const last = all.slice(-FLOW_WINDOW);
  const acc = last.filter(r => r.ok).length / last.length;

  const secs = last.map(r => (r.ms || 0) / 1000).filter(s => s > 0.5 && s < 900);
  const med = median(secs);
  const tempo = med > 0 ? Math.min(1, TARGET_SEC / med) : 0;

  let continuity = 1;
  if (last.length >= 3) {
    let fast = 0, gaps = 0;
    for (let i = 1; i < last.length; i++) {
      const dt = (new Date(last[i].at).getTime() - new Date(last[i - 1].at).getTime()) / 1000;
      if (Number.isFinite(dt) && dt >= 0) { gaps++; if (dt <= FLOW_GAP_SEC) fast++; }
    }
    continuity = gaps ? fast / gaps : 1;
  }

  const score = Math.max(0, Math.min(1, acc * (0.6 + 0.4 * tempo) * (0.75 + 0.25 * continuity)));

  let label;
  if (score >= 0.72) label = 'Akışta';
  else if (score >= 0.5) label = 'Odaklan';
  else if (score >= 0.3) label = 'Isınıyor';
  else label = 'Mola ver';

  return { score, acc, tempo, continuity, label, n: last.length };
}

/**
 * Akış içi yetkinlik anı. scheduleAfterAnswer "mezun" döndürdüğünde (kutu
 * 5) o sorunun temsil ettiği kural aralıklı tekrardan çıkmış demektir — bu
 * gerçek bir "otomatikleşti" sinyalidir, dekoratif rozet değil.
 */
export function flowMilestone(sched) {
  if (!sched) return null;
  if (sched.box >= BOXES.length) return 'Kural otomatikleşti — tekrar sırasından çıktı';
  return null;
}
