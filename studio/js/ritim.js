/* ==========================================================================
   ritim.js — GÜNLÜK MİNİMUM + ÇALIŞMA ZİNCİRİ
   ----------------------------------------------------------------------
   Koç (koc.js) "bugün ne kadar iyi olur" sorusunu cevaplar: HEDEF.
   Bu dosya ikinci ve daha küçük bir sayı tutar: MİNİMUM. Kötü bir günde
   bile yapılabilecek kadar küçük, günü "çalışılmış" saydıracak kadar
   anlamlı taban. Minimum dolunca gün tamam sayılır ve zincir bir halka
   uzar; hedef ondan sonra da açık kalır.

   NEDEN İKİ SAYI (kullanıcı fikri, 22 Kasım 2026 — "günlük minimum soru")
   - Alışkanlık araştırması: tek tek kaçırılan günler alışkanlığın oluşmasını
     bozmuyor, ardışık kaçırmalar bozuyor (Lally ve ark. 2010, Eur J Soc
     Psychol 40:998-1009). Bu yüzden zincir "hiç kaçırma" değil "iki kez üst
     üste kaçırma" kuralıyla çalışır.
   - Başlama eşiği: 40 soruluk hedef kötü günde hiç başlanmamasına yol açar;
     20 soruluk taban başlanır, başlayan çoğunlukla devam eder (adhd.js'deki
     5 soruluk kıvılcım aynı ilke).

   ZİNCİR KURALI (tek cümle): 7 günde bir boş gün serbest.
   - Minimuma ulaşan gün zincire halka ekler.
   - Minimumun altında kalan gün (hiç çalışılmamış ya da yarım), önceki 6
     günde başka bir serbest gün yoksa "serbest gün" sayılır: zincir kopmaz,
     halka da eklenmez. Varsa zincir kopar.
   - Bugün henüz dolmadıysa bugün kopma sayılmaz; gün bitene kadar açık.
   - Deneme cevapları da sayılır: 120 soruluk deneme günü elbette çalışma
     günüdür.

   Gün anahtarı store.todayKey ile aynı ölçekten (UTC tarihi, Türkiye'de
   gün 03:00'te döner): gece yarısından sonra çözülen sorular önceki güne
   yazılır, gece çalışanın zinciri saat 00:00'da kopmaz.

   Saf çekirdek (computeZincir, minimumOf) depo görmez; sarmalayıcı (ritim)
   ham cevap kaydından sayıları toplar.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { state, todayKey } from './store.js';

/** Ayarlar kartında sunulan sabit minimumlar (0 = otomatik). */
export const MIN_SECENEKLERI = [0, 10, 20, 30, 40];

const MIN_TABAN = 15;
const MIN_TAVAN = 30;
const SERBEST_PENCERE = 7;   // "7 günde bir boş gün serbest"

const gunEkle = (key, n) => {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const gunFarki = (a, b) =>
  Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);

/**
 * Günlük minimum. Ayar pozitif bir sayıysa odur; değilse koçun hedefinin
 * yarısı, 5'e yuvarlanıp 15-30 aralığına sıkıştırılır. Hedef 40 → 20,
 * hedef 20 → 15, hedef 80 → 30.
 * @param {number} hedef  koc().hedef
 * @param {number} [ayar] settings.adhd.dailyMin (0 = otomatik)
 */
export function minimumOf(hedef, ayar = 0) {
  const a = Math.round(Number(ayar));
  if (Number.isFinite(a) && a > 0) return a;
  const h = Number(hedef);
  const yari = Number.isFinite(h) && h > 0 ? Math.round(h / 2 / 5) * 5 : MIN_TABAN;
  return Math.min(MIN_TAVAN, Math.max(MIN_TABAN, yari));
}

