/* ==========================================================================
   gen/gaiplik.js — GAİPLİK ŞARTLARI VE SÜRELERİ SİMÜLATÖRÜ
   ========================================================================== */

import { rng } from './miras.js';

export const id = 'gaiplik';
export const subjectId = 'medeni_hukuk';
export const title = 'Gaiplik Karar & Süre Simülatörü';
export const desc = 'Ölüm tehlikesi (1 yıl) veya haber alamama (5 yıl) süre ve mahkeme motoru.';
export const basis = 'TMK m. 31-35';

const EH = ['Evet', 'Hayır'];
const MAHKEMELER = ['Sulh Hukuk Mahkemesi', 'Asliye Hukuk Mahkemesi', 'İcra Mahkemesi', 'Aile Mahkemesi'];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x3d1b);
  const kalip = zorla || pick(r, ['olum_tehlikesi_tam', 'olum_tehlikesi_erken', 'haber_alamama_tam', 'haber_alamama_erken', 'evlilik_fesih']);
  
  const kisi = pick(r, ['Ahmet Yılmaz', 'Mehmet Kaya', 'Zeynep Demir', 'Can Sezer']);
  
  let sebep = '';
  let gecenSure = 0;
  let beklenmesiGereken = 1;
  let davaAcilabilir = false;
  let mahkeme = 'Sulh Hukuk Mahkemesi';
  let evlilikDurumu = 'Sona ermez (Fesih davası gerekir)';
  let ilamSuresi = 'İki defa en az 6 ay ara ile ilan yapılır';

  if (kalip === 'olum_tehlikesi_tam') {
      sebep = 'Uçak kazasında kaybolmuş ve kendisinden ölüm tehlikesi içinde 1,5 yıldır haber alınamamaktadır.';
      gecenSure = 1.5;
      beklenmesiGereken = 1;
      davaAcilabilir = true;
  } else if (kalip === 'olum_tehlikesi_erken') {
      sebep = 'Denizde batan gemide kaybolmuş, üzerinden henüz 8 ay geçmiştir.';
      gecenSure = 0.6;
      beklenmesiGereken = 1;
      davaAcilabilir = false;
  } else if (kalip === 'haber_alamama_tam') {
      sebep = 'Yurt dışına gittikten sonra kendisinden 6 yıldır hiçbir haber alınamamaktadır.';
      gecenSure = 6;
      beklenmesiGereken = 5;
      davaAcilabilir = true;
  } else if (kalip === 'haber_alamama_erken') {
      sebep = 'Evinden ayrıldıktan sonra kendisinden 3 yıldır haber alınamamaktadır.';
      gecenSure = 3;
      beklenmesiGereken = 5;
      davaAcilabilir = false;
  } else {
      sebep = 'Ölüm tehlikesi içinde 2 yıldır kayıptır. Eşi evliliğin durumunu sormaktadır.';
      gecenSure = 2;
      beklenmesiGereken = 1;
      davaAcilabilir = true;
  }

  const v = { kalip, kisi, sebep, gecenSure, beklenmesiGereken, davaAcilabilir, mahkeme, evlilikDurumu };

  const html = `
  <div style="background:var(--bg-2); border:1px solid var(--border); border-radius:12px; padding:1.25rem; margin-bottom:1.25rem;">
      <div style="font-size:0.85rem; font-weight:700; color:var(--accent); text-transform:uppercase; letter-spacing:0.5px;">VAKA SENARYOSU</div>
      <div style="font-size:1.1rem; font-weight:700; margin:0.35rem 0;">${esc(kisi)}</div>
      <div style="font-size:0.95rem; line-height:1.5;">${esc(sebep)}</div>
  </div>`;

  const rows = [
    {
      label: 'Mahkeme Görevi', sub: 'TMK m. 32',
      slots: [{
        q: 'Gaiplik kararı almak için <b>hangi mahkemeye</b> başvurulmalıdır?',
        answer: 'Sulh Hukuk Mahkemesi',
        pool: MAHKEMELER,
        why: 'TMK m. 32 uyarınca gaiplik kararında görevli mahkeme <b>Sulh Hukuk Mahkemesidir</b>.'
      }]
    },
    {
      label: 'Yasal Süre Şartı', sub: 'TMK m. 33',
      slots: [{
        q: `Bu olayda gaiplik davası açabilmek için <b>gerekli yasal süre dolmuş mudur</b>?`,
        answer: davaAcilabilir ? 'Evet' : 'Hayır',
        pool: EH,
        why: davaAcilabilir
          ? `Evet — ${kalip.includes('olum') ? 'Ölüm tehlikesinde en az 1 yıl' : 'Uzun süre haber alamamada en az 5 yıl'} geçmesi gerekir. Olayda ${gecenSure} yıl geçmiştir.`
          : `Hayır — ${kalip.includes('olum') ? 'Ölüm tehlikesinde en az 1 yıl' : 'Uzun süre haber alamamada en az 5 yıl'} geçmesi şarttır. Olayda henüz ${gecenSure} yıl geçmiştir.`
      }]
    },
    {
      label: 'Evliliğe Etkisi', sub: 'TMK m. 36',
      slots: [{
        q: 'Gaiplik kararı verilmesi halinde eşin <b>evliliği kendiliğinden sona erer mi</b>?',
        answer: 'Hayır',
        pool: EH,
        why: 'Gaiplik kararı evliliği kendiliğinden sona erdirmez! Eşin ayrıca <b>Evliliğin Feshi davası</b> açması veya gaiplik davasıyla birlikte fesih istemesi gerekir (TMK m. 36).'
      }]
    }
  ];

  return {
    vaka: v, hesap: { davaAcilabilir }, baslik: 'Gaiplik Süre ve Şart Motoru',
    panels: [{ kind: 'html', html }],
    fill: {
      title: `Vaka #${seed} — Gaiplik Karar Simülatörü`,
      hint: 'Gaiplik senaryosunu incele ve TMK m.31-36 hükümlerini uygula.',
      headers: ['Aşama', 'Karar'],
      pool: [...MAHKEMELER, ...EH],
      rows
    }
  };
}
