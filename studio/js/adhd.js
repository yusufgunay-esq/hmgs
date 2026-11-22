/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّحْمَٰنِ الرَّحِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   adhd.js — BİLİŞSEL ODAK VE AKIŞ DESTEK MOTORU
   --------------------------------------------------------------------------
   ADHD beyninin altı temel sürtünme noktasını çözer; hiper-odak (hyperfocus)
   anını asla bölmeden, ucuz oyunlaştırma veya modal kilitleri eklemeden
   çalışır:
     1. İlk Kıvılcım (5 soruluk düşük eşikli başlangıç rampası)
     2. Ters Kök Kalkanı + Dürtü Fısıltısı (hızlı/olumsuz kök koruması)
     3. Odak Satırı + Hukuk/Süre Çapaları (çalışma belleği desteği)
     4. Kademeli Açıklama (önce 2 satır hap sebep, D tuşuyla tüm detay)
     5. Park Et (P tuşuyla tıkayan soruyu kuyruğun arkasına itme)
     6. Kaçış Sonrası Sakin Geri Giriş + Deneme 4 Çeyrek Pusulası
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { state, save } from './store.js';
import { esc } from './ui.js';

export const ADHD_DEFAULTS = Object.freeze({
  roundSize: 5,         // Akış tur noktası (5 veya 10)
  softCheckMin: 15,     // Sessiz nefes alma önerisi (dk); ekranı kilitlemez
  softBreakMin: 3,      // Kısa nefes molası süresi (dk)
  compactFeedback: true,// Önce 2 satırlık öz, D ile tam açıklama
  focusRail: false,     // Cümle odak rayı (F tuşuyla aç/kapa)
  cleanToday: true      // Bugün ekranında sade tek-karar düzeni
});

export function adhdSettings() {
  let raw = {};
  try { raw = (state().settings || {}).adhd || {}; } catch (_) {}
  const roundSize = Number(raw.roundSize) === 10 ? 10 : 5;
  const softCheckMin = Number(raw.softCheckMin) > 0 ? Number(raw.softCheckMin) : ADHD_DEFAULTS.softCheckMin;
  const softBreakMin = Number(raw.softBreakMin) > 0 ? Number(raw.softBreakMin) : ADHD_DEFAULTS.softBreakMin;
  return {
    roundSize,
    softCheckMin,
    softBreakMin,
    compactFeedback: raw.compactFeedback !== false,
    focusRail: !!raw.focusRail,
    cleanToday: raw.cleanToday !== false
  };
}

export function updateAdhdSettings(patch = {}) {
  const st = state();
  st.settings = st.settings || {};
  st.settings.adhd = { ...adhdSettings(), ...patch };
  save();
  return adhdSettings();
}

/* ---------- 1. TERS KÖK KALKANI ---------- */

const NEG_TR = /(?:^|[^\p{L}])(değildir|yanlıştır|söylenemez|çıkarılamaz|olamaz|beklenmez|gerekmez|bulunmaz|yer\s+almaz|kapsamaz|dahil\s+değildir|sayılmaz|geçersizdir|istisna(?:sı|sıdır|larından)?|hangisi\s+hariç|hangileri\s+yanlış|doğru\s+değildir|uygun\s+değildir|mümkün\s+değildir|verilemez|yapılamaz|istenemez|açılamaz)(?=$|[^\p{L}])/iu;
const NEG_EN = /\b(NOT|EXCEPT|FALSE|LEAST|UNTRUE|INCORRECT|cannot\s+be\s+inferred|does\s+not|is\s+not\s+(?:true|mentioned|stated|supported))\b/;

/**
 * Soru kökünde olumsuz / istisna ifadesi olup olmadığını tespit eder.
 * Yalnızca asıl soru cümlesine (ask) uygulanır, böylece olay örgüsündeki
 * normal olumsuzluklar yanlış alarm üretmez.
 */
