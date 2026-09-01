/* ==========================================================================
   ui.js — RENDER YARDIMCILARI
   Inline onclick YOK. Tüm etkileşim data-act + event delegation ile.
   ========================================================================== */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** HTML enjeksiyonuna karşı kaçış — tüm veri metinleri bundan geçer. */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Kaynak metinlerdeki `backtick` ve **kalın** işaretlerini güvenle işaretlemeye çevirir. */
export function rich(s) {
  let out = esc(s);
  
  // 1. Time Limits (Süreler)
  out = out.replace(/\b(\d+)\s+(GÜN|AY|YIL|HAFTA)İ?\b/gi, '<strong class="hl-time">$1 $2</strong>');
  
  // 2. Legal References (Kanun Maddeleri)
  out = out.replace(/\b(?:İİK|TMK|HMK|TBK|TCK|CMK|İYUK|AY|KVKK)\s+m\.\s*\d+(?:\/\d+)?[a-z]?\b/g, '<span class="hl-law">$&</span>');
  
  // 3. ALL CAPS Emphasis (Büyük Harfler)
  // Split by HTML tags to avoid messing up classes we just added
  const parts = out.split(/(<[^>]+>)/);
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { // Text nodes
      parts[i] = parts[i].replace(/\b([A-ZİĞÜŞÖÇ]{5,}|[A-ZİĞÜŞÖÇ]{3,}(?:\s+[A-ZİĞÜŞÖÇ]{3,})+)\b/g, '<strong class="hl-cap">$1</strong>');
    }
  }
  out = parts.join('');

  return out
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<mark>$1</mark>');
}

/**
 * Blok seviyesi metin — konu anlatımı için.
 * Kaynak metindeki yapıyı EKRANDA da yapı olarak gösterir:
 *   satır sonu            → ayrı paragraf
 *   "- " ile başlayan satır → madde işaretli liste
 *   "1) " / "1." ile başlayan → numaralı liste
 *   "Şu → Bu" içeren satır  → karşılaştırma satırı (sol/sağ)
 *   ">" ile başlayan satır  → vurgu kutusu (altın kural)
 * Inline `kod` ve **kalın** işaretleri korunur.
 * Sebep: 30 Tem — "5 unsuru vardır: 1)...2)...3)" tek paragrafa tıkılıyordu (bkz. log/2026-07-30_60_kelime_hatasi.md).
 */
export function richBlock(s) {
  let raw = String(s ?? '').trim();
  
  // 1. Otomatik Formatlayıcı (Boğukluk Giderici)
  // İç içe geçmiş listeleri (1), (2), a), (a) bul ve Markdown bullet list'e çevir
  raw = raw.replace(/(?:,\s*|;\s*|\.\s+|\s+)(?:\(\d{1,2}\)|\d{1,2}\)|\([a-h]\)|[a-h]\))\s+(?=[A-ZİĞÜŞÖÇ0-9])/g, '\n- ');
  
  // Bullets (•, Ø, ○) metin içinde yan yana duruyorsa dikey satır sonlarına çevir
  raw = raw.replace(/(?:\s*•\s*|\s*Ø\s*|\s*○\s*)/g, '\n- ');

  // Eğer metin hala çok uzun ve hiç paragraf/satır sonu içermiyorsa, güvenli cümle sonlarından böl
  if (raw.length > 250 && !raw.includes('\n')) {
    raw = raw.replace(/(?<=[a-zğüşıöç]{3,}[.!?;])\s+(?=[A-ZİĞÜŞÖÇ])/g, '\n\n');
  }

  const lines = raw.split(/\n/).map(l => l.trim());
  const out = []; let list = null, listTag = null;
  const flush = () => { if (list) { out.push(`<${listTag} class="rb-list">${list.join('')}</${listTag}>`); list = null; listTag = null; } };

  for (const ln of lines) {
    if (!ln) { flush(); continue; }
    const mUl = ln.match(/^[-•Ø○]\s+(.*)$/);
    const mOl = ln.match(/^(\d+|[a-zıiöüçşğ])[).]\s+(.*)$/i);
    const mBox = ln.match(/^>\s*(.*)$/);
    if (mUl || mOl) {
      const tag = mUl ? 'ul' : 'ol';
      if (listTag && listTag !== tag) flush();
      listTag = tag; list = list || [];
      list.push(`<li>${rich(mUl ? mUl[1] : mOl[2])}</li>`);
      continue;
    }
    flush();
    if (mBox) { out.push(`<div class="rb-box">${rich(mBox[1])}</div>`); continue; }
    const mCmp = ln.match(/^(.{1,60}?)\s+→\s+(.*)$/);
    if (mCmp) { out.push(`<div class="rb-row"><span class="rb-k">${rich(mCmp[1])}</span><span class="rb-v">${rich(mCmp[2])}</span></div>`); continue; }
    out.push(`<p>${rich(ln)}</p>`);
  }
  flush();
  return out.join('');
}

