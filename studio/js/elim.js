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
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, rich } from './ui.js';

const ROMAN_LINE = /^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X)\.\s*(.*)$/;
/* Çıplak rakam satırı ("I." tek başına) ve gerçek madde satırı ("I. metin"). */
const ROMAN_ONLY = /^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X)\.$/;
const IS_ITEM = /^(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X)\.\s+/;

/** Öncül bloğunu satır satır ayırır; Roma rakamıyla başlayanlar tıklanabilir olur.
 * @param {string} premise
 * @param {Set|Array} [struckNumerals] Önceden elenmiş öncüller kümesi (ör. Set {'I', 'III'})
 */
export function premiseHTML(premise, struckNumerals) {
  if (!premise) return '';
  const struckSet = struckNumerals instanceof Set ? struckNumerals : new Set(struckNumerals || []);
  const raw = String(premise).split('\n').map(l => l.trim()).filter(Boolean);

  /* GÜVENLİK AĞI (öncül eleme kırılmasın diye): rakam kendi satırında kalmış
     ("I." + altındaki satır metin) ise burada birleştirilir. Normalde ui.js
     splitStem bunu zaten yapar; burası bölme mantığı bir gün değişse veya yeni
     bir kaynak aynı biçimde gelse bile öncülün TIKLANABİLİR kalmasını garanti
     eder (kullanıcı "öncülü silemiyorum" durumuna bir daha düşmez). */
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    if (ROMAN_ONLY.test(raw[i]) && i + 1 < raw.length && !IS_ITEM.test(raw[i + 1])) {
      lines.push(raw[i] + ' ' + raw[i + 1]);
      i++;
      continue;
    }
    lines.push(raw[i]);
  }

  const items = lines.map(line => {
    const m = line.match(ROMAN_LINE);
    if (m) {
      const isStruck = struckSet.has(m[1]);
      return `<div class="premise-item${isStruck ? ' struck' : ''}" data-act="eliminate-premise" data-numeral="${esc(m[1])}"
        title="Bu öncülü yanlış say (onu içeren şıklar otomatik elenir)">
        <span class="premise-num">${esc(m[1])}.</span><span class="premise-txt">${rich(m[2])}</span>
      </div>`;
    }
    return `<div class="premise-lead">${rich(line)}</div>`;
  });
  return `<div class="q-premise">${items.join('')}</div>`;
}

/** Bir öncül metnindeki tüm Roma rakamlarını dizi olarak çıkarır. */
export function extractNumerals(premise) {
  if (!premise) return [];
  const raw = String(premise).split('\n').map(l => l.trim()).filter(Boolean);
  const numerals = [];
  for (const line of raw) {
    const m = line.match(ROMAN_LINE);
    if (m) numerals.push(m[1]);
  }
  return numerals;
}

/** Verilen şık metninin, elenmiş öncüllerden birini içerip içermediğini kontrol eder. */
export function isAutoStruck(optionText, struckNumerals, allNumerals = []) {
  if (!struckNumerals || !struckNumerals.size) return false;
  for (const n of struckNumerals) {
    if (mentionsNumeral(optionText, n, allNumerals)) return true;
  }
  return false;
}

/** ✕ eleme düğmesi + asıl şık düğmesini tek satırda üretir. */
export function optionRowHTML(o, { pickAct, extraClass = '', isStruckManual = false, isStruckAuto = false } = {}) {
  const struckClass = isStruckManual ? ' struck-manual' : (isStruckAuto ? ' struck-auto' : '');
  const xClass = (isStruckManual || isStruckAuto) ? ' on' : '';
  return `<div class="opt-row">
    <button class="opt ${extraClass}${struckClass}" data-act="${pickAct}" data-key="${esc(o.key)}">
      <span class="opt-k">${esc(o.key)}</span>
      <span class="opt-txt">${rich(o.text)}</span>
    </button>
    <span type="button" class="opt-x${xClass}" data-act="eliminate" data-key="${esc(o.key)}"
      role="button" tabindex="0" title="Bu şıkkı ele" aria-label="${esc(o.key)} şıkkını ele">✕</span>
  </div>`;
}

/** ✕'ye tıkla → yalnızca o şık manuel çizilir/geri alınır. */
export function toggleOption(viewSel, key) {
  const root = document.querySelector(viewSel);
  if (!root) return false;
  const btn = root.querySelector(`.opt[data-key="${key}"]`);
  const x = root.querySelector(`.opt-x[data-key="${key}"]`);
  if (!btn) return false;
  const on = btn.classList.toggle('struck-manual');
  x?.classList.toggle('on', on);
  return on;
}

/** Öncüle tıkla → öncül çizilir, onu içeren şıklar yeniden hesaplanıp çizilir/açılır. */
export function togglePremise(viewSel, numeral) {
  const root = document.querySelector(viewSel);
  if (!root) return false;
  const item = root.querySelector(`.premise-item[data-numeral="${numeral}"]`);
  if (!item) return false;
  const on = item.classList.toggle('struck');

  const struck = [...root.querySelectorAll('.premise-item.struck')].map(el => el.dataset.numeral);
  const all = [...root.querySelectorAll('.premise-item')].map(el => el.dataset.numeral);

  root.querySelectorAll('.opt').forEach(btn => {
    const text = btn.querySelector('.opt-txt')?.textContent || '';
    const hit = struck.some(n => mentionsNumeral(text, n, all));
    btn.classList.toggle('struck-auto', hit);
    const key = btn.dataset.key;
    const x = root.querySelector(`.opt-x[data-key="${key}"]`);
    if (x && !btn.classList.contains('struck-manual')) {
      x.classList.toggle('on', hit);
    }
  });
  return on;
}

/** Bir şık metni belirli bir öncülü (Roma rakamını) doğru sayıyor mu? */
export function mentionsNumeral(text, numeral, allNumerals = []) {
  if (new RegExp(`\\b${numeral}\\b`).test(text)) return true;
  if (allNumerals && allNumerals.length && /\bhepsi\b/i.test(text)) return true; // "Hepsi" tüm öncülleri kapsar
  return false;
}