export function detectNegativeStem(askText) {
  const s = String(askText || '').trim();
  if (!s) return { isNegative: false, match: '', label: '' };
  const mTr = s.match(NEG_TR);
  if (mTr) {
    const word = mTr[1].trim();
    const isException = /istisna|hariç/i.test(word);
    return {
      isNegative: true,
      match: word,
      label: isException ? 'İstisna kökü · hariç olanı ara' : 'Ters kök · yanlışı ara'
    };
  }
  const mEn = s.match(NEG_EN);
  if (mEn) {
    return {
      isNegative: true,
      match: mEn[1].trim(),
      label: 'Ters kök · olumsuz ifadeyi ara'
    };
  }
  return { isNegative: false, match: '', label: '' };
}

export function negativeBannerHTML(askText) {
  const info = detectNegativeStem(askText);
  if (!info.isNegative) return '';
  return `<div class="adhd-neg-banner" role="note" aria-label="${esc(info.label)}">
    <span class="adhd-neg-dot" aria-hidden="true"></span>
    <span class="adhd-neg-txt">${esc(info.label)}</span>
    <span class="adhd-neg-match">${esc(info.match)}</span>
  </div>`;
}

/* ---------- 2. DÜRTÜ FISILTISI ---------- */

/**
 * Aşırı hızlı tıklamalarda (özellikle ters kökte) modal açmadan, bahis
 * şeridinin üstünde sessiz bir kontrol cümlesi önerir.
 */
export function impulseWarning(elapsedMs, askText) {
  const ms = Number(elapsedMs) || 0;
  const neg = detectNegativeStem(askText);
  if (neg.isNegative && ms > 0 && ms < 4000) {
    return 'Çok hızlı seçtin · bu soru ters kök, ifadeyi bir kez daha kontrol et.';
  }
  if (ms > 0 && ms < 2200) {
    return 'Çok hızlı seçtin · emin olmadan kilitleme.';
  }
  return '';
}

/* ---------- 3. ÇALIŞMA BELLEĞİ: CÜMLE ODAGI & HUKUK ÇAPALARI ---------- */

