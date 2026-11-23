/* ==========================================================================
   ritim.js — GÜNÜN BARI (yalnız bugün)
   ----------------------------------------------------------------------
   Koç (koc.js) "bugün ne kadar iyi olur" sorusunu cevaplar: HEDEF.
   Bu dosya ikinci ve daha küçük bir sayı tutar: ASGARİ. Kötü bir günde bile
   yapılabilecek kadar küçük taban. İkisi tek bir barda üç renk olur:

        sarı   0 → asgari        (ısınma)
        yeşil  asgari → hedef    (iyi gün)
        mavi   hedefin ötesi     (fazlası kazanç)

   ZİNCİR YOK, GEÇMİŞ GÜN YOK (kullanıcı kararı, 23 Kasım 2026). 22 Kasım'da
   kurulan "N gün zincir" sayacı kullanıcıyı boğdu: "seri yapmak beni boğuyor,
   siliniyor, bozuluyor". ADHD'de kopan seri bütün emeği sıfırlanmış gibi
   hissettirir ve ertesi gün başlamayı zorlaştırır. Ara sürümdeki iki haftalık
   nokta takvimi de kalktı: "disiplini ben sağlarım, önceki günleri gösterme".
   Ekranda yalnız bugünün barı var; her gün 03.00'te sıfırdan, temiz başlar.
   Bu dosya geçmiş günlerin sayısını, seriyi ya da takvimi ÜRETMEZ (testte
   kilitli); geri eklemeden önce kullanıcıya sor.

   Gün anahtarı store.todayKey ile aynı ölçekten (UTC tarihi, Türkiye'de
   gün 03:00'te döner): gece yarısından sonra çözülen sorular önceki güne
   yazılır.

   Saf çekirdek (computeGun, minimumOf) depo görmez; sarmalayıcı (ritim)
   ham cevap kaydından sayıları toplar.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { state, todayKey } from './store.js';

/** Ayarlar kartında sunulan sabit asgariler (0 = otomatik). */
export const MIN_SECENEKLERI = [0, 10, 20, 30, 40];

const MIN_TABAN = 15;
const MIN_TAVAN = 30;
/** Barın mavi bölgesi hedefin bu katına kadar çizilir (fazlası ölçeği büyütür). */
export const BAR_UST_KAT = 1.5;

/**
 * Günlük asgari. Ayar pozitif bir sayıysa odur; değilse koçun hedefinin
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

/** Bir günün soru sayısı hangi renge düşer. */
export function bolgeOf(n, minimum, hedef) {
  if (!(n > 0)) return 'bos';
  if (n < minimum) return 'sari';
  if (n < hedef) return 'yesil';
  return 'mavi';
}

/**
 * SAF ÇEKİRDEK. Yalnız bugünün sayısına bakar.
 * @param {{ gunler: Map<string,number>, minimum: number, hedef: number, today: string }} p
 * @returns {{
 *   bugun:number, minimum:number, hedef:number, olcek:number, bolge:string,
 *   kalan:number, hedefKalan:number, bugunTamam:boolean
 * }}
 * hedef her zaman asgariden küçük değildir (yeşil bölge boş kalabilir).
 */
export function computeGun({ gunler, minimum, hedef, today } = {}) {
  const G = gunler instanceof Map ? gunler : new Map();
  const min = Math.max(1, Math.round(Number(minimum) || 1));
  const ust = Math.max(min, Math.round(Number(hedef) || 0));
  const bugun = G.get(String(today || '').slice(0, 10)) || 0;
  const olcek = Math.max(Math.round(ust * BAR_UST_KAT), bugun, 1);
  const bolge = bolgeOf(bugun, min, ust);
  return {
    bugun, minimum: min, hedef: ust, olcek,
    bolge: bolge === 'bos' ? 'sari' : bolge,
    kalan: Math.max(0, min - bugun), hedefKalan: Math.max(0, ust - bugun),
    bugunTamam: bugun >= min
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

/** Barın yanındaki tek kısa ifade (iki-üç kelime). */
export function barEtiketi(g) {
  if (g.bugun < g.minimum) return `asgariye ${g.kalan}`;
  if (g.bugun < g.hedef) return `hedefe ${g.hedefKalan}`;
  return 'hedef tamam';
}

/** İpucu cümlesi (yalnız title; ekranda yazı yok). */
export function gunCumlesi(g, dkSoru = 1) {
  const dk = n => Math.max(1, Math.round(n * dkSoru));
  if (g.bugun < g.minimum) return `Asgariye ${g.kalan} soru (~${dk(g.kalan)} dk).`;
  if (g.bugun < g.hedef) return `Asgari tamam. Hedefe ${g.hedefKalan} soru (~${dk(g.hedefKalan)} dk).`;
  return 'Hedef tamam. Bundan sonrası kazanç.';
}

/**
 * Sarmalayıcı: ham kayıttan bugünün sayısını toplar.
 * @param {number} hedef   koc().hedef
 * @param {number} [ayar]  settings.adhd.dailyMin
 */
export function ritim(hedef, ayar = 0) {
  const answers = state().answers || [];
  const minimum = minimumOf(hedef, ayar);
  const g = computeGun({ gunler: gunSayilari(answers), minimum, hedef, today: todayKey() });
  const dkSoru = dakikaOf(answers);
  return { ...g, otomatik: !(Number(ayar) > 0), dkSoru, etiket: barEtiketi(g), cumle: gunCumlesi(g, dkSoru) };
}
