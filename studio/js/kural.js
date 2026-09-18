/* ==========================================================================
   kural.js — YANLIŞTAN KURALA KÖPRÜ
   ----------------------------------------------------------------------
   NEDEN VAR (ölçüm, 15 Eyl 2026):

   · Projenin kendi kanıt tabanı: puanı yordayan şey ÇÖZÜLEN SORU sayısı,
     saat değil (Burk-Rafel 2017). Test etmek okumaya üstün (g=0,50) ama
     GERİ BİLDİRİMLİ test g=0,73, geri bildirimsiz 0,39 (Rowland 2014).
     Yani kaldıraç "konu anlatım eklemek" değil, GERİ BİLDİRİMİN TÜRÜ.

   · Studio'da 124 konunun 77'si (%62) ZATEN interaktif: 68 predict_then_explore,
     4 drag_classify, 4 scene_story, 1 family_tree. Bunlar düz okuma değil —
     "önce tahmin et, sonra aç" kalıbı (smoke.mjs testliyor: "TAHMİNDEN ÖNCE
     anlatım gizli"). 73'ünün sorusu var → 1613 soru.

   · AMA köprü yoktu. Ölçüm: `HMGSV3.render` yalnız flow.js'te (4 çağrı);
     practice.js ve akim.js'te 0. Geri bildirim kartındaki tek eylemler
     "next" ve "dontknow" idi. Yani yanlış yapan kullanıcıya düz metin bir
     paragraf veriliyordu, kuralın interaktif alıştırması verilmiyordu.

   Bu modül o köprüyü kurar: yanlış → AYNI EKRANDA o kuralın interaktif
   alıştırması → sonraki soru. Sekme değişmez, seans bölünmez.

   Tasarım kararı: YENİ İÇERİK YOK. Var olanı ulaşılabilir yapıyor. 11 gün
   kala yeni içerik üretmek değil, mevcut 77 alıştırmayı kullanıcıya
   göstermek doğru yatırım.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc } from './ui.js';
import { topicById, questionById, V3_TYPES } from './data.js';

/** Bu sorunun bağlı olduğu konu, interaktif bir kural alıştırması taşıyor mu? */
export function kuralVar(q) {
  const t = konu(q);
  return !!(t && (t.visualData || t.visualExtra));
}

function konu(q) {
  if (!q) return null;
  const t = q.topicId ? topicById.get(q.topicId) : null;
  if (!t) return null;
  // v1 statik tablo "alıştırma" değil — yalnız motorun çizebildiği kalıplar
  const v3 = V3_TYPES.has(t.visualType) || (t.visualExtra && V3_TYPES.has(t.visualExtra.visualType));
  return v3 ? t : null;
}

/**
 * Geri bildirim kitinin btn-row'una konacak düğme.
 * Konunun interaktif alıştırması yoksa BOŞ döner (sahte düğme basmayız).
 */
export function kuralButtonHTML(q) {
  const t = konu(q);
  if (!t) return '';
  const baslik = kuralBaslik(t);
  return `<button class="btn btn-2 btn-s btn-kural" data-act="kural"
    data-topic="${esc(t.id)}"
    data-qid="${esc(q.id || '')}"
    title="Tek sayfa okuma değil: bu kuralı ${baslik} ile çalış. Seans bölünmez, sonra kaldığın yerden devam edersin.">
    <span>Kuralı çalış</span>
    <span class="kbd-hint">K</span>
  </button>`;
}

/** Düğme ipucunda ne olduğunu söyler — "görsel" değil, gerçek etkileşim adı. */
function kuralBaslik(t) {
  const tip = t.visualType;
  const ad = {
    predict_then_explore: 'tahmin et → keşfet',
    guess_table: 'gizli hücre tahmini',
    decision_sim: 'karar simülatörü',
    drag_classify: 'sınıflandırma',
    scene_story: 'sahneli olay',
    scene_simulator: 'senaryo simülatörü',
    step_reveal: 'adım adım tahmin',
    time_slider: 'zaman çizgisi',
    interactive_hierarchy: 'etkileşimli hiyerarşi',
    family_tree: 'soy ağacı tahmini',
    fill_slots: 'boşluk doldurma',
    calculator: 'hesap simülatörü'
  }[tip];
  return ad || 'etkileşimli alıştırma';
}

