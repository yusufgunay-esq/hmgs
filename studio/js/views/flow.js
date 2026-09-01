/* ==========================================================================
   views/flow.js — AKIŞ: SEKMESİZ TEK SÜTUN KONU OKUMA
   Eski 4 sekmeli yapı kaldırıldı. Sıra:
     mevzuat şeridi → kavra bölümleri → etkileşimli görsel → tuzaklar
     → pratik olay (açılır) → bağlı çıkmış soruları çöz
   Görsel: v3 konularda HMGSV3 motoru; eski tipler okunur şekilde gösterilir
   ve açıkça "v3 bekliyor" olarak işaretlenir (sessizce iyi gibi durmasın).
   ========================================================================== */

import {
  esc, rich, $, $$, toast,
  groupLegalRefs, topicHeading, topicShort, shortRef, isCitation, citationParts, richBlock } from '../ui.js';
import { SUBJECTS, subjectName, topicsOf, topicById, questionsOfTopic, V3_TYPES } from '../data.js';
import { markTopicRead, save } from '../store.js';
import { topicMastery, MASTERY_LABEL } from '../engine.js';

let cur = { subjectId: 'medeni_hukuk', topicId: null };

export function open(topicId) {
  const t = topicById.get(topicId);
  if (!t) return false;
  cur = { subjectId: t.subjectId, topicId: t.id };
  render();
  return true;
}

export function setSubject(subjectId) {
  cur.subjectId = subjectId;
  const list = topicsOf(subjectId);
  cur.topicId = list.length ? list[0].id : null;
  render();
}