export function fmtSec(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} sn`;
}

export function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function pct(n) { return `%${Math.round(n)}`; }

const ITEM_LINE_RE = /^(?:(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X|\d{1,2})\.|\([a-z0-9]\)|[a-z]\))\s+/i;

/**
 * Kaynak PDF/OCR aktarımında satır sonları sayfa genişliğine göre düşmüş
 * oluyor — bazen tam kelime/cümle sınırında, bazen ortasında (ör. "...C
 * lehine bir\nipotek tesis etmiştir." — "bir" ile "ipotek" aynı cümlenin
 * parçası ama kaynakta ayrı satırda). premiseHTML her satırı ayrı bir
 * paragraf olarak bastığından bu kazara bölünme ekranda öncülü ikiye
 * bölünmüş gösteriyordu.
 * Kural: önceki satır cümle/öncül sonu işareti (. ! ? : ;) ile bitmiyorsa
 * VE madde/öncül maddesi DEĞİLSE (I./II./III. veya 1./2./3. gibi maddeler
 * bilerek ayrı satırdadır, noktasız bitse bile birleştirilmez) VE
 * sıradaki satır yeni bir madde başlatmıyorsa, iki satır
 * aynı cümlenin devamı sayılıp boşlukla birleştirilir. İçerik değişmiyor,
 * yalnızca yanlış yerdeki satır sonu kaldırılıyor.
 */
function normalizeWrappedLines(raw) {
  const lines = raw.split('\n');
  const out = [];
  for (const line of lines) {
    const curTrim = line.trim();
    if (out.length && curTrim) {
      const prevTrim = out[out.length - 1].trim();
      const prevEndsTerminal = /[.!?:;]$/.test(prevTrim) || ITEM_LINE_RE.test(prevTrim) || prevTrim === '';
      const curIsItem = ITEM_LINE_RE.test(curTrim);
      if (!prevEndsTerminal && !curIsItem) {
        out[out.length - 1] = prevTrim + ' ' + curTrim;
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Soru kökünü öncül ve asıl soru olarak ikiye ayırır. */
export function splitStem(stem) {
  let raw = (stem || '').trim().replace(/\/[ \t]*\n[ \t]*/g, '/');
  raw = normalizeWrappedLines(raw);
  const lines = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);
  if (lines.length > 1) {
    return { premise: lines.slice(0, -1).join('\n'), ask: lines[lines.length - 1] };
  }
  // Tek paragraf: son soru cümlesini ayır
  const m = raw.match(/^([\s\S]*?(?:[!;:]|(?<!\d)\.(?!\d)(?!["'’”]?\s*[a-zçğıöşü])))\s*([^.!?]*(?:hangisi|hangileri|hangisidir|doğrudur|yanlıştır|söylenemez|olamaz|kaçtır|değildir)[^?]*\?)\s*$/);
  if (m && m[1].trim().length > 25 && !/\d\.$/.test(m[1].trim())) return { premise: m[1].trim(), ask: m[2].trim() };
  return { premise: '', ask: raw };
}

/* ==========================================================================
   METİN NORMALİZASYONU
   Kaynak veri makine üretimi olduğu için gürültülü: kanun adı her maddede
   tekrar ediyor, başlıklar madde referansını içeriyor, etiketler çok uzun.
   Bu yardımcılar okuma ekranını sakinleştirir. Veriye dokunmazlar.
   ========================================================================== */

/**
 * "TMK m. 8,TMK m. 9,TMK m. 13,TBK m. 49" → "TMK m. 8, 9, 13 · TBK m. 49"
 * Kanun adını bir kez yazar, maddeleri toplar, sırayı korur.
 */
export function groupLegalRefs(raw, max = 92) {
  if (!raw) return '';
  // Veri bazı konularda dizi, bazılarında virgüllü metin — ikisini de karşıla.
  const items = (Array.isArray(raw) ? raw : String(raw).split(/[,;]/))
    .flatMap(s => String(s).split(/[,;]/))
    .map(s => s.trim()).filter(Boolean);

  const order = [];
  const byLaw = new Map();
  const prose = [];   // madde künyesi olmayan açıklama kalemleri

  items.forEach(item => {
    // "TMK m. 8" · "4857 sk m. 2/4" · "1982 AY m. 13-15"
    const m = item.match(/^([^—–]{0,40}?)\s*\bm\.\s*(\d[\w\/.\-]*)$/i);
    if (m) {
      const law = m[1].trim() || '—';
      const art = m[2].trim();
      if (!byLaw.has(law)) { byLaw.set(law, []); order.push(law); }
      const list = byLaw.get(law);
      if (!list.includes(art)) list.push(art);
    } else {
      prose.push(item);
    }
  });

  const groups = order.map(law => `${law} m. ${byLaw.get(law).join(', ')}`);

  // Maddesiz ama kısa mevzuat adları künye sayılır ("7533 sayılı Kanun", "1982 AY").
  const STATUTEISH = /(sayılı|Kanun|Anayasa|\bAY\b|Sözleşme|\bsk\b|Tüzük|Yönetmelik|KHK)/i;
  const shortCites = prose.filter(p => p.length <= 45 && STATUTEISH.test(p));
  const descriptive = prose.filter(p => !shortCites.includes(p));

  const cited = [...groups, ...shortCites].join(' · ');

  // Künye varsa yalnızca künyeyi göster: uzun betimleyici kalemler (Hukuk Tarihi,
  // Genel Kamu gibi derslerde 600 karaktere varıyor) şerit değil, içerik malzemesidir.
  if (cited) return ellipsis(cited, max);
  return ellipsis(descriptive.join(' · '), max);
}

/** Başlıktan baştaki sıra numarasını ve sondaki madde parantezini atar. */
export function topicHeading(title) {
  return String(title || '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s*\([^()]*(?:m\.|sk|sayılı|md\.)[^()]*\)\s*$/i, '')
    .trim();
}

function tidy(s) {
  return s.replace(/\s{2,}/g, ' ').replace(/\s*[,;:&]\s*$/, '').trim();
}

function ellipsis(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return tidy(sp > max * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

/**
 * Kenar menü için kısa ad. Sırayla dener:
 *   1. iki nokta öncesi ("Temel Kavramlar: İşçi..." → "Temel Kavramlar")
 *   2. satır içi madde parantezlerini ve backtick'leri at
 *   3. kırp
 */
export function topicShort(title, max = 46) {
  let h = topicHeading(title);

  const colon = h.indexOf(':');
  if (colon > 8 && colon <= max) return tidy(h.slice(0, colon));

  // Satır içi madde/mevzuat parantezleri menüde bilgi taşımıyor — at
  h = tidy(h
    .replace(/`[^`]*`/g, '')
    .replace(/\([^()]*(?:m\.\s*\d|sk\b|sayılı|md\.)[^()]*\)/gi, ''));

  return ellipsis(h, max);
}