// Cümle sonu sanılmaması gereken hukuk ve genel kısaltmalar
const ABBR_END = /(?:^|[\s(])(m|md|mad|f|s|sh|sy|st|no|nr|vb|vs|vd|bkz|krş|örn|dr|prof|doç|av|yrd|inc|mr|mrs|ms|tck|tmk|hmk|cmk|tbk|ttk|iik|iyuk|aym|ay|k|e|c|b|a)\.$/i;

/** Düz metni güvenli biçimde cümlelere böler (HTML'e girmeden önce çağrılır). */
export function splitSentences(plainText) {
  const text = String(plainText || '').trim();
  if (!text) return [];
  const parts = [];
  let buf = '';
  const tokens = text.split(/(\s+)/);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    buf += tok;
    if (/[.!?]["”’)\]]*$/.test(tok)) {
      const nextSpace = tokens[i + 1] || '';
      const nextWord = tokens[i + 2] || '';
      const trimmed = buf.trim();
      const isAbbr = ABBR_END.test(trimmed);
      const startsNew = /^[A-ZÇĞİÖŞÜ0-9"“‘(\[]/.test(nextWord);
      if (!isAbbr && nextSpace && startsNew && trimmed.length >= 18) {
        parts.push(trimmed);
        buf = '';
        i++; // aradaki boşluğu yut
      }
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

// HTML etiketlerinin içindeki metin düğümlerine dokunmadan hukuk/süre çapalarını vurgular.
const ANCHOR_RE = /(\b\d+(?:[.,]\d+)?\s*(?:gün(?:lük)?|hafta(?:lık)?|ay(?:lık)?|yıl(?:lık)?|saat(?:lik)?|TL|lira|bin|milyon|kat(?:ı)?)\b|\b\d+\/\d+\b|%\s*\d+(?:[.,]\d+)?|\b(?:kesin\s+süre|hak\s+düşürücü(?:\s+süre)?|zamanaşımı|salt\s+çoğunluk|nitelikli\s+çoğunluk|oybirliği|en\s+az|en\s+çok|en\s+geç|en\s+erken)\b)/giu;

export function highlightAnchorsHTML(html) {
  const s = String(html || '');
  if (!s) return '';
  // Etiketleri koru, yalnızca metin parçalarına regex uygula
  return s.split(/(<[^>]+>)/g).map(part => {
    if (!part || part.startsWith('<')) return part;
    return part.replace(ANCHOR_RE, '<mark class="adhd-anchor">$1</mark>');
  }).join('');
}

/**
 * Uzun olay/metin paragraflarını cümle odak rayına uyumlu hale getirir ve
 * süre/oran/kritik hukuk çapalarını hafifçe öne çıkarır.
 */
export function enhanceReadingHTML(plainText, richFn, opts = {}) {
  const text = String(plainText || '').trim();
  if (!text) return '';
  const minLen = opts.minRailLen != null ? opts.minRailLen : 130;
  const withAnchors = opts.anchors !== false;
  const renderPart = t => {
    const rendered = typeof richFn === 'function' ? richFn(t) : esc(t);
    return withAnchors ? highlightAnchorsHTML(rendered) : rendered;
  };

  if (text.length < minLen) return renderPart(text);
  const sents = splitSentences(text);
  if (sents.length < 2) return renderPart(text);

  return sents.map((sent, idx) =>
    `<span class="adhd-sent${idx === 0 ? ' is-focus' : ''}" data-act="adhd-sent" data-sent-idx="${idx}">${renderPart(sent)}</span>`
  ).join(' ');
}

/** Soru kökünü (ask) çapalar ve olumsuz ifadelerle okunur hale getirir. */
export function enhanceAskHTML(askText, richFn) {
  const rendered = typeof richFn === 'function' ? richFn(askText) : esc(askText);
  return highlightAnchorsHTML(rendered);
}

/* ---------- 4. KADEMELİ AÇIKLAMA (PROGRESSIVE DISCLOSURE) ---------- */

/**
 * Uzun açıklamayı "önce 2 satır çekirdek sebep, sonra tek tıkla detay"
 * biçiminde böler. Kısa açıklamalara gereksiz düğme koymaz.
 */
export function splitExplanation(text) {
  const raw = String(text || '').trim();
  if (!raw) return { lead: '', rest: '', isSplit: false };

  const paragraphs = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    const first = paragraphs[0];
    const rest = paragraphs.slice(1).join('\n\n').trim();
    if (first.length <= 280 && rest.length >= 45) {
      return { lead: first, rest, isSplit: true };
    }
  }

  if (raw.length <= 240) {
    return { lead: raw, rest: '', isSplit: false };
  }

  const sents = splitSentences(raw);
  if (sents.length < 2) {
    return { lead: raw, rest: '', isSplit: false };
  }

  let lead = sents[0];
  let cutIdx = 1;
  if (lead.length < 110 && sents.length >= 3 && (lead.length + sents[1].length) <= 250) {
    lead += ' ' + sents[1];
    cutIdx = 2;
  }
  const rest = sents.slice(cutIdx).join(' ').trim();
  if (rest.length < 45) {
    return { lead: raw, rest: '', isSplit: false };
  }
  return { lead, rest, isSplit: true };
}

export function progressiveExplanationHTML(formattedText, richBlockFn, opts = {}) {
  const compact = opts.compact != null ? opts.compact : adhdSettings().compactFeedback;
  const renderBlock = t => (typeof richBlockFn === 'function' ? richBlockFn(t) : `<p>${esc(t)}</p>`);
  if (!compact) return `<div class="fb-lead">${renderBlock(formattedText)}</div>`;

  const sp = splitExplanation(formattedText);
  if (!sp.isSplit) return `<div class="fb-lead">${renderBlock(formattedText)}</div>`;

  return `<div class="fb-lead adhd-exp-wrap" data-expanded="false">
    <div class="adhd-exp-core">
      <div class="adhd-exp-k">Öz</div>
      ${renderBlock(sp.lead)}
    </div>
    <div class="adhd-exp-rest" hidden>
      ${renderBlock(sp.rest)}
    </div>
    <button type="button" class="adhd-exp-toggle" data-act="adhd-toggle-exp" aria-expanded="false">
      <span>Detaylı açıklamayı aç</span>
      <span class="kbd">D</span>
    </button>
  </div>`;
}

/** DOM'daki aktif geri bildirim kartında detaylı açıklamayı açar/kapatır. */
export function toggleExplanationDOM(viewSel) {
  if (typeof document === 'undefined') return false;
  const root = document.querySelector(viewSel || 'main');
  const wrap = root?.querySelector('.adhd-exp-wrap');
  if (!wrap) return false;
  const rest = wrap.querySelector('.adhd-exp-rest');
  const btn = wrap.querySelector('.adhd-exp-toggle');
  if (!rest || !btn) return false;
  const open = wrap.dataset.expanded !== 'true';
  wrap.dataset.expanded = String(open);
  rest.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  const label = btn.querySelector('span:first-child');
  if (label) label.textContent = open ? 'Detayı gizle' : 'Detaylı açıklamayı aç';
  return open;
}

/* ---------- 5. İLK KIVILCIM (5 SORULUK BAŞLANGIÇ RAMPASI) ---------- */

/**
 * Göreve başlama felcini aşmak için 5 soruluk düşük sürtünmeli ısınma seti kurar:
 * İlk 2 soru kısa gövdeli (<= 280 karakter) seçilir ki beyin ilk 60 saniyede
 * ivme kazansın; kalan 3 soru gerçek sınav çekirdeğinden gelir.
 */
export function buildSparkSet(pool, seenIds = new Set(), count = 5) {
  const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!list.length) return [];
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds || []);
  const len = q => String(q.stem || '').length;

  const unseen = list.filter(q => !seen.has(q.id));
  const source = unseen.length >= count ? unseen : list;

  // Kısa sorular önce, ama farklı derslerden çeşitlilik korunsun
  const shortOnes = source.filter(q => len(q) <= 280 && !detectNegativeStem(q.stem).isNegative);
  const picked = [];
  const used = new Set();
  const usedSubj = new Set();

  const take = (arr, limit, preferNewSubj) => {
    for (const q of arr) {
      if (picked.length >= limit) break;
      if (used.has(q.id)) continue;
      if (preferNewSubj && usedSubj.has(q.subjectId)) continue;
      picked.push(q);
      used.add(q.id);
      if (q.subjectId) usedSubj.add(q.subjectId);
    }
  };

  // İlk 2 soru: kısa + pozitif kök + farklı ders (anında ivme)
  take(shortOnes, Math.min(2, count), true);
  take(shortOnes, Math.min(2, count), false);

  // Kalan sorular: çekirdek havuzdan dengeli ve farklı derslerden
  take(source, count, true);
  take(source, count, false);
  take(list, count, false);

  return picked.slice(0, count);
}

/* ---------- 6. PARK ET (KUYRUKTAN SONRAYA ATMA) ---------- */

/**
 * Tıkayan soruyu yanlış/boş saymadan kuyruğun 6 adım arkasına iter.
 * Böylece tek bir ağır soru yüzünden sekmeden kaçma döngüsü kırılır.
 */
export function parkInQueue(list, fromIndex = 0, offset = 6) {
  if (!Array.isArray(list) || list.length <= 1) return { moved: false, toIndex: fromIndex };
  if (fromIndex < 0 || fromIndex >= list.length - 1) return { moved: false, toIndex: fromIndex };
  const [item] = list.splice(fromIndex, 1);
  const toIndex = Math.min(list.length, fromIndex + Math.max(1, offset));
  list.splice(toIndex, 0, item);
  return { moved: true, toIndex };
}

/* ---------- 7. KAÇIŞ SONRASI SAKİN GERİ GİRİŞ ---------- */

export function reentryBannerHTML(escapeMs, parkAct) {
  const sec = Math.max(1, Math.round((Number(escapeMs) || 0) / 1000));
  const sure = sec >= 60 ? `${Math.floor(sec / 60)} dk ${sec % 60} sn` : `${sec} sn`;
  return `<div class="adhd-reentry" id="adhd-reentry" role="status">
    <span class="adhd-reentry-txt"><b>${esc(sure)}</b> ara verdin · kaldığın soru ve elediklerin hazır.</span>
    <div class="adhd-reentry-acts">
      ${parkAct ? `<button type="button" class="btn btn-2 btn-s" data-act="${esc(parkAct)}">Tıkadıysa sonraya bırak <span class="kbd">P</span></button>` : ''}
      <button type="button" class="adhd-reentry-close" data-act="adhd-dismiss-reentry" aria-label="Kapat">✕</button>
    </div>
  </div>`;
}

/** Aktif soru ekranında sakin geri giriş şeridini gösterir (modal açmaz). */
export function showReentry(viewSel, escapeMs, parkAct) {
  if (typeof document === 'undefined') return;
  const host = document.querySelector(viewSel);
  if (!host) return;
  host.querySelector('#adhd-reentry')?.remove();
  const mainCol = host.querySelector('.q-main');
  if (!mainCol) return;
  mainCol.insertAdjacentHTML('afterbegin', reentryBannerHTML(escapeMs, parkAct));
  const card = mainCol.querySelector('.q-card');
  if (card) {
    card.classList.remove('adhd-pulse');
    void card.offsetWidth;
    card.classList.add('adhd-pulse');
  }
}

/* ---------- 8. DENEME 4 ÇEYREK PUSULASI ---------- */

/**
 * Uzun denemeyi (80 veya 120 soru) 4 eşit çeyreğe böler ve mevcut çeyrek,
 * aralıklar ve sakin tempo durumunu döndürür.
 */
export function examQuarterMeta(index, total, leftMs, totalMs) {
  const n = Math.max(1, Number(total) || 1);
  const idx = Math.max(0, Math.min(n - 1, Number(index) || 0));
  const qSize = Math.ceil(n / 4);
  const quarters = [];
  for (let q = 0; q < 4; q++) {
    const start = q * qSize;
    if (start >= n) break;
    const end = Math.min(n - 1, start + qSize - 1);
    quarters.push({ num: q + 1, start, end, count: end - start + 1 });
  }
  const activeQ = quarters.find(q => idx >= q.start && idx <= q.end) || quarters[0];
  const progressFrac = (idx + 1) / n;
  const timeUsedFrac = totalMs > 0 ? Math.max(0, Math.min(1, 1 - (Math.max(0, leftMs) / totalMs))) : 0;
  const diffMin = totalMs > 0 ? Math.round((progressFrac - timeUsedFrac) * (totalMs / 60000)) : 0;

  let paceTone = 'ok';
  let paceLabel = `Çeyrek ${activeQ.num}/4 · hedeftesin`;
  if (diffMin >= 6) {
    paceTone = 'ahead';
    paceLabel = `Çeyrek ${activeQ.num}/4 · ~${diffMin} dk öndesin, acele etme`;
  } else if (diffMin <= -6) {
    paceTone = 'behind';
    paceLabel = `Çeyrek ${activeQ.num}/4 · ~${Math.abs(diffMin)} dk geride`;
  }

  return {
    quarter: activeQ.num,
    quarters,
    inQuarterPos: idx - activeQ.start + 1,
    quarterLen: activeQ.count,
    diffMin,
    paceTone,
    paceLabel
  };
}

/* ---------- 9. ODAK RAYI (FOCUS RAIL) DOM KONTROLÜ ---------- */

export function applyFocusRail(on) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('adhd-rail-on', !!on);
  document.querySelectorAll('[data-act="adhd-toggle-rail"]').forEach(btn => {
    btn.classList.toggle('active', !!on);
    btn.setAttribute('aria-pressed', String(!!on));
  });
}

export function toggleFocusRail() {
  const next = !adhdSettings().focusRail;
  updateAdhdSettings({ focusRail: next });
  applyFocusRail(next);
  return next;
}

export function selectFocusSentence(el) {
  if (!el || typeof document === 'undefined') return;
  const scope = el.closest('.q-card, .card, .read') || document;
  scope.querySelectorAll('.adhd-sent.is-focus').forEach(s => s.classList.remove('is-focus'));
  el.classList.add('is-focus');
}

export function stepFocusSentence(dir, viewSel) {
  if (typeof document === 'undefined') return false;
  const root = document.querySelector(viewSel);
  if (!root) return false;
  const sents = [...root.querySelectorAll('.adhd-sent')];
  if (!sents.length) return false;
  const cur = sents.findIndex(s => s.classList.contains('is-focus'));
  const nextIdx = cur < 0
    ? 0
    : Math.max(0, Math.min(sents.length - 1, cur + (dir > 0 ? 1 : -1)));
  sents.forEach((s, i) => s.classList.toggle('is-focus', i === nextIdx));
  sents[nextIdx]?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  return true;
}


/* ---------- 10. ÇEVRİMDIŞI ODAK SESİ (SICAK KAHVERENGİ GÜRÜLTÜ) ----------
   Sıfır indirme, sıfır harici ses dosyası: Web Audio API ile 400 Hz altı
   yumuşak kahverengi gürültü sentezler. Çalışma belleğini dış seslerden
   yalıtır; açılış/kapanış 0.35 sn yumuşak geçişle çıtsız çalışır. */

let _audioCtx = null;
let _noiseNode = null;
let _gainNode = null;
let _noiseOn = false;

export function isBrownNoiseOn() { return _noiseOn; }

function syncNoiseButtons() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-act="adhd-toggle-noise"]').forEach(btn => {
    btn.classList.toggle('active', _noiseOn);
    btn.setAttribute('aria-pressed', String(_noiseOn));
  });
}

