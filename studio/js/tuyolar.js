/* ==========================================================================
   tuyolar.js : Soru tipine özel sınav radarı ve ampirik kurtarma tüyoları
   Kaynak: 4 gerçek sınav kitapçığının (460 soru: 2024E, 2025M, 2025E, 2026N)
   tamamı taranarak ölçülen şık frekansları, kök yapıları ve çeldirici tuzakları.

   Amaç: Bir soru yanlış yapıldığında, boş bırakıldığında veya çözümü
   incelenirken geri bildirim alanında iki kolonlu, dingin ve Apple standardında
   bir "Çıkmış Sınav Radarı" sunarak adaya somut kurtarma taktiği kazandırmak.

   © 2026 Yusuf GÜNAY, Tüm Hakları Saklıdır.
   ========================================================================== */

import { esc } from './ui.js';

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
   DERS BAZLI ÇIKMIŞ SINAV İMZASI VE FREKANS VERİTABANI
   4 resmî sınav (460 soru) ölçüm tablosu:
   ========================================================================== */
export const DERS_RADARI = {
  medeni_hukuk: {
    ad: 'Medeni Hukuk',
    soruSayisi: 56,
    siklar: 'A: %16 · B: %20 · C: %21 · D: %23 · E: %20',
    enGuclu: 'D (%23)',
    enZayif: 'A (%16)',
    taktik: 'Sınavın en büyük soru payına (15 soru) sahip dersidir. Şık dağılımı dengelidir. Tapu sicili karineleri, hak ehliyeti ve miras payı hesaplamalarında kuralın açık istisnalarına odaklan. Doğru şık genellikle yalındır; en uzun şık %82 ihtimalle çeldiricidir.'
  },
  borclar_hukuku: {
    ad: 'Borçlar Hukuku',
    soruSayisi: 49,
    siklar: 'A: %6 · B: %16 · C: %27 · D: %22 · E: %29',
    enGuclu: 'E (%29) ve C (%27)',
    enZayif: 'A (%6)',
    taktik: 'A şıkkı 4 sınavın 49 sorusunda yalnızca 3 kez doğru çıkmıştır (%6). Kararsız kalındığında A şıkkı elenmeli; doğru cevap %56 ihtimalle E veya C seçeneğidir. Genel hükümler, kusursuz sorumluluk ve temerrüt şartlarında net kanuni kuralı ara.'
  },
  hmk: {
    ad: 'Medeni Usul Hukuku (HMK)',
    soruSayisi: 44,
    siklar: 'A: %20 · B: %20 · C: %11 · D: %20 · E: %27',
    enGuclu: 'E (%27)',
    enZayif: 'C (%11)',
    taktik: 'Sınavın olumsuz kök zirvesidir (soruların %52\'si olumsuzdur). Olumsuz köklerde dört şık kanunun birebir hükmüdür; doğru olan tek şıkta süre (2 hafta) veya merci tek bir kelimeyle bozulmuştur. Kararsızlıkta C\'den kaçın, E şıkkını öncelikle tart.'
  },
  ticaret_hukuku: {
    ad: 'Ticaret Hukuku',
    soruSayisi: 43,
    siklar: 'A: %26 · B: %14 · C: %26 · D: %19 · E: %16',
    enGuclu: 'A ve C (%52)',
    enZayif: 'B (%14)',
    taktik: 'Genel sınav eğiliminin aksine A ve C şıkları soruların yarısından fazlasını alır (%52). Şirketler hukukunda organ yetkileri ve nisaplar; kıymetli evrakta bono ve poliçe def\'ileri öne çıkar. Kararsızlıkta A ve C seçeneklerine yönelmek beklenen değeri artırır.'
  },
  ceza_hukuku: {
    ad: 'Ceza Hukuku',
    soruSayisi: 35,
    siklar: 'A: %29 · B: %3 · C: %17 · D: %29 · E: %23',
    enGuclu: 'A ve D (%57)',
    enZayif: 'B (%3 - Ölü Harf)',
    taktik: 'B şıkkı 4 sınavda yalnızca 1 kez doğru çıkmıştır (%3). İki şık arasında kalındığında B kesinlikle işaretlenmemeli, A veya D (%57) tercih edilmelidir. Olası kast ile bilinçli taksir ve iştirak türleri sınırlarında komşu kavram tuzaklarına dikkat et.'
  },
  icra_iflas: {
    ad: 'İcra ve İflas Hukuku',
    soruSayisi: 24,
    siklar: 'A: %29 · B: %8 · C: %13 · D: %33 · E: %17',
    enGuclu: 'D (%33) ve A (%29)',
    enZayif: 'B (%8)',
    taktik: 'Soruların %62,5\'inde (15/24) doğru cevap A veya D şıkkıdır. B şıkkı son 3 sınavda hiç çıkmamıştır. 7 günlük itiraz ve şikayet süreleri ile takibin aşamalarını birbirine karıştırma.'
  },
  cmk: {
    ad: 'Ceza Muhakemesi (CMK)',
    soruSayisi: 24,
    siklar: 'A: %21 · B: %21 · C: %29 · D: %17 · E: %13',
    enGuclu: 'C (%29)',
    enZayif: 'E (%13)',
    taktik: 'Olumsuz kök oranı %46\'dır. Koruma tedbirleri süreleri (tutuklama, gözaltı) ve görevli merci (sulh ceza hakimliği / ağır ceza mahkemesi) kaydırmaları sınavın merkezidir. C şıkkı liderdir.'
  },
  is_hukuku: {
    ad: 'İş ve Sosyal Güvenlik Hukuku',
    soruSayisi: 24,
    siklar: 'A: %12 · B: %8 · C: %25 · D: %38 · E: %17',
    enGuclu: 'D (%38)',
    enZayif: 'B (%8)',
    taktik: 'D şıkkı tek başına %38 ile 4 sınavın dördünde de açık liderdir. Kararsız kalındığında en yüksek beklenen değerli şık D\'dir. İşe iade süre zinciri (1 ay arabuluculuk, 2 hafta dava) ile kıdem tazminatı şartlarındaki sayısal tuzaklara odaklan.'
  },
  idare_hukuku: {
    ad: 'İdare Hukuku',
    soruSayisi: 23,
    siklar: 'A: %35 · B: %22 · C: %9 · D: %13 · E: %22',
    enGuclu: 'A (%35)',
    enZayif: 'C (%9)',
    taktik: 'A şıkkı %35 ile belirgin liderdir; 4 sınavın dördünde de çıkmıştır. Yetki devri, imza devri, idari vesayet ve hiyerarşi gibi kavram ailesi eşleştirmelerinde A şıkkı öne çıkar; C şıkkı dip seviyededir.'
  },
  anayasa_hukuku: {
    ad: 'Anayasa Hukuku',
    soruSayisi: 22,
    siklar: 'A: %9 · B: %14 · C: %32 · D: %32 · E: %14',
    enGuclu: 'C ve D (%64)',
    enZayif: 'A (%9)',
    taktik: 'C ve D şıkları soruların %64\'ünü oluşturur (14/22). A şıkkı yalnızca %9\'da kalmıştır. TBMM karar yeter sayıları (151, 301, 360, 400) ile seçim usullerinde C ve D seçenekleri baskındır.'
  },
  vergi_hukuku: {
    ad: 'Vergi Hukuku',
    soruSayisi: 22,
    siklar: 'A: %27 · B: %9 · C: %18 · D: %27 · E: %18',
    enGuclu: 'A ve D (%55)',
    enZayif: 'B (%9)',
    taktik: 'Tarh, tebliğ, tahakkuk ve tahsil aşamaları ile 5 yıllık tarh zamanaşımı sorularında A ve D odaklıdır. B şıkkı %9 ile en zayıf tercihtir.'
  },
  anayasa_yargisi: {
    ad: 'Anayasa Yargısı',
    soruSayisi: 14,
    siklar: 'A: %36 · B: %21 · C: %14 · D: %21 · E: %7',
    enGuclu: 'A (%36)',
    enZayif: 'E (%7)',
    taktik: '6216 sayılı Kanun kapsamındaki bireysel başvuru süreleri (30 gün, mazeret sonrası 15 gün) ve iptal davası sürelerinde A şıkkı ağırlıktadır; E şıkkı yalnızca 1 kez çıkmıştır.'
  },
  iyuk: {
    ad: 'İdari Yargılama Usulü (İYUK)',
    soruSayisi: 14,
    siklar: 'A: %7 · B: %29 · C: %14 · D: %29 · E: %21',
    enGuclu: 'B ve D (%57)',
    enZayif: 'A (%7)',
    taktik: 'İdari yargıda dava açma süreleri (genel 60 gün, vergi 30 gün) ve yürütmenin durdurulması şartlarında B ve D seçenekleri öne çıkar. A şıkkı 14 soruda yalnızca 1 kez çıkmıştır.'
  },
  avukatlik: {
    ad: 'Avukatlık Hukuku',
    soruSayisi: 13,
    siklar: 'A: %8 · B: %8 · C: %15 · D: %38 · E: %31',
    enGuclu: 'D ve E (%69)',
    enZayif: 'A ve B (%15)',
    taktik: 'D ve E şıkları soruların %69\'unu oluşturur. Avukatlık Kanunu kapsamındaki sır saklama, reklam yasağı ve baro organları seçimlerinde D ve E şıkları ezici çoğunluktadır; A ve B\'den kaçınılmalıdır.'
  },
  hukuk_felsefesi: {
    ad: 'Hukuk Felsefesi ve Sosyolojisi',
    soruSayisi: 13,
    siklar: 'A: %8 · B: %15 · C: %31 · D: %31 · E: %15',
    enGuclu: 'C ve D (%62)',
    enZayif: 'A (%8)',
    taktik: 'Soruların tamamına yakını düşünür ve eser eşleştirmesidir. Doğal hukuk, hukuki pozitivizm ve tarihçi okul ayrımlarında C ve D şıkları merkezdedir.'
  },
  hukuk_tarihi: {
    ad: 'Türk Hukuk Tarihi',
    soruSayisi: 11,
    siklar: 'A: %27 · B: %18 · C: %27 · D: %9 · E: %18',
    enGuclu: 'A ve C (%55)',
    enZayif: 'D (%9)',
    taktik: 'İslam hukuku kaynakları (icma, kıyas, istihsan) ve Osmanlı Mecelle hükümlerinde A ve C seçenekleri yoğunluktadır. D şıkkı yalnızca 1 kez çıkmıştır.'
  },
  milletlerarasi_hukuk: {
    ad: 'Milletlerarası Hukuk',
    soruSayisi: 11,
    siklar: 'A: %9 · B: %27 · C: %9 · D: %27 · E: %27',
    enGuclu: 'B, D ve E (%82)',
    enZayif: 'A ve C (%18)',
    taktik: 'Devletlerin tanınması, andlaşmalar hukuku ve deniz yetki alanlarında B, D ve E seçenekleri öne çıkar. A ve C şıkları nadirdir.'
  },
  mohuk: {
    ad: 'Milletlerarası Özel Hukuk (MÖHUK)',
    soruSayisi: 9,
    siklar: 'A: %0 · B: %44 · C: %33 · D: %22 · E: %0',
    enGuclu: 'B (%44)',
    enZayif: 'A ve E (%0 - Hiç Çıkmadı)',
    taktik: 'Yabancılık unsuru, bağlama noktaları ve tenfiz şartlarında B ve C seçenekleri ağırlıktadır; A ve E şıkları 9 soruda hiç çıkmamıştır.'
  },
  genel_kamu: {
    ad: 'Genel Kamu Hukuku',
    soruSayisi: 7,
    siklar: 'A: %29 · B: %29 · C: %0 · D: %14 · E: %29',
    enGuclu: 'A, B ve E (%86)',
    enZayif: 'C (%0)',
    taktik: 'Egemenlik teorileri ve modern devlet modelleri eşleştirmesinde A, B ve E seçenekleri yoğunlaşmıştır.'
  },
  vergi_usul: {
    ad: 'Vergi Usul Hukuku',
    soruSayisi: 2,
    siklar: 'C: %100',
    enGuclu: 'C',
    enZayif: 'A, B, D, E',
    taktik: 'Vergi Usul Kanunu kapsamındaki yoklama, inceleme ve ceza kesme usullerine odaklan.'
  }
};

