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

import { state, TARGET_SEC, PASS_CORRECT, daysLeft, answersToday, lastExam } from './store.js';
import { SUBJECTS, questionsOf, questionById, topicsOf, topicById, questionsOfTopic } from './data.js';

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
export function scheduleAfterAnswer(qId, ok) {
  const S = state();
  const cur = S.srs[qId] || { box: 0, lapses: 0, dueAt: null, lastAt: null };
  const now = new Date();

  if (ok) {
    cur.box = Math.min(cur.box + 1, BOXES.length);
  } else {
    cur.box = 0;
    cur.lapses += 1;
  }
  cur.lastAt = now.toISOString();

  if (cur.box >= BOXES.length) {
    cur.dueAt = null; // mezun
  } else {
    cur.dueAt = addDays(now, BOXES[cur.box]).toISOString();
  }
  S.srs[qId] = cur;

  if (cur.box >= BOXES.length) return { box: cur.box, note: 'Bu soru mezun oldu — tekrar sırasından çıktı.' };
  if (!ok) return { box: 0, note: `Yarın tekrar sorulacak. (${cur.lapses}. kez takıldın)` };
  return { box: cur.box, note: `${BOXES[cur.box]} gün sonra tekrar sorulacak.` };
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
   3. COACH — "ŞİMDİ NE YAPMALI"
   Tek karar döndürür. Kullanıcının seçim yapmasına gerek kalmaz.
   Öncelik sırası bilişsel gerekçeyle sabittir:
     1. Vadesi gelen tekrarlar  (geri getirme aralığı kaçarsa unutma başlar)
     2. Baz ölçüm yoksa deneme  (nerede olduğunu bilmeden strateji kurulamaz)
     3. En zayıf ağırlıklı ders  (sınav puanına en çok etki eden açık)
     4. Hiç dokunulmamış içerik  (kapsama boşluğu)
     5. Bakım dozu              (her şey yeşilse hızı koru)
   ========================================================================== */

export function dailyTarget() {
  const S = state();
  const d = daysLeft();
  const base = S.settings.dailyTarget || 40;
  if (d <= 7) return Math.round(base * 1.5);   // son hafta: yoğunlaş
  if (d <= 21) return Math.round(base * 1.25);
  return base;
}

export function todayProgress() {
  const rows = answersToday();
  const target = dailyTarget();
  return {
    solved: rows.length,
    correct: rows.filter(r => r.ok).length,
    target,
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
  const S = state();
  const due = dueQuestions();
  const d = daysLeft();
  const alts = [];

  // --- 1. Vadesi gelen tekrarlar ---
  if (due.length >= 5) {
    return {
      kind: 'review',
      title: `${due.length} soru tekrar vadesinde`,
      why: 'Aralıklı geri getirme, öğrenmenin prosedürel hafızaya geçtiği yer. Vade kaçarsa unutma eğrisi baştan başlar — bunlar her şeyden önce gelir.',
      cta: `Tekrarı başlat (${Math.min(due.length, 20)} soru)`,
      action: { view: 'practice', mode: 'review', count: Math.min(due.length, 20) },
      alts: buildAlts(['exam', 'weak', 'new'])
    };
  }

  // --- 2. Baz ölçüm: hiç deneme yok veya çok eskidi ---
  const last = lastExam();
  const examAge = daysSince(last?.at);
  const enoughPool = [...questionById.values()].length >= 100;
  if (enoughPool && (!last || (examAge > 10 && d > 5))) {
    return {
      kind: 'exam',
      title: last ? 'Yeni bir deneme zamanı' : 'İlk deneme sınavını çöz',
      why: last
        ? `Son denemenden ${Math.round(examAge)} gün geçti. Net, tek gerçek pusuladır — bu kadar aralıkta gelişimin ölçülemez.`
        : 'Nerede olduğunu bilmeden neyi çalışacağına karar veremezsin. 120 soru, süre baskısı altında, tek oturum — baz netini alalım.',
      cta: '120 soruluk denemeyi başlat',
      action: { view: 'exam', mode: 'start' },
      alts: buildAlts(['weak', 'new', 'review'])
    };
  }

  // --- 3. En zayıf ağırlıklı ders ---
  const ranked = allSubjectMastery()
    .filter(s => s.pool >= 5)
    .map(s => {
      const m = s.mastery;
      const gap = m.state === 'none' ? 1 : (1 - m.score);
      // Sınav ağırlığı × açık = puana etkisi
      return { ...s, priority: (s.examQ / 120) * gap };
    })
    .sort((a, b) => b.priority - a.priority);

  const worst = ranked[0];
  if (worst && worst.priority > 0.008) {
    const m = worst.mastery;
    const why = m.state === 'none'
      ? `${worst.name} sınavda ${worst.examQ} soru ediyor ve henüz hiç çözmedin. En büyük ölçülmemiş riskin burada.`
      : m.state === 'effort'
        ? `${worst.name}'nda başarın %${Math.round(m.acc * 100)}, medyan sürenin ${Math.round(m.medianSec)} sn. Hem yavaş hem hatalı — bu konu hâlâ eforlu, prosedürel değil.`
        : `${worst.name}'nda doğruluğun iyi (%${Math.round(m.acc * 100)}) ama medyan süren ${Math.round(m.medianSec)} sn. Hedef ${TARGET_SEC} sn — hız çalışması gerek.`;
    return {
      kind: 'weak',
      title: `${worst.name}'na odaklan`,
      why,
      cta: `${Math.min(15, worst.pool)} soru çöz`,
      action: { view: 'practice', mode: 'subject', subjectId: worst.id, count: Math.min(15, worst.pool) },
      alts: buildAlts(['review', 'exam', 'new'])
    };
  }

  // --- 4. Hiç dokunulmamış içerik ---
  const unseen = unseenQuestions();
  if (unseen.length > 0) {
    return {
      kind: 'new',
      title: `${unseen.length} soruya hiç dokunmadın`,
      why: 'Havuzun tamamını en az bir kez görmeden zayıf alan haritası tamamlanmaz.',
      cta: `Yeni ${Math.min(15, unseen.length)} soru çöz`,
      action: { view: 'practice', mode: 'unseen', count: Math.min(15, unseen.length) },
      alts: buildAlts(['review', 'exam', 'weak'])
    };
  }

  // --- 5. Bakım dozu ---
  return {
    kind: 'maintain',
    title: 'Bakım dozu',
    why: 'Vadesi gelen tekrar yok, zayıf alan kalmadı. Şimdi işi hızı korumak — karma set çöz, otomatikliği paslanmaya bırakma.',
    cta: '15 soruluk karma set',
    action: { view: 'practice', mode: 'mixed', count: 15 },
    alts: buildAlts(['exam', 'review'])
  };
}

function buildAlts(kinds) {
  const map = {
    review: { label: 'Tekrarları çöz', action: { view: 'practice', mode: 'review', count: 20 } },
    exam:   { label: 'Deneme sınavı',  action: { view: 'exam', mode: 'start' } },
    new:    { label: 'Yeni sorular',   action: { view: 'practice', mode: 'unseen', count: 15 } },
    weak:   { label: 'Karma set',      action: { view: 'practice', mode: 'mixed', count: 15 } }
  };
  return kinds.map(k => map[k]).filter(Boolean);
}

/* ==========================================================================
   NET / PUAN HESABI
   HMGS: yanlış cezası yok → net = doğru sayısı. Puan = doğru/120 × 100.
   ========================================================================== */

export function scoreOf(correct, total = 120) {
  const pts = (correct / total) * 100;
  return { net: correct, points: Math.round(pts * 10) / 10, pass: correct >= PASS_CORRECT };
}