export function startBrownNoise() {
  if (_noiseOn || typeof window === 'undefined') return _noiseOn;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    if (!_audioCtx) _audioCtx = new AC();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();

    // 4 saniyelik dikişsiz sıcak kahverengi gürültü tamponu (saf matematik)
    const sampleRate = _audioCtx.sampleRate;
    const len = sampleRate * 4;
    const buf = _audioCtx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    // Döngü ucunda sıfır tıkırtı için çapraz yumuşatma (son 0.15 sn → başa)
    const fade = Math.min(Math.floor(sampleRate * 0.15), Math.floor(len / 8));
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[len - fade + i] = data[len - fade + i] * (1 - t) + data[i] * t;
    }

    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const filter = _audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 380;

    const gain = _audioCtx.createGain();
    const now = _audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(_audioCtx.destination);
    src.start();

    _noiseNode = src;
    _gainNode = gain;
    _noiseOn = true;
    syncNoiseButtons();
    return true;
  } catch (_) {
    _noiseOn = false;
    syncNoiseButtons();
    return false;
  }
}

export function stopBrownNoise() {
  if (!_noiseOn) return false;
  _noiseOn = false;
  try {
    const src = _noiseNode;
    const gain = _gainNode;
    _noiseNode = null;
    _gainNode = null;
    if (_audioCtx && gain) {
      const now = _audioCtx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      setTimeout(() => { try { src?.stop(); src?.disconnect(); } catch (_) {} }, 280);
    } else {
      src?.stop();
    }
  } catch (_) {}
  syncNoiseButtons();
  return true;
}