/**
 * Soru metni, mevzuat künyesi ve gerekçesini konunun chunks maddeleriyle eşleştirir;
 * en yüksek alaka puanına sahip alt kuralı (chunk) seçer.
 */
export function matchRuleChunk(q, t) {
  if (!t || !t.chunks || !t.chunks.length) return null;
  if (!q) return t.chunks[0];
  if (t.chunks.length === 1) return t.chunks[0];

  const qText = ((q.stem || '') + ' ' + (q.explanation || '') + ' ' + (q.legalBasis || '')).toLowerCase();
  
  // Madde numarası çıkarımı (örn. 'm. 248', 'm. 166', '248', '166/1', vb.)
  const qArts = [];
  const artMatches = qText.matchAll(/(?:m\.|md\.|madde|fıkra)\s*(\d+[\w\/-]*)/gi);
  for (const m of artMatches) {
    if (m[1]) qArts.push(m[1].toLowerCase());
  }

  let bestChunk = t.chunks[0];
  let maxScore = -1;

  t.chunks.forEach((chunk) => {
    let score = 0;
    const refText = (chunk.legalRef || '').toLowerCase();
    const cText = (chunk.text || '').toLowerCase();
    const detailText = (chunk.detail || '').toLowerCase();
    const highlights = (chunk.highlights || []).map(h => String(h).toLowerCase());

    // 1. Kanun maddesi tam eşleşmesi (en yüksek ağırlık)
    for (const art of qArts) {
      if (refText.includes(art)) score += 40;
      else if (cText.includes(art)) score += 20;
    }

    // 2. Vurgulanan kavramlar (highlights) eşleşmesi
    for (const h of highlights) {
      const hWords = h.split(/[\s,()\/&.\-]+/).filter(w => w.length >= 4);
      let hHit = 0;
      for (const w of hWords) {
        if (qText.includes(w)) hHit++;
      }
      if (hWords.length > 0 && hHit === hWords.length) score += 25;
      else if (hHit > 0) score += hHit * 5;
    }

    // 3. Madde künyesi başlık kelimeleri
    const refWords = refText.replace(/^.*?(?:m\.|sk|sayılı|\d+)/, '').split(/[\s,()\/&.\-]+/).filter(w => w.length >= 4);
    for (const w of refWords) {
      if (qText.includes(w)) score += 8;
    }

    // 4. Kural gövdesi ve detay metni kelime örtüşmesi
    const cWords = (cText + ' ' + detailText).split(/[\s,()\/&.\-]+/).filter(w => w.length >= 5);
    let cHits = 0;
    for (const w of cWords) {
      if (qText.includes(w)) cHits++;
    }
    score += Math.min(cHits * 2, 20);

    if (score > maxScore) {
      maxScore = score;
      bestChunk = chunk;
    }
  });

  return bestChunk;
}

function formatRuleText(str) {
  if (!str) return '';
  let s = esc(String(str))
    .replace(/—/g, ' · ')
    .replace(/–/g, ' - ');
  s = s.replace(/`([^`]+)`/g, '<code class="clean-inline-code">$1</code>');
  return s;
}

function cleanRef(str) {
  if (!str) return '';
  return esc(String(str))
    .replace(/—/g, ' · ')
    .replace(/–/g, ' - ')
    .replace(/`/g, '')
    .trim();
}

function targetChunkHTML(chunk) {
  if (!chunk) return '';
  const ref = cleanRef(chunk.legalRef || '');
  const text = formatRuleText(chunk.text || '');
  const pills = (chunk.highlights || []).map(h => 
    `<span class="kural-pill">${cleanRef(h)}</span>`
  ).join('');
  const detail = chunk.detail ? formatRuleText(chunk.detail) : '';

  return `
    <div class="kural-focus-card">
      <div class="kural-focus-head">
        <span class="kural-focus-badge">Soruya Özgü Kural</span>
        <span class="kural-focus-ref">${ref}</span>
      </div>
      <div class="kural-focus-text">${text}</div>
      ${pills ? `<div class="kural-focus-pills">${pills}</div>` : ''}
      ${detail ? `
        <div class="kural-focus-trap">
          <span class="kural-focus-trap-tag">Kritik Sınav Tuzağı</span>
          <span class="kural-focus-trap-body">${detail}</span>
        </div>` : ''}
    </div>`;
}

