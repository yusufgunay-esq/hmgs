/* ==========================================================================
   koc.js — ALGORİTMİK KOÇ: GÜNLÜK SORU HEDEFİ + DENEME SIKLIĞI
   ----------------------------------------------------------------------
   Bugün ekranındaki hedef eskiden settings.dailyTarget = 40 (sabit) idi:
   sınava 5 ay varken de, 1 gün varken de aynı sayı. Bu dosya hedefi kalan
   malzemeden, tekrar borcundan ve ölçülen tempodan türetir.

   İLKELER
   1. Her sayı veriden gelir: question bankası (görülmemiş katman sayıları),
      state().answers (tempo, bugün çözülen), srs (vadesi gelen borç),
      EXAM_DATE (kalan gün). Uydurma sabit yok.
   2. Hedef ÖNERİDİR. Akışı kilitlemez, kısıtlamaz, "bitti" demez; projede
      geçerli "tavan yok" ilkesi aynen durur.
   3. Saf çekirdek (computeKoc) ile veri sarmalayıcısı (koc) ayrıdır: çekirdek
      yalnız sayılarla çalışır, testte tarayıcı/depo gerekmez.
   4. Deneme sıklığı sınava kalan güne göre kademelidir. "Her gün tam deneme"
      yalnız son haftanın kuralıydı; 5 aylık ufukta her gün 120 soru öğrenmeyi
      bitirir (deneme ölçer, öğretmez). Uzakta haftada bir, yaklaştıkça sıklaşır.

   FORMÜLLER (computeKoc)
     çalışma günü = max(1, round(D * 6/7))      haftada bir dinlenme payı
     yeniGun      = ceil((görülmemiş gerçek + deneme) / çalışma günü)
     tekrarGun    = ceil(vadesi gelen / max(1, min(D, 14)))
     hedef        = 10'a yuvarla(max(20, yeniGun + tekrarGun))
     eksik        = tempo > 0 ? max(0, yeniGun + tekrarGun - ceil(tempo * 1.15)) : 0
     kapsamaGun   = ceil((görülmemiş gerçek + deneme) / max(1, tempo * 0.7))

   SON HAFTA (1 <= D <= 7) — ham formül burada anlamsızlaşır: D=1'de 650
   görülmemiş soru "günde 770 soru" üretiyordu. Sınav ölçer, öğretmez; son
   hafta yeni malzeme kovalanmaz. Bu yüzden o aralıkta:
     yeniGun = 0
     hedef   = 10'a yuvarla(max(20, tempo>0 ? ceil(tempo*1.15) : 40))
     eksik   = 0            ("eksik kalıyor" uyarısı son haftada gürültüdür)
   tekrarGun ve kapsamaGun bilgi olarak hesaplanmaya devam eder; hedefe girmez.

   NEDEN 1,15 ve 0,7: tempo hedefin %15'in altında kalıyorsa sakin bir uyarı
   eşiği (gürültü değil); kapsama günü temponun %70'iyle hesaplanır çünkü
   günün bir kısmı tekrar ve onarıma gider, yalnız yeni malzemeye gitmez.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { questionById, tierOf, TIER_REAL, TIER_DENEME, TIER_AI } from './data.js';
import { state, todayKey, daysLeft, lastExam } from './store.js';
import { dueQuestions } from './engine.js';

const sayi0 = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const onla = n => Math.round(n / 10) * 10;
const gunOf = iso => String(iso || '').slice(0, 10);
const gunFarki = (a, b) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const gunEkle = (key, n) => {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------- faz eşlemesi ---------- */

export const FAZ = {
  insa: 'inşa',
  pekistirme: 'pekiştirme',
  final: 'final',
  sonHafta: 'son hafta',
  sinav: 'sınav'
};

/** Sınava kalan güne göre dönem adı. */
export function fazOf(D) {
  const d = Math.max(0, Math.round(Number(D) || 0));
  if (d === 0) return FAZ.sinav;
  if (d <= 7) return FAZ.sonHafta;
  if (d <= 21) return FAZ.final;
  if (d <= 90) return FAZ.pekistirme;
  return FAZ.insa;
}

/**
 * Tam deneme kaç günde bir önerilir.
 *   0 gün (sınav)  : 0  — deneme yok
 *   1-7 gün        : 1  — her gün (son hafta, eski kural burada geçerli)
 *   8-21 gün       : 2
 *   22-90 gün      : 4
 *   90+ gün        : 7  — haftada bir ölçüm yeter; günler öğrenmeye gider
 */
export function denemeAraligi(D) {
  const d = Math.max(0, Math.round(Number(D) || 0));
  if (d === 0) return 0;
  if (d <= 7) return 1;
  if (d <= 21) return 2;
  if (d <= 90) return 4;
  return 7;
}

const MESAJ = {
  [FAZ.insa]: 'İnşa dönemi: yeni malzemeyi bitir, tempo düzenli olsun.',
  [FAZ.pekistirme]: 'Pekiştirme: eksik konular kapanıyor, deneme sıklaşıyor.',
  [FAZ.final]: 'Final: deneme ve tekrar ağırlıklı, yeni malzeme azalıyor.',
  [FAZ.sonHafta]: 'Son hafta: yeni konu yok, tekrar ve sakinlik.',
  [FAZ.sinav]: 'Sınav günü: soru yok, bildiğin yeterli.'
};

