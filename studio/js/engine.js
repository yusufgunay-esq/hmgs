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
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { state, TARGET_SEC, PASS_CORRECT, daysLeft, answersToday, lastExam, todayKey, EXAM_DATE } from './store.js';
import { SUBJECTS, questionsOf, questionById, topicsOf, topicById, questionsOfTopic, shuffle, tierOf, TIER_REAL, TIER_DENEME, TIER_AI, TIER_ADV, aiModelRank } from './data.js';

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

/* --------------------------------------------------------------------------
   TEKRAR POLİTİKASI v3 — SORU SAYISIYLA, GÜNLE DEĞİL (19 Eylül 2026)
   ----------------------------------------------------------------------
   Kullanıcı: "yarın gelmesine gerek yok, akışta bir daha önüme eklenebilir;
   gün olarak düşünmene gerek yok, sınava yedi gün kaldı." Sınav ufku bir
   haftayken takvim aralığı (1-3-7-14-30 gün, sonra "yarın", sonra "1 gün")
   yanlış birimdi: tekrarı ertesi güne atmak, o gün çalışılmazsa hiç yapılmaması
   ve yanlışın sıcakken düzeltilememesi demek. Aralık artık ÇÖZÜLEN SORU
   SAYISIYLA ölçülür: `dueN` = bu soru, toplam cevap sayısı bu değere
   ulaşınca yeniden sorulabilir. Aynı akışın içinde, araya başka sorular
   girdikten sonra geri gelir; oturum kapanırsa sayaç sonraki oturumda sürer.

                       DOĞRU                        YANLIŞ / BOŞ / MANTIKLA
   HMGS (T1/T2)   bitti (tekrarında doğruysa    SRS_WRONG_GAP soru sonra tekrar;
                  da bitti, son kontrol yok)    yine yanlışsa yine gelir
   İleri havuz (T3)  bitti                         BİR kez, SRS_CONFIRM_GAP soru sonra,
                                                HMGS tekrarlarının arkasında;
                                                ikinci yanlışta bırakılır

   Aralıklar KARARDIR. Gerekçe: yanlıştan hemen sonra aynı konudan bir kardeş
   soru zaten 2 soru sonra geliyor (flowReinforce); sorunun KENDİSİ hemen
   dönerse cevap kısa süreli bellekten okunur, geri çağırma olmaz. Araya
   ~10 soru (birkaç farklı ders) girmesi bunu keser. Kontrol turu daha seyrek.
   Akış kuyruğu 8 soruda bir dolduğu için gerçek dönüş ~10-20 soru sonradır.
   Kutu alanı geriye dönük uyum için duruyor: bitti/bırakıldı = BOXES.length.
   -------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   v3.2 — LİTERATÜR KARŞILAŞTIRMASI (20 Eylül 2026)
   ----------------------------------------------------------------------
   Kullanıcı: "pekiştirmeli öğrenme yapıyorsun herhalde, makaleleri incele."
   Dürüst yanıt: burada öğrenen (trained) bir RL politikası YOK — ödül
   fonksiyonu optimize eden bir ajan değil, simülasyonla doğrulanmış bir
   kural setiyiz (SM-2/Leitner ailesi). Gerçek RL/optimal-kontrol örneği
   Tabibian, Upadhyay, De, Zarezade, Schölkopf, Gomez-Rodriguez'in
   "Enhancing human learning via spaced repetition optimization" (PNAS 2019,
   MEMORIZE) makalesi: unutmayı üstel bir süreç modelleyip tekrar YOĞUNLUĞUNUN
   "unutma olasılığıyla orantılı" olması gerektiğini kanıtlıyor — yani bütçe,
   unutmaya en yakın soruya gitmeli. `dueShare()` (aşağıda) bunu SET
   düzeyinde zaten yapıyor: bekleyen yanlış biriktikçe tekrar payı büyüyor.
   Bu turda aynı ilke SORU düzeyine indi: `spot` alanı (bkz. scheduleAfterAnswer)
   ile 2+ kez takılıp sonra doğru yapılan soru TEK seferlik, çok uzak ve düşük
   öncelikli bir nokta kontrolüne giriyor — 1 kez takılıp hemen toparlayandan
   ayrılıyor. Modern SRS'lerin (FSRS: Difficulty-Stability-Retrievability
   durumu; Duolingo'nun Half-Life Regression'ı, Settles & Meeder 2016) ortak
   noktası tam bu: aralık sabit değil, sorunun GEÇMİŞİNE (kaç kez unutuldu)
   göre uyarlanır. Tam FSRS/HLR (öğrenen, regresyonla eğitilen model) BURADA
   KASITLI OLARAK kurulmadı: sınava 7 gün var, kullanıcının kendi veri hacmi
   (~birkaç bin cevap) böyle bir modeli güvenilir eğitmeye yetmez ve şu anda
   yeni bir hata riski almaya değmez — bu, ölçülmeden atılan bir adım olurdu.
   Bjork'un "arzu edilir zorluk" (desirable difficulty) / "proximal learning
   bölgesi" çerçevesi zaten karşılanıyor: edinim bloğu (KARMA_ACQ_BLOCK) çok
   yeni bir dersi önce tek başına verip sonra harmana katıyor — tümüyle
   yabancı malzemeyi hemen karıştırmak zorluğu "arzu edilir" olmaktan çıkarır.
   Brunmair & Richter 2019 (interleaving, g=0,34) ve Rowland 2014 (test
   etkisi, geri bildirimli g=0,73) zaten `interleave()` ve "her soru anında
   doğru/yanlış gösterir" ilkeleriyle karşılanıyor durumda; bu turda onlara
   dokunulmadı.
   -------------------------------------------------------------------------- */

/** Yanlış yapılan HMGS sorusu kaç cevap sonra yeniden sorulabilir. KARAR. */
export const SRS_WRONG_GAP = 10;
/** İleri havuz (T3) yanlışının tek tekrarı kaç cevap sonra. KARAR. */
export const SRS_CONFIRM_GAP = 30;
/**
 * 2+ kez takılıp sonra toparlanan HMGS sorusuna verilen TEK nokta kontrolü
 * kaç cevap sonra gelir (bkz. v3.2 notu yukarıda). SRS_WRONG_GAP'ten kasıtlı
 * olarak çok uzak: eski "son kontrol" turu (v3.1'de kaldırıldı) HERKESE
 * uygulandığı için kuyruğu tıkıyordu; bu yalnız gerçekten zorlanmış azınlığa
 * (lapses>=2) uygulanıyor ve geç/düşük öncelikli kalması bilinçli — amaç
 * bekleyen taze yanlışların önüne geçmemesi. KARAR.
 */
export const SRS_SPOTCHECK_GAP = 60;
/** 2+ kez takılmış eşiği — spot kontrolünü tetikleyen lapses sayısı. KARAR. */
export const SRS_SPOTCHECK_LAPSES = 2;

function answerCount() { return state().answers.length; }

function isHmgs(qId) {
  const q = questionById.get(qId);
  return !q || tierOf(q) !== TIER_ADV;   // bilinmeyen soru HMGS sayılır (güvenli taraf)
}

/** Soru hâlâ tekrar sırasında mı (vadesi gelmiş ya da gelecek). */
export function isPending(r) { return !!r && (r.dueN != null || !!r.dueAt); }

/** Vadesi geldi mi. Eski (tarihli) kayıtlar da okunur. */
export function isDue(r, now = new Date()) {
  if (!r) return false;
  if (r.dueN != null) return answerCount() >= r.dueN;
  return !!r.dueAt && new Date(r.dueAt) <= now;
}

function graduate(cur) { cur.box = BOXES.length; cur.dueAt = null; delete cur.dueN; }

function schedule(cur, gap) {
  cur.dueAt = null;
  cur.dueN = answerCount() + gap;
}

/** Cevaptan sonra SRS durumunu güncelle. Dönen not kullanıcıya gösterilir. */
export function scheduleAfterAnswer(qId, ok, logicGuess = false) {
  const S = state();
  const cur = S.srs[qId] || { box: 0, lapses: 0, dueAt: null, lastAt: null };
  const hmgs = isHmgs(qId);
  const solid = ok && !logicGuess;
  const wasPending = isPending(cur) && cur.box < BOXES.length;
  const wasSpot = !!cur.spot;   // bu doğru cevap TAM OLARAK nokta kontrolünü mü çözüyor
  cur.lastAt = new Date().toISOString();
  delete cur.dropped;
  delete cur.spot;
  let res;

  if (!hmgs) {
    // ---- İleri havuz ----
    if (solid) {
      graduate(cur);
      res = { box: cur.box, kind: 'ilk', note: 'İleri havuz sorusu doğru: tekrar edilmeyecek.' };
    } else {
      if (!ok) cur.lapses += 1;
      cur.box = 0;
      if ((cur.t3Retry || 0) >= 1) {
        graduate(cur); cur.dropped = true;
        res = { box: cur.box, kind: 'birakildi', note: 'İleri havuz sorusu: bir daha sorulmayacak, HMGS sorularına yer açıldı.' };
      } else {
        cur.t3Retry = (cur.t3Retry || 0) + 1;
        schedule(cur, SRS_CONFIRM_GAP);
        res = { box: 0, kind: 'tekrar', note: 'İleri havuz sorusu: akışta ileride bir kez daha gelebilir.' };
      }
    }
  } else if (!solid) {
    // ---- HMGS: yanlış, boş ya da mantıkla ----
    if (!ok) cur.lapses += 1;
    cur.box = 0;
    schedule(cur, SRS_WRONG_GAP);
    res = !ok
      ? { box: 0, kind: 'tekrar', note: `Birkaç soru sonra yeniden gelecek. (${cur.lapses}. kez takıldın)` }
      : { box: 0, kind: 'tekrar', note: 'Doğru' };
  } else if (!wasPending) {
    // ---- HMGS: sırada değilken doğru (ilk kez ya da daha önce bitmiş) ----
    graduate(cur);
    res = { box: cur.box, kind: 'ilk', note: 'Doğru: tekrar sırasına girmedi.' };
  } else if (!wasSpot && (cur.lapses || 0) >= SRS_SPOTCHECK_LAPSES) {
    // ---- HMGS: 2+ kez takılıp şimdi doğru (nokta kontrolü İLK kez tetikleniyor) ----
    // Genel "son kontrol" turu (v3.1'de kaldırıldı) HERKESE uygulandığı için
    // kuyruğu tıkıyordu. Burada yalnız GERÇEKTEN zorlanmış (üst üste değil,
    // toplamda 2+ kez yanlış) sorulara, çok daha uzak ve düşük öncelikli TEK
    // bir nokta kontrolü veriliyor (SRS_SPOTCHECK_GAP, bkz. v3.2 notu). Bir
    // kez takılıp hemen toparlayan soru (lapses===1) direkt biter — FSRS'in
    // "tekrar unutulan sorunun kararlılığı tek doğrulukla dolmaz" ilkesiyle
    // "her yanlış-doğru çifti aynı ağırlıkta değildir" arasındaki orta yol.
    // `!wasSpot` ÖNEMLİ: lapses hiç sıfırlanmadığı için bu koşul olmasa
    // nokta kontrolünün KENDİSİ doğru çözülünce de tekrar tetiklenir ve soru
    // asla bitmez (sonsuz döngü) — bkz. smoke.mjs "nokta kontrolü de doğru
    // yapılınca tam mezun oluyor" testi, 20 Eylül 2026'da bu haliyle yakalandı.
    cur.spot = true;
    schedule(cur, SRS_SPOTCHECK_GAP);
    res = { box: cur.box, kind: 'tekrar', note: `Birkaç kez takıldığın bir soruydu (${cur.lapses}. kez): ileride, çok geriden bir kez daha gelecek.` };
  } else {
    // ---- HMGS: yanlış yapıp tekrarında doğru (yalnız 1 kez takılmış) ----
    graduate(cur);
    res = { box: cur.box, kind: 'mezun', note: 'Tekrarında doğru: bu kural oturdu, sıradan çıktı.' };
  }

  S.srs[qId] = cur;
  return res;
}