export function render() {
  const host = $('#view-flow');
  if (!host) return;

  const list = topicsOf(cur.subjectId);
  if (!cur.topicId || !list.some(t => t.id === cur.topicId)) {
    cur.topicId = list.length ? list[0].id : null;
  }
  const t = cur.topicId ? topicById.get(cur.topicId) : null;

  host.innerHTML = `
    <div class="wrap">
      <div class="flow-layout">
        <aside class="flow-side">
          <select class="flow-select" data-act="flow-subject-select" aria-label="Ders seç">
            ${SUBJECTS.map(s => `<option value="${esc(s.id)}" ${s.id === cur.subjectId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
          <div class="flow-count">${list.length} konu</div>
          <nav class="flow-toc">
            ${list.map((x, i) => {
              const m = topicMastery(x.id);
              const lab = MASTERY_LABEL[m.state];
              return `<a href="#" data-act="flow-topic" data-topic="${esc(x.id)}"
                class="${x.id === cur.topicId ? 'on' : ''}" title="${esc(topicHeading(x.title))}">
                <span class="dot ${lab.dot}"></span><span class="n">${i + 1}</span>${esc(topicShort(x.title))}
              </a>`;
            }).join('')}
          </nav>
        </aside>

        <div class="read">${t ? topicHTML(t) : '<p class="hint">Bu derste konu bulunamadı.</p>'}</div>
      </div>
    </div>`;

  if (t) {
    markTopicRead(t.id);
    save();
    mountVisual(t);
  }
}

function topicHTML(t) {
  const qs = questionsOfTopic(t.id);
  const m = topicMastery(t.id);
  const lab = MASTERY_LABEL[m.state];
  const isV3 = V3_TYPES.has(t.visualType);

  return `
    <h2>${esc(topicHeading(t.title))}</h2>
    <div class="basisline">${esc(groupLegalRefs(t.legalBasis) || subjectName(t.subjectId))}</div>

    ${m.state !== 'none' ? `<div class="btn-row" style="margin:-1.25rem 0 2.25rem">
      <span class="chip ${lab.chip}"><span class="dot ${lab.dot}" style="display:inline-block;margin-right:0.35rem"></span>${lab.txt}</span>
      ${m.n ? `<span class="chip">${m.n} çözüm · %${Math.round(m.acc * 100)} · ${Math.round(m.medianSec)} sn medyan</span>` : ''}
    </div>` : ''}

    ${(t.chunks || []).map(c => `
      <section>
        ${c.legalRef ? `<div class="ref">${esc(shortRef(c.legalRef))}</div>` : ''}
        ${richBlock(c.text || '')}
        ${c.detail ? detailHTML(c.detail) : ''}
      </section>`).join('')}

    <div class="visual-slot" id="visual-slot" data-v3="${isV3}"></div>
    ${t.visualExtra ? '<div class="visual-slot" id="visual-slot-extra" data-v3="true"></div>' : ''}

    ${(t.examTraps || []).map(tr => `
      <div class="trap">
        <div class="lbl">Sınav tuzağı</div>
        <p>${rich(typeof tr === 'string' ? tr : (tr.text || tr.trap || tr.title || ''))}</p>
      </div>`).join('')}

    ${t.interactiveCase ? caseHTML(t.interactiveCase) : ''}

    <div class="flow-end">
      ${qs.length
        ? `<button class="btn" data-act="flow-practice" data-topic="${esc(t.id)}">Bu konunun ${qs.length} sorusunu çöz</button>`
        : `<span class="hint">Bu konuya bağlı soru yok — izlenebilirlik açığı. Ders havuzundan çöz:</span>
           <button class="btn btn-2" data-act="flow-practice-subject" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} soruları</button>`}
      ${nextPrevHTML(t)}
    </div>`;
}

/** Yargı kararı alıntısı gövde metniyle karışmasın — ayrı alıntı bloğu. */
function detailHTML(detail) {
  if (!isCitation(detail)) return `<p class="detail">${rich(detail)}</p>`;
  const { label, body } = citationParts(detail);
  return `<blockquote class="cite">
    <span class="cite-lbl">${esc(label)}</span>
    <p>${rich(body)}</p>
  </blockquote>`;
}

function caseHTML(c) {
  return `
    <div class="reveal-box">
      <button data-act="reveal">
        <span>⚖️ Pratik olay · ${esc(c.title || 'Uygulama')}</span>
        <span class="hint">çözümü göster</span>
      </button>
      <div>
        <p>${rich(c.scenario || '')}</p>
        ${c.question ? `<p><strong>${rich(c.question)}</strong></p>` : ''}
        <div class="reveal-box" style="margin:0.5rem 0 0">
          <button data-act="reveal">
            <span>${esc(c.solutionTitle || 'Çözüm')}</span>
            <span class="hint">aç</span>
          </button>
          <div style="display:none">${rich(c.solutionText || '')}</div>
        </div>
      </div>
    </div>`;
}

function nextPrevHTML(t) {
  const list = topicsOf(t.subjectId);
  const i = list.findIndex(x => x.id === t.id);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  return `<span style="margin-left:auto;display:flex;gap:0.4rem">
    ${prev ? `<button class="btn btn-2 btn-s" data-act="flow-topic" data-topic="${esc(prev.id)}">← Önceki konu</button>` : ''}
    ${next ? `<button class="btn btn-2 btn-s" data-act="flow-topic" data-topic="${esc(next.id)}">Sonraki konu →</button>` : ''}
  </span>`;
}

/* ---------- görsel montajı ---------- */

function mountVisual(t) {
  const slot = $('#visual-slot');
  if (!slot) return;
  if (!t.visualData) { slot.remove(); return; }

  const isV3 = V3_TYPES.has(t.visualType);

  if (isV3 && window.HMGSV3 && typeof window.HMGSV3.render === 'function') {
    slot.classList.add('hv3-host');
    try {
      window.HMGSV3.render(slot, 'flow_' + t.id, t.visualData, t);
      mountVisualExtra(t);
      return;
    } catch (e) {
      console.warn('[flow] HMGSV3 render hatası:', e);
    }
  }

  slot.innerHTML = legacyVisualHTML(t);
  mountVisualExtra(t);
}

/**
 * İkincil görsel panel (GORSELLESTIRME_VE_KAPSAM_STANDARDI §B.2: "ikincil kalıp ayrı panel
 * olarak eklenebilir"). t.visualExtra = { visualType, visualData } — ör. zümre konusunda
 * hem soy ağacı (family_tree) hem tereke hesap makinesi (calculator) birlikte gösterilir.
 */
function mountVisualExtra(t) {
  const slot = $('#visual-slot-extra');
  if (!slot) return;
  const ve = t.visualExtra;
  if (!ve || !ve.visualData || !V3_TYPES.has(ve.visualType) ||
      !window.HMGSV3 || typeof window.HMGSV3.render !== 'function') { slot.remove(); return; }
  slot.classList.add('hv3-host');
  try {
    window.HMGSV3.render(slot, 'flowx_' + t.id, ve.visualData, ve);
  } catch (e) {
    console.warn('[flow] HMGSV3 extra render hatası:', e);
    slot.remove();
  }
}

/**
 * Eski (statik) görsel verisini okunur şekilde gösterir ve dürüstçe etiketler.
 * Amaç: "görselleştirme var" izlenimi vermemek — dönüştürülmesi gerektiğini göstermek.
 */
function legacyVisualHTML(t) {
  const vd = t.visualData || {};
  let body = '';

  if (Array.isArray(vd.rows) && Array.isArray(vd.headers)) {
    body = `<table>
      <thead><tr>${vd.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${vd.rows.map(r => `<tr>${(Array.isArray(r) ? r : r.cells || []).map(c => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  } else if (Array.isArray(vd.steps)) {
    body = `<ol>${vd.steps.map(s => `<li>${rich(s.label || s.title || s)}${s.desc ? ` — <span style="color:var(--ink-2)">${rich(s.desc)}</span>` : ''}</li>`).join('')}</ol>`;
  } else if (Array.isArray(vd.levels)) {
    body = `<ol>${vd.levels.map(l => `<li>${rich(l.title || l.label || l)}${l.desc ? ` — <span style="color:var(--ink-2)">${rich(l.desc)}</span>` : ''}</li>`).join('')}</ol>`;
  } else if (Array.isArray(vd.branches)) {
    body = `<ul>${vd.branches.map(b => `<li>${rich(b.title || b.label || b)}${b.desc ? ` — <span style="color:var(--ink-2)">${rich(b.desc)}</span>` : ''}</li>`).join('')}</ul>`;
  } else if (Array.isArray(vd.items)) {
    body = `<ul>${vd.items.map(x => `<li>${rich(x.title || x.label || x.text || x)}</li>`).join('')}</ul>`;
  } else {
    body = `<p class="hint">Bu konunun görsel verisi henüz yeni motorun okuyabileceği biçimde değil.</p>`;
  }

  return `<div class="visual-legacy">
    <div class="lbl">Şema · <span style="color:var(--warn)">etkileşimli sürüme dönüştürülmeyi bekliyor (${esc(t.visualType || 'tipsiz')})</span></div>
    ${body}
  </div>`;
}

export function practiceTopic() { return cur.topicId; }
