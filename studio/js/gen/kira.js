/* ==========================================================================
   gen/kira.js — KİRA HUKUKU & TAHLİYE SİMÜLATÖRÜ
   TBK m. 315, 342, 347, 350, 352/1, 355
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { rng } from './miras.js';

export const id = 'kira';
export const subjectId = 'borclar_hukuku';
export const category = 'borclar_kira';
export const title = 'Kira Hukuku & Tahliye Simülatörü';
export const desc = 'Temerrüt ihtarı (30 gün), tahliye taahhüdü, 3 yıllık kiralama yasağı ve 10 yıllık uzama.';
export const basis = 'TBK m. 315 · 342 · 347 · 350-355';

export const kaliplar = [
  { id: '', label: 'Karışık' },
  { id: 'temerrut_ihtar', label: 'Temerrüt İhtarı (30 Gün)' },
  { id: 'tahliye_taahhudu', label: 'Tahliye Taahhüdü & Süre' },
  { id: 'gereksinim_ve_yasak', label: 'İhtiyaç & 3 Yıl Yasağı' },
  { id: 'depozito_siniri', label: 'Depozito Güvence Sınırı' },
  { id: 'on_yillik_uzama', label: '10 Yıllık Uzama & Fesih' }
];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x4f19);
  const kalip = zorla || pick(r, ['temerrut_ihtar', 'tahliye_taahhudu', 'gereksinim_ve_yasak', 'depozito_siniri', 'on_yillik_uzama']);

  const kiraci = pick(r, ['Kaan Demir', 'Selin Yılmaz', 'Murat Kaya', 'Ece Doğan']);
  const evSahibi = pick(r, ['Tarık Bey', 'Leyla Hanım', 'Vedat Bey', 'Meral Hanım']);
  const kiraBedeli = int(r, 15, 35) * 1000;
  const sehirSemt = pick(r, ['Kadıköy (İstanbul)', 'Çankaya (Ankara)', 'Konak (İzmir)', 'Nilüfer (Bursa)']);

  let senaryoBaslik = '';
  let senaryoMetin = '';
  let rows = [];

  if (kalip === 'temerrut_ihtar') {
    senaryoBaslik = 'KİRA BEDELİNİN ÖDENMEMESİ VE TEMERRÜT İHTARI';
    const verilenSure = pick(r, [15, 20]);
    const odenenGun = verilenSure + 5;
    senaryoMetin = `Kiracı ${esc(kiraci)}, ${esc(sehirSemt)} semtindeki çatılı işyeri için aylık ${kiraBedeli.toLocaleString('tr-TR')} TL kira bedelini vadesinde ödememiştir. Kiraya veren ${esc(evSahibi)}, noterden gönderdiği ihtarnamede: "Ödenmeyen kira borcunuzu tebliğden itibaren ${verilenSure} gün içinde ödeyiniz; aksi halde sözleşme feshedilerek tahliye davası açılacaktır" ihtarında bulunmuştur. İhtarname tebliğ edilmiş; ${esc(kiraci)} borcunu tebliğden sonraki ${odenenGun}. günde ödemiştir. Kiraya veren Sulh Hukuk Mahkemesinde temerrüt nedeniyle tahliye davası açmıştır.`;

    rows = [
      {
        label: 'İhtarda Verilen Süre', sub: 'TBK m. 315/2',
        slots: [{
          q: 'Çatılı işyerinde temerrüt ihtarı için verilen süre kanuna uygun mudur?',
          answer: 'Hayır (En az 30 gün olmalı)',
          pool: ['Evet (Süre geçerlidir)', 'Hayır (En az 30 gün olmalı)', 'Hayır (En az 60 gün olmalı)'],
          why: 'TBK m. 315/2 gereğince konut ve çatılı işyeri kiralarında kiracıya verilecek asgari ödeme süresi en az 30 gündür. 15 veya 20 günlük süre verilmesi yasal tabanın altında kaldığından ihtarı geçersiz kılar.'
        }]
      },
      {
        label: 'Tahliye Talebinin Akıbeti', sub: 'Hukuki Sonuç',
        slots: [{
          q: 'Mahkeme kiraya verenin tahliye talebini nasıl karara bağlamalıdır?',
          answer: 'Tahliye talebini reddetmelidir',
          pool: ['Tahliyeye karar vermelidir', 'Tahliye talebini reddetmelidir', 'Kiracıya ek 15 gün vermelidir'],
          why: 'Usulüne uygun en az 30 günlük kanuni önel tanınmadığı için kiracı yasal anlamda temerrüde düşürülmemiştir; fesih koşulu gerçekleşmediğinden tahliye davası reddedilir.'
        }]
      }
    ];
  } else if (kalip === 'tahliye_taahhudu') {
    senaryoBaslik = 'TAHLİYE TAAHHÜDÜ GEÇERLİLİĞİ VE HAK DÜŞÜRÜCÜ SÜRE';
    const ayniGunMu = pick(r, [true, false]);
    if (ayniGunMu) {
      senaryoMetin = `Kiracı ${esc(kiraci)}, 01.09.2024 başlangıç tarihli konut kira sözleşmesini imzalarken, aynı gün ev sahibi ${esc(evSahibi)}'nin talebiyle düzenleme tarihi 01.09.2024, tahliye tarihi ise 01.09.2025 olan yazılı bir tahliye taahhütnamesi vermiştir. Tahliye tarihi geldiğinde kiracı taşınmazı boşaltmamıştır.`;
      rows = [
        {
          label: 'Taahhüdün Geçerliliği', sub: 'TBK m. 352/1',
          slots: [{
            q: 'Kira sözleşmesiyle aynı gün (teslim anında) alınan taahhüdün hükmü nedir?',
            answer: 'Geçersizdir (Müzayaka karinesi)',
            pool: ['Geçerlidir', 'Geçersizdir (Müzayaka karinesi)', 'Askıda hükümsüzdür'],
            why: 'Yargıtay yerleşik içtihatları ve TBK m. 352/1 uyarınca tahliye taahhüdü kiralananın tesliminden sonra verilmelidir. Kira sözleşmesiyle aynı gün alınan taahhütler kiracının müzayaka (baskı) altında olduğu kabul edilerek geçersiz sayılır.'
          }]
        },
        {
          label: 'Takip / Dava İmkanı', sub: 'Yasal Sonuç',
          slots: [{
            q: 'Bu taahhüde dayanılarak icra takibi veya tahliye davası açılabilir mi?',
            answer: 'Açılamaz (Taahhüt geçersizdir)',
            pool: ['Açılabilir (1 ay içinde)', 'Açılamaz (Taahhüt geçersizdir)', 'Açılabilir (1 yıl içinde)'],
            why: 'Geçersiz bir tahliye taahhüdüne dayanılarak başlatılan icra takibi veya açılan tahliye davası kiracının itirazı üzerine iptal edilir/reddedilir.'
          }]
        }
      ];
    } else {
      senaryoMetin = `Kiracı ${esc(kiraci)}, oturmakta olduğu konut için taşınma tarihinden 4 ay sonra kendi serbest iradesiyle 01.07.2025 tahliye tarihli yazılı bir tahliye taahhüdü vermiştir. Kiraya veren ${esc(evSahibi)}, tahliye tarihinden itibaren 50 gün geçtikten sonra (20.08.2025) tahliye talepli icra takibi başlatmıştır.`;
      rows = [
        {
          label: 'Taahhüdün Geçerliliği', sub: 'TBK m. 352/1',
          slots: [{
            q: 'Teslimden sonra serbest iradeyle yazılı verilen taahhüt geçerli midir?',
            answer: 'Geçerlidir',
            pool: ['Geçerlidir', 'Geçersizdir', 'Noter onayı olmadan geçersizdir'],
            why: 'Kiralananın tesliminden sonra kiracının serbest iradesiyle verdiği ve belirli bir tahliye tarihini içeren yazılı taahhütname geçerlidir; adi yazılı şekil yeterlidir.'
          }]
        },
        {
          label: 'Yasal Başvuru Süresi', sub: 'Hak Düşürücü Süre',
          slots: [{
            q: 'Tahliye tarihinden 50 gün sonra başlatılan takibin akıbeti nedir?',
            answer: 'Süre geçmiştir (1 aylık hak düşürücü süre)',
            pool: ['Takip süresindedir (Süre 1 yıldır)', 'Süre geçmiştir (1 aylık hak düşürücü süre)', 'Takip süresindedir (Süre 3 aydır)'],
            why: 'TBK m. 352/1 gereğince kiraya veren tahliye taahhüdüne dayanarak taahhüt edilen tarihten başlayarak 1 ay içinde icraya başvurmak veya dava açmak zorundadır. Önceden ihtarname gönderilmemişse 1 aylık hak düşürücü süre geçtikten sonra tahliye hakkı düşer.'
          }]
        }
      ];
    }
  } else if (kalip === 'gereksinim_ve_yasak') {
    senaryoBaslik = 'GEREKSİNİM TAHLİYESİ VE 3 YILLIK YENİDEN KİRALAMA YASAĞI';
    const yillikKira = kiraBedeli * 12;
    senaryoMetin = `Ev sahibi ${esc(evSahibi)}, üniversiteyi kazanan oğlunun oturacağı gerekçesiyle kiracı ${esc(kiraci)} aleyhine TBK m. 350 uyarınca tahliye davası açmış ve mahkeme kararıyla kiracı tahliye edilmiştir. Kiracının ödediği son kira aylık ${kiraBedeli.toLocaleString('tr-TR')} TL (yıllık ${yillikKira.toLocaleString('tr-TR')} TL)'dir. Tahliyeden 8 ay sonra oğlu başka şehre yatay geçiş yapınca ${esc(evSahibi)}, evi eski kiracı ${esc(kiraci)}'a teklif etmeksizin üçüncü bir kişiye kiralamıştır.`;

    rows = [
      {
        label: 'Yeniden Kiralama Yasağı', sub: 'TBK m. 355/1',
        slots: [{
          q: 'Kiraya verenin taşınmazı üçüncü kişiye kiralaması yasal yasağa aykırı mıdır?',
          answer: 'Evet (3 yıl kiralama yasağı vardır)',
          pool: ['Evet (3 yıl kiralama yasağı vardır)', 'Hayır (Oğlu taşındığı için haklı sebep vardır)', 'Hayır (Yasak süresi 1 yıldır ve dolmuştur)'],
          why: 'TBK m. 355/1 uyarınca gereksinim amacıyla tahliyesi sağlanan taşınmaz, haklı sebep olmaksızın 3 yıl geçmedikçe eski kiracıdan başkasına kiralanamaz. Çocuğun okul değiştirmesi Yargıtay kararlarında kiraya veren yönünden haklı sebep sayılmaz.'
        }]
      },
      {
        label: 'Eski Kiracının Tazminat Hakkı', sub: 'TBK m. 355/3',
        slots: [{
          q: 'Eski kiracının talep edebileceği asgari kanuni tazminat tutarı nedir?',
          answer: 'En az 1 yıllık kira bedeli',
          pool: ['Tazminat talep edemez', 'En az 1 yıllık kira bedeli', 'En az 3 aylık kira bedeli', 'En az 6 aylık kira bedeli'],
          why: 'TBK m. 355/3 açık hükmüdür: Kiraya veren yeniden kiralama yasağına aykırı davrandığında, eski kiracısına son kira yılında ödenmiş olan bir yıllık kira bedelinden az olmamak üzere tazminat ödemekle yükümlüdür.'
        }]
      }
    ];
  } else if (kalip === 'depozito_siniri') {
    senaryoBaslik = 'GÜVENCE (DEPOZİTO) SINIRI VE SÖZLEŞME SERBESTİSİ';
    const talepEdilenAy = pick(r, [4, 5]);
    const talepEdilenTutar = kiraBedeli * talepEdilenAy;
    const yasalUstSinir = kiraBedeli * 3;
    senaryoMetin = `Aylık kira bedeli ${kiraBedeli.toLocaleString('tr-TR')} TL olan konut için kiraya veren ${esc(evSahibi)}, sözleşmeye: "Kiracı güvence bedeli olarak ${talepEdilenAy} aylık kira tutarı olan ${talepEdilenTutar.toLocaleString('tr-TR')} TL nakit depozitoyu sözleşme anında elden kiraya verene teslim eder" maddesi koymuştur.`;

    rows = [
      {
        label: 'Azami Güvence Miktarı', sub: 'TBK m. 342/1',
        slots: [{
          q: 'Konut kirasında kiracıdan istenebilecek azami depozito tutarı ne kadardır?',
          answer: 'En çok 3 aylık kira bedeli',
          pool: ['En çok 1 aylık kira bedeli', 'En çok 3 aylık kira bedeli', 'En çok 6 aylık kira bedeli', 'Sınır yoktur (Serbestçe kararlaştırılır)'],
          why: 'TBK m. 342/1 uyarınca konut ve çatılı işyeri kiralarında sözleşmeyle kiracıya güvence verme borcu getirilmişse, bu miktar en çok üç aylık kira bedelini aşamaz. 3 ayı aşan kısım kısmi butlanla geçersizdir.'
        }]
      },
      {
        label: 'Paranın Saklanma Şekli', sub: 'TBK m. 342/2',
        slots: [{
          q: 'Güvence parasının elden kiraya verene teslimi kanuna uygun mudur?',
          answer: 'Aykırıdır (Bankada vadeli hesaba yatırılmalıdır)',
          pool: ['Uygundur (Taraflar serbestçe belirler)', 'Aykırıdır (Bankada vadeli hesaba yatırılmalıdır)', 'Aykırıdır (Notere depo edilmelidir)'],
          why: 'TBK m. 342/2 emredicidir: Güvence para olarak kararlaştırılmışsa kiracı tarafından vadeli tasarruf hesabına yatırılır. Kiraya verenin parayı kendi şahsi hesabına alması veya elden tahsil etmesi kanuna aykırıdır.'
        }]
      }
    ];
  } else {
    senaryoBaslik = '10 YILLIK UZAMA SÜRESİ VE SEBEPSİZ FESİH';
    senaryoMetin = `1 yıl süreli konut kira sözleşmesi 01.10.2013 tarihinde kurulmuştur. Kira süresi bittikten sonra her yıl 1'er yıl uzayarak devam etmiştir. Kiraya veren ${esc(evSahibi)}, 10 yıllık uzama süresi dolduktan sonra 01.06.2025 tarihinde noterden gönderdiği fesih bildirimiyle 01.10.2025 tarihi itibarıyla hiçbir gerekçe göstermeksizin sözleşmeyi feshettiğini bildirmiştir.`;

    rows = [
      {
        label: 'Kiraya Verenin Fesih Hakkı', sub: 'TBK m. 347/1',
        slots: [{
          q: 'Kiraya veren 10 yıllık uzama süresi sonunda sebep göstermeden feshedebilir mi?',
          answer: 'Evet (Sebepsiz fesih hakkı doğar)',
          pool: ['Evet (Sebepsiz fesih hakkı doğar)', 'Hayır (Haklı tahliye sebebi şarttır)', 'Hayır (Sadece kiracı feshedebilir)'],
          why: 'TBK m. 347/1 uyarınca 10 yıllık uzama süresi sonunda kiraya veren, herhangi bir sebep (ihtiyaç, yeniden inşa vb.) göstermek zorunda kalmaksızın sözleşmeyi feshetme hakkına kavuşur.'
        }]
      },
      {
        label: 'Fesih Bildirim Süresi', sub: 'En Az 3 Ay Önce',
        slots: [{
          q: '01.06.2025 tarihinde yapılan bildirim 01.10.2025 için süresinde midir?',
          answer: 'Evet (En az 3 ay önce yapılmıştır)',
          pool: ['Evet (En az 3 ay önce yapılmıştır)', 'Hayır (En az 6 ay önce yapılmalıdır)', 'Hayır (En az 1 yıl önce yapılmalıdır)'],
          why: 'TBK m. 347/1 gereğince kiraya veren uzama yılının bitiminden en az 3 ay önce bildirimde bulunmalıdır. 1 Ekim bitimi için 1 Haziran bildirimi 4 ay önce yapılmış olup kanuni asgari 3 aylık öneli karşılar.'
        }]
      }
    ];
  }

  // Assertion: her slotun cevabı pool içinde olmalı
  rows.forEach(r => {
    (r.slots || []).forEach(s => {
      if (!s.pool.includes(s.answer)) {
        console.error('[gen/kira] answer pool içinde yok:', s.answer, s.pool);
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
    baslik: 'Kira Hukuku & Tahliye Simülatörü',
    title: 'Kira Hukuku & Tahliye Simülatörü',
    basis: 'TBK m. 315 · 342 · 347 · 350-355',
    panels: [{ kind: 'html', html }],
    fill: {
      title: 'Hukuki Karar & Süre Değerlendirmesi',
      headers: ['Hukuki Unsur / Kurum', 'Yasal Karar & Sonuç'],
      rows
    }
  };
}
