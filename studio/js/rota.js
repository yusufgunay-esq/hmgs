/* ==========================================================================
   rota.js — GÜNÜN ROTASI (Bugün ekranının karar motoru)
   ----------------------------------------------------------------------
   Eski pregel.js'in yerine geçer. Oradaki üç sabit (başlangıç günü
   16 Eylül, "11 günlük plan", 451 soruluk toplam hedef) ölçüm değildi:
   451 soru ilk günlerde aşıldı, günlük hedef 30'a kelepçelendi ve
   "Bugünkü akışı başlat" düğmesi ekrandaki ders bloklarını hiç okumadan
   genel akışı açıyordu. Plan görünüyordu ama hiçbir şeyi yönetmiyordu.

   BU MODÜL NE YAPAR
   Her render'da ham veriden (cevap günlüğü, tekrar kuyruğu, denemeler,
   saat, sınava kalan gün) günün SIRALI adım listesini kurar. İlk
   bitmemiş adım Bugün ekranının kahramanıdır; kullanıcı ne yapacağına
   karar vermez, sıradakine basar.

   KARAR İLKELERİ (son sürüm, 23 Eylül 2026 akşam, kullanıcıyla birlikte)
     1. Yarım deneme varsa ona dön.
     2. Her gün bir tam deneme (sınav günü hariç). Saate bağlı değil: 10:15
        yalnız öneri, geç kalkılan gün deneme yanmaz. Kâğıt: en az görülmüş.
     3. Dünkü denemenin yanlış, boş ve kuşkulu soruları (tekrar ertesi gün).
     4. KONU ONARIMI: yanlışlar tek tek önüne atılmaz. Yalnız gerçek HMGS
        ve YETKİ denemesi yanlışları sayılır; her biri konusuna bağlanır ve
        o konudan önce 4 KARDEŞ soru, sonra yanlışın kendisi gelir. Önce
        kural farklı kılıklarda yeniden kurulur, sonra asıl soru o kuralın
        oturup oturmadığını sınar (aynı soruyu tekrar etmek cevabın harfini
        ezberletir, kuralı değil). Aynı anda en çok 3 konu açık; biri bitince
        sıradaki gelir. Hâkimlik ve HMGS benzeri yanlışları akışın içinde döner.
     5. Süreler ve sayılar (son 4 gün).
     6. Akış: sonsuz.

   TAVAN YOK: sınırlı adımlar içerikleri kadardır; liste bitince kahraman
   akıştır ve akışın sonu yoktur. Ne kadar çözülürse o kadar.

   SAYILAR KAYMAZ: her adımın "planlanan" değeri "bugün yapılan + şu an
   kalan" olarak kurulur; cevap verdikçe yapılan artar, kalan azalır,
   toplam aynı kalır. Ayrı bir plan kaydı tutmaya gerek yok.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { questionById, pastExamList, pastExamQuestions, aiQuestions, tierOf, topicById, questionsOfTopic, questionsOf, SUBJECT_BY_ID, subjectName, shuffle, TIER_REAL, TIER_DENEME, TIER_AI, TIER_ADV, aiModelRank } from './data.js';
import { state, todayKey, lastExam, EXAM_DATE } from './store.js';
import { dueQuestions, leechQuestions, karmaWeights, isDeadlinesQuestion, BOXES } from './engine.js';
import { denemeLabel, arsivLabel } from './labels.js';

/* ---------- ayarlar (ölçekler, sabit takvim değil) ---------- */

export const ROTA = {
  KAPASITE_VARSAYILAN: 120,
  KAPASITE_MIN: 60,
  KAPASITE_MAX: 240,
  GECMIS_GUN: 7,            // kapasite medyanı kaç günden
  AKTIF_GUN_ESIGI: 15,      // bir gün "çalışılmış" sayılsın diye en az cevap
  SRS_TAVAN: 40,            // normal günde tek oturumluk tekrar tavanı
  SRS_TAVAN_SON_GUN: 40,
  SURE_SORU: 20,
  SURE_SORU_SON_GUN: 30,
  INATCI_TAVAN: 20,
  TEKRAR_TAVAN: 60,         // deneme tekrarı en çok bu kadar
  TEKRAR_TAVAN_SON_GUN: 30,
  TEKRAR_YAS_GUN: 3,        // deneme tekrarı kaç gün geçerli
  DENEME_SAAT: '10:15',
  SON_GUN_KAPANIS: 21,      // sınavdan önceki akşam
  GECE_KAPANIS: 23
};