/**
 * Eski (tarihli) kayıtları v3'e çeker. Bitmesi gereken kaydı bitirir/bırakır;
 * sırada kalacak olanın tarihini SORU SAYACINA çevirir (vadesi şimdi gelir,
 * setin %30 tekrar sınırı onları akışa yayar). Kuyruğa YENİ soru eklemez.
 * İdempotent: her açılışta ve her Drive birleştirmesinden sonra çalışır
 * (telefondaki eski kopya birleşmede tarihli kaydı geri getirebilir).
 * @returns {number} değişen kayıt sayısı
 */
export function applySrsPolicy() {
  const S = state();
  const last = new Map();
  for (const a of S.answers) last.set(a.qId, a);
  const n0 = S.answers.length;
  let n = 0;
  for (const [qId, r] of Object.entries(S.srs)) {
    if (!r || !r.dueAt || r.dueN != null) continue;     // bitmiş ya da zaten v3
    const a = last.get(qId);
    let out = false;
    if (a) {
      const solid = a.ok && !a.logicGuess;
      if (!isHmgs(qId)) out = solid || (r.lapses || 0) >= 2;
      else if (solid) out = (r.lapses || 0) === 0 || (r.box || 0) >= 2;
    }
    if (out) {
      const dropped = !isHmgs(qId) && !(a && a.ok);
      graduate(r);
      if (dropped) r.dropped = true;
    } else {
      r.dueN = n0;           // sıradaki tekrar: şimdi
      r.dueAt = null;
    }
    n++;
  }
  return n;
}

/** Mantıkla bahisiyle tekrar havuzuna alınır. */
export function reScheduleAsLogic(qId, flag = true) {
  return scheduleAfterAnswer(qId, true, flag);
}


/**
 * Bir soru bu sayıda takıldıysa karma setin tekrar bloğunun ÖNÜNDEN çıkarılır.
 *
 * Neden: kuyruk vade tarihine göre sıralanınca 9 günde 36 → 200+ soruya çıkıyor;
 * bir blok yalnız ~13 soru taşıyor. Üst üste yanlış yapılan soru her gün
 * kuyruğun başında kalıp geri kalanı açlığa mahkûm ediyordu: ölçüm, due bloğunun
 * 9 günde yalnız 36 FARKLI sorudan oluştuğunu ve aynı sorunun 2,9 kez döndüğünü
 * gösterdi (kuyruğa takılı 14 soru). Eşikle: 83 farklı soru, 1,3 kez, takılı 0.
 *
 * Soru HAVUZDAN ÇIKMAZ: karma setin görülmemiş/inceleme kısmında yine gelir ve
 * "Tekrarları çöz" seansında listenin başında durur. Kaybettiği tek şey, her
 * gün ilk 13 slottan birini kalıcı işgal etme ayrıcalığıdır. 9 gün kala bu,
 * tek bir soruyu ezberlemek yerine 100+ kural kalıbı görmek demektir.
 */
export const SRS_LEECH = 3;

/**
 * Bugün vadesi gelmiş (veya geçmiş) sorular — TAMAMI, leech filtresi YOK.
 * Filtre karma setin tekrar bloğunda uygulanır (buildKarmaSet); "Tekrarları
 * çöz" seansı bilinçli olarak takıldıklarını da gösterir.
 */
export function dueQuestions(now = new Date()) {
  const S = state();
  const out = [];
  for (const [qId, r] of Object.entries(S.srs)) {
    if (!isDue(r, now)) continue;
    const q = questionById.get(qId);
    if (q) out.push({ q, srs: r });
  }
  /* SIRALAMA — EN ESKİ VADE ÖNCE (takılı soru kuyruğu tıkamasın).
     İleri havuz (T3) tekrarları HMGS tekrarlarının ARKASINDA durur: "gelebilir
     ama illa gelmesi gerekmiyor". Vade: soru sayacı (dueN); eski tarihli
     kayıtlar sayacı olmayanlar olarak en başa düşer. */
  const vade = (x, y) => {
    const xn = x.dueN != null, yn = y.dueN != null;
    if (xn && yn) return x.dueN - y.dueN;
    if (!xn && !yn) return new Date(x.dueAt) - new Date(y.dueAt);
    return xn ? 1 : -1;                                   // eski tarihli kayıt önce
  };
  // Öncelik: HMGS yanlışı → HMGS nokta kontrolü (spot) → ileri havuz. Nokta
  // kontrolü zaten bir kez doğru çözülmüş, 2+ kez takılmış sorudur; bekleyen
  // TAZE yanlışın önüne geçmemeli (v3.2, bkz. yukarıdaki not). Aynı vadede
  // (dueN eşit) MEMORIZE (PNAS 2019)'ın "tekrar unutmaya yakınlıkla orantılı
  // olmalı" sonucunun kaba bir yaklaşımı: daha çok takılmış soru (lapses
  // yüksek) unutmaya daha yakın kabul edilir, önce o gelir.
  // 23 Eylül 2026: HMGS yanlışları kendi içinde de katman sırasıyla gelir
  // (çıkmış → YETKİ denemesi → AI benzeri), sonra nokta kontrolü, en son hâkimlik.
  const sinif = d => { const t = tierOf(d.q); return t === TIER_ADV ? 9 : (d.srs.spot ? 5 : t); };
  out.sort((a, b) => sinif(a) - sinif(b) || vade(a.srs, b.srs) || (b.srs.lapses || 0) - (a.srs.lapses || 0));
  return out;
}