export function toggleBrownNoise() {
  if (_noiseOn) { stopBrownNoise(); return false; }
  return startBrownNoise();
}

export function noiseButtonHTML() {
  const on = isBrownNoiseOn();
  return `<button class="icon-btn${on ? ' active' : ''}" data-act="adhd-toggle-noise" aria-pressed="${on}" title="Odak sesi: yumuşak kahverengi gürültü (N)" aria-label="Odak sesi">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
      <path d="M3 12h2"></path>
      <path d="M8 8v8"></path>
      <path d="M12 5v14"></path>
      <path d="M16 9v6"></path>
      <path d="M19 12h2"></path>
    </svg>
  </button>`;
}

/* ---------- 11. ODAK AYARLARI KARTI (İLERLEME SEKMESİ) ---------- */

export function adhdSettingsPanelHTML() {
  const s = adhdSettings();
  const noise = isBrownNoiseOn();
  const chip = (key, val, active, label) =>
    `<button type="button" class="adhd-set-chip${active ? ' on' : ''}" data-act="adhd-set" data-key="${esc(key)}" data-val="${esc(String(val))}">${esc(label)}</button>`;
  return `
    <div class="section-label">Odak ve çalışma tercihleri</div>
    <div class="card adhd-settings-card">
      <div class="adhd-set-grid">
        <div class="adhd-set-row">
          <div>
            <div class="adhd-set-name">Bugün ekranı</div>
            <div class="adhd-set-sub">Sade görünüm karar yorgunluğunu keser; ayrıntılar tek tıkla açılır.</div>
          </div>
          <div class="adhd-set-opts">
            ${chip('cleanToday', 'true', s.cleanToday, 'Sade')}
            ${chip('cleanToday', 'false', !s.cleanToday, 'Tümü açık')}
          </div>
        </div>
        <div class="adhd-set-row">
          <div>
            <div class="adhd-set-name">Akış tur uzunluğu</div>
            <div class="adhd-set-sub">Her tur sonunda küçük dolum hissi verir, akışı kesmez.</div>
          </div>
          <div class="adhd-set-opts">
            ${chip('roundSize', '5', s.roundSize === 5, '5 soru')}
            ${chip('roundSize', '10', s.roundSize === 10, '10 soru')}
          </div>
        </div>
        <div class="adhd-set-row">
          <div>
            <div class="adhd-set-name">Açıklama görünümü</div>
            <div class="adhd-set-sub">Önce 2 satırlık öz görünür; D tuşuyla tüm detay açılır.</div>
          </div>
          <div class="adhd-set-opts">
            ${chip('compactFeedback', 'true', s.compactFeedback, 'Öz önce')}
            ${chip('compactFeedback', 'false', !s.compactFeedback, 'Hep tam')}
          </div>
        </div>
        <div class="adhd-set-row">
          <div>
            <div class="adhd-set-name">Odak satırı (F)</div>
            <div class="adhd-set-sub">Uzun metinlerde aktif cümleyi net tutar, diğerlerini hafifçe kısar.</div>
          </div>
          <div class="adhd-set-opts">
            ${chip('focusRail', 'true', s.focusRail, 'Açık')}
            ${chip('focusRail', 'false', !s.focusRail, 'Kapalı')}
          </div>
        </div>
        <div class="adhd-set-row">
          <div>
            <div class="adhd-set-name">Odak sesi (N)</div>
            <div class="adhd-set-sub">Çevrimdışı sentezlenen yumuşak kahverengi gürültü.</div>
          </div>
          <div class="adhd-set-opts">
            <button type="button" class="adhd-set-chip${noise ? ' on' : ''}" data-act="adhd-toggle-noise" aria-pressed="${noise}">${noise ? 'Açık · kapat' : 'Aç'}</button>
          </div>
        </div>
      </div>
    </div>`;
}
