/* ==========================================================================
   gen/hmk_sure.js — HMK USUL SÜRELERİ & İLK İTİRAZLAR SİMÜLATÖRÜ
   HMK m. 116, 117, 127, 344, 345
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { rng } from './miras.js';

export const id = 'hmk_sure';
export const subjectId = 'hmk';
export const category = 'usul_icra';
export const title = 'HMK Süreler & Usul Hamlesi Simülatörü';
export const desc = 'Cevap süresi (2 hafta), ek süre, istinaf harç tamamlama (1 haftalık kesin süre) ve ilk itirazlar.';
export const basis = 'HMK m. 116 · 117 · 127 · 344 · 345';

export const kaliplar = [
  { id: '', label: 'Karışık' },
  { id: 'cevap_ek_sure', label: 'Cevap Dilekçesi & Ek Süre' },
  { id: 'cevap_sure_asimi', label: 'Cevap Süresinin Kaçırılması' },
  { id: 'ilk_itiraz_yetki', label: 'Yetki İtirazı & Usulü' },
  { id: 'istinaf_suresi', label: 'İstinaf Başvuru Süresi' },
  { id: 'istinaf_harc_eksik', label: 'İstinaf Harç Eksikliği & Kesin Süre' }
];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x6b2e);
  const kalip = zorla || pick(r, ['cevap_ek_sure', 'cevap_sure_asimi', 'ilk_itiraz_yetki', 'istinaf_suresi', 'istinaf_harc_eksik']);

  const davaci = pick(r, ['Ahmet Kaya', 'Zeynep Çelik', 'Güneş Lojistik A.Ş.', 'Bahar Tekstil Ltd.']);
  const davali = pick(r, ['Mustafa Koç', 'Elif Demir', 'Kuzey İnşaat A.Ş.', 'Deniz Ticaret']);
  const mahkeme = pick(r, ['İstanbul 4. Asliye Hukuk Mahkemesi', 'Ankara 2. Asliye Hukuk Mahkemesi', 'İzmir 7. Asliye Ticaret Mahkemesi']);

  let senaryoBaslik = '';
  let senaryoMetin = '';
  let rows = [];

  if (kalip === 'cevap_ek_sure') {
    senaryoBaslik = 'CEVAP DİLEKÇESİ VE EK SÜRE TALEBİ';
    senaryoMetin = `${esc(davaci)} tarafından ${esc(davali)} aleyhine açılan alacak davasında, dava dilekçesi davalı vekiline 04.05.2026 tarihinde usulüne uygun tebliğ edilmiştir. Davalı vekili, dava dosyasındaki ticari defterlerin incelenmesinin ve belgelerin toplanmasının güçlüğü sebebiyle 14.05.2026 tarihinde (tebliğden 10 gün sonra) mahkemeye başvurarak cevap dilekçesini hazırlamak üzere 1 aylık ek süre talep etmiştir.`;

    rows = [
      {
        label: 'Ek Süre Talep Zamanı', sub: 'HMK m. 127/2',
        slots: [{
          q: 'Ek süre talebi yasal süresi içinde yapılmış mıdır?',
          answer: 'Evet (İlk 2 haftalık süre içinde yapılmıştır)',
          pool: ['Evet (İlk 2 haftalık süre içinde yapılmıştır)', 'Hayır (Ön incelemede istenmelidir)', 'Hayır (İlk 10 gün dolduğu için geçersizdir)'],
          why: 'HMK m. 127/2 gereğince cevap dilekçesini hazırlamakta çok zorlanan davalı, bu iki haftalık yasal cevap süresi dolmadan mahkemeye başvurmalıdır. 10. günde yapılan başvuru süresindedir.'
        }]
      },
      {
        label: 'Verilebilecek Azami Ek Süre', sub: 'Kanuni Üst Sınır',
        slots: [{
          q: 'Mahkemece verilebilecek azami ek süre ne kadardır?',
          answer: 'Bir defaya mahsus en çok 2 hafta',
          pool: ['Talep edilen 1 ay verilir', 'Bir defaya mahsus en çok 2 hafta', 'Hâkimin takdirindedir (Sınır yoktur)'],
          why: 'HMK m. 127/2 uyarınca mahkeme, durumu inceleyerek bir defaya mahsus olmak ve iki haftayı geçmemek üzere ek bir süre verebilir. 1 aylık ek süre verilemez.'
        }]
      }
    ];
  } else if (kalip === 'cevap_sure_asimi') {
    senaryoBaslik = 'CEVAP SÜRESİNİN GEÇİRİLMESİ VE HUKUKİ SONUÇLARI';
    senaryoMetin = `Dava dilekçesi davalı ${esc(davali)}'ye 02.03.2026 tarihinde tebliğ edilmiştir. Davalı vekili, iş yoğunluğunu mazeret göstererek tebliğ tarihinden 20 gün sonra (22.03.2026 tarihinde) mahkemeye başvurmuş ve cevap dilekçesi için 2 haftalık ek süre talebinde bulunmuştur.`;

    rows = [
      {
        label: 'Süre Aşımında Ek Süre', sub: 'HMK m. 127/2',
        slots: [{
          q: 'Cevap süresi geçtikten sonra yapılan ek süre talebi kabul edilebilir mi?',
          answer: 'Hayır (Cevap süresi geçtikten sonra ek süre verilemez)',
          pool: ['Evet (Hakimin takdiriyle verilebilir)', 'Hayır (Cevap süresi geçtikten sonra ek süre verilemez)', 'Evet (Mazeret geçerli ise verilebilir)'],
          why: 'HMK m. 127/2 gereğince ek süre talebi ancak 2 haftalık kanuni cevap süresi içinde yapılabilir. Yasal süre dolduktan sonra ek süre talebi dinlenemez ve reddedilir.'
        }]
      },
      {
        label: 'Cevap Vermemenin Sonucu', sub: 'HMK m. 128',
        slots: [{
          q: 'Süresinde cevap dilekçesi vermeyen davalının usulî durumu nedir?',
          answer: 'Davacının dava dilekçesindeki vakıalarını inkar etmiş sayılır',
          pool: ['Davacının iddialarını ikrar etmiş sayılır', 'Davacının dava dilekçesindeki vakıalarını inkar etmiş sayılır', 'Davadan feragat etmiş sayılır'],
          why: 'HMK m. 128 açık hükmüdür: Süresi içinde cevap dilekçesi vermemiş olan davalı, davacının dava dilekçesinde ileri sürdüğü vakıaların tamamını inkar etmiş sayılır (ikrar etmiş sayılmaz!).'
        }]
      }
    ];
  } else if (kalip === 'ilk_itiraz_yetki') {
    senaryoBaslik = 'KESİN OLMAYAN YETKİ İTİRAZININ İLERİ SÜRÜLMESİ VE USULÜ';
    senaryoMetin = `${esc(davaci)} (Ankara), sözleşmeden kaynaklanan para alacağı için ${esc(davali)} (İstanbul) aleyhine Ankara Asliye Hukuk Mahkemesinde dava açmıştır (olayda kesin yetki kuralı yoktur). Davalı vekili süresinde sunduğu cevap dilekçesinde yetki itirazında bulunmamış; daha sonra yapılan ön inceleme duruşmasında: "Davalının yerleşim yeri İstanbul'dur, mahkemeniz yetkisizdir, dosya İstanbul'a gönderilsin" itirazında bulunmuştur.`;

    rows = [
      {
        label: 'Yetki İtirazının Niteliği', sub: 'HMK m. 116/1-a',
        slots: [{
          q: 'Kesin yetki kuralının bulunmadığı hallerde yetki itirazı ne tür bir usul işlemidir?',
          answer: 'İlk İtirazdır (Cevap dilekçesinde ileri sürülmelidir)',
          pool: ['Dava Şartıdır (Her zaman ileri sürülebilir)', 'İlk İtirazdır (Cevap dilekçesinde ileri sürülmelidir)', 'Def\'i niteliğinde değildir'],
          why: 'HMK m. 116/1-a gereğince kesin yetki kuralının bulunmadığı hallerde yetki itirazı bir ilk itirazdır. Cevap dilekçesinde ileri sürülmeyen ilk itirazlar dinlenmez (HMK m. 117/1).'
        }]
      },
      {
        label: 'Ön İncelemedeki İtirazın Akıbeti', sub: 'HMK m. 19/2 & 117',
        slots: [{
          q: 'Cevap dilekçesinde ileri sürülmeyip ön incelemede yapılan yetki itirazına mahkeme ne karar vermelidir?',
          answer: 'İtirazı reddedip davaya bakmalıdır (Mahkeme yetkili hale gelmiştir)',
          pool: ['Re\'sen yetkisizlik kararı verip dosyayı göndermelidir', 'İtirazı reddedip davaya bakmalıdır (Mahkeme yetkili hale gelmiştir)', 'Görevsizlik kararı vermelidir'],
          why: 'HMK m. 19/2 uyarınca yetki itirazı süresinde ve usulüne uygun yapılmazsa dava açılan mahkeme yetkili hale gelir. Mahkeme kesin yetki kuralı olmayan hallerde re\'sen yetkisizlik kararı veremez.'
        }]
      }
    ];
  } else if (kalip === 'istinaf_suresi') {
    senaryoBaslik = 'İSTİNAF KANUN YOLU BAŞVURU SÜRESİ VE USULÜ';
    senaryoMetin = `${esc(mahkeme)}'nin verdiği nihai gerekçeli karar, davalı vekiline 01.06.2026 tarihinde e-tebligat yoluyla usulüne uygun tebliğ edilmiştir. Davalı vekili 25.06.2026 tarihinde (tebliğden 24 gün sonra) istinaf dilekçesi vererek karara itiraz etmiştir.`;

    rows = [
      {
        label: 'Yasal İstinaf Süresi', sub: 'HMK m. 345',
        slots: [{
          q: 'Hukuk davalarında istinaf yoluna başvuru süresi ne kadardır?',
          answer: 'Tebliğden itibaren 2 hafta',
          pool: ['Tebliğden itibaren 2 hafta', 'Tebliğden itibaren 1 ay', 'Tefhimden itibaren 10 gün', 'Tebliğden itibaren 15 gün'],
          why: 'HMK m. 345 uyarınca istinaf yoluna başvuru süresi ilamın taraflara tebliğinden itibaren iki haftadır. 7499 sayılı Kanun değişikliğiyle tefhim uygulaması kaldırılmış, süre tebliğden itibaren 2 hafta olarak yeknesaklaştırılmıştır.'
        }]
      },
      {
        label: 'Gecikmiş İstinafın Akıbeti', sub: 'HMK m. 346/1',
        slots: [{
          q: '24 gün sonra verilen istinaf dilekçesi hakkında ilk derece mahkemesi ne karar verir?',
          answer: 'İstinaf dilekçesinin reddine karar verir',
          pool: ['Dosyayı Bölge Adliye Mahkemesine gönderir', 'İstinaf dilekçesinin reddine karar verir', 'Tarafı duruşmaya çağırır'],
          why: 'HMK m. 346/1 emredicidir: İstinaf dilekçesi kanuni süre geçtikten sonra verilirse, kararı veren mahkeme istinaf dilekçesinin reddine karar verir (dosyayı BAM\'a göndermez).'
        }]
      }
    ];
  } else {
    senaryoBaslik = 'İSTİNAF DİLEKÇESİNDE HARÇ VE GİDER EKSİKLİĞİ';
    senaryoMetin = `Davacı vekili, aleyhine verilen ret kararına karşı süresinde istinaf dilekçesi sunmuş; ancak istinaf karar ve ilam harcı ile tebligat giderlerini eksik yatırmıştır. Mahkeme yazı işleri müdürü eksikliği tespit etmiş ve mahkemece davacı tarafa muhtıra tebliğ edilmiştir.`;

    rows = [
      {
        label: 'Verilecek Yasal Tamamlama Süresi', sub: 'HMK m. 344/1',
        slots: [{
          q: 'Harç ve masraf eksiğinin tamamlanması için mahkemece verilecek süre ne tür bir süredir?',
          answer: '1 haftalık kesin süre',
          pool: ['2 haftalık kesin süre', '1 haftalık kesin süre', 'Hâkimin belirleyeceği takdiri süre', '1 aylık süre'],
          why: 'HMK m. 344/1 açık hükmüdür: İstinaf dilekçesi verilirken gerekli harç ve giderler yatırılmamışsa, mahkemece eksikliğin tamamlanması için bir haftalık kesin süre verilir ve sonuçları açıkça ihtar edilir.'
        }]
      },
      {
        label: 'Süresinde Tamamlamamanın Yaptırımı', sub: 'HMK m. 344/1 Sonuç',
        slots: [{
          q: 'Verilen 1 haftalık kesin sürede harç tamamlanmazsa mahkeme ne karar verir?',
          answer: 'Kararın istinaf edilmemiş sayılmasına karar verir',
          pool: ['İstinaf talebini esastan reddeder', 'Kararın istinaf edilmemiş sayılmasına karar verir', 'Dosyayı re\'sen BAM\'a gönderir'],
          why: 'HMK m. 344/1 gereğince verilen bir haftalık kesin süre içinde harç ve giderler tamamlanmazsa, mahkemece kararın istinaf edilmemiş sayılmasına karar verilir.'
        }]
      }
    ];
  }

  // Assertion: her slotun cevabı pool içinde olmalı
  rows.forEach(r => {
    (r.slots || []).forEach(s => {
      if (!s.pool.includes(s.answer)) {
        console.error('[gen/hmk_sure] answer pool içinde yok:', s.answer, s.pool);
        s.pool.push(s.answer);
      }
    });
  });

  const html = `
    <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">
      <div style="font-size:0.75rem;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:0.5px;">${esc(senaryoBaslik)}</div>
      <div style="font-size:0.95rem;line-height:1.6;margin-top:0.6rem;color:var(--ink);">${esc(senaryoMetin)}</div>
    </div>`;

  return {
    baslik: 'HMK Süreler & Usul Hamlesi Simülatörü',
    title: 'HMK Süreler & Usul Hamlesi Simülatörü',
    basis: 'HMK m. 116 · 117 · 127 · 344 · 345',
    panels: [{ kind: 'html', html }],
    fill: {
      title: 'Hukuki Usul & Karar Değerlendirmesi',
      headers: ['Usulî Kurum / İşlem', 'Yasal Karar & Sonuç'],
      rows
    }
  };
}