/**
 * Kural panelini aç/kapa. DOM'daki `#kural-slot` kabına basar.
 * @param {string} topicId
 * @param {string} [qId] - Soru kimliği (opsiyonel)
 */
export function kuralToggle(topicId, qId = null) {
  const slot = document.getElementById('kural-slot');
  const btn = document.querySelector('[data-act="kural"]');
  if (!slot) return false;

  // Açıkken kapat
  if (!slot.hidden) {
    slot.hidden = true;
    slot.innerHTML = '';
    btn?.classList.remove('active');
    return false;
  }

  const t = topicById.get(topicId);
  if (!t) return false;

  const targetQ = (qId && questionById.get(qId)) || (btn && btn.dataset.qid && questionById.get(btn.dataset.qid)) || null;
  const chunk = matchRuleChunk(targetQ, t);

  slot.hidden = false;
  slot.innerHTML = `
    <div class="kural-head">
      <span class="kural-lbl">Kural · ${esc(etiket(t.visualType))}</span>
      <span class="kural-src">${esc(shortTitle(t.title))}</span>
    </div>
    ${chunk ? targetChunkHTML(chunk) : ''}
    <div class="kural-sim-wrapper">
      <div class="kural-sim-head">
        <span class="kural-sim-tag">İnteraktif Alıştırma</span>
        <span class="kural-sim-desc">Bu konunun çekirdek mantığını canlı dene</span>
      </div>
      <div class="kural-host hv3-host" id="kural-host"></div>
      ${t.visualExtra && t.visualExtra.visualData
        ? '<div class="kural-host hv3-host" id="kural-host-extra"></div>' : ''}
    </div>`;

  const host = document.getElementById('kural-host');
  const ok = mount(host, t, 'kural_' + t.id);
  if (!ok) {
    // Motor çizemediyse düğme de bir işe yaramaz — sessizce boş kutu bırakma (AGENTS §0)
    slot.hidden = true;
    slot.innerHTML = '';
    return false;
  }

  if (t.visualExtra && t.visualExtra.visualData) {
    const extra = document.getElementById('kural-host-extra');
    mount(extra, { id: t.id + '_x', visualType: t.visualExtra.visualType, visualData: t.visualExtra.visualData }, 'kuralx_' + t.id);
  }

  btn?.classList.add('active');
  slot.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return true;
}

/** flow.js:mountVisual ile aynı yol — kaynak tek, kopya yok. */
function mount(host, t, key) {
  if (!host || !t.visualData) return false;
  const V = typeof window !== 'undefined' ? window.HMGSV3 : null;
  if (!V || typeof V.render !== 'function') return false;
  if (!V3_TYPES.has(t.visualType)) return false;
  try {
    V.render(host, key, t.visualData, t);
    return host.children.length > 0;
  } catch (e) {
    console.warn('[kural] render hatası:', e);
    return false;
  }
}

function etiket(tip) {
  return {
    predict_then_explore: 'Tahmin et → keşfet',
    guess_table: 'Gizli hücre tahmini',
    decision_sim: 'Karar simülatörü',
    drag_classify: 'Sınıflandırma',
    scene_story: 'Sahneli olay',
    scene_simulator: 'Senaryo simülatörü',
    step_reveal: 'Adım adım',
    time_slider: 'Zaman çizgisi',
    interactive_hierarchy: 'Hiyerarşi',
    family_tree: 'Soy ağacı',
    fill_slots: 'Boşluk doldurma',
    calculator: 'Hesap'
  }[tip] || tip;
}

/** Konu başlığından sıra numarasını ve madde parantezini atar (ui.js ile aynı iş). */
function shortTitle(s) {
  return String(s || '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s*\([^()]*(?:m\.|sk|sayılı|md\.)[^()]*\)\s*$/i, '')
    .trim()
    .slice(0, 72);
}
