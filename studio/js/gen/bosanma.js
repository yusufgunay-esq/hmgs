/* ==========================================================================
   gen/bosanma.js — BOŞANMA SEBEPLERİ, AF & KUSUR DENGESİ SİMÜLATÖRÜ
   TMK m. 161, 162, 166, 174, 175, 178
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { rng } from './miras.js';

export const id = 'bosanma';
export const subjectId = 'medeni_hukuk';
export const category = 'medeni_aile';
export const title = 'Boşanma Sebepleri & Kusur Simülatörü';
export const desc = 'Özel/genel boşanma sebepleri, af, 6 ay/5 yıl hak düşürücü süre ve 1 yıllık zamanaşımı.';
export const basis = 'TMK m. 161 · 162 · 166 · 174 · 175 · 178';

export const kaliplar = [
  { id: '', label: 'Karışık' },
  { id: 'zina_hak_dusurucu', label: 'Zina & 6 Ay/5 Yıl Hak Düşürücü Süre' },
  { id: 'hayata_kast_ve_af', label: 'Hayata Kast & Af Kuralı' },
  { id: 'kusur_ve_tazminat', label: 'Eşit Kusur & Maddi/Manevi Tazminat' },
  { id: 'yoksulluk_nafakasi', label: 'Kusur Dengesi & Yoksulluk Nafakası' },
  { id: 'tazminat_zamarasimi', label: 'Boşanma Sonrası 1 Yıllık Zamanaşımı' }
];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x3d7a);
  const kalip = zorla || pick(r, ['zina_hak_dusurucu', 'hayata_kast_ve_af', 'kusur_ve_tazminat', 'yoksulluk_nafakasi', 'tazminat_zamarasimi']);

  const koca = pick(r, ['Burak Bey', 'Can Bey', 'Emre Bey', 'Tolga Bey']);
  const kadin = pick(r, ['Aslı Hanım', 'Damla Hanım', 'Gözde Hanım', 'Selin Hanım']);

  let senaryoBaslik = '';
  let senaryoMetin = '';
  let rows = [];

  if (kalip === 'zina_hak_dusurucu') {
    senaryoBaslik = 'ZİNA SEBEBİYLE BOŞANMA VE HAK DÜŞÜRÜCÜ SÜRELER';
    senaryoMetin = `${esc(kadin)}, eşi ${esc(koca)}'ın kendisini aldattığını (zina fiilini) somut delillerle 10.01.2025 tarihinde kesin olarak öğrenmiştir. Eşini affetmediğini belirtmesine rağmen, araya giren aile büyüklerinin etkisiyle dava açmayı ertelemiş ve öğrenme tarihinden itibaren 8 ay geçtikten sonra (10.09.2025 tarihinde) TMK m. 161 uyarınca zina özel sebebine dayalı boşanma davası açmıştır.`;

    rows = [
      {
        label: 'Zina Sebebinin Niteliği', sub: 'TMK m. 161',
        slots: [{
          q: 'Zina hukuki niteliği itibarıyla nasıl bir boşanma sebebidir?',
          answer: 'Özel ve Mutlak boşanma sebebidir',
          pool: ['Özel ve Mutlak boşanma sebebidir', 'Genel ve Nisbi boşanma sebebidir', 'Özel ve Nisbi boşanma sebebidir'],
          why: 'Zina kanunda özel olarak sayılmış mutlak bir boşanma sebebidir; zina ispatlandığında hakim evlilik birliğinin temelinden sarsılıp sarsılmadığını araştırmaksızın boşanmaya karar vermek zorundadır.'
        }]
      },
      {
        label: 'Dava Hakkı ve Süre', sub: 'TMK m. 161/2',
        slots: [{
          q: 'Öğrenmeden itibaren 8 ay geçtikten sonra açılan zina davasının akıbeti nedir?',
          answer: 'Dava hakkı düşmüştür (Öğrenmeden itibaren 6 ay geçmiştir)',
          pool: ['Dava süresindedir (Süre 1 yıldır)', 'Dava hakkı düşmüştür (Öğrenmeden itibaren 6 ay geçmiştir)', 'Dava süresindedir (Süre 5 yıldır)'],
          why: 'TMK m. 161/2 gereğince dava hakkı, boşanma sebebinin öğrenilmesinden başlayarak altı ay ve her halde zinanın üzerinden beş yıl geçmekle düşer. 6 aylık süre hak düşürücü süre olup hakimce re\'sen gözetilir.'
        }]
      }
    ];
  } else if (kalip === 'hayata_kast_ve_af') {
    senaryoBaslik = 'HAYATA KAST VE AFFIN DAVA HAKKINA ETKİSİ';
    senaryoMetin = `${esc(koca)}, çıkan tartışmada eşi ${esc(kadin)}'ın hayatına kast etmiş ve ağır şekilde yaralamıştır. Olaydan sonra pişman olduğunu söyleyen ${esc(koca)}'ı eşi ${esc(kadin)} affettiğini belirterek yazılı bir af mektubu vermiş ve birlikte tatile gitmişlerdir. Ancak 3 ay sonra aralarında yeni bir tartışma çıkınca ${esc(kadin)}, önceki hayata kast eylemine (TMK m. 162) dayanarak boşanma davası açmıştır.`;

    rows = [
      {
        label: 'Affin Hukuki Etkisi', sub: 'TMK m. 162/3',
        slots: [{
          q: 'Eşini affeden tarafın önceki hayata kast eylemine dayanarak dava açma hakkı var mıdır?',
          answer: 'Hayır (Affeden tarafın dava hakkı yoktur)',
          pool: ['Evet (Hayata kast affedilse de dava açılabilir)', 'Hayır (Affeden tarafın dava hakkı yoktur)', 'Evet (Ceza davası kesinleşince açılabilir)'],
          why: 'TMK m. 162/3 açık hükmüdür: "Affeden tarafın dava hakkı yoktur." Yazılı veya zımni af halinde önceki eyleme dayanılarak özel boşanma davası açılamaz.'
        }]
      },
      {
        label: 'Açılan Davanın Akıbeti', sub: 'Hukuki Sonuç',
        slots: [{
          q: 'Mahkeme affedilen eyleme dayalı açılan bu boşanma davasında ne karar vermelidir?',
          answer: 'Davanın reddine karar vermelidir',
          pool: ['Boşanmaya karar vermelidir', 'Davanın reddine karar vermelidir', 'Taraflara barışma süresi vermelidir'],
          why: 'Af ile birlikte dava hakkı ortadan kalktığından, affedilen önceki hayata kast vakıasına dayanılarak boşanma kararı verilemez; dava esastan reddedilir.'
        }]
      }
    ];
  } else if (kalip === 'kusur_ve_tazminat') {
    senaryoBaslik = 'EŞİT KUSUR HALİNDE BOŞANMA VE MADDİ/MANEVİ TAZMİNAT';
    senaryoMetin = `Açılan evlilik birliğinin sarsılması (TMK m. 166/1) davasında mahkemece yapılan tahkikat sonucunda; ${esc(koca)}'ın sürekli eşine hakaret ettiği, ${esc(kadin)}'ın ise eşine fiziksel şiddet uyguladığı tespit edilmiş ve her iki eşin de eşit derecede kusurlu olduğu belirlenmiştir. ${esc(kadin)}, eşinden 500.000 TL maddi ve 500.000 TL manevi tazminat talep etmiştir.`;

    rows = [
      {
        label: 'Boşanma Kararı Verilebilir mi', sub: 'TMK m. 166/1',
        slots: [{
          q: 'Her iki eşin de eşit kusurlu olduğu bu olayda boşanma kararı verilebilir mi?',
          answer: 'Evet (Evlilik birliği temelinden sarsılmıştır)',
          pool: ['Evet (Evlilik birliği temelinden sarsılmıştır)', 'Hayır (Davacının kusursuz olması şarttır)', 'Hayır (Eşit kusurda dava reddedilir)'],
          why: 'Eşlerin eşit kusurlu olması boşanmaya engel değildir; evlilik birliği temelinden sarsılmış olduğu için mahkeme boşanma kararı verir.'
        }]
      },
      {
        label: 'Maddi ve Manevi Tazminat Talebi', sub: 'TMK m. 174',
        slots: [{
          q: 'Eşit kusurlu eş lehine maddi veya manevi tazminata hükmedilebilir mi?',
          answer: 'Hayır (Tazminat ancak kusursuz veya daha az kusurlu eşe verilir)',
          pool: ['Evet (Zarar oranında tazminat verilir)', 'Hayır (Tazminat ancak kusursuz veya daha az kusurlu eşe verilir)', 'Yalnızca manevi tazminata hükmedilir'],
          why: 'TMK m. 174 uyarınca maddi ve manevi tazminat talep edebilmek için kusursuz veya diğer eşe göre daha az kusurlu olmak şarttır. Eşit kusur halinde hiçbir taraf lehine maddi veya manevi tazminata hükmedilemez.'
        }]
      }
    ];
  } else if (kalip === 'yoksulluk_nafakasi') {
    senaryoBaslik = 'KUSUR DENGESİ VE YOKSULLUK NAFAKASI';
    senaryoMetin = `Boşanma davasında mahkemece tarafların eşit derecede kusurlu oldukları tespit edilmiştir. Boşanma yüzünden yoksulluğa düşecek olan ${esc(kadin)}, çalışmakta olan ve düzenli geliri bulunan eşi ${esc(koca)}'tan aylık 10.000 TL yoksulluk nafakası talep etmiştir. Davalı koca, "Eşit kusurluyuz, bana karşı tazminat alamayacağı gibi nafaka da alamaz" savunmasında bulunmuştur.`;

    rows = [
      {
        label: 'Yoksulluk Nafakası Kusur Eşiği', sub: 'TMK m. 175',
        slots: [{
          q: 'Yoksulluk nafakası talep edebilmek için aranan kanuni kusur kıstası nedir?',
          answer: 'Kusuru daha ağır olmamak şartı aranır (Eşit kusurlu alabilir)',
          pool: ['Tamamen kusursuz olmak şarttır', 'Kusuru daha ağır olmamak şartı aranır (Eşit kusurlu alabilir)', 'Kusur durumuna hiç bakılmaz'],
          why: 'TMK m. 175 gereğince boşanma yüzünden yoksulluğa düşecek taraf, kusuru daha ağır olmamak koşuluyla geçimi için diğer taraftan nafaka isteyebilir. Eşit kusurlu olan eş daha ağır kusurlu olmadığı için nafaka talep etme hakkına sahiptir.'
        }]
      },
      {
        label: 'Nafaka Talebinin Akıbeti', sub: 'Hukuki Karar',
        slots: [{
          q: 'Mahkeme eşit kusurlu ve yoksulluğa düşecek eşin nafaka talebini kabul etmeli midir?',
          answer: 'Kabul etmelidir (Diğer tarafın mali gücü oranında)',
          pool: ['Kabul etmelidir (Diğer tarafın mali gücü oranında)', 'Reddetmelidir (Eşit kusurluya nafaka verilmez)', 'Yalnızca geçici tedbir nafakası verebilir'],
          why: 'Eşit kusurlu eş daha ağır kusurlu sayılmadığından ve boşanma yüzünden yoksulluğa düşeceğinden, diğer tarafın mali gücü oranında süresiz olarak yoksulluk nafakasına hükmedilmelidir.'
        }]
      }
    ];
  } else {
    senaryoBaslik = 'BOŞANMANIN KESİNLEŞMESİ VE 1 YILLIK ZAMANAŞIMI';
    senaryoMetin = `Taraflar arasındaki boşanma davası karara bağlanmış ve boşanma hükmü 15.02.2024 tarihinde kesinleşmiştir. Boşanma davasında tazminat talep etmemiş olan ${esc(kadin)}, boşanma hükmünün kesinleşmesinden 16 ay sonra (15.06.2025 tarihinde) ayrı bir dava açarak eski eşinden 400.000 TL maddi ve manevi tazminat talep etmiştir. Davalı eski eş süresinde zamanaşımı def'inde bulunmuştur.`;

    rows = [
      {
        label: 'Yasal Zamanaşımı Süresi', sub: 'TMK m. 178',
        slots: [{
          q: 'Evliliğin boşanma sebebiyle sona ermesinden doğan dava haklarının zamanaşımı süresi ne kadardır?',
          answer: 'Boşanma hükmünün kesinleşmesinden itibaren 1 yıl',
          pool: ['Boşanma hükmünün kesinleşmesinden itibaren 1 yıl', 'Boşanma karar tarihinden itibaren 6 ay', 'Genel zamanaşımı olan 10 yıl', 'Kesinleşmeden itibaren 5 yıl'],
          why: 'TMK m. 178 açık hükmüdür: "Evliliğin boşanma sebebiyle sona ermesinden doğan dava hakları, boşanma hükmünün kesinleşmesinin üzerinden bir yıl geçmekle zamanaşımına uğrar." (HMGS sınav sorusu: hmgs_2026_04_026).'
        }]
      },
      {
        label: 'Zamanaşımı Def\'inin Sonucu', sub: 'Hukuki Karar',
        slots: [{
          q: 'Kesinleşmeden 16 ay sonra açılan ve zamanaşımı def\'i ileri sürülen davanın akıbeti nedir?',
          answer: 'Zamanaşımı sebebiyle davanın reddine karar verilir',
          pool: ['Dava kabul edilir (Hakkın kötüye kullanılması yasağı)', 'Zamanaşımı sebebiyle davanın reddine karar verilir', 'Dosya arabulucuya gönderilir'],
          why: '1 yıllık yasal zamanaşımı süresi dolduktan sonra açılan davada davalı tarafça süresinde zamanaşımı def\'i ileri sürüldüğü takdirde, mahkemece davanın zamanaşımı nedeniyle reddine karar verilir.'
        }]
      }
    ];
  }

  // Assertion: her slotun cevabı pool içinde olmalı
  rows.forEach(r => {
    (r.slots || []).forEach(s => {
      if (!s.pool.includes(s.answer)) {
        console.error('[gen/bosanma] answer pool içinde yok:', s.answer, s.pool);
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
    baslik: 'Boşanma Sebepleri & Kusur Simülatörü',
    title: 'Boşanma Sebepleri & Kusur Simülatörü',
    basis: 'TMK m. 161 · 162 · 166 · 174 · 175 · 178',
    panels: [{ kind: 'html', html }],
    fill: {
      title: 'Hukuki Değerlendirme & Karar',
      headers: ['Hukuki Unsur / Kurum', 'Yasal Karar & Sonuç'],
      rows
    }
  };
}
