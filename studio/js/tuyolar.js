/* ==========================================================================
   tuyolar.js : Soru tipine özel sınav radarı ve ampirik kurtarma tüyoları
   Kaynak: 4 gerçek sınav kitapçığının (460 soru: 2024E, 2025M, 2025E, 2026N)
   tamamı taranarak ölçülen kök yapıları ve çeldirici tuzakları.
   Ders bazlı harf oranları 25 Eylül 2026'da ÇIKARILDI: dört sınavda sınandı, tutmuyor
   (diğer üç sınavdan seçilen favori harf dördüncüde %16,9 isabet, rastgele %20).
   Burada yalnız dört sınavın dördünde de tutan oranlar durur.
   Ders kartı Notlar'dan beslenir (not-eslesme.js): soruyla ilgili tuzak ya da
   ezber öğesi, yoksa dersin "sınavda" notu.

   Amaç: Bir soru yanlış yapıldığında, boş bırakıldığında veya çözümü
   incelenirken geri bildirim alanında iki kolonlu, dingin ve Apple standardında
   bir "Çıkmış Sınav Radarı" sunarak adaya somut kurtarma taktiği kazandırmak.

   © 2026 Yusuf GÜNAY, Tüm Hakları Saklıdır.
   ========================================================================== */

import { esc } from './ui.js';
import { isPastExam, questionById } from './data.js';
import { ilgiliNotlar, notDersleri } from './not-eslesme.js';

const ROM = /^(Yalnız\s+)?(I{1,3}|IV)(\s*,\s*(I{1,3}|IV))*(\s+ve\s+(I{1,3}|IV))?$/i;

const STOP = new Set((
  'Türkiye Büyük Millet Meclisi Anayasa Mahkemesi Anayasası Kanunu Kanun Danıştay Yargıtay Sayıştay ' +
  'Cumhurbaşkanı Cumhurbaşkanlığı Bakanlık Bakanlığı Bakan Devlet Devleti Adalet İçişleri Maliye Hazine Türk Medeni Borçlar ' +
  'Ticaret Ceza Muhakemesi Muhakemeleri İcra İflas İdari Yargılama Usulü Vergi Usul İş Sendikalar Toplu Sözleşmesi Avukatlık ' +
  'Barosu Baro Birliği Kurumu Kurulu Kurul Bölge Adliye İstinaf Uyuşmazlık Avrupa İnsan Hakları Osmanlı Mecelle Divanı Yüce ' +
  'Divan Hâkimler Savcılar Yüksek Seçim Ankara İstanbul İzmir Bursa Adana Samsun Kilis Osmaniye Kozan Hacettepe Rekabet ' +
  'Ulusal Sosyal Güvenlik'
).split(/\s+/));