/* ==========================================================================
   SORU KÖKÜ VE BİÇİM KURTARMA TÜYOLARI
   ========================================================================== */
function kokTaktigi(t, sec) {
  if (t.onculu) {
    return {
      etiket: 'Öncüllü Soru (I, II, III)',
      taktik: '4 sınavdaki 78 öncüllü sorunun %67\'sinde doğru cevap 2 öncüllüdür (I ve II: %30, II ve III: %21, I ve III: %17). "I, II ve III (tümü doğru)" seçeneği yalnızca %7,7 çıkmıştır. Kararsızlıkta tümü doğru şıkkından kaçın; tek bir öncülü kesin elediğinde soru iki seçeneğe iner.'
    };
  }
  if (t.olumsuz) {
    return {
      etiket: 'Olumsuz Kök ("...değildir / ...yanlıştır")',
      taktik: 'Sınavın %30\'u olumsuz köktür. Soru yazarları doğru cevabı A şıkkına koymaktan kaçınmış (A yalnızca %6,6), D ve E şıklarına ötelemiştir (%57,4). Dört şık kanunun birebir doğru hükmüyken, doğru olan tek şıkta süre veya merci tek bir kelimeyle bozulmuştur. En uzun şıkka kapılma.'
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
      taktik: 'Zıt ikizler kuralı: İki şık aynı konuda birbirine zıt iki hüküm bildiriyorsa (örneğin "durdurur" ile "durdurmaz"), doğru cevap %80 üzeri ihtimalle bu iki zıt seçenekten biridir. Diğer üç şıkkı hızla ele.'
    };
  }
  return {
    etiket: 'Düz Bilgi ve Mevzuat Kökü',
    taktik: 'Doğru şıkkın tek başına en uzun olma oranı 4 sınav genelinde yalnızca %13,9\'dur. Kararsız kalındığında "en uzun şık doğrudur" ezberine kapılma; o şık %86 ihtimalle çeldiricidir.'
  };
}

