/* ==========================================================================
   elim.js — ŞIK VE ÖNCÜL ELEME
   Pratik ve sınav ekranlarının ortak kullandığı, saf DOM tabanlı eleme mantığı.
   Bilinçli olarak render() TETİKLEMEZ: practice.js/exam.js'te render() süre
   sayacını sıfırlıyor (S.qStart / E.qStart) — eleme tıklaması bir cevap değil,
   ölçülen süreyi bozmamalı. Bu yüzden doğrudan DOM sınıflarını değiştirir.

   Öncül eleme mantığı: "I. ... II. ... III. ..." biçimindeki öncüllere
   tıklanınca o öncülün üstü çizilir; metninde o öncülü (ör. "I ve II",
   "Yalnız III", "Hepsi") geçen TÜM şıklar otomatik çizilir. Kullanıcı başka
   bir öncülü daha elerse veya birini geri alırsa küme yeniden hesaplanır —
   bir şık, kendisini oluşturan öncüllerden biri bile elenmiş kaldıkça çizili
   kalır (mantıksal olarak artık doğru olamaz).
   ========================================================================== */

import { esc, rich } from './ui.js';

const ROMAN_LINE = /^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X)\.\s*(.+)$/;

/** Öncül bloğunu satır satır ayırır; Roma rakamıyla başlayanlar tıklanabilir olur. */
export function premiseHTML(premise) {
  if (!premise) return '';
  const lines = String(premise).split('\n').map(l => l.trim()).filter(Boolean);
  const items = lines.map(line => {
    const m = line.match(ROMAN_LINE);
    if (m) {
      return `<div class="premise-item" data-act="eliminate-premise" data-numeral="${esc(m[1])}"
        title="Bu öncülü yanlış say — onu içeren şıklar otomatik elenir">
        <span class="premise-num">${esc(m[1])}</span><span class="premise-txt">${rich(m[2])}</span>
      </div>`;
    }
    return `<div class="premise-lead">${rich(line)}</div>`;
  });
  return `<div class="q-premise">${items.join('')}</div>`;
}

/** ✕ eleme düğmesi + asıl şık düğmesini tek satırda üretir. */
export function optionRowHTML(o, { pickAct, extraClass = '' } = {}) {
  return `<div class="opt-row">
    <button class="opt ${extraClass}" data-act="${pickAct}" data-key="${esc(o.key)}">
      <span class="opt-k">${esc(o.key)}</span>
      <span class="opt-txt">${rich(o.text)}</span>
    </button>
    <span type="button" class="opt-x" data-act="eliminate" data-key="${esc(o.key)}"
      role="button" tabindex="0" title="Bu şıkkı ele" aria-label="${esc(o.key)} şıkkını ele">✕</span>
  </div>`;
}

/** ✕'ye tıkla → yalnızca o şık manuel çizilir/geri alınır. */
export function toggleOption(viewSel, key) {
  const root = document.querySelector(viewSel);
  if (!root) return;
  const btn = root.querySelector(`.opt[data-key="${key}"]`);
  const x = root.querySelector(`.opt-x[data-key="${key}"]`);
  if (!btn) return;
  const on = btn.classList.toggle('struck-manual');
  x?.classList.toggle('on', on);
}

/** Öncüle tıkla → öncül çizilir, onu içeren şıklar yeniden hesaplanıp çizilir/açılır. */
export function togglePremise(viewSel, numeral) {
  const root = document.querySelector(viewSel);
  if (!root) return;
  const item = root.querySelector(`.premise-item[data-numeral="${numeral}"]`);
  if (!item) return;
  item.classList.toggle('struck');

  const struck = [...root.querySelectorAll('.premise-item.struck')].map(el => el.dataset.numeral);
  const all = [...root.querySelectorAll('.premise-item')].map(el => el.dataset.numeral);

  root.querySelectorAll('.opt').forEach(btn => {
    const text = btn.querySelector('.opt-txt')?.textContent || '';
    const hit = struck.some(n => mentionsNumeral(text, n, all));
    btn.classList.toggle('struck-auto', hit);
  });
}

/** Bir şık metni belirli bir öncülü (Roma rakamını) doğru sayıyor mu? */
function mentionsNumeral(text, numeral, allNumerals) {
  if (new RegExp(`\\b${numeral}\\b`).test(text)) return true;
  if (allNumerals.length && /\bhepsi\b/i.test(text)) return true; // "Hepsi" tüm öncülleri kapsar
  return false;
}
