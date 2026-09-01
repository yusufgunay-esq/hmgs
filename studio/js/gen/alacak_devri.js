/* ==========================================================================
   gen/alacak_devri.js — ALACAĞIN DEVRİ VE DEF'İLER SİMÜLATÖRÜ
   ========================================================================== */

import { rng } from './miras.js';

export const id = 'alacak_devri';
export const subjectId = 'borclar_hukuku';
export const title = 'Alacağın Devri & Def\'i Simülatörü';
export const desc = 'Yazılı şekil (TBK m.184), borçlunun savunmaları (m.188) ve devir vaadi (m.184/2).';
export const basis = 'TBK m. 183-193';

const EH = ['Evet', 'Hayır'];
const SEKIL = ['Yazılı Şekil', 'Sözlü Geçerli', 'Resmi Şekil', 'Kesin Butlan'];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x7e21);
  const kalip = zorla || pick(r, ['yazili_gecerli', 'sozlu_gecersiz', 'devir_vaadi', 'borclunun_defisi']);
  
  const alacakli = pick(r, ['Ahmet', 'Zeynep', 'Kaya A.Ş.']);
  const devralan = pick(r, ['Mehmet', 'Elif', 'Finans Ltd.']);
  const borclu = pick(r, ['Can', 'Mustafa', 'Ayşe']);
  const tutar = int(r, 20, 100) * 1000;

  let sekilDurumu = '';
  let gecerliMi = true;
  let vaadMi = false;
  let borcluDefi = false;
  let aciklama = '';

  if (kalip === 'yazili_gecerli') {
      sekilDurumu = 'Devreden Alacaklı yazılı bir devir sözleşmesi imzalayarak alacağı devretmiştir.';
      gecerliMi = true;
      aciklama = 'TBK m. 184 uyarınca alacağın devrinin geçerliliği yazılı şekilde yapılmış olmasına bağlıdır.';
  } else if (kalip === 'sozlu_gecersiz') {
      sekilDurumu = 'Alacaklı, borçlunun önünde sözlü olarak alacağı devrettiğini beyan etmiş, yazılı belge yapılmamıştır.';
      gecerliMi = false;
      aciklama = 'TBK m. 184 emredici şekil şartıdır. Sözlü yapılan alacağın devri kesin hükümsüzdür (geçersizdir).';
  } else if (kalip === 'devir_vaadi') {
      sekilDurumu = 'Alacaklı ileride alacağını devredeceğine dair devir vaadinde bulunmuştur.';
      vaadMi = true;
      gecerliMi = true;
      aciklama = 'TBK m. 184/2 uyarınca alacağın devri vaadı (ön sözleşme) da yazılı şekle tabidir (resmi şekil aranmaz).';
  } else {
      sekilDurumu = 'Yazılı devir yapılmıştır. Ancak borçlunun devredene karşı daha önceden doğmuş bir takas hakkı ve def\'isi bulunmaktadır.';
      borcluDefi = true;
      gecerliMi = true;
      aciklama = 'TBK m. 188 uyarınca borçlu, devri öğrendiği anda devredene karşı sahip olduğu tüm def\'ileri yeni alacaklıya karşı da ileri sürebilir.';
  }

  const v = { kalip, alacakli, devralan, borclu, tutar, sekilDurumu, gecerliMi, vaadMi, borcluDefi };

  const html = `
  <div style="background:var(--bg-2); border:1px solid var(--border); border-radius:12px; padding:1.25rem; margin-bottom:1.25rem;">
      <div style="font-size:0.85rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">ALACAĞIN DEVRİ HUKUKİ İLİŞKİSİ</div>
      <div style="margin:0.5rem 0; font-size:1rem;">
          <b>Alacaklı (Devreden):</b> ${esc(alacakli)} &nbsp; | &nbsp; 
          <b>Borçlu:</b> ${esc(borclu)} &nbsp; | &nbsp; 
          <b>Devralan:</b> ${esc(devralan)} (${tutar} TL)
      </div>
      <div style="font-size:0.95rem; line-height:1.5; background:var(--bg); padding:0.75rem; border-radius:8px; border:1px solid var(--border); margin-top:0.5rem;">
          ${esc(sekilDurumu)}
      </div>
  </div>`;

  const rows = [
    {
      label: 'Geçerlilik Şekli', sub: 'TBK m. 184',
      slots: [{
        q: 'Alacağın devri sözleşmesinin geçerliliği <b>hangi şekle</b> tabidir?',
        answer: 'Yazılı Şekil',
        pool: SEKIL,
        why: 'TBK m. 184/1 uyarınca alacağın devrinin geçerliliği <b>yazılı şekilde</b> yapılmasına bağlıdır.'
      }]
    },
    {
      label: 'İşlemin Akıbeti', sub: 'Geçerlilik Denetimi',
      slots: [{
        q: 'Somut olaydaki alacağın devri işlemi <b>geçerli midir</b>?',
        answer: gecerliMi ? 'Evet' : 'Hayır',
        pool: EH,
        why: aciklama
      }]
    },
    {
      label: 'Borçlunun Savunmaları', sub: 'TBK m. 188',
      slots: [{
        q: `Borçlu ${esc(borclu)}, eski alacaklıya karşı sahip olduğu def'ileri <b>yeni alacaklıya karşı da ileri sürebilir mi</b>?`,
        answer: 'Evet',
        pool: EH,
        why: 'TBK m. 188 uyarınca borçlu, devri öğrendiği anda devredene karşı sahip olduğu tüm def\'ileri (ör. takas, zamanaşımı, ödeme) devralana karşı da ileri sürebilir.'
      }]
    }
  ];

  return {
    vaka: v, hesap: { gecerliMi }, baslik: 'Alacağın Devri Simülatörü',
    panels: [{ kind: 'html', html }],
    fill: {
      title: `Vaka #${seed} — Alacağın Devri & TBK m.183`,
      hint: 'Alacağın devri olayını incele ve şekil şartları ile def\'ileri hesapla.',
      headers: ['Aşama', 'Karar'],
      pool: [...SEKIL, ...EH],
      rows
    }
  };
}