/* ---------- tarih yardımcıları ---------- */

function localKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
}

/** Cevap/deneme kaydının günü. store.todayKey ile AYNI ölçek (ISO tarih). */
const gunOf = iso => String(iso || '').slice(0, 10);

function gunFarki(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

function gunEkle(key, n) {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SINAV_GUNU = localKey(EXAM_DATE);

/**
 * Saat, çalışma gününe göre. Gece yarısını geçtiysek ama çalışma günü
 * (todayKey) henüz dönmediyse saat 24+ sayılır: 01:00 "gecenin biri"dir,
 * yeni günün sabahı değil.
 */
function calismaSaati(now, today) {
  const h = now.getHours() + now.getMinutes() / 60;
  return localKey(now) !== today && h < 12 ? h + 24 : h;
}

function median(xs) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const onla = n => Math.round(n / 10) * 10;

/* ---------- ölçümler ---------- */

/** Son 7 günün gerçek temposu (deneme cevapları hariç). */
export function kapasite(today = todayKey()) {
  const byDay = new Map();
  for (const a of state().answers || []) {
    if (a.mode === 'exam') continue;
    const k = gunOf(a.at);
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  const aktif = [];
  for (let i = 1; i <= ROTA.GECMIS_GUN; i++) {
    const n = byDay.get(gunEkle(today, -i)) || 0;
    if (n >= ROTA.AKTIF_GUN_ESIGI) aktif.push(n);
  }
  if (!aktif.length) return { n: ROTA.KAPASITE_VARSAYILAN, olculen: false, gun: 0 };
  const n = Math.max(ROTA.KAPASITE_MIN, Math.min(ROTA.KAPASITE_MAX, onla(median(aktif))));
  return { n, olculen: true, gun: aktif.length };
}

/** Bugünün cevapları, hangi kapıdan girildiyse ona göre sayılır. */
function bugunSayac(today) {
  const c = { akis: 0, srs: 0, sure: 0, inatci: 0, odev: 0, odevKonu: {}, konu: {}, konuYeni: {}, toplam: 0, dogru: 0 };
  for (const a of state().answers || []) {
    if (gunOf(a.at) !== today || a.mode === 'exam') continue;
    c.toplam++;
    if (a.ok) c.dogru++;
    if (a.mode === 'flow') c.akis++;
    else if (a.mode === 'review' || a.set === 'srs') c.srs++;
    else if (a.set === 'sure' || a.set === 'deadlines') c.sure++;
    else if (a.set === 'inatci') c.inatci++;
    else if (typeof a.set === 'string' && a.set.startsWith('konu:')) {
      const k = a.set.slice(5);
      c.konu[k] = (c.konu[k] || 0) + 1;
      if ((a.attempt || 1) === 1) c.konuYeni[k] = (c.konuYeni[k] || 0) + 1;
    }
    else if (a.set === 'odev') {
      c.odev++;
      if (a.topicId) c.odevKonu[a.topicId] = (c.odevKonu[a.topicId] || 0) + 1;
    }
  }
  return c;
}

/** Son denemenin tekrar havuzu (yanlış, boş, kuşkulu) ve kalanı. */
export function denemeTekrari(today = todayKey()) {
  const ex = lastExam();
  if (!ex || !Array.isArray(ex.repeatIds) || !ex.repeatIds.length) return null;
  const yas = gunFarki(gunOf(ex.at), today);
  if (yas > ROTA.TEKRAR_YAS_GUN) return null;
  const sonra = new Set((state().answers || [])
    .filter(a => a.mode !== 'exam' && String(a.at) > String(ex.at))
    .map(a => a.qId));
  const ids = ex.repeatIds.filter(id => questionById.has(id));
  const kalan = ids.filter(id => !sonra.has(id));
  return { ex, yas, toplam: ids.length, kalanIds: kalan };
}

/** Hâlâ mezun olmamış inatçı sorular (3+ kez takılan). */
export function inatcilar() {
  // HMGS soruları önce; ileri havuzndaki inatçılar listenin sonunda.
  const l = leechQuestions().filter(d => (d.srs.box || 0) < BOXES.length).map(d => d.q);
  return l.filter(q => tierOf(q) !== TIER_ADV).concat(l.filter(q => tierOf(q) === TIER_ADV));
}

/**
 * KONU ÖDEVLERİ — Takip koçunun dış betiğe bağlı ödevlerinin yerine.
 * Eskisi /api/claude-tasks'tan çekiliyordu; betik çalışmayınca sekme boş
 * kalıyordu. Artık ödev Stüdyo'nun kendi cevap günlüğünden çıkar:
 *
 *   puan = sınavdaki soru payı × hata oranı × güven × kalan malzeme
 *
 * Yalnız DÜNE KADARKİ cevaplara bakılır; böylece gün içinde çözdükçe liste
 * kaymaz, bugünün ödevi bugün sabit kalır. En fazla 3 konu, her biri 8 soru:
 * "çok ödev" korkusu yok, biten konunun yerine yarın yenisi gelir.
 * Konu, en az 3 kez çözülmüş ve hata oranı %35'in üstündeyse aday olur;
 * aynı dersten en fazla bir konu seçilir.
 */
export function konuOdevleri(today = todayKey(), adet = 3, soru = 8) {
  const agg = new Map();
  for (const a of state().answers || []) {
    if (!a.topicId || gunOf(a.at) >= today) continue;
    const r = agg.get(a.topicId) || { n: 0, yanlis: 0 };
    r.n++; if (!a.ok) r.yanlis++;
    agg.set(a.topicId, r);
  }
  const out = [];
  for (const [topicId, r] of agg) {
    const t = topicById.get(topicId);
    if (!t || r.n < 3) continue;
    const oran = r.yanlis / r.n;
    if (oran < 0.35) continue;
    const havuz = questionsOfTopic(topicId, 'core').filter(q => tierOf(q) !== TIER_ADV);
    if (havuz.length < 4) continue;
    const examQ = (SUBJECT_BY_ID.get(t.subjectId) || {}).examQ || 3;
    const guven = Math.min(1, r.n / 6);
    out.push({
      topicId, subjectId: t.subjectId,
      baslik: String(t.title || '').replace(/^\s*\d+\.\s*/, ''),
      ders: subjectName(t.subjectId),
      oran, n: r.n, soru: Math.min(soru, havuz.length),
      puan: examQ * oran * guven
    });
  }
  // Ders başına tek konu: üç ödev aynı derse yığılmasın, açık dağılsın.
  const dersler = new Set();
  return out.sort((a, b) => b.puan - a.puan)
    .filter(o => !dersler.has(o.subjectId) && dersler.add(o.subjectId))
    .slice(0, adet);
}

/* ---------- KONU ONARIMI ---------- */

export const ONARIM = { KARDES: 4, YANLIS_MAX: 3, ACIK_KONU: 3 };

/** Onarım listesine girecek yanlış: yalnız gerçek HMGS ve YETKİ denemesi. */
export const onarimYanlisi = q => { const t = tierOf(q); return t === TIER_REAL || t === TIER_DENEME; };

/** Sorunun onarım grubu: konusu varsa konu, yoksa (YETKİ sorularının çoğu) ders. */
function grupAnahtari(q) {
  return q.topicId && topicById.has(q.topicId) ? 't:' + q.topicId : 'd:' + q.subjectId;
}

function grupAdi(k) {
  if (k.startsWith('t:')) {
    const t = topicById.get(k.slice(2));
    return { baslik: String(t?.title || 'Konu').replace(/^\s*\d+\.\s*/, ''), subjectId: t?.subjectId };
  }
  const sid = k.slice(2);
  return { baslik: subjectName(sid) + ' · karışık', subjectId: sid };
}

/** Grubun kardeş soru havuzu: kesin hiyerarşi (T1 Gerçek HMGS > T2 Deneme Setleri > T3 AI > T4 İleri). */
function kardesHavuzu(k, haric) {
  const gorulen = new Set((state().answers || []).map(a => a.qId));
  const liste = k.startsWith('t:') ? questionsOfTopic(k.slice(2), 'all') : questionsOf(k.slice(2), 'all');
  const aday = liste.filter(q => !gorulen.has(q.id) && !haric.has(q.id));

  const t1 = shuffle(aday.filter(q => tierOf(q) === TIER_REAL));
  const t2 = shuffle(aday.filter(q => tierOf(q) === TIER_DENEME));
  const t3 = aday.filter(q => tierOf(q) === TIER_AI).sort((a, b) => aiModelRank(a) - aiModelRank(b));
  const t4 = shuffle(aday.filter(q => tierOf(q) === TIER_ADV));

  // Eğer bu konuda görülmemiş Gerçek HMGS veya Deneme Seti kalmadıysa,
  // doğrudan AI sorusuna atlamak yerine aynı dersin henüz görülmemiş Gerçek HMGS ve Deneme Seti sorularına bak:
  if (!t1.length && !t2.length && k.startsWith('t:')) {
    const topic = topicById.get(k.slice(2));
    if (topic && topic.subjectId) {
      const subjectAday = questionsOf(topic.subjectId, 'all').filter(q => !gorulen.has(q.id) && !haric.has(q.id));
      const subjT1 = shuffle(subjectAday.filter(q => tierOf(q) === TIER_REAL));
      const subjT2 = shuffle(subjectAday.filter(q => tierOf(q) === TIER_DENEME));
      if (subjT1.length || subjT2.length) {
        return subjT1.concat(subjT2);
      }
    }
  }

  return t1.concat(t2, t3, t4);
}

/**
 * Bugünün konu onarım grupları, önem sırasıyla.
 * puan = dersin sınav payı × (1 + bekleyen yanlış) × (0,5 + konudaki hata oranı)
 * Bugün başlanmış grup, yanlışları bitse de bitene kadar listede kalır.
 */
export function konuOnarimi(today = todayKey()) {
  const due = dueQuestions().filter(d => onarimYanlisi(d.q));
  const gruplar = new Map();
  const grup = k => {
    if (!gruplar.has(k)) gruplar.set(k, { key: k, yanlislar: [], n: 0, hata: 0 });
    return gruplar.get(k);
  };
  due.forEach(d => grup(grupAnahtari(d.q)).yanlislar.push(d.q));

  // Bugün açılmış gruplar (cevap kaydındaki set etiketinden) listede kalır.
  const c = bugunSayac(today);
  Object.keys(c.konu).forEach(k => grup(k));

  // Konu isabeti: HMGS/YETKİ cevaplarından.
  for (const a of state().answers || []) {
    const q = questionById.get(a.qId);
    if (!q || !onarimYanlisi(q)) continue;
    const g = gruplar.get(grupAnahtari(q));
    if (!g) continue;
    g.n++; if (!a.ok) g.hata++;
  }

  const out = [];
  for (const g of gruplar.values()) {
    const ad = grupAdi(g.key);
    const examQ = (SUBJECT_BY_ID.get(ad.subjectId) || {}).examQ || 3;
    const yapilan = c.konu[g.key] || 0;
    const kardesYapilan = c.konuYeni[g.key] || 0;
    const yanlisSayi = Math.min(ONARIM.YANLIS_MAX, g.yanlislar.length);
    const kardesKalan = Math.max(0, ONARIM.KARDES - kardesYapilan);
    const kardesVar = Math.min(kardesKalan, kardesHavuzu(g.key, new Set(g.yanlislar.map(q => q.id))).length);
    const plan = yapilan + yanlisSayi + kardesVar;
    if (plan === 0) continue;
    const oran = g.n ? g.hata / g.n : 1;
    out.push({
      key: g.key, baslik: ad.baslik, subjectId: ad.subjectId, ders: subjectName(ad.subjectId),
      yanlis: g.yanlislar.length, yanlisSet: yanlisSayi, kardes: kardesVar,
      oran, n: g.n, plan, yapilan,
      basladi: yapilan > 0,
      puan: examQ * (1 + g.yanlislar.length) * (0.5 + oran)
    });
  }
  return out.sort((a, b) => (b.basladi - a.basladi) || (b.puan - a.puan));
}

/** main.js için: grubun seansı. Önce kardeşler (kuralı kur), en sonda yanlışlar (sına). */
export function konuSetSorulari(key) {
  const due = dueQuestions().filter(d => onarimYanlisi(d.q) && grupAnahtari(d.q) === key).map(d => d.q)
    .slice(0, ONARIM.YANLIS_MAX);
  const c = bugunSayac(todayKey());
  const kardesKalan = Math.max(0, ONARIM.KARDES - (c.konuYeni[key] || 0));
  const kardes = kardesHavuzu(key, new Set(due.map(q => q.id))).slice(0, kardesKalan);
  return kardes.concat(due);
}

/**
 * Tam prova için en az "kirlenmiş" kâğıt. Daha önce çözülmüş sorularla
 * yapılan deneme netini şişirir; ölçtüğümüz şey hafıza olur, sınav değil.
 * Gerçek arşiv sınav kâğıdı küçük bir öncelik alır (dil ve kurgu birebir sınav).
 */
export function denemeSecimi() {
  const S = state();
  const gorulen = new Set((S.answers || []).map(a => a.qId));
  const yapilan = new Set((S.exams || []).map(e => e.real).filter(Boolean));
  const secenek = [];
  for (const r of pastExamList()) {
    const qs = pastExamQuestions(r.id);
    if (qs.length < 100) continue;
    const g = qs.filter(q => gorulen.has(q.id)).length / qs.length;
    secenek.push({ kind: 'real', source: r.id, label: r.label, n: qs.length, gorulen: g, yapildi: yapilan.has(r.id) });
  }
  // Deneme kâğıtları (ör. Deneme 1): arşiv sınavı değil ama
  // tam, blueprint'e sadık 120 soruluk kâğıt. Kaynak kimliği "deneme" içeren
  // ve en az 100 sorusu olan her kaynak bir aday kâğıttır.
  const kagit = new Map();
  for (const q of questionById.values()) {
    if (q.category === 'Çıkmış Sorular' || !/deneme/i.test(String(q.source || ''))) continue;
    if (!kagit.has(q.source)) kagit.set(q.source, []);
    kagit.get(q.source).push(q);
  }
  for (const [src, qs] of kagit) {
    if (qs.length < 100) continue;
    const g = qs.filter(q => gorulen.has(q.id)).length / qs.length;
    secenek.push({ kind: 'set', source: src, label: kagitAdi(src, qs[0]), n: qs.length, gorulen: g, yapildi: yapilan.has(src) });
  }
  const ai = aiQuestions();
  if (ai.length >= 120) {
    const g = ai.filter(q => gorulen.has(q.id)).length / ai.length;
    secenek.push({ kind: 'ai', label: 'Yapay Zeka Denemesi', n: 120, gorulen: g, yapildi: yapilan.has('ai_hmgs') });
  }
  const cekirdek = [...questionById.values()].filter(q => tierOf(q) !== TIER_ADV);
  if (cekirdek.length >= 120) {
    const g = cekirdek.filter(q => gorulen.has(q.id)).length / cekirdek.length;
    secenek.push({ kind: 'karma', label: 'Karma deneme', n: 120, gorulen: g, yapildi: false });
  }
  if (!secenek.length) return null;
  const maliyet = o => o.gorulen + (o.yapildi ? 1 : 0) - (o.kind === 'real' ? 0.1 : 0);
  // Eşitlikte en yeni kâğıt: son sınavların biçimi bir sonrakine en yakın olanı.
  return secenek.sort((a, b) => (maliyet(a) - maliyet(b)) || (yeniligi(b) - yeniligi(a)))[0];
}

/** Kaynak ID'den oturum-duyarlı görünen ad üretir. */
function kagitAdi(src, q) {
  if (/deneme/i.test(src)) return denemeLabel(src);
  if (/^hmgs_/i.test(src)) return arsivLabel(src);
  return (q && q.category) || src;
}

/** Bir kaynağın soruları, kâğıttaki orijinal sırasıyla (rota başlatıcısı için). */
export function kagitSorulari(src) {
  return [...questionById.values()].filter(q => q.source === src)
    .sort((a, b) => (a.qNumber || 0) - (b.qNumber || 0));
}

const AYLAR = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
/** Kâğıdın tarihi (yıl×12 + ay); bilinmiyorsa 0. Etiketten okunur: "HMGS Nisan 2026". */
function yeniligi(o) {
  const t = String(o.label || '').toLocaleLowerCase('tr-TR');
  const y = t.match(/20\d\d/);
  if (!y) return 0;
  const ay = AYLAR.findIndex(a => t.includes(a));
  return Number(y[0]) * 12 + Math.max(0, ay);
}

/** Net riski en yüksek dersler (akış gerekçesi için; karma motoruyla aynı kaynak). */
function riskliDersler(n = 3) {
  return karmaWeights()
    .filter(r => r.weight > 0)
    .sort((a, b) => b.netRiskte - a.netRiskte)
    .slice(0, n)
    .map(r => ({ id: r.id, name: r.name, acc: r.seen >= 5 ? r.acc : null, netRiskte: r.netRiskte }));
}

/* ---------- ana karar ---------- */

/**
 * @param {{now?:Date, examActive?:boolean}} opts
 * @returns {{
 *   faz:string, D:number, saat:number, kapasite:object, bugun:object,
 *   adimlar:Array, simdi:object|null, toplamPlan:number, toplamYapilan:number,
 *   kart:object|null
 * }}
 */
export function rota(opts = {}) {
  const now = opts.now || new Date();
  const today = todayKey(now);
  const D = gunFarki(today, SINAV_GUNU);
  const saat = calismaSaati(now, today);
  const kap = kapasite(today);
  const c = bugunSayac(today);
  const S = state();

  // ---- sınav günü ve sonrası: soru yok, yalnız kart ----
  if (D < 0 || (D === 0 && saat >= 13)) {
    return bos({ faz: 'bitti', D, saat, kap, c, kart: { tur: 'bitti' } });
  }
  if (D === 0) {
    return bos({ faz: 'sinav', D, saat, kap, c, kart: { tur: 'sinav' } });
  }

  const faz = D === 1 ? 'son-gun' : D <= 4 ? 'final' : 'insa';
  const adimlar = [];

  // ---- 1. yarım deneme ----
  if (opts.examActive) {
    adimlar.push({
      id: 'deneme-devam', tur: 'deneme', baslik: 'Yarım kalan denemeye dön',
      neden: 'Süre işliyor. Denemeyi bitirmeden başka bir şeye geçersen sonuç kaydedilmez.',
      plan: 1, yapilan: 0, cta: 'Denemeye dön', launch: { tur: 'deneme-devam' }
    });
  }

  // ---- 2. tam prova ----
  const ex = lastExam();
  const denemeBugun = (S.exams || []).some(e => gunOf(e.at) === today);
  const yas = ex ? gunFarki(gunOf(ex.at), today) : Infinity;
  // Her gün bir tam deneme (kullanıcı kararı, 23 Eylül 2026 akşam). Saate
  // bağlı değil: geç kalkılan gün deneme yanmaz, 10:15 yalnız öneri.
  const denemeGerek = !opts.examActive && D >= 1;
  let denemeAdimi = null;
  if (denemeBugun) {
    const e = (S.exams || []).filter(x => gunOf(x.at) === today).slice(-1)[0];
    denemeAdimi = {
      id: 'deneme', tur: 'deneme', baslik: 'Günün denemesi',
      neden: `Bugünkü deneme: ${e.net} net${e.label ? ' · ' + e.label : ''}.`,
      plan: 1, yapilan: 1, cta: 'Sonuca bak', launch: { tur: 'deneme-sayfa' }
    };
  } else if (denemeGerek) {
    const sec = denemeSecimi();
    if (sec) {
      const onceki = ex
        ? `Son denemen ${yas === 1 ? 'dün' : yas + ' gün önce'} (${ex.net} net).`
        : 'Henüz ölçülmüş bir denemen yok.';
      const kagit = sec.gorulen < 0.05
        ? `${sec.label}: sorularının hiçbirini daha önce görmedin, net temiz ölçülür.`
        : `${sec.label}: sorularının %${Math.round(sec.gorulen * 100)}'ini daha önce gördün; eldeki en temiz kâğıt bu.`;
      const saatNotu = saat < 10.25
        ? `Denk getirebilirsen ${ROTA.DENEME_SAAT}'te başla, pazar sabahının saati; getiremezsen ne zaman hazırsan o zaman.`
        : 'Tek oturum, boş bırakmadan.';
      denemeAdimi = {
        id: 'deneme', tur: 'deneme', baslik: 'Günün denemesi',
        neden: `${onceki} ${kagit} ${saatNotu}`,
        plan: 1, yapilan: 0, saat: saat < 10.25 ? ROTA.DENEME_SAAT : null,
        cta: '120 soruluk denemeyi başlat', launch: { tur: 'deneme', secim: sec }
      };
    }
  }

  // ---- adım adayları ----
  const tk = denemeTekrari(today);
  // Deneme tekrarı ERTESİ GÜN başlar (23 Eylül 2026). Denemenin hemen ardından
  // çözüm ekranı okunur; aynı soruları aynı gün yeniden çözmek az önce okunan
  // cevabı TANIMAYI ölçer, kuralı geri çağırmayı değil. Kalıcılık için aralık
  // hedef sürenin kabaca %10-20'si (Cepeda vd. 2008); 4 günlük ufukta ~1 gün.
  const tekrarYarin = !!(tk && tk.toplam && tk.yas === 0 && D > 1);
  const tekrarBilgi = tekrarYarin ? {
    id: 'tekrar', tur: 'bilgi', bilgi: true, plan: 0, yapilan: 0,
    baslik: `Deneme tekrarı yarın · ${tk.toplam} soru`,
    neden: 'Bugün yalnız çözüm ekranını oku: her yanlışta doğru şıkkın dayandığı kuralı bul. Aynı soruları yarın yeniden çözeceksin; bir gece aralık, hatırlamayı tanımadan ayırır.'
  } : null;
  const tekrar = tk && tk.toplam && !tekrarYarin ? (() => {
    const plan = tk.toplam;
    const yapilan = Math.min(plan, tk.toplam - tk.kalanIds.length);
    return {
      id: 'tekrar', tur: 'tekrar', baslik: 'Deneme tekrarı',
      neden: `${tk.yas === 0 ? 'Bugünkü' : tk.yas === 1 ? 'Dünkü' : 'Son'} denemenin yanlış, boş ve kuşkulu ${tk.toplam} sorusu. Deneme netini ölçer; bu adım netini büyütür.`,
      plan, yapilan, cta: 'Deneme yanlışlarını çöz', launch: { tur: 'tekrar' }
    };
  })() : null;

  const surePool = [...questionById.values()].filter(isDeadlinesQuestion).length;
  const sureHedef = D === 1 ? ROTA.SURE_SORU_SON_GUN : ROTA.SURE_SORU;
  const sure = D <= 4 && surePool >= 10 ? {
    id: 'sure', tur: 'sure', baslik: 'Süreler ve sayılar',
    neden: 'Sınavın yaklaşık %12\'si süre, sayı ve parasal sınır. Son günlerde en hızlı geri dönen kalem; önce hiç doğru yapmadıkların gelir.',
    plan: sureHedef, yapilan: Math.min(c.sure, sureHedef),
    cta: 'Süreleri çöz', launch: { tur: 'sure' }
  } : null;

  const onarim = konuOnarimi(today);
  const secili = [];
  for (const o of onarim) {
    const bitti = o.plan > 0 && o.yapilan >= o.plan;
    if (bitti || o.basladi) { secili.push(o); continue; }
    // Açık konular farklı derslerden olsun: üçü aynı derse yığılmasın.
    const acikKonular = secili.filter(x => !(x.plan > 0 && x.yapilan >= x.plan));
    if (acikKonular.length < ONARIM.ACIK_KONU && !acikKonular.some(x => x.subjectId === o.subjectId)) secili.push(o);
  }
  const bekleyenKonu = onarim.length - secili.length;
  const bekleyenYanlis = onarim.filter(o => !secili.includes(o)).reduce((t, o) => t + o.yanlis, 0);
  const konular = secili.map(o => ({
    id: 'konu:' + o.key, tur: 'konu', baslik: o.baslik,
    alt: `${o.ders} · ${o.yanlis ? `${o.yanlis} yanlış` : 'yanlışı kalmadı'}${o.n ? ` · konuda %${Math.round(o.oran * 100)} hata` : ''}`,
    neden: `${o.ders}: önce bu konudan ${o.kardes || 'birkaç'} yeni soruyla kuralı farklı kılıklarda kur, sonra ${o.yanlisSet ? `yanlış yaptığın ${o.yanlisSet} soru` : 'konuyu'} kuralın oturup oturmadığını sınasın. Aynı soruyu tekrar etmek harfi ezberletir; kardeş soru kuralı.`,
    plan: o.plan, yapilan: Math.min(o.yapilan, o.plan),
    topicId: o.key.startsWith('t:') ? o.key.slice(2) : null,
    cta: 'Konuyu onar', launch: { tur: 'konu', key: o.key }
  }));
  const kuyruk = bekleyenKonu > 0 ? {
    id: 'konu-kuyruk', tur: 'bilgi', bilgi: true, plan: 0, yapilan: 0,
    baslik: `Sırada ${bekleyenKonu} konu daha`,
    neden: `${bekleyenYanlis} arşiv ve deneme yanlışı bu konularda bekliyor; açık konulardan biri bitince sıradaki gelir.`
  } : null;

  // Akış sınırsızdır: plan sayısı yok, hiçbir zaman "bitti" olmaz.
  const sonGun = D === 1;
  const riskli = riskliDersler(3);
  const akis = {
    id: 'akis', tur: 'akis', baslik: 'Akış', sinirsiz: true,
    neden: riskli.length
      ? `Karışık, sınav biçiminde ve sonu yok. Motor seni en çok net kaybettiren derslere çekiyor: ${riskli.map(r => `${r.name}${r.acc != null ? ` (%${Math.round(r.acc * 100)})` : ''}`).join(', ')}. Yanlışların arada geri gelir.`
      : 'Karışık, sınav biçiminde ve sonu yok; ders seçimini karma motoru yapar.',
    plan: 0, yapilan: c.akis,
    cta: 'Akışa gir', launch: { tur: 'akis' }
  };
  // ---- sıra ----
  // Deneme ilk sırada ama kilit değil: satırdan istediğin adımı açabilirsin.
  [denemeAdimi, tekrar, tekrarBilgi, ...konular, kuyruk, sure].filter(Boolean).forEach(a => adimlar.push(a));
  adimlar.push(akis);
  if (sonGun) {
    adimlar.push({ id: 'yarin', tur: 'bilgi', bilgi: true, baslik: 'Yarın sınav',
      neden: "Saat 10.00'dan sonra binaya alınmıyorsun (PGM ilanı). Kimliğin ve sınava giriş belgen hazır olsun.", plan: 0, yapilan: 0 });
  }

  // ---- durumlar ----
  let simdi = null;
  for (const a of adimlar) {
    a.bitti = !a.bilgi && !a.sinirsiz && a.plan > 0 && a.yapilan >= a.plan;
    if (!simdi && !a.bitti && !a.bilgi && !a.istege) simdi = a;
  }

  const zorunlu = adimlar.filter(a => !a.bilgi && !a.istege && !a.sinirsiz && a.tur !== 'deneme');
  const toplamPlan = zorunlu.reduce((s, a) => s + a.plan, 0);
  const toplamYapilan = zorunlu.reduce((s, a) => s + Math.min(a.plan, a.yapilan), 0);

  // ---- kapanış kartı ----
  // Kapanış kartı yok: gün bir tavanla bitmez. Liste bitince kahraman akıştır.
  const kart = null;

  return { faz, D, saat, today, kapasite: kap, bugun: c, adimlar, simdi, toplamPlan, toplamYapilan, kart, sinavGunu: SINAV_GUNU };
}

function bos({ faz, D, saat, kap, c, kart }) {
  return { faz, D, saat, kapasite: kap, bugun: c, adimlar: [], simdi: null, toplamPlan: 0, toplamYapilan: 0, kart, sinavGunu: SINAV_GUNU };
}

/** main.js için: adımın başlatacağı soru listesi (tekrar ve inatçı). */
export function adimSorulari(tur) {
  if (tur === 'tekrar') {
    const tk = denemeTekrari();
    return tk ? tk.kalanIds.map(id => questionById.get(id)).filter(Boolean) : [];
  }
  if (tur === 'inatci') return inatcilar();
  return [];
}