/**
 * SAF ÇEKİRDEK. Tarayıcı, depo ve veri katmanı yok; yalnız sayılar.
 * @param {{
 *   D?:number, unseenReal?:number, unseenDeneme?:number, unseenAi?:number,
 *   dueCount?:number, measuredPace?:number, todayDone?:number,
 *   lastExamDaysAgo?:number|null
 * }} input
 * @returns {{
 *   faz:string, hedef:number, yeniGun:number, tekrarGun:number, tempo:number,
 *   eksik:number, kapsamaGun:number, mesaj:string, denemeAraligi:number,
 *   unseen:number, unseenReal:number, unseenDeneme:number, unseenAi:number,
 *   dueCount:number, workDays:number, todayDone:number, D:number
 * }}
 */
export function computeKoc(input = {}) {
  const D = Math.max(0, Math.round(sayi0(input.D)));
  const unseenReal = Math.floor(sayi0(input.unseenReal));
  const unseenDeneme = Math.floor(sayi0(input.unseenDeneme));
  const unseenAi = Math.floor(sayi0(input.unseenAi));
  const dueCount = Math.floor(sayi0(input.dueCount));
  const tempo = Math.round(sayi0(input.measuredPace));
  const todayDone = Math.floor(sayi0(input.todayDone));
  const unseen = unseenReal + unseenDeneme;
  const faz = fazOf(D);
  const aralik = denemeAraligi(D);

  // Sınav günü hedef yok: rota o gün yalnız sınav kartını çizer.
  if (D === 0) {
    return {
      faz, hedef: 0, yeniGun: 0, tekrarGun: 0, tempo, eksik: 0, kapsamaGun: 0,
      mesaj: MESAJ[faz], denemeAraligi: aralik,
      unseen, unseenReal, unseenDeneme, unseenAi, dueCount,
      workDays: 0, todayDone, D, sonHafta: false
    };
  }

  const workDays = Math.max(1, Math.round(D * 6 / 7));
  const tekrarPencere = Math.max(1, Math.min(D, 14));
  const tekrarGun = Math.ceil(dueCount / tekrarPencere);

  // Son hafta: yeni soru kovalanmaz, hedef son tempoyu korumakla sınırlanır.
  const sonHafta = D <= 7;
  const yeniGun = sonHafta ? 0 : Math.ceil(unseen / workDays);
  const ham = yeniGun + tekrarGun;
  const hedef = sonHafta
    ? onla(Math.max(20, tempo > 0 ? Math.ceil(tempo * 1.15) : 40))
    : onla(Math.max(20, ham));
  const eksik = sonHafta
    ? 0
    : (tempo > 0 ? Math.max(0, ham - Math.ceil(tempo * 1.15)) : 0);
  const kapsamaGun = Math.ceil(unseen / Math.max(1, tempo * 0.7));

  return {
    faz, hedef, yeniGun, tekrarGun, tempo, eksik, kapsamaGun,
    mesaj: MESAJ[faz], denemeAraligi: aralik,
    unseen, unseenReal, unseenDeneme, unseenAi, dueCount,
    workDays, todayDone, D, sonHafta
  };
}

/* ---------- veri sarmalayıcısı ---------- */

function median(xs) {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Son 7 günün aktif gün medyanı (deneme cevapları hariç). rota.kapasite ile
 * AYNI ölçek, ama ayrı küçük yardımcı: koc.js rota.js'i import etmez (tek
 * yönlü bağımlılık — rota → koc).
 */
export function tempoOlc(today = todayKey()) {
  const byDay = new Map();
  for (const a of state().answers || []) {
    if (a.mode === 'exam') continue;
    const k = gunOf(a.at);
    byDay.set(k, (byDay.get(k) || 0) + 1);
  }
  const aktif = [];
  for (let i = 1; i <= 7; i++) {
    const n = byDay.get(gunEkle(today, -i)) || 0;
    if (n >= 15) aktif.push(n);
  }
  if (!aktif.length) return { n: 0, gun: 0 };
  return { n: Math.round(median(aktif)), gun: aktif.length };
}

/** Görülmemiş sorular, katman katman. */
export function gorulmemis() {
  const seen = new Set((state().answers || []).map(a => a.qId));
  let real = 0, deneme = 0, ai = 0;
  for (const q of questionById.values()) {
    if (seen.has(q.id)) continue;
    const t = tierOf(q);
    if (t === TIER_REAL) real++;
    else if (t === TIER_DENEME) deneme++;
    else if (t === TIER_AI) ai++;
  }
  return { real, deneme, ai };
}

/**
 * Bugün ekranının koç bloğu için gerçek sarmalayıcı. Ham veriden sayıları
 * toplar, saf çekirdeğe verir.
 */
export function koc() {
  const today = todayKey();
  const g = gorulmemis();
  const tempo = tempoOlc(today);
  const bugunCozulen = (state().answers || [])
    .filter(a => gunOf(a.at) === today && a.mode !== 'exam').length;
  const ex = lastExam();
  const lastExamDaysAgo = ex ? Math.max(0, gunFarki(gunOf(ex.at), today)) : null;

  const c = computeKoc({
    D: daysLeft(),
    unseenReal: g.real,
    unseenDeneme: g.deneme,
    unseenAi: g.ai,
    dueCount: dueQuestions().length,
    measuredPace: tempo.n,
    todayDone: bugunCozulen,
    lastExamDaysAgo
  });
  return { ...c, tempoGun: tempo.gun, lastExamDaysAgo };
}