/** Tekrar kuyruğuna takılıp öne çıkma ayrıcalığını yitiren sorular. */
export function leechQuestions() {
  const S = state();
  return Object.entries(S.srs)
    .filter(([, r]) => (r.lapses || 0) >= SRS_LEECH)
    .map(([qId, r]) => ({ q: questionById.get(qId), srs: r }))
    .filter(d => d.q)
    .sort((a, b) => b.srs.lapses - a.srs.lapses);
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

// MASTERY — OTOMATİKLEŞME SKORU
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

  // Mantıkla/cevaptan önce ipucu istenerek çözülen satır bağımsız bir "çözüm"
  // değildir — SRS'te kutuyu ilerletmiyor (scheduleAfterAnswer, logicGuess),
  // burada da doğruluk/hız ortalamasına girmez: yardım alınan yavaş bir satırı
  // "otomatikleşme düştü" gibi okumak okuma süresini hız sanmak olur. Konu
  // tamamen mantıkla geçildiyse "veri yok" deme, eldeki (kirli) veriyle ölç.
  const clean = last.filter(r => !r.logicGuess);
  const base = clean.length ? clean : last;

  const acc = base.filter(r => r.ok).length / base.length;
  const medSec = median(base.map(r => r.ms / 1000).filter(s => s > 1 && s < 900));
  const speed = medSec > 0 ? Math.min(1, TARGET_SEC / medSec) : 0;
  const score = acc * speed;

  let st;
  if (base.length < 5) st = 'thin';                              // yeterli veri yok
  else if (acc >= 0.85 && medSec <= TARGET_SEC) st = 'auto';     // 🟢 otomatik
  else if (acc >= 0.70) st = 'aware';                            // 🟡 bilinçli
  else st = 'effort';                                            // 🔴 eforlu

  return { state: st, score, acc, medianSec: medSec, n: base.length };
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
    ? `Son deneme netin ${gapInfo.net} (84 barajı için ${gapInfo.gap} net açık)`
      + (worst.length
        ? `; en çok ${worst[0].name} sızdırıyor (sınavda ${worst[0].examQ} soru, isabet %${Math.round(worst[0].acc * 100)})`
        : '')
      + '. '
    : '';

  let why;
  if (due.length >= 5 && fresh > 0) {
    why = gapLead + `Set ${Math.min(due.length, Math.floor(count * KARMA_DUE_SHARE))} tekrar sorusuyla açılıyor, kalanı yeni malzeme. Hiç açmadığın ${fresh} ders var; bunlar ilk temasta blok hâlinde geliyor, tanıdıktan sonra harmana karışıyor.`;
  } else if (fresh > 0) {
    why = gapLead + `Hiç açmadığın ${fresh} ders var ve sınavın yarısından fazlası oralarda. Set ağırlığı ölçülmüş sınav dağılımından geliyor; en çok pay ${lead ? lead.name : 'ilgili ders'} tarafında.`;
  } else {
    why = gapLead + `Karışık set. Ders adı cevabı verene kadar gizli; sınavda da yazmıyor, hangi kuralın uygulanacağını kendin seçeceksin.`;
  }

  // action şekli testlerle kilitli (kind:'karma', action.mode:'karma', action.count)
  // — DEĞİŞTİRME. Sonsuz akışa geçiş main.js#runAction'da yapılıyor: aynı
  // buildKarmaSet çıktısını akim.js'in kapanışsız kuyruğuna besliyor. Burada
  // yalnız kullanıcının gördüğü metin sabit sayı değil "akış" çerçevesinde
  // (18 Eylül 2026, kullanıcı talimatı: stüdyo kullanıcıyı flow'a atmalı).
  return {
    kind: 'karma',
    title: 'Akışa gir',
    why,
    cta: 'Akışı başlat',
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

/**
 * Tekrar payı bekleyen HMGS YANLIŞLARINA göre büyür (19 Eylül 2026).
 * geliş hızından yavaş dönüyordu: simülasyonda (günde 100 soru, ilk
 * denemede %55 isabet) 8 günde 165 HMGS yanlışı sıra bekliyordu — "yanlışsa
 * gelsin" sözü tutulmuyordu. Pay yalnız HMGS yanlışı birikince açılır; nokta
 * kontrolü (spot, v3.2) ve ileri havuz tekrarı payı büyütmez — ikisi de düşük
 * hacimli, düşük öncelikli, "gerçek backlog" değil. Tavan %45: yarısından
 * fazlası tekrar olursa "önce bütün HMGS soruları" hedefi (kapsam) kayar.
 */
export const KARMA_DUE_SHARE = 0.30;
export const KARMA_DUE_SHARE_MAX = 0.45;
export const KARMA_DUE_BACKLOG_FULL = 120;
/* 23 Eylül 2026 (kullanıcı talimatı): görülmemiş gerçek sınav sorusu bitince yeni
   malzeme artık denemeden/AI'dan gelir; o noktada çıkmış yanlışlarını geri
   getirmek daha değerli, tekrar payı bir basamak yükselir. Yığılma olmasın
   diye tavan yine yarının altında. KARAR, ölçüm değil. */
export const KARMA_DUE_SHARE_T1BITTI = 0.40;
export const KARMA_DUE_SHARE_T1BITTI_MAX = 0.50;
function dueShare(dueList, t1Bitti = false) {
  const bekleyen = dueList.filter(d => tierOf(d.q) !== TIER_ADV && !d.srs.spot).length;
  const t = Math.min(1, bekleyen / KARMA_DUE_BACKLOG_FULL);
  const lo = t1Bitti ? KARMA_DUE_SHARE_T1BITTI : KARMA_DUE_SHARE;
  const hi = t1Bitti ? KARMA_DUE_SHARE_T1BITTI_MAX : KARMA_DUE_SHARE_MAX;
  return lo + (hi - lo) * t;
}
function gorulmemisCikmisVar() {
  const seen = new Set(state().answers.map(a => a.qId));
  for (const q of questionById.values()) if (tierOf(q) === TIER_REAL && !seen.has(q.id)) return true;
  return false;
}
/**
 * Hiç açılmamış derste ilk temas kaç soruluk blok hâlinde verilir.
 * KARMA_ACQ_THRESHOLD'a EŞİT olmalı (18 Eylül 2026, ölçüldü): 4 iken bir blok
 * seen'i 4'e taşıyordu ama "fresh" sınırı 5'ti — blok dersi mezun ETMİYORDU,
 * bir sonraki dolumda (akim.js refill, ~her 8-9 soruda bir) aynı ders yine
 * "taze" sayılıp İKİNCİ bir blok alıyordu. 220 sorulu sıfırdan-başlangıç
 * simülasyonunda (studio/test/_akim_sim.mjs) 10 ders 2-3 kez bloklandı.
 * Blok = eşik olunca bir blok dersi tam mezun ediyor, ikinci blok gelmiyor.
 */
export const KARMA_ACQ_BLOCK = 5;
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
/**
 * KATMAN POLİTİKASI — sabit oran YOK, tam sıra var (kullanıcı kararı, 18 Eyl 2026;
 * 23 Eylül 2026'da deneme seti kendi katmanına ayrılıp dörde çıkarıldı).
 *
 *   TIER_PRIORITY = [1, 2, 3, 4]  →  gerçek HMGS → HMGS denemesi →
 *                                    HMGS benzeri (AI) → ileri havuz SONRA.
 *
 * Sıra candidatesOf içinde uygulanır:
 *   görülmemiş T1 → görülmemiş T2 → görülmemiş T3 → takılınan T1/T2/T3 → T4
 * (T3 = HMGS benzeri kendi İÇİNDE de sıralı: bkz. aiModelRank, candidatesOf.)
 *
 * Neden sabit oran yok: bir tur "%45 T1 / %25 T2 / %30 T3" kotası denendi.
 * Ölçüm, bu kotanın gereksiz olduğunu gösterdi — 650 HMGS sorusu (o zamanki
 * T1 460 + T2 190) 9 gün × 45 = 405 soruyu ZATEN karşılıyor. Kota hâkimliğe
 * erkenden yer açıp sınavın kendi düzeyinden çalıyordu.
 *
 * İleri havuz havuzu (2.707) kaybolmaz: yalnız dersin HMGS havuzu tükendiğinde
 * (vergi_usul gibi ince derslerde) devreye girer ve havuzdan hiç çıkmaz.
 */
export const TIER_PRIORITY = [1, 2, 3, 4];
/**
 * SET İÇİ KATMAN PAYI ('all' / Tüm Havuz Karma kapsamı) — T1 > T2 > T3 > T4.
 *
 *   T1 arşiv   %55  — sınavın kendi dili, biçimi ve düzeyi
 *   T2 HMGS denemesi %20  — blueprint'e sadık, HMGS'ye özel yazılmış
 *                                  profesyonel malzeme, AI-benzeriden önde
 *   T3 HMGS benzeri (AI)    %15  — aynı biçimle üretilmiş, üçüncü sırada
 *   T4 ileri havuz     %10  — BAŞKA bir sınav; derinlik antrenmanı,
 *                                  sınavın kendi düzeyinin üstünde
 *
 * 23 Eylül 2026'da eski {1:0.70, 2:0.20(AI+YETKİ birlikte), 3:0.10} ikiye
 * bölündü (kullanıcı kararı): eski T1+T2 payı (%90) T1/T2/T3'e 55/20/15
 * olarak dağıtıldı, T4(ileri havuz) payı %10'da SABİT kaldı. KARAR, ölçülmedi —
 * ölçülürse burası güncellenmeli (bkz. DERS PAYI v4'ün yöntemi).
 *
 * Paylar `secByTier` ile SET GENELİNDE tutulur (küresel açık giderme):
 * her dersin kotası, hedef orana göre en geride kalmış katmandan doldurulur.
 * Sabit oran gibi görünür ama ders havuzu yetmediğinde kendiliğinden kayar —
 * örn. `vergi_usul`ün HMGS havuzu az olduğu için orada T4 devreye girer.
 */
export const KARMA_TIER_MIX = { 1: 0.55, 2: 0.20, 3: 0.15, 4: 0.10 };
/**
 * ÇEKİRDEK (scope 'core') KATMAN PAYI — 19 Eylül 2026, kullanıcı talimatı.
 *
 * Kullanıcı: "bana HMGS sorularının hepsinin gelmiş olması lazım, HMGS benzeri
 * soruların da gözükmesi lazım." Sınava az gün kala HMGS havuzunun tamamı
 * görülemiyorken setin bir kısmını ileri havuza ayırmak bu hedeften
 * doğrudan çalıyordu. Çekirdek akışta T4 (ileri havuz) artık PAY ALMAZ; yalnız
 * bir dersin HMGS adayları (T1+T2+T3) tükendiğinde yedek olarak girer
 * (secByTier). Aynı gün ikinci talimat: katmanlar oranla karışmaz, SIRAYLA
 * gelir (bkz. secByTier aşamaları). 23 Eylül 2026: T2 (deneme seti) kendi
 * aşamasına ayrıldı, T3 (AI-benzeri) de kendi aşamasına — üçü de tek tek,
 * hâlâ hiçbiri oranla karışmıyor.
 * 'all' kapsamı (Tüm Havuz Karma) bilinçli seçimdir, orada KARMA_TIER_MIX kalır.
 */
export const KARMA_TIER_MIX_CORE = { 1: 1, 2: 0, 3: 0, 4: 0 };   // aşamalar tek katmanlı; oran fiilen kullanılmıyor

/** Ders bazında ham cevap sayacı: { seen, correct }. */
/**
 * Dersin henüz görülmemiş HMGS (T1+T2, çekirdek) soru sayısı. Ders payının
 * "taşıma" tarafı: HMGS'si bitmiş ders pay alırsa o pay tekrar ve ileri havuzla
 * doluyor, oysa başka derslerde görülmemiş HMGS sorusu bekliyor.
 */
function unseenHmgsBySubject() {
  const seen = new Set(state().answers.map(a => a.qId));
  const m = new Map();
  for (const q of questionById.values()) {
    if (tierOf(q) === TIER_ADV || seen.has(q.id) || !String(q.examTarget || '').startsWith('hmgs')) continue;
    m.set(q.subjectId, (m.get(q.subjectId) || 0) + 1);
  }
  return m;
}
/** HMGS'si tükenmiş dersin payı bu kata iner (sıfır değil: tekrarı ve yedeği yine gelir). KARAR. */
export const KARMA_EXHAUSTED_W = 0.25;

/* --------------------------------------------------------------------------
   DERS PAYI v4 — BEKLENEN NET DAĞITIMI (20 Eylül 2026, araştırmayla)
   ----------------------------------------------------------------------
   Kullanıcı: "derslerin geliş sırası içine siniyor mu, araştır ve en iyi hale
   getir." ÖLÇÜM (7 gün × 60 soru simülasyonu, gerçek bankayla) üç hata buldu:
   (1) Sınavda 3 soru eden Genel Kamu 420 soruda SIFIR kez geldi, oysa
       havuzunda 14 gerçek HMGS sorusu duruyordu. Vergi Usul 1, THT 5 kez.
   (2) Akışın %40'ı yanlış sonrası pekiştirmeydi ve pekiştirme ders payına
       TABİ DEĞİLDİ; yani ders dengesi akışın ancak %60'ını yönetiyordu.
   (3) Bir ders 142 soru boyunca hiç gelmeyebiliyordu (Anayasa, sınavda 6 soru).

   KÖK SEBEP: eski ağırlık `accGap = max(0,12, 1 − isabet)` idi, yani isabet
   DÜŞTÜKÇE pay BÜYÜYORDU ve tavanı yoktu. Dört ayrı literatür kolu bunun
   ters olduğunu söylüyor:
     · Wilson, Shenhav, Straccia, Cohen 2019 (Nature Communications, "85%
       kuralı"): öğrenme en hızlı ~%85 isabette; isabet çok düşükken öğrenme
       sinyali güvenilmez olur ve öğrenme YAVAŞLAR.
     · Metcalfe & Kornell 2005 (Region of Proximal Learning): sınırlı zamanda
       en zor maddeler kötü yatırımdır; "neredeyse biliniyor" olana gidilir.
     · Nelson & Leonesio (labor-in-vain etkisi): en zor maddeye ayrılan fazladan
       süre ölçülebilir kazanç üretmiyor.
     · "Optimal practice allocation under learning saturation" (arXiv
       2609.05501): puan TOPLAMSAL olduğunda (HMGS neti tam olarak budur) ve
       öğrenme eğrileri içbükeyse optimum DAĞITILMIŞ olur, uzmanlaşma değil.

   YENİ ÖLÇÜ — "riskteki net ÷ o neti almak için gereken iş":

       riskteki net = sınavdaki soru sayısı × (tavan − tahmini isabet)
       doygunluk    = kalan iş / (kalan iş + harcanan iş)    [kalan iş = görülmemiş T1+T2]
       ağırlık      = riskteki net × doygunluk × boşuna-emek damperi × avail

   Bu tek kesir dört işi birden yapıyor: sınav ağırlığını taşıyor (blueprint),
   öğrenilecek şey kalmayan dersi söndürüyor, çok çalışılmış dersin payını
   kendiliğinden düşürüyor (azalan getiri / power law of practice) ve KAPALI
   küçük dersleri öne çıkarıyor (14 soruluk Genel Kamu'yu bitirmek, 452 soruluk
   Borçlar'da 14 soru daha çözmekten çok daha fazla net getirir).

   MALİYETİN BİRİMİ ÖNEMLİ (kullanıcı düzeltmesi, aynı gün): "çekirdek havuz"
   diye `examTarget` etiketine bakmak YANLIŞTI — o etiket 2.755 soru gösteriyor
   ama 2.105'i ileri havuzdan, yalnız "HMGS seviyesine uygun" diye
   işaretlenmiş. Kapatılabilir gerçek malzeme T1 (460 arşiv) + T2 (190
   HMGS benzeri) = 650 sorudur ve maliyet artık ondan türer. Bu düzeltmenin
   sonucu stratejik: 650 soru 7 günde BİTİRİLEBİLİR bir sayıdır, yani bu bir
   "kıt dikkati bölüştürme" değil "kapalı bir seti bitirme" problemidir.
   -------------------------------------------------------------------------- */

/** Gerçekçi isabet tavanı: bunun üstü için çalışmak kazanç üretmiyor (Wilson 2019). */
export const KARMA_ACC_CEIL = 0.85;
/** Tavana varmış dersin bakım dozu; ağırlık hiç sıfırlanmaz. KARAR. */
export const KARMA_ACC_FLOOR = 0.05;
/** Hiç çözülmemiş ders bu isabette varsayılır (şans %20 ile tavan arası) ve bu güçle. */
export const KARMA_PRIOR_ACC = 0.35;
export const KARMA_PRIOR_N = 6;
export const KARMA_WORK_FLOOR = 8;
/**
 * BOŞUNA EMEK DAMPERİ. Bu isabetin ALTINDA ve bu kadar soru ÇÖZÜLMÜŞKEN pay
 * kısılır: soru çözmek o derste artık işe yaramıyor demektir, gereken şey
 * kuralı okumaktır (uygulama bunu geri bildirim kartı ve Gemini köprüsüyle
 * zaten sunuyor). Kısma KASITLI OLARAK hafif: yanlış + açıklama hâlâ öğretir
 * (Rowland 2014, geri bildirimli test etkisi g = 0,73), bu yüzden ders
 * sıfırlanmaz, yalnız kendi kendini büyüten döngü kırılır.
 */
export const KARMA_VAIN_ACC = 0.35;
export const KARMA_VAIN_N = 25;
export const KARMA_VAIN_DAMP = 0.75;
/**
 * AÇLIK SINIRI — ortalama bir ders (sınavda 6 soru) bu kadar cevaptan fazla
 * kaybolamaz. Sınır SABİT DEĞİL, sınav ağırlığıyla ters orantılı ölçeklenir
 * (bkz. aclikSiniri): sınavda 15 soru eden Medeni 18 soruda bir dönmeli,
 * 3 soru eden Genel Kamu 90 soruda bir. Sabit sınır hem büyük derse gevşek
 * hem küçük derse imkânsız geliyordu; ölçümde sınır 45 iken gerçekleşen en
 * uzun boşluk 151 soruydu, yani söz tutulmuyordu.
 */
export const KARMA_STARVE_GAP = 45;
/** Sınırın ölçeklendiği referans ders ağırlığı (120 soru / 20 ders). */
export const KARMA_STARVE_REF_EXAMQ = 6;
/** Bu katın üstünde açlık KRİTİKTİR: slot sınırına bakılmaksızın sete girer. */
export const KARMA_STARVE_CRIT = 2;

/** Bir dersin kaç cevaptır kaybolabileceğinin sınırı (sınav ağırlığıyla ters). */
export function aclikSiniri(examQ) {
  const ham = KARMA_STARVE_GAP * KARMA_STARVE_REF_EXAMQ / Math.max(1, examQ);
  return Math.min(120, Math.max(15, Math.round(ham)));
}
/** Açlık tabanı için ayrılan slot, setin en fazla bu kadarı olur. KARAR. */
export const KARMA_STARVE_SHARE = 0.25;
/** Bu gün sayısının altında "ince havuzu sonraya sakla" koruması kalkar: sonrası yok. */
export const KARMA_ENDGAME_DAYS = 10;

/** Sınav ufku kapandı mı (ince havuz koruması kalkar). */
export function endgame() { return daysLeft() <= KARMA_ENDGAME_DAYS; }

/**
 * Her ders KAÇ CEVAPTIR hiç gelmedi (hiç gelmediyse toplam cevap sayısı).
 * Birimi yine gün değil soru (v3 kararı). Açlık tabanı bunu okur.
 */
export function subjectStarvation() {
  const A = state().answers;
  const son = new Map();
  A.forEach((a, i) => son.set(a.subjectId, i));
  const n = A.length;
  const m = new Map();
  for (const s of SUBJECTS) m.set(s.id, son.has(s.id) ? n - 1 - son.get(s.id) : n);
  return m;
}

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
  const unseenHmgs = unseenHmgsBySubject();
  const aclikMap = subjectStarvation();
  return SUBJECTS.map(s => {
    const pool = questionsOf(s.id).length;
    const c = counts.get(s.id) || { seen: 0, correct: 0 };
    const left = unseenHmgs.get(s.id) || 0;          // görülmemiş T1+T2 (gerçek HMGS malzemesi)

    /* 1. RİSKTEKİ NET — sınav blueprint'i × kapatılabilir isabet açığı.
       İsabet Bayes'le yumuşatılır: 3 soruda 1 doğru "%33 isabet" değildir.
       Hiç çözülmemiş ders KARMA_PRIOR_ACC'te varsayılır, yani açığı büyük
       ama sonsuz değil (eski formülde accGap = 1 idi, ölçülmemiş ders
       ölçülmüş her dersten hep öndeydi). */
    const pHat = (c.correct + KARMA_PRIOR_ACC * KARMA_PRIOR_N) / (c.seen + KARMA_PRIOR_N);
    const acik = Math.max(KARMA_ACC_FLOOR, KARMA_ACC_CEIL - pHat);
    const netRiskte = s.examQ * acik;

    /* 2. DOYGUNLUK — kalan iş / (kalan iş + harcanan iş).
       ÖNEMLİ DÜZELTME (aynı gün, ölçümle): ilk sürüm ağırlığı doğrudan
       "net ÷ maliyet" yani VERİM yapıyordu. Ölçüm sarkacın öbür uca gittiğini
       gösterdi: küçük kapalı dersler verimli oldukları için Borçlar 0,43,
       Ticaret 0,52, Anayasa 0,48 katına düştü. Hata mantıktaydı: saf verimi
       kovalamak yalnız BÜTÇE KITken doğrudur. Burada bütçe kıt değil — bütün
 Toplamsal
       puanda ve içbükey öğrenme eğrilerinde optimum DAĞITILMIŞ olur
       (arXiv 2609.05501). Bu yüzden ağırlık, harcanmamışken sınav
       ağırlığının ta kendisidir (doygunluk = 1) ve ders çalışıldıkça
       kendiliğinden söner. Küçük ders payını hızla bırakır (az işi vardır),
       büyük ders uzun süre taşır; ikisi de sınav payına göre başlar. */
    const govde = Math.max(left, KARMA_WORK_FLOOR);
    const doygunluk = govde / (govde + c.seen);

    /* 3. BOŞUNA EMEK DAMPERİ (hafif, bkz. yukarıdaki not). */
    const acc = c.seen >= 5 ? c.correct / c.seen : null;
    const vain = (acc !== null && acc < KARMA_VAIN_ACC && c.seen >= KARMA_VAIN_N) ? KARMA_VAIN_DAMP : 1;

    /* 4. Gerçek HMGS malzemesi bitmiş ders geri çekilir (payı tekrarla ve
       ileri havuzyla dolacaktı; o pay malzemesi duran derse gitsin). */
    const avail = left > 0 ? 1 : KARMA_EXHAUSTED_W;

    const weight = pool === 0 ? 0 : netRiskte * doygunluk * vain * avail;

    /* Eski alanlar KORUNUYOR: pregel.js, today.js ve testler bunları okuyor.
       Artık ağırlığı SÜRMÜYORLAR, yalnız ekranda "neden bu ders" derken
       kullanılıyorlar. serve ve coverGap bilerek hesaplanmaya devam ediyor. */
    const coverTarget = Math.max(1, s.examQ * KARMA_COVER_PER_EXAMQ);
    const coverGap = 1 - Math.min(1, c.seen / coverTarget);
    const accGap = acc === null ? 1 : Math.max(0.12, 1 - acc);
    const serve = Math.min(1, pool / Math.max(1, s.examQ * KARMA_SERVE_PER_EXAMQ));
    const thin = pool < s.examQ * 2;

    return { ...s, pool, seen: c.seen, acc, pHat, netRiskte, doygunluk, vain,
             coverGap, accGap, serve, thin, weight, unseenHmgs: left,
             aclik: aclikMap.get(s.id) || 0, fresh: c.seen < KARMA_ACQ_THRESHOLD };
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

/**
 * Bir dersten seçilebilir sorular — SINAV YAKINLIĞINA GÖRE.
 *
 * Katman (data.js tierOf) sınav yakınlığıdır, zorluk değil:
 *   1 arşiv (460) · 2 HMGS benzeri AI (190) · 3 ileri havuz (2.105)
 *
 * ÖNCELİK SIRASI — "HMGS önce, ileri havuz sonra":
 *   (1) görülmemiş T1   (2) görülmemiş T2      ← sınavın kendi dili ve biçimi
 *   (3) takılınan T1    (4) takılınan T2       ← HMGS tekrarı (acil olanı due bloğu alır)
 *   (5) görülmemiş T3   (6) takılınan T3       ← ileri havuz; HMGS tükendiğinde devreye girer
 *
 * Neden T3 en sonda: 650 HMGS sorusu 9 gün × 45 = 405 soruya yetiyor (ölçüldü: toplam
 * setin ~%99'u T1+T2 olur, T3 yalnız HMGS havuzu ince olan derslerde — vergi_usul gibi —
 * görünür). İleri havuz HMGS'den daha derin sorar; sınavın ölçtüğü düzeyin üstünde
 * soru çözmek o düzeyi çalıştırmaz. T3 havuzdan ÇIKMAZ, yalnız sıranın sonundadır.
 *
 * 🔴 ESKİ HATA: `byTier(unseen).concat(byTier(shaky))` idi → görülmemiş HÂKİMLİK
 * soruları, yanlış yapılmış GERÇEK HMGS sorusundan önce geliyordu. Sıra artık
 * (katman, tür) çiftiyle kurulur; katmanın İÇİ karıştırılır, katmanlar arası sıra korunur.
 *
 * Sıra SET İÇİNDE uygulanmaz (interleave karıştırır): sınav da soruları kaynağına
 * göre sıralamaz, "hangi kuralın uygulanacağını seçmek" işin yarısıdır.
 */
function candidatesOf(subjectId, excludeIds, scope = 'core') {
  const S = state();
  const now = new Date();
  const seenIds = new Set(S.answers.map(a => a.qId));
  let pool = questionsOf(subjectId, scope).filter(q => !excludeIds.has(q.id));
  if (!pool.length && scope === 'core') {
    pool = questionsOf(subjectId, 'all').filter(q => !excludeIds.has(q.id));
  }
  // Anahtar: katman*10 + tür (1 görülmemiş, 2 takılınan). Küçük anahtar önce gelir.
  const kova = new Map();
  for (const q of pool) {
    let tur = 1;
    if (seenIds.has(q.id)) {
      const r = S.srs[q.id];
      // Görülmüş soru YALNIZ vadesi geldiyse aday olur. Vadesini SRS belirler
      // (yanlış → yarın, doğru → 3/7/14/30 gün); "yeni malzeme" kısmı bunu
      // delmemeli. 19 Eylül 2026'ya kadar burada yalnız `box >= 2` eleniyordu:
      // dün doğru çözülüp 3 gün sonraya planlanan (kutu 1) ya da bugün yanlış
      // yapılıp yarına planlanan (kutu 0) soru, dersinin görülmemiş T1'i
      // bitince VADESİNDEN ÖNCE yeniden geliyordu — kullanıcının "hep aynı
      // sorular dönüyor" hissinin bir kaynağı. Vadesi gelmiş olanı zaten
      // tekrar bloğu alır; buraya yalnız o bloğun %30 sınırına sığmayanlar düşer.
      if (r && !isDue(r, now)) continue;
      tur = 2;
    }
    const key = tierOf(q) * 10 + tur;
    if (!kova.has(key)) kova.set(key, []);
    kova.get(key).push(q);
  }
  const out = [];
  for (const key of [...kova.keys()].sort((a, b) => a - b)) {
    const bucket = kova.get(key);
    // HMGS benzeri (AI) katmanının İÇİNDE model önceliği: Opus > Sonnet >
    // Gemini (kullanıcı kararı, 23 Eylül 2026). Diğer katmanlarda düz karışım.
    if (Math.floor(key / 10) === TIER_AI) {
      const byModel = new Map();
      for (const q of bucket) {
        const r = aiModelRank(q);
        if (!byModel.has(r)) byModel.set(r, []);
        byModel.get(r).push(q);
      }
      for (const r of [...byModel.keys()].sort((a, b) => a - b)) out.push(...shuffle(byModel.get(r)));
    } else {
      out.push(...shuffle(bucket));
    }
  }
  return out;
}

/**
 * Bir dersin kotasını katmanlar arasında KARMA_TIER_MIX'e göre dağıt.
 *
 * Yöntem: KÜRESEL AÇIK GİDERME. Her soru için, set genelinde hedef orana göre
 * "en geride kalmış" katman seçilir. `want` 1-2 olsa bile doğru çalışır
 * (en büyük-kalan yöntemi küçük sayılarda sapıyordu: want=1 her zaman T1'e
 * gidiyordu ve ölçümde setin %65'i T1 oluyordu).
 *
 * Havuz yetmezse kendiliğinden kayar: o katmanda aday kalmazsa döngü bir
 * sonraki en aç katmanı seçer. `vergi_usul`ün HMGS havuzu 5 soru olduğu için
 * orada T3 devreye girer — istenen davranış.
 *
 * @param {Array} list  o dersin adayları, öncelik sırasına dizili (T1→T2→T3)
 * @param {number} want alınacak soru sayısı
 * @param {{hedef:Object, alindi:Object, toplam:number}} sayac set geneli sayaç
 */
function secKatman(list, want, sayac) {
  if (want <= 0 || !list.length) return [];
  if (list.length <= want) return list;

  const kova = new Map();
  for (const q of list) {
    const t = tierOf(q);
    if (!kova.has(t)) kova.set(t, []);
    kova.get(t).push(q);
  }

  const alinan = new Set();
  const out = [];
  while (out.length < want) {
    let en = null, enSkor = -Infinity;
    for (const t of TIER_PRIORITY) {
      const aday = (kova.get(t) || []).filter(q => !alinan.has(q.id));
      if (!aday.length) continue;
      // Hedeflenen sayı - alınan sayı (eşitlikte T1 önce gelir).
      const skor = (sayac.hedef[t] || 0) * sayac.toplam - (sayac.alindi[t] || 0);
      if (skor > enSkor) { enSkor = skor; en = t; }
    }
    if (en === null) break;
    const aday = (kova.get(en) || []).filter(q => !alinan.has(q.id));
    const q = aday[0];
    out.push(q); alinan.add(q.id);
    sayac.alindi[en] = (sayac.alindi[en] || 0) + 1;
  }
  // Hiçbir katmanda aday kalmadıysa öncelik sırasını bozma, eldekini ver.
  if (out.length < want) {
    for (const q of list) {
      if (out.length >= want) break;
      if (!alinan.has(q.id)) { out.push(q); alinan.add(q.id); }
    }
  }
  return out;
}

/**
 * Bir dersin kotasını AŞAMALARLA doldur (19 Eylül 2026).
 *
 * Eski hâli yalnız katmana bakıyordu; bir kovada hem görülmemiş hem vadesi
 * geçmiş (tekrar) soru vardı ve %70 T1 payı ikisinden hangisi önde gelirse
 * onunla doluyordu. Dersin görülmemiş T1'i bitince bu pay, tekrar kuyruğunun
 * taşan kısmıyla doluyordu — o sırada aynı derste görülmemiş HMGS benzeri
 * (T2) sorular beklerken. Ölçüm (gerçek veri, günde 100 soru, 8 gün): 8. gün
 * yeni soru oranı %37-49'a düştü, medeni'de 15 ve HMK'da 13 görülmemiş T2
 * dururken yeni malzeme payı tekrarla doldu. Kullanıcının tarifi tam buydu:
 * "bir yerden sonra önüme neredeyse yeni soru gelmiyor".
 *
 * Aşama sırası (ikinci düzeltme, 19 Eylül; 23 Eylül'de T2/T3 ayrımıyla
 * genişletildi — kullanıcı: "önce bütün HMGS soruları, sonra bütün HMGS
 * denemeleri, sonra bütün HMGS benzeri sorular"):
 *   çekirdek ('core'):  görülmemiş arşiv (T1) → görülmemiş HMGS
 *                       denemesi/YETKİ (T2) → görülmemiş HMGS benzeri/AI (T3)
 *                       → vadesi gelmiş HMGS tekrarı (T1∪T2∪T3) →
 *                       görülmemiş ileri havuz (T4) → vadesi gelmiş T4
 *   Neden T1 önce, oranla değil: gerçek sınav sorusu sınavın kendi dili ve
 *   düzeyidir, en değerli kaynak odur. T2/T3 ders ders devreye girer: bir
 *   dersin T1'i bitince o dersin payı T2'ye, T2 de bitince T3'e geçer, diğer
 *   derslerde T1 sürerken. Yanlışlar tekrar bloğundan (setin en çok %45'i)
 *   araya serpilir.
 *   tüm havuz ('all'):  görülmemiş (her katman) → vadesi gelmiş
 * Her aşamanın İÇİNDE katman payı secKatman ile (küresel açık giderme) korunur.
 * Vadesi gelmiş tekrarın asıl yeri yine setin tekrar bloğudur;
 * buraya yalnız o bloğa sığmayanlar düşer.
 */
function secByTier(list, want, sayac, seenIds = new Set()) {
  if (want <= 0 || !list.length) return [];
  const gor = q => seenIds.has(q.id);
  const hmgs = q => tierOf(q) !== TIER_ADV;
  const t = q => tierOf(q);
  const asamalar = [
    q => !gor(q) && t(q) === TIER_REAL,
    q => !gor(q) && t(q) === TIER_DENEME,
    q => !gor(q) && t(q) === TIER_AI,
    q => gor(q) && t(q) === TIER_REAL,
    q => gor(q) && t(q) === TIER_DENEME,
    q => gor(q) && t(q) === TIER_AI,
    q => !gor(q) && t(q) === TIER_ADV,
    q => gor(q) && t(q) === TIER_ADV
  ];
  const out = [];
  for (const asama of asamalar) {
    if (out.length >= want) break;
    out.push(...secKatman(list.filter(asama), want - out.length, sayac));
  }
  return out;
}

/**
 * Ağırlıkları tam sayı kotaya çevir — YANSIZ YUVARLAMA (20 Eylül 2026).
 *
 * Eskiden "en büyük kalan" yöntemiydi ve tek bir set için doğruydu; ama akış
 * aynı dağıtımı ~her 8 soruda bir TEKRAR yapıyor. Tekrarlanan dağıtımda en
 * büyük kalan SİSTEMATİK kaybeden üretir: 14 slota 15 ders girdiğinde payı
 * 1'in altında kalan dersler her seferinde aynı sırayla eleniyor, yani hiç
 * gelmiyorlar (testle yakalandı: sıfır-kapsam derslerden yalnız ikisi sete
 * giriyordu, üçü hiç girmiyordu).
 *
 * Artık kalan slotlar, kesirli payla ORANTILI olasılıkla dağıtılıyor
 * (yerine koymadan ağırlıklı örnekleme). Tek sette sonuç aynı büyüklükte,
 * ama TEKRARLANDIĞINDA her dersin beklenen payı tam olarak kendi payı olur;
 * sistematik kaybeden kalmaz. Kararlı çalışması için setin kendi karıştırması
 * (shuffle) zaten var, ek belirsizlik getirmiyor.
 */
function allocate(rows, total) {
  const sum = rows.reduce((a, r) => a + r.weight, 0);
  if (sum <= 0 || total <= 0) return new Map();
  const exact = rows.map(r => ({ id: r.id, v: (r.weight / sum) * total }));
  const out = new Map(exact.map(e => [e.id, Math.floor(e.v)]));
  let left = total - [...out.values()].reduce((a, b) => a + b, 0);
  const havuz = exact.map(e => ({ id: e.id, kesir: e.v - Math.floor(e.v) })).filter(e => e.kesir > 0);
  while (left > 0 && havuz.length) {
    const toplam = havuz.reduce((a, e) => a + e.kesir, 0);
    let x = Math.random() * toplam, i = 0;
    for (; i < havuz.length - 1; i++) { x -= havuz[i].kesir; if (x <= 0) break; }
    out.set(havuz[i].id, (out.get(havuz[i].id) || 0) + 1);
    havuz.splice(i, 1);
    left--;
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
 *
 * @param {{blockedSubjects?:Set<string>}} opts  blockedSubjects: bu ID'lere
 *   edinim bloğu VERİLMEZ (yine de ağırlıklı kotayla normal soru alırlar).
 *   Neden gerekli: akim.js'in sonu olmayan kuyruğu her ~8 soruda bir bu
 *   fonksiyonu YENİDEN çağırır (refill). "fresh" durumu S.answers'taki
 *   CEVAPLANMIŞ sayıya bakar; bir bloğun 5 sorusu kuyrukta sıraya girip henüz
 *   CEVAPLANMADIYSA ders hâlâ "taze" görünür ve bir sonraki dolumda İKİNCİ
 *   bir blok alabilir — fonksiyon kendi başına buna kör. Ölçüldü (18 Eylül
 *   2026, studio/test/_akim_sim.mjs, 220 soruluk akış): aynı ders 2-3 kez
 *   bloklandı (borçlar, ceza, cmk, iş, vergi, milletlerarası, mohuk,
 *   avukatlık, iyuk, hukuk felsefesi). Çağıran (akim.js) `blockedThisCall`
 *   dönüşünü biriktirip bir sonraki çağrıya geri verir — oturum hafızası
 *   burada değil çağıranda tutulur (motor durumsuz kalır, tek doğruluk
 *   kaynağı ilkesi bozulmaz).
 * @returns {{questions:Array, plan:Array, due:number, gaps:Array, blockedThisCall:string[]}}
 */
export function buildKarmaSet(count = 20, scope = 'core', opts = {}) {
  const alreadyBlocked = opts.blockedSubjects instanceof Set ? opts.blockedSubjects : new Set();
  const seenIds = new Set(state().answers.map(a => a.qId));
  const used = new Set();
  const picked = [];

  // --- 1. Vadesi gelen tekrarlar ---
  // Burada katman sırası BİLİNÇLİ olarak uygulanmaz. Yanlış yaptığın zor (T3)
  // soru, tam da tekrar edilmesi gereken sorudur; onu "sonra" demek hatayı
  // öteler. Seti T3'ün ele geçirmesine karşı koruma zaten var: bu blok setin
  // en fazla %30'udur (KARMA_DUE_SHARE) ve dueQuestions "en eski vade" sırasıyla
  // verir — inceleme için doğru sinyal budur.
  //
  // LEECH: 3+ kez takılan soru bu bloğun önünden çıkarılır. Kuyruk 9 günde
  // 36 → 200+ soruya çıkıyor, blok yalnız ~13 taşıyor; takılı soru öne çıkma
  // ayrıcalığını korursa kuyruğun gerisi hiç görünmez (ölçüldü: aynı 36 soru
  // 2,9 kez dönüyordu). Soru havuzdan çıkmaz — görülmemiş kısmında ve
  // "Tekrarları çöz" seansında yine gelir.
  const dueAll = dueQuestions().filter(d => (d.srs.lapses || 0) < SRS_LEECH);
  const dueCap = Math.floor(count * dueShare(dueAll, dueAll.length > 0 && !gorulmemisCikmisVar()));
  const due = dueAll.slice(0, dueCap);
  due.forEach(d => { used.add(d.q.id); });
  const dueGroups = due.map(d => ({ subjectId: d.q.subjectId, items: [d.q], block: false }));

  // --- 2. Kalan pay: ölçülmüş sınav ağırlığına göre yeni malzeme ---
  const remaining = count - due.length;
  const rows = karmaWeights().filter(r => r.weight > 0);

  /* --- AÇLIK TABANI (20 Eylül 2026, ölçümle) ---
     Orantısal dağıtım 16'lık dolumlarda küçük dersi kesire düşürüp sıfırlıyordu:
     ölçümde Genel Kamu 420 soruda HİÇ gelmedi, Anayasa 142 soru boyunca kayboldu.
     Sınavda soru eden ve gerçek HMGS malzemesi duran hiçbir ders
     KARMA_STARVE_GAP cevaptan fazla kaybolamaz; kaybolduysa dolumda garanti
     bir slot alır. Taban setin en çok KARMA_STARVE_SHARE'ini kaplar, yani
     ağırlık düzeni ezilmez, yalnız sıfırlanma engellenir. */
  /* --- AÇLIK TABANI ---
     Orantısal dağıtım 16'lık dolumlarda küçük dersi kesire düşürüp sıfırlıyor:
     ölçümde Genel Kamu 420 soruda HİÇ gelmedi, Anayasa 142 soru kayboldu.
     Taban, kendi sınırını aşmış derse garanti bir slot verir; slot kotanın
     üstüne eklenir, fazlası aşağıdaki bütçeden düşer (aç dersler döngüde ÖNCE
     geldiği için kesilen taraf en düşük ağırlıklı ders olur). Sınır sabit
     değil, sınav ağırlığıyla ölçeklenir (aclikSiniri): sınavda 15 soru eden
     ders sık, 3 soru eden seyrek dönmeli. Slot sayısının TAVANI var (acLimit + 1,
     kritik açlık dahil): tavansızken oturum başında bütün dersler birden aç
     sayılıp tabana doluşuyor ve ayrılan yeri bitiriyordu — testle yakalandı
     (kalın bankalı sıfır-kapsam dersler sete giremiyordu). ÖLÇÜLDÜ: slotu yalnız "kotadan pay
     alamamış" derse vermek DAHA KÖTÜ sonuç verdi (boşluk 3,3× → 4,3×), çünkü
     dar sınırlı büyük dersler de tabana muhtaç olabiliyor; aday listesi
     kısıtlanmadı. */
  const acSlot = new Map();
  const acLimit = Math.max(1, Math.floor(remaining * KARMA_STARVE_SHARE));
  const acAdaylar = rows
    .filter(r => r.examQ >= 3 && (r.unseenHmgs > 0 || r.pool > 0))
    .map(r => ({ r, sinir: aclikSiniri(r.examQ) }))
    .filter(x => x.r.aclik > x.sinir)
    .sort((a, b) => (b.r.aclik / b.sinir) - (a.r.aclik / a.sinir));
  for (const x of acAdaylar) {
    const kritik = x.r.aclik > x.sinir * KARMA_STARVE_CRIT;
    if (acSlot.size >= acLimit + 1) break;              // kritik bile olsa tavan var
    if (acSlot.size >= acLimit && !kritik) break;
    acSlot.set(x.r.id, 1);
  }
  /* Slotlar dağıtımdan ÖNCE ayrılır, üstüne eklenmez: üstüne eklenince toplam
     ayrılan yeri aşıyor ve aşağıdaki bütçe kuyruğu kesiyordu — kesilen taraf
     hep en düşük ağırlıklı (sınavda 3 soru eden) dersler oluyordu, yani taban
     tam da korumak istediği dersi eziyordu. */
  const acToplam = acSlot.size;

  /* Sıra: önce AÇ dersler, sonra ağırlık (edinim bloğu en çok gereken derse).
     Sıralama kotadan ÖNCE yapılır, çünkü blok payı da baştan ayrılacak. */
  rows.sort((a, b) => (acSlot.has(b.id) ? 1 : 0) - (acSlot.has(a.id) ? 1 : 0) || b.weight - a.weight);

  /* BLOK PAYI BAŞTAN AYRILIR (20 Eylül 2026, testle yakalandı).
     Edinim bloğu `want`i kotanın üstüne çıkarıyordu; bütçe ağırlık sırasında
     harcandığı için taşmayı hep en küçük dersler ödüyordu: boş durumda iki
     blok 20 slotun 10'unu alıyor, sınavda 3 soru eden dersler hiç sete
     giremiyordu. Blok payı önce ayrılır, kotalar KALAN üzerinden hesaplanır;
     böylece blok da, küçük ders de kendi yerini bulur. */
  const blokAday = rows.filter(r => r.fresh && (!r.thin || endgame()) && !alreadyBlocked.has(r.id) && r.pool > 1)
    .slice(0, KARMA_MAX_BLOCKS);
  const blokAyrilan = Math.min(blokAday.length * KARMA_ACQ_BLOCK, Math.floor(remaining * 0.5));
  const blokPay = new Map(blokAday.map((r, i) =>
    [r.id, Math.max(2, Math.min(KARMA_ACQ_BLOCK, r.pool, Math.floor(blokAyrilan / Math.max(1, blokAday.length))))]));

  const quota = allocate(rows, Math.max(0, remaining - acToplam - blokAyrilan));
  for (const [id, n] of acSlot) quota.set(id, (quota.get(id) || 0) + n);

  const newGroups = [];
  let deficit = 0;
  let blocksLeft = KARMA_MAX_BLOCKS;
  const blockedThisCall = [];
  // Katman payı SET GENELİNDE tutulur: her dersin kotası, set için hedeflenen
  // T3 (ileri havuz) payı SET GENELİNDE tutulur: her dersin kotası, T1>T2>T3
  // oranına göre "en geride kalmış" katmandan doldurulur (secByTier).
  const sayac = {
    hedef: scope === 'core' ? KARMA_TIER_MIX_CORE : KARMA_TIER_MIX,
    t3Yedek: scope === 'core',
    alindi: { 1: 0, 2: 0, 3: 0, 4: 0 }, toplam: Math.max(1, remaining)
  };
  /* Sıra: önce AÇ dersler (garanti slotları kırpmada düşmesin), sonra ağırlık
     (edinim bloğu en çok gereken derse gitsin).
     BÜTÇE (20 Eylül 2026, ölçümle bulundu): edinim bloğu `want`i kotanın
     ÜSTÜNE çıkarabiliyordu; set `count`u aşınca sondaki `slice(0, count)`
     kırpıyordu ve harmanlama tek soruluk dersleri en sona koyduğu için
     kırpılan hep AÇ dersler oluyordu. Ölçüm: açlık tabanı gereken 55 durumun
     yalnız 12'sinde işliyordu (%22) ve vergi_usul 229 soru kayboldu.
     Artık toplam, ayrılan yerden taşamaz; kırpma devreye hiç girmez. */
  let butce = remaining;
  for (const r of rows) {
    if (butce <= 0) break;
    let want = Math.min(quota.get(r.id) || 0, butce);
    if (!want) continue;
    // Havuzu zaten yetmeyen dersin kıt sorularını sete dağıtmayız: seti bir
    // örnekle işaretler, gerisi kâğıtta kalır.
    // İnce havuz koruması "kıt soruyu sonraya sakla" demekti; sınava
    // KARMA_ENDGAME_DAYS günden az kalınca saklanacak bir "sonra" yok, o
    // sorular tam da şimdi çözülmeli (bkz. endgame).
    if (r.thin && !endgame()) want = Math.min(want, 1);
    // Hiç açılmamış derste ilk temas blok hâlinde verilir; tek soru tahmine
    // döner. Ama set blok yığınına dönmesin diye set başına en fazla
    // KARMA_MAX_BLOCKS ders blok alır — yoksa "karma" adı altında yine
    // ders ders çalışmış oluyoruz. alreadyBlocked: bu dersin bloğu önceki bir
    // dolumda ZATEN verildi (henüz cevaplanmamış olsa bile) — ikinci kez verme.
    const block = blokPay.has(r.id) && blocksLeft > 0;
    /* Edinim bloğu setin YARISINDAN fazlasını yiyemez. Bütçe sıkı olunca
       (16'lık dolumda tekrar payından sonra ~11 slot) iki blok × 5 soru seti
       tüketiyor ve geri kalan bütün dersler o dolumdan pay alamıyordu; ölçümde
       sıfır-kapsam derslerin üçü hiç sete giremedi. Blok ilk temas için hâlâ
       bitişik ve yeterince uzun kalıyor. */
    if (block) { want = Math.max(want, blokPay.get(r.id) || 0); blocksLeft--; blockedThisCall.push(r.id); }
    want = Math.min(want, butce);
    const cands = secByTier(candidatesOf(r.id, used, scope), want, sayac, seenIds);
    cands.forEach(q => used.add(q.id));
    butce -= cands.length;
    if (cands.length < want) deficit += want - cands.length;
    if (cands.length) newGroups.push({ subjectId: r.id, items: cands, block: block && cands.length > 1 });
  }

  /* TAMAMLAMA TURU — set her zaman dolu çıkar.
     Ayrılan paylar (tekrar bloğu, açlık slotu, edinim bloğu) tam
     kullanılmayabiliyor ve adayı biten ders kotasını dolduramıyor; eskiden bu
     fark `deficit` diye SAYILIYOR ama KAPATILMIYORDU, set eksik dönüyordu
     (testle yakalandı: 20 istenen sette 17 soru). Artan yer, sırayla en
     ağırlıklı dersten başlayarak dolduruluyor. */
  for (let tur = 0; butce > 0 && tur < 3; tur++) {
    let eklendi = 0;
    for (const r of rows) {
      if (butce <= 0) break;
      // İnce havuz kuralı tamamlamada da geçerli (sınav ufku açıkken).
      if (r.thin && !endgame()) continue;
      const ek = secByTier(candidatesOf(r.id, used, scope), 1, sayac, seenIds);
      if (!ek.length) continue;
      ek.forEach(q => used.add(q.id));
      butce -= ek.length; eklendi += ek.length;
      const g = newGroups.find(x => x.subjectId === r.id && !x.block);
      if (g) g.items.push(...ek); else newGroups.push({ subjectId: r.id, items: ek, block: false });
    }
    if (!eklendi) break;
  }

  const all = interleave(dueGroups.concat(newGroups));
  picked.push(...all.slice(0, Math.max(1, count)));

  // Plan: kullanıcıya değil, ekrandaki özet ve teste.
  const planMap = new Map();
  picked.forEach(q => planMap.set(q.subjectId, (planMap.get(q.subjectId) || 0) + 1));
  const plan = [...planMap.entries()]
    .map(([id, n]) => ({ id, name: (SUBJECTS.find(s => s.id === id) || {}).name || id, n }))
    .sort((a, b) => b.n - a.n);

  return { questions: picked, plan, due: due.length, gaps: karmaGaps(), deficit, blockedThisCall };
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
 * PEKİŞTİRME TAVANI (20 Eylül 2026, ölçümle).
 * Ölçüm: akışın %40'ı yanlış sonrası pekiştirme sorusuydu ve bu kısım ders
 * payına HİÇ tabi değildi; yani "ders payı = sınav ağırlığı × açık"
 * matematiği akışın ancak %60'ını yönetiyordu. Sonuç, kendi kendini büyüten
 * bir döngüydü: kötü olunan derste çok yanlış → çok pekiştirme → o ders
 * akışı ele geçiriyor (Vergi Hukuku sınavda 3 soru, akışta 23 soru; %57'si
 * pekiştirme). Pekiştirme İYİ bir mekanik, sınırsız olması kötüydü: son
 * FLOW_REINFORCE_WINDOW cevabın FLOW_REINFORCE_MAX'inden fazlası aynı dersse
 * o derse pekiştirme verilmez (tavan ≈ %25). Hata anındaki düzeltme fırsatı
 * korunur, dersin akışı yutması engellenir.
 */
export const FLOW_REINFORCE_WINDOW = 20;
export const FLOW_REINFORCE_MAX = 5;

/**
 * Akış kuyruğu için bir parti soru üret. buildKarmaSet'in ince sarmalayıcısı:
 * vadesi gelen SRS tekrarları önce, kalanı ölçülmüş sınav ağırlığına göre,
 * aynı ders yan yana gelmeden. Tek doğruluk kaynağı karma motorudur.
 */
export function flowFeed(count = FLOW_BATCH, scope = 'core', opts = {}) {
  return buildKarmaSet(count, scope, opts);
}

/**
 * Yanlış yapılan sorudan sonra aynı kuralın bir kardeşini döndürür.
 * Tercih sırası: aynı konu (topicId) → aynı ders. Yakın zamanda sorulanlar
 * (excludeIds) ve sorunun kendisi dışlanır. Aday yoksa null (pekiştirme yok,
 * uydurma yok).
 */
export function flowReinforce(q, excludeIds = new Set(), scope = 'core') {
  if (!q) return null;
  // Ders payı tavanı (bkz. FLOW_REINFORCE_MAX): bu ders son pencerede zaten
  // çok yer kapladıysa pekiştirme verilmez, akış kota düzenine geri döner.
  const sonPencere = state().answers.slice(-FLOW_REINFORCE_WINDOW);
  if (sonPencere.filter(a => a.subjectId === q.subjectId).length > FLOW_REINFORCE_MAX) return null;
  const skip = new Set(excludeIds);
  skip.add(q.id);
  // 19 Eylül 2026 düzeltmesi. Eskiden havuz her zaman 'all' idi ve katman
  // gözetilmiyordu: çekirdek akışta bile kardeş soru çoğunlukla ileri havuz
  // bankasından (2.827 soru) ve çekirdek DIŞI ileri_adv'den geliyordu.
  // Yanlış oranı ~%45 olunca akışın ~%40'ı pekiştirmeydi; ölçüm (gerçek
  // veriyle 8 günlük simülasyon): akışın %30-40'ı T3 oldu, hedef %10'du,
  // HMGS benzeri %20 hedefin altında %10-15'te kaldı.
  // Şimdi: kapsam korunur, aynı konudan önce GÖRÜLMEMİŞ arşiv (T1),
  // sonra görülmemiş HMGS benzeri (T2), sonra görülmemiş ileri havuz (T3). Böylece
  // pekiştirme aynı zamanda kapsama işler: kardeş soru, zaten görülmesi
  // gereken bir HMGS sorusudur.
  let pool = q.topicId ? questionsOfTopic(q.topicId, scope) : [];
  if (!pool.length) pool = questionsOf(q.subjectId, scope);
  const cands = pool.filter(x => !skip.has(x.id));
  if (!cands.length) return null;
  const S = state();
  const seenIds = new Set(S.answers.map(a => a.qId));
  const now = new Date();
  // Görülmüş soru yalnız vadesi geldiyse pekiştirme olabilir (candidatesOf ile aynı kural).
  const rank = x => {
    const t = tierOf(x);
    if (!seenIds.has(x.id)) return t;                         // görülmemiş: T1..T4
    const r = S.srs[x.id];
    if (r && !isDue(r, now)) return null;
    return 4 + t;                                             // vadesi gelmiş (4 katman: +4 ile örtüşmez)
  };
  let best = Infinity, top = [];
  for (const x of cands) {
    const k = rank(x);
    if (k === null) continue;
    if (k < best) { best = k; top = [x]; }
    else if (k === best) top.push(x);
  }
  return shuffle(top)[0] || null;
}

/**
 * HMGS kapsamı: arşiv (T1), HMGS denemesi (T2) ve HMGS benzeri (T3)
 * sorulardan kaçı en az bir kez görüldü. Kullanıcı "hepsini göremedim bile"
 * dedi ve bunu ekranda hiçbir yer söylemiyordu. Yalnız OKUR.
 * 23 Eylül 2026: eskiden T2 (`similar`) hem deneme setini hem AI-benzeriyi
 * birlikte sayıyordu; üçe ayrıldı. `similar` alanı artık YALNIZ AI-benzeridir,
 * yeni `deneme` alanı YETKİ setini ayrı sayar — mevcut `.real`/`.similar`
 * okuyan ekranlar kırılmaz, yalnız `.similar`in anlamı daralır.
 */
export function hmgsCoverage() {
  const seen = new Set(state().answers.map(a => a.qId));
  const out = { 1: { seen: 0, total: 0 }, 2: { seen: 0, total: 0 }, 3: { seen: 0, total: 0 } };
  for (const q of questionById.values()) {
    const t = tierOf(q);
    if (t === TIER_ADV) continue;
    out[t].total++;
    if (seen.has(q.id)) out[t].seen++;
  }
  return { real: out[1], deneme: out[2], similar: out[3] };
}

/* ==========================================================================
   HMGS HARİTASI VE BAHİS (20 Eylül 2026, kullanıcı talimatı: "dopamin, akış,
   bırakmak istemeyeyim; seri yok, pop-up yok, patlama yok")
   --------------------------------------------------------------------------
   İki mekanik, ikisi de GERÇEK veriye bağlı, ikisi de kaybedilemez:

   HARİTA: arşiv + HMGS denemesi + HMGS benzeri (AI) sorular,
   hepsi bir arada (ileri havuz HARİÇ). Her kare bir soru, yeri sabit.
   Görülmemiş = boş, tekrar bekliyor = açık halka, oturmuş = dolu. Kare hiçbir
   zaman sönmez (seri mantığının tersi: gelmediğin gün hiçbir şey kaybolmaz).
   Sonlu, sınavla birebir örtüşen bir hedef; hedefe yaklaştıkça hız artar
   (goal gradient, Kivetz vd. 2006). 23 Eylül 2026'ya kadar yalnız T1+T2
   (gerçek + o zamanki birleşik T2) sayılıyordu; şimdi T1+T2+T3 (bkz.
   hmgsCoverage). Bu ekranlara henüz BAĞLI DEĞİL (yalnız engine.js içinde
   tanımlı), bu yüzden `.tier` alanının anlam genişlemesi hiçbir görünümü
   kırmıyor — bağlanınca tier 1/2/3 rozetleri ayrı ayrı ele alınmalı.

   BAHİS: şıkkı seçtikten sonra "eminim / sanırım / mantıkla". Dopamin
   ödülün kendisine değil ödül TAHMİN HATASINA tepki verir; emin olmadığın
   doğru ve emin olduğun yanlış en büyük sürprizi üretir. Pine vd. 2018
   (Nature Communications): emin olunan yanlışların bir hafta sonra
   doğruya dönme oranı %55,4, hiç emin olunmayanlarda %20,7 (hiperdüzeltme).
   En alt düzey ESKİ "Mantık" BAYRAĞININ YERİNE GEÇER (20 Eylül 2026, kullanıcı:
   "mantıkla geç zaten bahisle aynı, birleştirelim"): doğru çıksa bile tekrar
   sırasına girer, ama karar cevaptan ÖNCE verildiği için sonradan uydurulmuş
   değildir. Bu yüzden düzeyin adı "Salladım" değil "Mantıkla": kapsadığı şey
   "kuralı bilmiyordum, elemeyle/mantıkla buldum" — salt şans da buraya düşer.
   Cevaptan SONRA basılan Mantık rozeti akıştan kaldırıldı (tek karar noktası).
   ORTA düzey (Sanırım) bilinçli olarak logic:false: klavyede Enter'ın
   varsayılanı o, logic yapılsaydı alışkanlıkla geçilen her soru tekrar
   kuyruğuna düşer ve sınava 7 gün kala kapsam hedefi bozulurdu.
   ========================================================================== */

let _mapIndex = null;
/** T1+T2+T3 (ileri havuz HARİÇ) soruları ders ders, sabit sırayla (kare yeri değişmez). Önbellekli. */
function mapIndex() {
  if (_mapIndex && _mapIndex.size === questionById.size) return _mapIndex.rows;
  const by = new Map();
  for (const q of questionById.values()) {
    const t = tierOf(q);
    if (t === TIER_ADV) continue;
    if (!by.has(q.subjectId)) by.set(q.subjectId, []);
    by.get(q.subjectId).push({ id: q.id, tier: t });
  }
  const order = SUBJECTS.map(s => s.id);
  const rows = [...by.entries()]
    .sort((a, b) => {
      const ia = order.indexOf(a[0]), ib = order.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map(([subjectId, list]) => ({
      subjectId,
      ids: list.sort((a, b) => a.tier - b.tier || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    }));
  _mapIndex = { size: questionById.size, rows };
  return rows;
}

/** Tek kare durumu: 'bos' | 'acik' | 'yandi'. */
export function tileState(qId, lastOk = null, S = state()) {
  const r = S.srs[qId];
  if (lastOk === null) {
    let seen = false;
    for (let i = S.answers.length - 1; i >= 0; i--) {
      if (S.answers[i].qId === qId) { seen = true; lastOk = S.answers[i].ok && !S.answers[i].logicGuess; break; }
    }
    if (!seen) return 'bos';
  }
  if (r && isPending(r) && (r.box || 0) < BOXES.length) return 'acik';
  return lastOk ? 'yandi' : 'acik';
}

/**
 * Bütün harita. Yalnız OKUR.
 * @returns {{rows:Array<{subjectId,total,lit,open,tiles:Array<{id,tier,s}>}>, total, lit, open}}
 */
export function hmgsMap() {
  const S = state();
  const last = new Map();
  for (const a of S.answers) last.set(a.qId, a.ok && !a.logicGuess);
  let total = 0, lit = 0, open = 0;
  const rows = mapIndex().map(row => {
    let rl = 0, ro = 0;
    const tiles = row.ids.map(({ id, tier }) => {
      const s = last.has(id) ? tileState(id, last.get(id), S) : 'bos';
      if (s === 'yandi') rl++; else if (s === 'acik') ro++;
      return { id, tier, s };
    });
    total += tiles.length; lit += rl; open += ro;
    return { subjectId: row.subjectId, total: tiles.length, lit: rl, open: ro, tiles };
  });
  return { rows, total, lit, open };
}

/** Bir dersin harita satırı (akış içinde, cevaptan sonra çizilir). */
export function hmgsMapRow(subjectId) {
  return hmgsMap().rows.find(r => r.subjectId === subjectId) || null;
}

export const CONF = {
  sure:  { key: 'sure',  label: 'Eminim',   logic: false },
  think: { key: 'think', label: 'Sanırım',  logic: false },
  guess: { key: 'guess', label: 'Mantıkla', logic: true },
  hint:  { key: 'hint',  label: 'İpucuyla', logic: true }
};

/**
 * Bahis isabeti (kalibrasyon). Cevap satırlarındaki `conf` alanını okur.
 * @returns {{sure:{n,ok}, think:{n,ok}, guess:{n,ok}}}
 */
export function calibration(rows) {
  const out = { sure: { n: 0, ok: 0 }, think: { n: 0, ok: 0 }, guess: { n: 0, ok: 0 } };
  for (const r of rows || []) {
    if (!r || !out[r.conf]) continue;
    out[r.conf].n++; if (r.ok) out[r.conf].ok++;
  }
  return out;
}

/**
 * Bu sorunun bir önceki cevabından bu yana kaç cevap geçti (şimdiki cevap
 * zaten kaydedilmişse onu saymaz). Görülmemişse null. "12 soru önce yanlış
 * yapmıştın, şimdi oturdu" cümlesi için.
 */
export function answersSincePrev(qId) {
  const A = state().answers;
  let seenCurrent = false;
  for (let i = A.length - 1; i >= 0; i--) {
    if (A[i].qId !== qId) continue;
    if (!seenCurrent) { seenCurrent = true; continue; }
    return A.length - 1 - i - 1;
  }
  return null;
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
  // v2: ilk seferde doğru olan soru da mezun oluyor; o bir "otomatikleşme anı"
  // değil. Yalnız takılıp sonra oturan kural sayılır.
  if (sched.kind === 'mezun') return 'Kural otomatikleşti, tekrar sırasından çıktı';
  return null;
}

/* ==========================================================================
   SÜRELER VE PARASAL SINIRLAR HAP SETİ (SINAVIN %12'Sİ)
   Sınav analizinde ölçülen ~%12'lik süre ve parasal sınır sorularını
   doğrudan hedefler. Soru kökünde veya etiketlerinde süre, zaman, faiz
   veya parasal eşik geçen soruları seçer.
   ========================================================================== */

const DEADLINE_PATTERN = /\b(\d+)\s*(gün|gun|hafta|ay|yıl|yil|lira|tl|saat|dakika)\b|senetle\s+ispat|istinaf\s+sınırı|temyiz\s+sınırı|parasal\s+sınır|hak\s+düşürücü\s+süre|zamanaşımı|yasal\s+faiz|temerrüt\s+faizi|kaç\s+(gün|gun|ay|yıl|yil|hafta|saat)|hangi\s+süre|ne\s+kadar\s+süre|kaç\s+yaş|kaç\s+kişi|kaç\s+üye|oranı\s+kaçtır/i;
const DEADLINE_TAGS = new Set(['sure', 'zamanasimi', 'hak_dusurucu', 'sinir', 'parasal', 'oran', 'faiz', 'sureler']);

export function isDeadlinesQuestion(q) {
  if (!q) return false;
  const tags = Array.isArray(q.tags) ? q.tags : [];
  if (tags.some(t => DEADLINE_TAGS.has(String(t).toLowerCase()))) return true;
  return DEADLINE_PATTERN.test(q.stem || '');
}

export function buildDeadlinesSet(count = 20) {
  const S = state();
  const seen = new Set(S.answers.filter(a => a.ok).map(a => a.qId));
  const pool = [...questionById.values()].filter(isDeadlinesQuestion);

  // HMGS malzemesi önce (arşiv + HMGS benzeri), ileri havuz
  // yalnız HMGS süre soruları bittiğinde. Sıra: taze HMGS → görülmüş HMGS →
  // taze ileri havuz → görülmüş ileri havuz.
  const hmgs = q => tierOf(q) !== TIER_ADV;
  const fresh = pool.filter(q => !seen.has(q.id));
  const rest = pool.filter(q => seen.has(q.id));

  const picked = shuffle(fresh.filter(hmgs)).concat(shuffle(rest.filter(hmgs)),
    shuffle(fresh.filter(q => !hmgs(q))), shuffle(rest.filter(q => !hmgs(q)))).slice(0, count);

  const planMap = new Map();
  picked.forEach(q => planMap.set(q.subjectId, (planMap.get(q.subjectId) || 0) + 1));
  const plan = [...planMap.entries()]
    .map(([id, n]) => ({ id, name: (SUBJECTS.find(s => s.id === id) || {}).name || id, n }))
    .sort((a, b) => b.n - a.n);

  return { questions: picked, plan, totalPool: pool.length };
}
