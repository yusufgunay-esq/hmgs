/* ==========================================================================
   ui.js — RENDER YARDIMCILARI
   Inline onclick YOK. Tüm etkileşim data-act + event delegation ile.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** HTML enjeksiyonuna karşı kaçış — tüm veri metinleri bundan geçer. */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Metindeki emojileri ve gereksiz boşlukları temizler (Anti-Emoji standardı). */
export function stripEmoji(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kaynak metinlerdeki `backtick` ve **kalın** işaretlerini güvenle işaretlemeye çevirir. */
export function rich(s) {
  const out = esc(s);
  return out
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<mark>$1</mark>');
}

/**
 * Blok seviyesi metin — konu anlatımı ve soru gerekçeleri için akıllı yapılandırıcı.
 *   - Şık tahlilleri (A, B, C, D, E) → bağımsız `.rb-opt-block` blokları (harf korunur)
 *   - Roma rakamlı öncüller (I., II., III...) → `.rb-roman-block`
 *   - Madde işaretleri (- • *) → `ul.rb-list`
 *   - Numaralı adımlar (1., 2...) → `ol.rb-list`
 *   - Karşılaştırma ("Şu → Bu") → `.rb-row`
 *   - Altın kural ("> ...") → `.rb-box`
 *   - Uzun boğuk paragrafları nefes alan parçalara ayırır.
 */
export function richBlock(s) {
  let raw = String(s ?? '').trim();
  if (!raw) return '';

  // 1. Heceleme / Tire birleştirme (OCR ve satır sonu bozulmalarını düzeltir)
  raw = raw.replace(/([a-zçğıöşüA-ZÇĞİÖŞÜ]+)-\s+([a-zçğıöşüA-ZÇĞİÖŞÜ]+)/g, '$1$2');

  // 2. Satır içi veya bitişik A), B), C), D), E) şık tahlillerini bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])(?:\()?([A-Ea-e])\)\s+/g, '\n$1) ');

  // 3. 'A seçeneği:' veya 'A şıkkı:' / 'A şıkkında:' ifadelerini bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])([A-E]\s+(?:seçeneği|seçeneğinde|şıkkı|şıkkında)[:\s]?)/gi, '\n$1 ');

  // 4. Roma rakamlı öncülleri (I., II., III...) bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])((?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)\s+/g, '\n$1 ');

  // 5. Madde imlerini (•, Ø, ○, *) bağımsız satırlara dönüştür
  raw = raw.replace(/(?:\s*[•Ø○]\s*|\s+\*\s+)/g, '\n- ');

  // 6. Satır bazında inceleme ve uzun boğuk cümleleri ayırma
  const rawLines = raw.split(/\n/);
  const lines = [];
  for (let l of rawLines) {
    l = l.trim();
    if (!l) continue;
    // Eğer satır aşırı uzunsa (> 420 karakter) ve bir şık/madde başlangıcı değilse, dengeli cümle bloklarına ayır
    if (l.length > 420 && !l.match(/^(?:[A-Ea-e]\)|\d+[.)]|[-•*]|(?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)/)) {
      const sentences = l.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/);
      let cur = '';
      for (const s of sentences) {
        const pt = s.trim();
        if (!pt) continue;
        if (cur && (cur.length + pt.length > 320)) {
          lines.push(cur);
          cur = pt;
        } else {
          cur = cur ? cur + ' ' + pt : pt;
        }
      }
      if (cur) lines.push(cur);
    } else {
      lines.push(l);
    }
  }

  const out = [];
  let list = null, listTag = null;
  const flush = () => {
    if (list) {
      out.push(`<${listTag} class="rb-list">${list.join('')}</${listTag}>`);
      list = null;
      listTag = null;
    }
  };

  for (const ln of lines) {
    if (!ln) { flush(); continue; }

    // Şık Tahlili: "A) ..." veya "a) ..." (Harf asla silinmez veya sayıya dönüştürülmez!)
    const mOpt = ln.match(/^([A-Ea-e])\)\s*(.*)$/);
    if (mOpt) {
      flush();
      const letter = mOpt[1].toUpperCase();
      out.push(`<div class="rb-opt-block"><span class="rb-opt-letter">${letter}</span><div class="rb-opt-text">${rich(mOpt[2])}</div></div>`);
      continue;
    }

    // Şık Tahlili: "A seçeneği: ...", "B şıkkı ...", "C şıkkında ..."
    const mOptNamed = ln.match(/^([A-E])\s+(seçeneği|seçeneğinde|şıkkı|şıkkında)[:\s]?\s*(.*)$/i);
    if (mOptNamed) {
      flush();
      const letter = mOptNamed[1].toUpperCase();
      out.push(`<div class="rb-opt-block"><span class="rb-opt-letter">${letter}</span><div class="rb-opt-text"><strong>${letter} ${mOptNamed[2]}:</strong> ${rich(mOptNamed[3])}</div></div>`);
      continue;
    }

    // Roma Rakamlı Öncül: "I. ...", "II. ...", "III. ..."
    const mRoman = ln.match(/^((?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)\s*(.*)$/);
    if (mRoman) {
      flush();
      out.push(`<div class="rb-roman-block"><span class="rb-roman-num">${mRoman[1]}</span><div class="rb-roman-text">${rich(mRoman[2])}</div></div>`);
      continue;
    }

    // Madde İşaretli Liste: "- ...", "• ..."
    const mUl = ln.match(/^[-•Ø○*]\s+(.*)$/);
    if (mUl) {
      if (listTag && listTag !== 'ul') flush();
      listTag = 'ul';
      list = list || [];
      list.push(`<li>${rich(mUl[1])}</li>`);
      continue;
    }

    // Numaralı Liste: "1. ...", "2) ..." (Sadece saf rakamlar)
    const mOl = ln.match(/^(\d+)[.)]\s+(.*)$/);
    if (mOl) {
      if (listTag && listTag !== 'ol') flush();
      listTag = 'ol';
      list = list || [];
      list.push(`<li>${rich(mOl[2])}</li>`);
      continue;
    }

    flush();

    // Altın Kural / Vurgu Kutusu: "> ..."
    const mBox = ln.match(/^>\s*(.*)$/);
    if (mBox) {
      out.push(`<div class="rb-box">${rich(mBox[1])}</div>`);
      continue;
    }

    // Karşılaştırma Satırı: "Sol → Sağ"
    const mCmp = ln.match(/^(.{1,60}?)\s+→\s+(.*)$/);
    if (mCmp) {
      out.push(`<div class="rb-row"><span class="rb-k">${rich(mCmp[1])}</span><span class="rb-v">${rich(mCmp[2])}</span></div>`);
      continue;
    }

    // Standart Paragraf
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