/** Cevap kaydını gün → soru sayısı haritasına çevirir (deneme dahil). */
export function gunSayilari(answers) {
  const m = new Map();
  for (const a of answers || []) {
    const k = String(a && a.at || '').slice(0, 10);
    if (k.length !== 10) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

/**
 * SAF ÇEKİRDEK.
 * @param {{ gunler: Map<string,number>, minimum: number, today: string, pencere?: number }} p
 * @returns {{
 *   seri:number, enIyi:number, bugun:number, bugunTamam:boolean, kalan:number,
 *   dunSerbest:boolean, serbestKaldi:boolean, hucreler:Array<{key:string,n:number,durum:string,bugun:boolean}>,
 *   haftaToplam:number, haftaTamGun:number
 * }}
 * hucre.durum: 'tam' (≥ minimum) · 'yarim' (1..minimum-1) · 'bos' (0) · 'once' (ilk çalışma gününden önce)
 * hucre.serbest: serbest gün olarak sayıldıysa true · hucre.kopus: zincir burada koptuysa true
 */
export function computeZincir({ gunler, minimum, today, pencere = 14 } = {}) {
  const G = gunler instanceof Map ? gunler : new Map();
  const min = Math.max(1, Math.round(Number(minimum) || 1));
  const bugunKey = String(today || '').slice(0, 10);
  const nOf = k => G.get(k) || 0;

  // İlk çalışma günü: zincir oradan başlar. Hiç kayıt yoksa bugün.
  let ilk = bugunKey;
  for (const k of G.keys()) if (G.get(k) > 0 && k < ilk) ilk = k;

  // Baştan bugüne yürü: serbest gün ve kopuş kararları ileri yönde verilir.
  const kayit = new Map();   // key → { serbest, kopus }
  let seri = 0, enIyi = 0, sonSerbest = null;
  const gunSayisi = Math.max(0, gunFarki(ilk, bugunKey));
  for (let i = 0; i <= gunSayisi; i++) {
    const k = gunEkle(ilk, i);
    const n = nOf(k);
    if (k === bugunKey) {
      // Bugün: dolduysa halka eklenir; dolmadıysa karar gün bitince verilir.
      if (n >= min) seri++;
      kayit.set(k, { serbest: false, kopus: false });
      break;
    }
    if (n >= min) {
      seri++;
      kayit.set(k, { serbest: false, kopus: false });
    } else if (seri === 0) {
      // Korunacak zincir yok: serbest hak harcanmaz, kopuş da yazılmaz.
      kayit.set(k, { serbest: false, kopus: false });
    } else if (sonSerbest === null || gunFarki(sonSerbest, k) >= SERBEST_PENCERE) {
      sonSerbest = k;
      kayit.set(k, { serbest: true, kopus: false });
    } else {
      seri = 0;
      sonSerbest = null;     // kopuştan sonra yeni zincirin kendi serbest hakkı var
      kayit.set(k, { serbest: false, kopus: true });
    }
    enIyi = Math.max(enIyi, seri);
  }
  enIyi = Math.max(enIyi, seri);

  const bugun = nOf(bugunKey);
  const bugunTamam = bugun >= min;
  const dun = gunEkle(bugunKey, -1);
  const dunKayit = kayit.get(dun);
  const dunSerbest = !!(dunKayit && dunKayit.serbest);
  // Bugün de dolmazsa serbest sayılır mı? (önceki 6 günde serbest gün yoksa)
  const serbestKaldi = sonSerbest === null || gunFarki(sonSerbest, bugunKey) >= SERBEST_PENCERE;

  const hucreler = [];
  const P = Math.max(1, Math.round(pencere));
  for (let i = P - 1; i >= 0; i--) {
    const k = gunEkle(bugunKey, -i);
    const n = nOf(k);
    const r = kayit.get(k) || {};
    hucreler.push({
      key: k, n,
      durum: k < ilk ? 'once' : n >= min ? 'tam' : n > 0 ? 'yarim' : 'bos',
      serbest: !!r.serbest, kopus: !!r.kopus,
      bugun: k === bugunKey
    });
  }

  let haftaToplam = 0, haftaTamGun = 0;
  for (let i = 0; i < 7; i++) {
    const n = nOf(gunEkle(bugunKey, -i));
    haftaToplam += n;
    if (n >= min) haftaTamGun++;
  }

  return {
    seri, enIyi, bugun, bugunTamam, kalan: Math.max(0, min - bugun),
    dunSerbest, serbestKaldi, hucreler, haftaToplam, haftaTamGun, minimum: min
  };
}

/**
 * Soru başına gerçek dakika (açıklama okuma payı dahil). Son 120 deneme dışı
 * cevabın ekranda kalma süresi medyanı × 1,25; veri azsa 50 sn varsayımı.
 */
export function dakikaOf(answers) {
  const xs = [];
  const list = answers || [];
  for (let i = list.length - 1; i >= 0 && xs.length < 120; i--) {
    const a = list[i];
    if (!a || a.mode === 'exam') continue;
    const ms = Number.isFinite(a.rawMs) ? a.rawMs : a.ms;
    if (Number.isFinite(ms) && ms > 3000 && ms < 600000) xs.push(ms);
  }
  let sn = 50;
  if (xs.length >= 20) {
    xs.sort((x, y) => x - y);
    sn = xs[Math.floor(xs.length / 2)] / 1000;
  }
  return Math.max(0.5, (sn * 1.25) / 60);
}

/** Tek satırlık durum cümlesi (Bugün ekranı). */
export function ritimCumlesi(z, hedef = 0, dkSoru = 1) {
  const dk = n => Math.max(1, Math.round(n * dkSoru));
  if (z.bugunTamam) {
    const h = Math.max(0, (hedef || 0) - z.bugun);
    return h > 0
      ? `Gün tamam, zincir ${z.seri} gün. Hedefe ${h} soru daha (~${dk(h)} dk).`
      : `Gün tamam, hedef de tamam. Zincir ${z.seri} gün.`;
  }
  if (z.seri === 0) return `Yeni zincir bugün başlar: ${z.minimum} soru, ~${dk(z.kalan)} dk.`;
  if (z.dunSerbest) return `Dün serbest gündü. Bugün ${z.kalan} soruyla zinciri koru (~${dk(z.kalan)} dk).`;
  if (!z.serbestKaldi) return `Minimuma ${z.kalan} soru (~${dk(z.kalan)} dk). Bu hafta serbest gününü kullandın.`;
  return `Minimuma ${z.kalan} soru (~${dk(z.kalan)} dk), zincir ${z.seri + 1} güne çıkar.`;
}

/**
 * Sarmalayıcı: ham kayıttan sayıları toplar.
 * @param {number} hedef    koc().hedef
 * @param {number} [ayar]   settings.adhd.dailyMin
 * @param {number} [pencere] kaç günlük hücre şeridi
 */
export function ritim(hedef, ayar = 0, pencere = 14) {
  const answers = state().answers || [];
  const minimum = minimumOf(hedef, ayar);
  const z = computeZincir({ gunler: gunSayilari(answers), minimum, today: todayKey(), pencere });
  const dkSoru = dakikaOf(answers);
  return { ...z, hedef: hedef || 0, otomatik: !(Number(ayar) > 0), dkSoru, cumle: ritimCumlesi(z, hedef, dkSoru) };
}
