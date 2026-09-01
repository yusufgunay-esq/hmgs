/* ==========================================================================
   gen/icra.js — İLAMSIZ İCRA & İTİRAZ SİMÜLATÖRÜ
   ========================================================================== */

import { rng } from './miras.js';

export const id = 'icra';
export const subjectId = 'icra_iflas';   // data.js'teki ders id'si (12 Ağu 2026 düzeltmesi)
export const title = 'İlamsız İcra & İtiraz Simülatörü';
export const desc = 'Takip talebinden itirazın kaldırılmasına görsel karar motoru.';
export const basis = 'İİK m. 58-72';

const AD_ALACAKLI = ['Kredi A.Ş.', 'Ahmet Yılmaz', 'Mehmet Ticaret', 'Zeynep Ak'];
const AD_BORCLU = ['Cemil Vardar', 'Ayşe Demir', 'Murat Kaya', 'Serkan Doğan'];
const EH = ['Evet', 'Hayır'];
const YOL = [
  'İcra mahkemesi — itirazın kaldırılması',
  'Genel mahkeme — itirazın iptali',
  'Doğrudan haciz'
];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x1c4a);
  const kalip = zorla || pick(r, ['imza_itiraz', 'borca_itiraz', 'gecikmis_itiraz', 'itiraz_yok']);
  
  const alacakli = pick(r, AD_ALACAKLI);
  const borclu = pick(r, AD_BORCLU);
  const tutar = int(r, 10, 100) * 1000;
  
  // 12 Ağu 2026 düzeltmesi: belge türü kalıptan BAĞIMSIZ seçiliyordu ve
  // "imzaya itiraz + ortada belge yok" gibi hukuken anlamsız vakalar çıkıyordu.
  // İmza itirazı ancak borçlunun imzasını taşıyan bir senet varsa kurulabilir.
  const belgeHavuz = (kalip === 'imza_itiraz')
    ? ['adi_senet', 'imzasi_noter_onayli']
    : ['adi_senet', 'imzasi_noter_onayli', 'belge_yok', 'resmi_daire_makbuzu'];
  const belgeTur = pick(r, belgeHavuz);
  const itirazGunu = (kalip === 'gecikmis_itiraz') ? int(r, 8, 15) : int(r, 1, 7);
  // Süresinden sonra itiraz ≠ İİK m. 65 "gecikmiş itiraz": ikincisi ancak
  // kusursuz bir engel (mazeret) varsa, engelin kalkmasından itibaren 3 gün
  // içinde icra mahkemesine yapılır.
  const mazeretVar = (kalip === 'gecikmis_itiraz') ? (r() < 0.5) : false;

  const v = { kalip, alacakli, borclu, tutar, belgeTur, itirazGunu, mazeretVar };

  let baslik = '';
  if (kalip === 'imza_itiraz') baslik = 'İmzaya İtiraz — geçici mi kesin kaldırma mı? (İİK m. 68/a)';
  else if (kalip === 'borca_itiraz') baslik = 'Borca İtiraz ve Kesin Kaldırma (İİK m. 68)';
  else if (kalip === 'gecikmis_itiraz') baslik = 'Süresinden Sonra İtiraz — gecikmiş itiraz mı? (İİK m. 62, 65)';
  else if (kalip === 'itiraz_yok') baslik = 'İtirazsız Kesinleşme ve Haciz';

  const m68BelgesiMi = (belgeTur === 'imzasi_noter_onayli' || belgeTur === 'resmi_daire_makbuzu');
  const adiSenet = (belgeTur === 'adi_senet');

  const suresindeMi = (kalip !== 'itiraz_yok' && itirazGunu <= 7);
  const takipDururMu = suresindeMi;

  let kaldirmaMumkunMu = false;
  let kaldirmaTuru = '';

  if (kalip === 'imza_itiraz') {
    // Düzeltme: noter onaylı senette imza zaten m. 68 belgesidir — alacaklı
    // KESİN kaldırma ister; imza inkârı ancak sahtelik iddiasıyla ileri
    // sürülebilir. Eski kodda bu hâlde "kaldırma mümkün değil" deniyordu.
    if (belgeTur === 'imzasi_noter_onayli') { kaldirmaMumkunMu = true; kaldirmaTuru = 'kesin kaldırma'; }
    else if (adiSenet) { kaldirmaMumkunMu = true; kaldirmaTuru = 'geçici kaldırma'; }
  } else if (kalip === 'borca_itiraz') {
    // Borca itirazda imzaya ayrıca ve açıkça itiraz edilmediği için imza
    // ikrar edilmiş sayılır (İİK m. 62/V) — adi senet m. 68 belgesine döner.
    if (m68BelgesiMi || adiSenet) { kaldirmaMumkunMu = true; kaldirmaTuru = 'kesin kaldırma'; }
  }

  const h = { suresindeMi, takipDururMu, kaldirmaMumkunMu, kaldirmaTuru, m68BelgesiMi, adiSenet, mazeretVar };

  const flowHTML = `
  <div style="display:flex; flex-direction:column; gap:1.25rem; background:var(--bg-sunk); padding:1.5rem; border-radius:12px; border:1px solid var(--line);">
      <div style="display:flex; align-items:center; gap:1rem;">
          <div style="background:var(--accent); color:#fff; padding:0.5rem 1rem; border-radius:8px; font-weight:700;">1. Takip Talebi</div>
          <div style="flex:1; border-top:2px dashed var(--line);"></div>
          <div style="background:var(--bg); padding:0.5rem 1rem; border-radius:8px; font-weight:500; font-size:0.95rem; border:1px solid var(--line);">Alacaklı: <b>${esc(alacakli)}</b></div>
      </div>
      <div style="display:flex; align-items:center; gap:1rem;">
          <div style="background:var(--bg); border:1px solid var(--line); color:var(--ink); padding:0.5rem 1rem; border-radius:8px; font-weight:700;">2. Ödeme Emri</div>
          <div style="flex:1; border-top:2px dashed var(--line);"></div>
          <div style="background:var(--bg); padding:0.5rem 1rem; border-radius:8px; font-size:0.95rem; border:1px solid var(--line);">
            Dayanak: <b>${
              belgeTur === 'adi_senet' ? 'Adi Senet (Noter onaysız)' :
              belgeTur === 'imzasi_noter_onayli' ? 'İmzası noter onaylı senet' :
              belgeTur === 'resmi_daire_makbuzu' ? 'Resmi daire makbuzu' : 'Herhangi bir belge yok (sözlü)'
            }</b>
          </div>
      </div>
      <div style="display:flex; align-items:center; gap:1rem;">
          <div style="background:${suresindeMi ? 'var(--warn-soft)' : 'var(--no-soft)'}; color:${suresindeMi ? 'var(--warn)' : 'var(--no)'}; padding:0.5rem 1rem; border-radius:8px; font-weight:700;">3. Borçlunun İtirazı</div>
          <div style="flex:1; border-top:2px dashed var(--line);"></div>
          <div style="background:var(--bg); padding:0.5rem 1rem; border-radius:8px; font-size:0.95rem; border:1px solid var(--line);">
            ${kalip === 'itiraz_yok' ? 'Borçlu süresi içinde hiçbir itirazda bulunmadı.' : `Tebliğden <b>${itirazGunu} gün sonra</b> borçlu <b>${esc(borclu)}</b> ${kalip === 'imza_itiraz' ? 'imzaya itiraz' : 'borca itiraz'} etti.`}
          </div>
      </div>
  </div>`;

  const rows = [];

  rows.push({
    label: 'Takibin Durması', sub: 'İİK m. 62, 66',
    slots: [{
      q: 'Yapılan işlem takibi kendiliğinden <b>durdurur mu</b>?',
      answer: h.takipDururMu ? 'Evet' : 'Hayır',
      pool: EH,
      why: h.takipDururMu
        ? 'Evet — Ödeme emrinin tebliğinden itibaren <b>7 gün</b> içinde icra dairesine yapılan itiraz, takibi <b>kendiliğinden</b> durdurur (İİK m. 62, 66). İtiraz için ayrıca mahkeme kararı gerekmez.'
        : (kalip === 'itiraz_yok'
            ? 'Hayır — Süresinde itiraz edilmediği için ödeme emri kesinleşir; alacaklı 1 yıl içinde <b>haciz</b> isteyebilir (İİK m. 78).'
            : `Hayır — İtiraz 7 günlük süre geçtikten sonra (${itirazGunu}. gün) yapılmıştır; süresinde olmayan itiraz takibi durdurmaz.`)
    }]
  });

  // Süresinden sonra itiraz eden borçlunun tek yolu: İİK m. 65 gecikmiş itiraz.
  if (kalip === 'gecikmis_itiraz') {
    rows.push({
      label: 'Gecikmiş İtiraz', sub: 'İİK m. 65',
      slots: [{
        q: `Borçlu ${esc(borclu)} süreyi kaçırdı${h.mazeretVar ? ' ve süre içinde ağır hastalık nedeniyle yatakta olduğunu belgeliyor' : ' ve gecikme için herhangi bir mazeret gösteremiyor'}. <b>Gecikmiş itiraz</b> yoluyla takibi durdurabilir mi?`,
        answer: h.mazeretVar ? 'Evet' : 'Hayır',
        pool: EH,
        why: h.mazeretVar
          ? 'Evet — Borçlu kusuru olmaksızın bir engel yüzünden süresinde itiraz edememişse, <b>engelin kalktığı günden itibaren 3 gün</b> içinde mazeretiyle birlikte <b>icra mahkemesine</b> başvurup gecikmiş itirazda bulunabilir (İİK m. 65). Kabul edilirse takip durur. Dikkat: bu, süreyi kaçıran her borçlunun hakkı değildir.'
          : 'Hayır — İİK m. 65 <b>kusursuz bir engel (mazeret)</b> şartına bağlıdır. Mazeret yoksa süre geçmiştir; itiraz sonuç doğurmaz. "Süresinden sonra itiraz" ile kanunun <b>gecikmiş itiraz</b> kurumunu karıştırma: ikincisi mazerete ve 3 günlük süreye bağlı, icra mahkemesine yapılan ayrı bir yoldur.'
      }]
    });
  }

  if (h.takipDururMu) {
    rows.push({
      label: 'İcra Mahkemesi', sub: 'İtirazın kaldırılması',
      slots: [{
        q: `Alacaklı ${esc(alacakli)}, itirazı bertaraf etmek için doğrudan <b>icra mahkemesinden</b> itirazın kaldırılmasını isteyebilir mi?`,
        answer: h.kaldirmaMumkunMu ? 'Evet' : 'Hayır',
        pool: EH,
        why: h.kaldirmaMumkunMu
          ? (kalip === 'imza_itiraz'
              ? (belgeTur === 'imzasi_noter_onayli'
                  ? 'Evet — Senet <b>noterlikçe onaylı</b> olduğundan zaten İİK m. 68 belgesidir; alacaklı <b>kesin kaldırma</b> ister. Noter onaylı imzanın inkârı ancak sahtelik iddiasıyla ileri sürülebilir.'
                  : 'Evet — Adi senetteki imzaya itiraz hâlinde alacaklı, İİK m. 68/a uyarınca icra mahkemesinden <b>geçici kaldırma</b> ister; mahkeme imza incelemesi yapar. Geçici kaldırma kararından sonra borçlunun yolu <b>borçtan kurtulma davasıdır</b> (m. 69).')
              : (adiSenet
                  ? 'Evet — Borca itiraz edilirken imzaya <b>ayrıca ve açıkça</b> itiraz edilmediği için senetteki imza ikrar edilmiş sayılır (İİK m. 62/V); adi senet böylece m. 68 belgesine dönüşür ve <b>kesin kaldırma</b> istenebilir.'
                  : 'Evet — Takip dayanağı noter onaylı senet / resmi daire belgesi olduğundan İİK m. 68 kapsamındadır; alacaklı <b>kesin kaldırma</b> ister.'))
          : 'Hayır — Elde İİK m. 68 kapsamında bir belge yok. Alacaklının yolu <b>genel mahkemede itirazın iptali davasıdır</b> (İİK m. 67, itirazın tebliğinden itibaren <b>1 yıl</b>). Haksız itiraz sabit olursa borçlu aleyhine <b>%20\'den az olmamak üzere icra inkâr tazminatına</b> hükmedilir.'
      }]
    });

    rows.push({
      label: 'Alacaklının Yolu', sub: 'Hangi mahkeme?',
      slots: [{
        q: 'Bu vakada alacaklının izleyeceği <b>doğru yol</b> hangisidir?',
        answer: h.kaldirmaMumkunMu ? 'İcra mahkemesi — itirazın kaldırılması' : 'Genel mahkeme — itirazın iptali',
        pool: YOL,
        why: h.kaldirmaMumkunMu
          ? `İcra mahkemesi <b>belge üzerinden, basit yargılamayla</b> karar verir; burada istenecek olan <b>${h.kaldirmaTuru}</b>. Süre: itirazın tebliğinden itibaren <b>6 ay</b> (İİK m. 68).`
          : 'İtirazın iptali genel mahkemede, <b>tam yargılamayla</b> görülür ve alacağın esasını çözer; süresi <b>1 yıldır</b> (İİK m. 67). Kaldırma yolu ise yalnızca m. 68 belgesi varken açıktır.'
      }]
    });
  }

  if (kalip === 'itiraz_yok') {
    rows.push({
      label: 'Kesinleşme Sonrası', sub: 'İİK m. 78',
      slots: [{
        q: 'Ödeme emri kesinleştikten sonra alacaklı ne isteyebilir?',
        answer: 'Doğrudan haciz',
        pool: YOL,
        why: 'Süresinde itiraz edilmediği için ödeme emri kesinleşir; alacaklı ödeme emrinin tebliğinden itibaren <b>1 yıl</b> içinde haciz isteyebilir (İİK m. 78). Mahkemeye gitmesine gerek yoktur.'
      }]
    });
  }

  return {
    vaka: v, hesap: h, baslik,
    panels: [{ kind: 'html', html: flowHTML }],
    fill: {
      title: `Vaka #${seed} — ${baslik}`,
      hint: 'İlamsız icra akışını incele: itiraz süresinde mi, takip durdu mu, alacaklı hangi mahkemeye gidecek? (İİK m. 58-72)',
      headers: ['Aşama', 'Karar'],
      pool: EH,
      rows
    }
  };
}
