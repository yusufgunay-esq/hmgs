/* ==========================================================================
   gen/ceza_suc.js — CEZA SUÇ TİPLERİ & İŞTİRAK SİMÜLATÖRÜ
   TCK m. 37, 39, 40/2, 106, 107, 142, 148
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { rng } from './miras.js';

export const id = 'ceza_suc';
export const subjectId = 'ceza_hukuku';
export const category = 'ceza_cmk';
export const title = 'Ceza Suç Tipleri & İştirak Simülatörü';
export const desc = 'Şantaj vs. Tehdit vs. Yağma ayrımı, müşterek faillik, yardım etme ve özgü suçlarda bağlılık kuralı.';
export const basis = 'TCK m. 37 · 39 · 40/2 · 106 · 107 · 142 · 148';

export const kaliplar = [
  { id: '', label: 'Karışık' },
  { id: 'santaj_vs_tehdit', label: 'Şantaj vs. Tehdit Ayrımı' },
  { id: 'hirsizlik_vs_yagma', label: 'Hırsızlık vs. Yağma Ayrımı' },
  { id: 'baygin_magdur_nitelikli', label: 'Baygın Mağdur & Suç Tipi' },
  { id: 'musterek_fail_vs_yardim', label: 'Müşterek Fail vs. Yardım Eden' },
  { id: 'baglilik_kurali_ozgu', label: 'Özgü Suçta Bağlılık Kuralı' }
];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x5a31);
  const kalip = zorla || pick(r, ['santaj_vs_tehdit', 'hirsizlik_vs_yagma', 'baygin_magdur_nitelikli', 'musterek_fail_vs_yardim', 'baglilik_kurali_ozgu']);

  const fail1 = pick(r, ['Kemal', 'Serdar', 'Cemil', 'Barış']);
  const fail2 = pick(r, ['Volkan', 'Levent', 'Okan', 'Murat']);
  const magdur = pick(r, ['Sinan Bey', 'Fatih Bey', 'Deniz Hanım', 'Banu Hanım']);

  let senaryoBaslik = '';
  let senaryoMetin = '';
  let rows = [];

  if (kalip === 'santaj_vs_tehdit') {
    senaryoBaslik = 'ŞEREF VE SAYGINLIĞA ZARAR VERME TEHDİDİYLE MENFAAT TEMİNİ';
    senaryoMetin = `${esc(fail1)}, mağdur ${esc(magdur)}'a ait gizli kamera görüntülerini ve aile mahremiyetine ilişkin özel yazışmaları ele geçirmiştir. ${esc(fail1)}, mağdurun yanına giderek: "Bana yarın akşama kadar 300.000 TL vermezsen, bu görüntüleri iş yerine, ailene ve tüm sosyal medyaya yayarak seni rezil ederim" demiştir. Korkuya kapılan ${esc(magdur)}, parayı hazırlamak zorunda kalmıştır.`;

    rows = [
      {
        label: 'Oluşan Asıl Suç Tipi', sub: 'TCK m. 107/2',
        slots: [{
          q: 'Şeref veya saygınlığa zarar verme tehdidiyle menfaat talebi hangi suçu oluşturur?',
          answer: 'Şantaj Suçu (TCK m. 107/2)',
          pool: ['Şantaj Suçu (TCK m. 107/2)', 'Tehdit Suçu (TCK m. 106/1)', 'Yağma Suçu (TCK m. 148)', 'Dolandırıcılık Suçu (TCK m. 157)'],
          why: 'TCK m. 107/2 açık hükmüdür: Kendisine veya başkasına yarar sağlamak maksadıyla bir kişinin şeref veya saygınlığına zarar verecek nitelikteki hususların açıklanacağı tehdidinde bulunulması halinde Şantaj suçu oluşur (HMGS 2026 sorusu: hmgs_2026_04_082).'
        }]
      },
      {
        label: 'Yağma Neden Oluşmaz', sub: 'Suç Tipleri Ayrımı',
        slots: [{
          q: 'Bu eylem neden yağma (gasp) suçunu oluşturmaz?',
          answer: 'Cebir veya hayata/vücut dokunulmazlığına yönelik tehdit yoktur',
          pool: ['Para henüz teslim alınmadığı için', 'Cebir veya hayata/vücut dokunulmazlığına yönelik tehdit yoktur', 'Şikayete tabi olduğu için'],
          why: 'Yağma (TCK m. 148) suçunun oluşabilmesi için tehdidin mağdurun kendisinin veya yakınının hayatına, vücut veya cinsel dokunulmazlığına yönelik olması gerekir. Şeref ve saygınlığa yönelik tehdit ile menfaat sağlanması özel norm olan Şantaj suçunu oluşturur.'
        }]
      }
    ];
  } else if (kalip === 'hirsizlik_vs_yagma') {
    senaryoBaslik = 'HIRSIZLIK VE CEBİR KULLANIMIYLA YAĞMAYA DÖNÜŞÜM';
    senaryoMetin = `${esc(fail1)}, sokakta yürüyen ${esc(magdur)}'ın elindeki çantayı aniden çekip kaçmak istemiştir. Mağdur çantayı bırakmayıp direnince ${esc(fail1)}, cebinden çıkardığı bıçağı gösterip "Bırakmazsan seni öldürürüm!" diye bağırmış, mağduru yere iterek yaralamış ve çantayı zorla alıp kaçmıştır.`;

    rows = [
      {
        label: 'Nihai Eylemin Niteliği', sub: 'TCK m. 148 & 149',
        slots: [{
          q: 'Başta hırsızlık olarak başlayan eylem hangi suça dönüşmüştür?',
          answer: 'Nitelikli Yağma Suçu (Silahla cebir/tehdit)',
          pool: ['Nitelikli Hırsızlık ve Kasten Yaralama (Ayrı ayrı)', 'Nitelikli Yağma Suçu (Silahla cebir/tehdit)', 'Yalnızca Tehdit ve Hırsızlığa Teşebbüs'],
          why: 'Hırsızlık eylemi sırasında malı almak veya zilyetliği korumak için mağdura karşı cebir veya tehdit kullanıldığı anda fiil birleşerek TCK m. 148/149 uyarınca Yağma (gasp) suçunu oluşturur (bileşik suç).'
        }]
      },
      {
        label: 'İçtima Kuralı', sub: 'Bileşik Suç Rejimi',
        slots: [{
          q: 'Fail ayrıca kasten yaralama ve tehdit suçlarından cezalandırılır mı?',
          answer: 'Hayır (Cebir ve tehdit yağmanın kurucu unsurudur)',
          pool: ['Evet (Tüm suçlardan ayrı ayrı cezalandırılır)', 'Hayır (Cebir ve tehdit yağmanın kurucu unsurudur)', 'Yalnızca fikri içtima hükümleri uygulanır'],
          why: 'TCK m. 42 uyarınca biri diğerinin unsurunu veya ağırlaştırıcı nedenini oluşturan fiillerde bileşik suç kuralları geçerlidir. Yağmanın kurucu unsuru olan cebir ve tehdit için ayrıca ceza verilmez (neticesi sebebiyle ağırlaşmış yaralama hariç).'
        }]
      }
    ];
  } else if (kalip === 'baygin_magdur_nitelikli') {
    senaryoBaslik = 'BAŞKASINCA BAYILTILMIŞ KİŞİNİN EŞYASINI ALMA';
    senaryoMetin = `${esc(magdur)}, kimliği belirsiz kişilerce darp edilerek bayıltılmış ve yol kenarında hareketsiz yatmaktadır. Olay yerinden geçen ${esc(fail1)}, mağdurun baygın halinden ve kendisini koruyamayacak durumda olmasından yararlanarak mağdurun cebindeki pahalı telefonu ve cüzdanını alarak uzaklaşmıştır. ${esc(fail1)} mağdura hiçbir fiziksel temas veya cebir/tehdit uygulamamıştır.`;

    rows = [
      {
        label: 'İşlenen Suçun Türü', sub: 'TCK m. 142/2-a',
        slots: [{
          q: 'Kendisi cebir uygulamayıp baygın mağdurun eşyasını alan failin suçu nedir?',
          answer: 'Beden veya ruh bakımından kendini savunamayacak kişiye karşı nitelikli hırsızlık',
          pool: ['Yağma Suçu (TCK m. 148)', 'Beden veya ruh bakımından kendini savunamayacak kişiye karşı nitelikli hırsızlık', 'Basit Hırsızlık (TCK m. 141)', 'Kaybolmuş Eşya Üzerinde Tasarruf (TCK m. 160)'],
          why: 'TCK m. 142/2-a uyarınca suçun kişinin beden veya ruh bakımından kendisini savunamayacak durumda olmasından yararlanılarak işlenmesi nitelikli hırsızlıktır. Cebir veya tehdidi bizzat fail uygulamadığı için yağma suçu oluşmaz (HMGS sorusu: hmgs_2025_09_083).'
        }]
      },
      {
        label: 'Yağma Şartının Gerçekleşmeme Sebebi', sub: 'Hukuki Gerekçe',
        slots: [{
          q: 'Bu olayda yağma suçunun oluşmamasının temel hukuki nedeni nedir?',
          answer: 'Cebir ile malın alınması arasında faile ait nedensellik bağı yoktur',
          pool: ['Malın değeri az olduğu için', 'Cebir ile malın alınması arasında faile ait nedensellik bağı yoktur', 'Mağdur şikayetçi olmadığı için'],
          why: 'Yağma suçunda cebir veya tehdit bizzat fail veya iştirakçileri tarafından malı teslime zorlamak amacıyla kullanılmalıdır. Failin başlatmadığı bağımsız bir baygınlık durumundan yararlanmak hırsızlık kapsamında kalır.'
        }]
      }
    ];
  } else if (kalip === 'musterek_fail_vs_yardim') {
    senaryoBaslik = 'İŞTİRAK DERECELERİ: MÜŞTEREK FAİLLİK VE YARDIM ETME';
    senaryoMetin = `${esc(fail1)} ve ${esc(fail2)}, bir kuyumcu soygunu planlamışlardır. Soygun günü ${esc(fail1)} elinde silahla içeri girip veznedarı tehdit etmiş ve altınları çantaya doldurmuştur. ${esc(fail2)} ise kapıda elinde silahla beklemiş, çevredekilerin içeri girmesini engellemiş ve müdahaleyi önlemiştir. Üçüncü şahıs olan arkadaşları ise olay yerine hiç gelmemiş, sadece olaydan bir gün önce soygun için sahte plaka temin etmiştir.`;

    rows = [
      {
        label: 'Kapıda Nöbet Tutanın Statüsü', sub: 'TCK m. 37/1',
        slots: [{
          q: 'Soygunda kapıda nöbet tutup müdahaleyi engelleyen kişinin iştirak statüsü nedir?',
          answer: 'Müşterek Faildir (Fiil üzerinde ortak hakimiyet kurmuştur)',
          pool: ['Yardım Edendir (İkincil roldedir)', 'Müşterek Faildir (Fiil üzerinde ortak hakimiyet kurmuştur)', 'Azmettirendir', 'Dolaylı Faildir'],
          why: 'TCK m. 37/1 uyarınca suçun kanuni tanımında yer alan fiili birlikte gerçekleştiren veya suçun işlenişinde fiil üzerinde ortak hakimiyet kuran her kişi müşterek faildir. Soygunda kapıda silahla gözcülük yapmak doğrudan suçun icrasına katılım olup failliktir.'
        }]
      },
      {
        label: 'Sahte Plaka Temin Edenin Statüsü', sub: 'TCK m. 39/2-b',
        slots: [{
          q: 'Olay yerine gelmeyip önceden sahte plaka temin eden kişinin iştirak statüsü nedir?',
          answer: 'Yardım Edendir (Suçun işlenmesinde kullanılan araçları temin etmiştir)',
          pool: ['Müşterek Faildir', 'Yardım Edendir (Suçun işlenmesinde kullanılan araçları temin etmiştir)', 'Suçsuzdur'],
          why: 'TCK m. 39/2-b uyarınca suçun işlenmesinde kullanılan araçları sağlayan kişi yardım eden olarak sorumlu tutulur ve cezasından kanuni indirim yapılır.'
        }]
      }
    ];
  } else {
    senaryoBaslik = 'ÖZGÜ SUÇLARDA BAĞLILIK KURALI VE FAİLLİK';
    senaryoMetin = `Bir kamu bankasında memur olan kamu görevlisi ${esc(fail1)}, görevi gereği kendisine teslim edilmiş olan 2.000.000 TL parayı zimmetine geçirmeyi planlamıştır. Memur olmayan sivil arkadaşı ${esc(fail2)} ise banka şifre sisteminin aşılması için teknik destek sağlamış ve paranın taşınmasına yardım etmiştir.`;

    rows = [
      {
        label: 'Sivil Şahsın Faillik Durumu', sub: 'TCK m. 40/2 Bağlılık Kuralı',
        slots: [{
          q: 'Kamu görevlisi olmayan sivil arkadaş zimmet suçunun müşterek faili olabilir mi?',
          answer: 'Olamaz (Özgü suçlarda fail ancak özel faillik niteliğini taşıyan kişi olabilir)',
          pool: ['Olabilir (Fiili birlikte gerçekleştirmişlerdir)', 'Olamaz (Özgü suçlarda fail ancak özel faillik niteliğini taşıyan kişi olabilir)', 'Dolaylı fail olarak sorumlu olur'],
          why: 'TCK m. 40/2 açık hükmüdür: "Özgü suçlarda, ancak özel faillik niteliğini taşıyan kişi fail olabilir. Bu suçların işlenişine iştirak eden diğer kişiler ise azmettiren veya yardım eden olarak sorumlu tutulur." (HMGS sorusu: hmgs_2025_09_081).'
        }]
      },
      {
        label: 'Sivil Şahsın Sorumluluk Türü', sub: 'TCK m. 39 & 40/2',
        slots: [{
          q: 'Kamu görevlisi olmayan sivil şahıs hangi sıfatla cezalandırılır?',
          answer: 'Zimmet suçuna yardım eden sıfatıyla cezalandırılır',
          pool: ['Hırsızlık suçunun müşterek faili olarak', 'Zimmet suçuna yardım eden sıfatıyla cezalandırılır', 'Görevi kötüye kullanmaktan'],
          why: 'Bağlılık kuralı (TCK m. 40) gereğince özel faillik vasfı olmayan kişi özgü suça yardım eden sıfatıyla o suçtan (zimmet) sorumlu tutulur ve cezası TCK m. 39 uyarınca indirilir.'
        }]
      }
    ];
  }

  // Assertion: her slotun cevabı pool içinde olmalı
  rows.forEach(r => {
    (r.slots || []).forEach(s => {
      if (!s.pool.includes(s.answer)) {
        console.error('[gen/ceza_suc] answer pool içinde yok:', s.answer, s.pool);
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
    baslik: 'Ceza Suç Tipleri & İştirak Simülatörü',
    title: 'Ceza Suç Tipleri & İştirak Simülatörü',
    basis: 'TCK m. 37 · 39 · 40/2 · 106 · 107 · 142 · 148',
    panels: [{ kind: 'html', html }],
    fill: {
      title: 'Hukuki Suç & İştirak Değerlendirmesi',
      headers: ['Kurum / Tip / Rol', 'Yasal Karar & Sonuç'],
      rows
    }
  };
}