const AD_EK = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})(['’](?:ın|in|un|ün|nın|nin|nun|nün|a|e|ya|ye|ı|i|u|ü|nı|ni|la|le|yla|yle|dan|den|tan|ten|ndan|nden|na|ne))/g;
const AD_VIR = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})\s*,\s+[a-zçğıöşü]/g;
const SORU_CUM = /((\d{3,4}\s*sayılı|1982\s*Anayasası|Anayasa['’]ya|Türk\s+\w+\s+Kanunu)[^.?]{0,140}?göre)|(\bBuna göre\b)|(\bYukarıda\w*\b)/i;
const HARF_TARAF = /\(([A-E])\)|\b(?:memur|işçi|işveren|kişi|şirket|davacı|davalı|sanık|müvekkil|tacir|banka|ülke|Devleti?)\s+\(?([A-Z])\)?\b|\b([A-Z])\s+Devleti\b/;

function kisiVar(s) {
  for (const re of [AD_EK, AD_VIR]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) if (!STOP.has(m[1])) return true;
  }
  return false;
}

function anlatiUz(s) {
  const m = SORU_CUM.exec(s);
  return m ? m.index : (s.length > 260 ? s.length : 0);
}

function optTexts(q) {
  if (!q.options) return [];
  if (Array.isArray(q.options)) return q.options.map(o => (typeof o === 'string' ? o : (o.text || o.t || '')));
  return Object.values(q.options).map(o => (typeof o === 'string' ? o : (o.text || o.t || '')));
}

/** Sorunun gerçek sınav dedektörleriyle tipini çıkarır. */
export function soruTipleri(q) {
  const stem = q.stem || '';
  const opts = optTexts(q);
  const onculu = /hangileri/i.test(stem) || opts.filter(o => ROM.test(String(o).trim())).length >= 4;
  const kalip = /ifadelerden hangisi\s+(doğru|yanlış)/i.test(stem);
  const olumsuz = /(değildir|yanlıştır|olamaz|söylenemez|sayılamaz|yer almaz|yapılamaz|edilemez|verilemez|aranmaz|gidilemez|bağlamaz)\s*\??\s*$/i.test(stem.trim());
  const az = anlatiUz(stem);
  const olay = (az >= 60 && kisiVar(stem.slice(0, Math.max(60, az) + 120))) || (az >= 40 && HARF_TARAF.test(stem));
  const kisaSik = opts.length > 0 && opts.every(o => String(o).trim().length < 40);
  const cokKisaSik = opts.length > 0 && opts.every(o => String(o).trim().length <= 14);

  // En uzun şık kontrolü
  let enUzunSikMi = false;
  if (opts.length === 5) {
    const lens = opts.map(o => String(o).length);
    const maxL = Math.max(...lens);
    const minL = Math.min(...lens);
    enUzunSikMi = (maxL - minL) > 40;
  }

  return { onculu, kalip, olumsuz, olay, kisaSik, cokKisaSik, enUzunSikMi };
}

/* ==========================================================================
   NOTLAR KARTI
   ========================================================================== */
const md = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

function notOgesiHTML(o) {
  if (o.tur === 'ezber') {
    return `<div class="radar-num"><b>${esc(o.veri[0])}</b><span>${esc(o.veri[1])}</span></div>`;
  }
  const t = o.veri;
  if (typeof t === 'string') return `<p class="radar-card-desc">${md(t)}</p>`;
  return `<div class="radar-trap">
      <span class="radar-trap-y"><em>Kurulan</em>${md(t.y)}</span>
      <span class="radar-trap-d"><em>Doğrusu</em>${md(t.d)}</span>
    </div>`;
}

function notKartiHTML(q) {
  const ders = notDersleri(q);
  if (!ders.length) return '';
  const esl = ilgiliNotlar(q);
  const d = (esl.length && ders.find(x => x.id === esl[0].ders)) || ders[0];
  const govde = esl.length
    ? esl.map(notOgesiHTML).join('')
    : `<p class="radar-card-desc">${md(d.sinavda)}</p>`;
  return `<div class="radar-card">
      <div class="radar-card-head">
        <span class="radar-card-title">${esc(d.ad)}</span>
        <span class="radar-card-meta">Sınavda ${d.soru} soru</span>
      </div>
      <div class="radar-notes">${govde}</div>
    </div>`;
}

/* ==========================================================================
   SORU KÖKÜ VE BİÇİM KURTARMA TÜYOLARI
   ========================================================================== */
function kokTaktigi(t, sec) {
  if (t.onculu) {
    return {
      etiket: 'Öncüllü Soru (I, II, III)',
      taktik: '78 öncüllü sorunun 53\'ünde (%68) doğru cevap iki öncül; "I, II ve III" yalnız 6 kez (%8). Dört sınavın dördünde de böyle. Bir öncülü kesin elersen soru iki şıkka iner.'
    };
  }
  if (t.olumsuz) {
    return {
      etiket: 'Olumsuz Kök ("...değildir / ...yanlıştır")',
      taktik: 'Dört şık kanunun hükmü; doğru cevapta süre ya da merci tek kelimeyle bozulmuş. Olumsuz kökte doğru cevap 120 sorunun yalnız 8\'inde A (%7), hiçbir sınavda 4\'ü geçmedi; D ya da E 66 soruda (%55). Dört sınavda da tutan tek harf oranı bu: kararsız kalırsan A\'yı en son düşün.'
    };
  }
  if (t.kisaSik || t.cokKisaSik) {
    return {
      etiket: 'Kısa Şıklar (Süre / Sayı / Merci)',
      taktik: 'Sınavın %28\'inde şıklar 12 karakterden kısadır. Çeldiriciler birbirine çok yakın kanun eşikleridir (7 gün / 10 gün; 15 gün / 30 gün; 1 yıl / 2 yıl). Hangi somut işlemin süresi sorulduğunu ve süre başlangıç anını (tebliğ mi, öğrenme mi) netleştir.'
    };
  }
  if (t.olay) {
    return {
      etiket: 'Olay ve Pratik Vaka Kurgusu',
      taktik: 'Olay örgüsündeki kişi adları ve detaylar dikkat dağıtmak içindir. Olayı tek hukuki soruya indirge: Kim, kime karşı, hangi hukuki sebebe ve süreye dayanarak talepte bulunuyor?'
    };
  }
  if (t.kalip) {
    return {
      etiket: 'İfadelerden Hangisi Kalıbı',
      taktik: 'Şıklara geçmeden kökün "doğru" mu "yanlış" mı sorduğunu bir kez daha oku, sonra her şıkkı ayrı ayrı doğru ya da yanlış diye işaretle.'
    };
  }
  return {
    etiket: 'Düz Bilgi ve Mevzuat Kökü',
    taktik: 'Tek başına en uzun şık 395 sorunun yalnız 64\'ünde (%16) doğru; dört sınavda da %14-18 arası. Uzun diye seçme.'
  };
}

/**
 * Geri bildirim alanında görüntülenecek zengin Çıkmış Sınav Radarı HTML bloğu.
 * Yan yana iki modüler kart (CSS Grid) içeren, mat, dingin ve Apple standardında yapı.
 */
export function kurtarmaRadariHTML({ q, chosen, ok, sec = 0, isReview = false, isMarked = false }) {
  if (!q) return '';
  const fullQ = questionById.get(q.qId || q.id) || q;
  if (!isPastExam(fullQ)) return '';
  if (ok && !isMarked && !isReview) return '';

  const t = soruTipleri(q);
  const kt = kokTaktigi(t, sec);
  const fastWrong = !ok && sec > 0 && sec < 40 && chosen !== null;
  const badgeText = fastWrong
    ? `Hızlı Çözüldü (${Math.round(sec)} sn)`
    : isMarked
      ? 'Kuşkulu İşaretlenen Soru'
      : chosen === null
        ? 'Boş Bırakılan Soru'
        : 'Yanlış Çözülen Soru';

  return `
    <div class="radar-wrap">
      <div class="radar-head">
        <div class="radar-title-group">
          <span class="radar-title">Çıkmış Sınav Radarı</span>
          <span class="radar-badge">4 Sınav · 460 Soru Verisi</span>
        </div>
        <span class="radar-status ${fastWrong ? 'fast' : isMarked ? 'marked' : ''}">${esc(badgeText)}</span>
      </div>

      <div class="radar-grid">
        <div class="radar-card">
          <div class="radar-card-head">
            <span class="radar-card-title">${esc(kt.etiket)}</span>
            <span class="radar-card-meta">Biçim Tuzağı</span>
          </div>
          <p class="radar-card-desc">${esc(kt.taktik)}</p>
        </div>

        ${notKartiHTML(fullQ)}
      </div>
    </div>
  `;
}

/** Geriye dönük uyumluluk: eski tuyoSec çağrıları için köprü */
export function tuyoSec(q, { ok, hizli }) {
  if (ok || !q) return null;
  const fullQ = questionById.get(q.qId || q.id) || q;
  if (!isPastExam(fullQ)) return null;
  const t = soruTipleri(fullQ);
  const kt = kokTaktigi(t, 0);
  return { baslik: kt.etiket, metin: kt.taktik, tip: 'radar' };
}