/**
 * Bölüm etiketi: yalnızca mevzuat künyesi kalsın.
 *   "TMK m. 8 & m. 28 — Hak Ehliyeti ve Cenin"  → "TMK m. 8 & m. 28"
 *   "AİHS ve AİHM Rejimi (`m. 34/35 ...`)"      → "m. 34/35"
 *   künye yoksa kırpılır.
 */
export function shortRef(legalRef, max = 40) {
  if (!legalRef) return '';
  // Uzun tire ile ayrılmış açıklama kuyruğunu at (tek tire madde aralığını bozmasın)
  let s = tidy(String(legalRef).split(/\s+[—–]\s+/)[0]);
  if (s.length <= max) return s.replace(/`/g, '');

  // Künyeyi ayıkla: "TMK m. 8 & m. 28", "1982 AY m. 87", "m. 14/3"
  const cite = s.match(/((?:[A-ZÇĞİÖŞÜ][^\s(`]*\s+)?(?:sk\s+|sayılı\s+Kanun\s+|AY\s+)?m\.\s*\d[\d\/.,\s&]*(?:m\.\s*\d[\d\/.,\s&]*)*)/);
  if (cite) {
    const c = tidy(cite[1].replace(/`/g, ''));
    if (c.length <= max) return c;
  }
  return ellipsis(s.replace(/`/g, ''), max);
}

const COURTS = /^(Yargıtay|Danıştay|Anayasa Mahkemesi|AYM|YHGK|YCGK|İBK|Uyuşmazlık Mahkemesi|AİHM)\b/;

/** Bir metin yargı kararı alıntısı mı? */
export function isCitation(text) {
  return COURTS.test(String(text || '').trim());
}

/** Alıntıyı etiket ve gövde olarak ayırır: "Yargıtay Emsali: ..." → {label, body} */
export function citationParts(text) {
  const t = String(text || '').trim();
  const i = t.indexOf(':');
  if (i > 0 && i < 60) return { label: t.slice(0, i).trim(), body: t.slice(i + 1).trim() };
  return { label: 'Yargı kararı', body: t };
}

export function emptyState({ icon = '·', title, body, cta }) {
  return `<div class="empty">
    <div class="big">${esc(icon)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
    ${cta ? `<button class="btn" data-act="${esc(cta.act)}">${esc(cta.label)}</button>` : ''}
  </div>`;
}

/** Kısa süreli bildirim. */
let toastTimer = null;
export function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);' +
      'background:var(--ink);color:#fff;padding:0.65rem 1.15rem;border-radius:10px;' +
      'font-size:0.87rem;font-weight:500;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.18);' +
      'opacity:0;transition:opacity .2s ease;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}