/**
 * Geri bildirim alanında görüntülenecek zengin Çıkmış Sınav Radarı HTML bloğu.
 * Yan yana iki modüler kart (CSS Grid) içeren, mat, dingin ve Apple standardında yapı.
 */
export function kurtarmaRadariHTML({ q, chosen, ok, sec = 0, isReview = false, isMarked = false }) {
  if (ok && !isMarked && !isReview) return '';

  const t = soruTipleri(q);
  const kt = kokTaktigi(t, sec);
  const sId = q.subjectId || q.dersSlug || '';
  const dr = DERS_RADARI[sId] || {
    ad: 'Genel Sınav',
    soruSayisi: 460,
    siklar: 'A: %19 · B: %16 · C: %21 · D: %24 · E: %20',
    enGuclu: 'D (%24)',
    enZayif: 'B (%16)',
    taktik: 'Sınav genelinde D şıkkı (%24) en yüksek, B şıkkı (%16) en düşük frekanstadır. D\'nin baskınlığı öncüllü ve olumsuz köklü sorulardan kaynaklanır.'
  };

  const fastWrong = !ok && sec > 0 && sec < 40 && chosen !== null;
  const badgeText = fastWrong
    ? `Hızlı Çözüldü (${Math.round(sec)} sn)`
    : isMarked
      ? 'Kuşkulu İşaretlenen Soru'
      : chosen === null
        ? 'Boş Bırakılan Soru'
        : 'Yanlış Çözülen Soru';

  return `
    <div class="radar-wrap" style="margin:0.85rem 0;padding:0.9rem 1rem;background:var(--bg-raise, #f7f6f2);border:1px solid var(--line, rgba(0,0,0,0.08));border-radius:8px;">
      <div class="radar-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;padding-bottom:0.45rem;border-bottom:1px solid var(--line, rgba(0,0,0,0.06));">
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span style="font-size:0.75rem;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:var(--ink-3, #71717a)">Çıkmış Sınav Radarı</span>
          <span style="font-size:0.68rem;padding:0.15rem 0.45rem;background:var(--card, #fff);border:1px solid var(--line, rgba(0,0,0,0.08));border-radius:4px;color:var(--ink-2, #3f3f46)">4 Sınav · 460 Soru Verisi</span>
        </div>
        <span style="font-size:0.72rem;font-weight:600;color:var(--ink-2, #52525b)">${esc(badgeText)}</span>
      </div>

      <div class="radar-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:0.85rem;">
        <div class="radar-card" style="padding:0.75rem;background:var(--card, #fff);border:1px solid var(--line, rgba(0,0,0,0.06));border-radius:6px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--ink, #18181b);margin-bottom:0.35rem;display:flex;justify-content:space-between;align-items:center;">
            <span>${esc(kt.etiket)}</span>
            <span style="font-size:0.68rem;color:var(--ink-3, #71717a);font-weight:500">Biçim Tuzağı</span>
          </div>
          <p style="margin:0;font-size:0.82rem;line-height:1.45;color:var(--ink-2, #3f3f46)">${esc(kt.taktik)}</p>
        </div>

        <div class="radar-card" style="padding:0.75rem;background:var(--card, #fff);border:1px solid var(--line, rgba(0,0,0,0.06));border-radius:6px;">
          <div style="font-size:0.75rem;font-weight:700;color:var(--ink, #18181b);margin-bottom:0.35rem;display:flex;justify-content:space-between;align-items:center;">
            <span>${esc(dr.ad)}</span>
            <span style="font-size:0.68rem;color:var(--ink-3, #71717a);font-weight:500">Lider: <b>${esc(dr.enGuclu)}</b> · Zayıf: <b>${esc(dr.enZayif)}</b></span>
          </div>
          <p style="margin:0 0 0.4rem 0;font-size:0.78rem;color:var(--ink-3, #71717a);font-family:monospace">${esc(dr.siklar)}</p>
          <p style="margin:0;font-size:0.82rem;line-height:1.45;color:var(--ink-2, #3f3f46)">${esc(dr.taktik)}</p>
        </div>
      </div>
    </div>
  `;
}

/** Geriye dönük uyumluluk: eski tuyoSec çağrıları için köprü */
export function tuyoSec(q, { ok, hizli }) {
  if (ok) return null;
  const t = soruTipleri(q);
  const kt = kokTaktigi(t, 0);
  return { baslik: kt.etiket, metin: kt.taktik, tip: 'radar' };
}
