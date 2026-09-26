/* ==========================================================================
   views/flow.js — KONULAR: TEK SÜTUN KONU OKUMA
   Sıra: ders + konu listesi (kenarda) → sınav şeridi → metin → görsel
         → tuzaklar → pratik olay → bu konunun soruları + önceki/sonraki
   25 Eylül 2026 elden geçirme:
     · Ders seçimi açılır listeden ders paneline taşındı (soru sayısı ve
       okunan konu oranıyla).
     · Kenar listesinde konu arama, okundu işareti ve ders ilerlemesi.
     · Her konunun üstünde o dersin sınav şeridi (Notlar verisinden).
     · Klavye: ← / → önceki ve sonraki konu.
     · Telefonda konu listesi üstte katlanır; açınca liste, seçince kapanır.
   Görsel: v3 konularda HMGSV3 motoru; eski tipler okunur şema olarak.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import {
  esc, rich, $,
  groupLegalRefs, topicHeading, topicShort, shortRef, isCitation, citationParts, richBlock } from '../ui.js';
import { SUBJECTS, subjectName, topicsOf, topicById, questionsOfTopic, V3_TYPES } from '../data.js';
import { markTopicRead, save, state } from '../store.js';
import { topicMastery, MASTERY_LABEL } from '../engine.js';
import { kitapPaneliHTML, ozetEtiketiHTML, kitapVar } from '../kitap.js';
import { DERSLER } from '../notlar-data.js';
import { openDers as notlarAc } from './notlar.js';

let cur = { subjectId: 'medeni_hukuk', topicId: null };
const ui = { menu: false, toc: false, q: '' };
let bagli = false;

/* Stüdyo ders kimliği → Notlar ders kimliği */
const NOT_ID = {
  medeni_hukuk: 'medeni', borclar_hukuku: 'borclar', hmk: 'hmk', ticaret_hukuku: 'ticaret',
  ceza_hukuku: 'ceza', anayasa_hukuku: 'anayasa', idare_hukuku: 'idare', icra_iflas: 'icra',
  cmk: 'cmk', is_hukuku: 'is', vergi_hukuku: 'vergi', vergi_usul: 'vergi',
  milletlerarasi_hukuk: 'milletlerarasi', mohuk: 'mohuk', avukatlik: 'avukatlik',
  anayasa_yargisi: 'aymyargi', iyuk: 'iyuk', hukuk_felsefesi: 'felsefe',
  hukuk_tarihi: 'tarih', genel_kamu: 'genelkamu'
};
const notOf = sid => DERSLER.find(d => d.id === NOT_ID[sid]);

const okundu = id => !!(state().topics || {})[id];
const okunanSay = sid => topicsOf(sid).filter(t => okundu(t.id)).length;
const norm = s => String(s || '').toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function open(topicId) {
  const t = topicById.get(topicId);
  if (!t) return false;
  cur = { subjectId: t.subjectId, topicId: t.id };
  ui.toc = false;
  render();
  window.scrollTo({ top: 0 });
  return true;
}

export function setSubject(subjectId) {
  cur.subjectId = subjectId;
  const list = topicsOf(subjectId);
  const ilkOkunmamis = list.find(t => !okundu(t.id));
  cur.topicId = (ilkOkunmamis || list[0] || {}).id || null;
  ui.menu = false; ui.q = '';
  render();
}

export function render() {
  const host = $('#view-flow');
  if (!host) return;
  bagla(host);

  const list = topicsOf(cur.subjectId);
  if (!cur.topicId || !list.some(t => t.id === cur.topicId)) {
    cur.topicId = list.length ? list[0].id : null;
  }
  const t = cur.topicId ? topicById.get(cur.topicId) : null;

  // Konu okunmuş sayılır; kenar listesindeki işaret ve sayaç bunu anında göstersin.
  if (t) { markTopicRead(t.id); save(); }

  host.innerHTML = `
    <div class="wrap">
      <div class="flow-layout${ui.toc ? ' toc-open' : ''}">
        ${sideHTML(list, t)}
        <div class="read">${t ? topicHTML(t, list) : '<p class="hint">Bu derste henüz konu yok.</p>'}</div>
      </div>
    </div>`;

  if (t) mountVisual(t);
}

/* ---------- kenar: ders paneli + konu listesi ---------- */

function sideHTML(list, t) {
  const s = SUBJECTS.find(x => x.id === cur.subjectId);
  const oku = okunanSay(cur.subjectId);
  const i = t ? list.findIndex(x => x.id === t.id) : -1;
  const q = norm(ui.q);
  const gorunen = q ? list.filter(x => norm(topicHeading(x.title)).includes(q)) : list;

  return `
    <aside class="flow-side">
      <button class="fl-subj" data-fl="menu" aria-expanded="${ui.menu}">
        <span class="fl-subj-name">${esc(s ? s.name : subjectName(cur.subjectId))}</span>
        <span class="fl-subj-meta">${s ? `${s.examQ} soru · ` : ''}${list.length} konu</span>
        <span class="fl-chev" aria-hidden="true"></span>
      </button>
      ${ui.menu ? menuHTML() : ''}

      <button class="fl-toc-toggle" data-fl="toc" aria-expanded="${ui.toc}">
        <span>${i >= 0 ? `Konu ${i + 1} / ${list.length}` : 'Konular'}</span>
        <span class="hint">${ui.toc ? 'kapat' : 'listeyi aç'}</span>
      </button>

      <div class="fl-toc-wrap">
        <div class="fl-progress" title="Okunan konu">
          <span class="fl-progress-bar"><i style="width:${list.length ? Math.round((oku / list.length) * 100) : 0}%"></i></span>
          <span>${oku}/${list.length} okundu</span>
        </div>
        ${list.length > 8 ? `<input class="fl-search" type="search" placeholder="Konu ara" value="${esc(ui.q)}" data-fl="ara" aria-label="Konu ara">` : ''}
        <nav class="flow-toc">
          ${gorunen.map(x => {
            const n = list.indexOf(x) + 1;
            const lab = MASTERY_LABEL[topicMastery(x.id).state];
            const on = t && x.id === t.id;
            return `<a href="#" data-act="flow-topic" data-topic="${esc(x.id)}"
              class="${on ? 'on' : ''}${okundu(x.id) ? ' is-read' : ''}" title="${esc(topicHeading(x.title))}">
              <span class="n">${n}</span><span class="tt">${esc(topicShort(x.title))}</span><span class="dot ${lab.dot}" title="${esc(lab.txt)}"></span>
            </a>`;
          }).join('') || '<p class="hint fl-empty">Eşleşen konu yok.</p>'}
        </nav>
      </div>
    </aside>`;
}

function menuHTML() {
  return `<div class="fl-menu" role="listbox">
    ${SUBJECTS.map(s => {
      const n = topicsOf(s.id).length;
      const o = okunanSay(s.id);
      return `<button class="fl-menu-i${s.id === cur.subjectId ? ' on' : ''}" data-fl="ders" data-id="${esc(s.id)}" role="option" aria-selected="${s.id === cur.subjectId}">
        <span class="fl-menu-n">${esc(s.name)}</span>
        <span class="fl-menu-m">${s.examQ} soru</span>
        <span class="fl-menu-bar"><i style="width:${n ? Math.round((o / n) * 100) : 0}%"></i></span>
      </button>`;
    }).join('')}
  </div>`;
}

/* ---------- okuma alanı ---------- */

function seritHTML(sid) {
  const d = notOf(sid);
  if (!d) return '';
  const enCok = d.cikan.slice(0, 3).map(c => c[0]).join(', ');
  return `<div class="fl-exam">
    <span class="fl-exam-k">Sınavda</span>
    <span class="fl-exam-v">Soru ${d.aralik[0]}–${d.aralik[1]} · ${d.soru} soru${d.ters >= 40 ? ` · <b>ters kök %${d.ters}</b>` : ''}</span>
    <span class="fl-exam-t">En çok: ${esc(enCok)}</span>
    <button class="fl-exam-a" data-fl="notlar" data-id="${esc(d.id)}">Notlar</button>
  </div>`;
}

function topicHTML(t, list) {
  const qs = questionsOfTopic(t.id);
  const m = topicMastery(t.id);
  const lab = MASTERY_LABEL[m.state];
  const isV3 = V3_TYPES.has(t.visualType);
  const i = list.findIndex(x => x.id === t.id);

  return `
    <p class="fl-eyebrow">${esc(subjectName(t.subjectId))} · Konu ${i + 1} / ${list.length}</p>
    <h2>${esc(topicHeading(t.title))}</h2>
    <div class="basisline">${esc(groupLegalRefs(t.legalBasis) || '')}</div>

    ${seritHTML(t.subjectId)}

    ${m.state !== 'none' ? `<div class="fl-chips">
      <span class="chip ${lab.chip}"><span class="dot ${lab.dot}"></span>${lab.txt}</span>
      ${m.n ? `<span class="chip">${m.n} çözüm · %${Math.round(m.acc * 100)} doğru · ${Math.round(m.medianSec)} sn</span>` : ''}
    </div>` : ''}

    ${kitapPaneliHTML(t.subjectId)}

    ${kitapVar(t.subjectId) ? ozetEtiketiHTML(t.subjectId) : ''}
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
        : `<button class="btn btn-2" data-act="flow-practice-subject" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} sorularını çöz</button>`}
    </div>
    ${pagerHTML(list, i)}`;
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
        <span>Pratik olay · ${esc(c.title || 'Uygulama')}</span>
        <span class="hint">göster</span>
      </button>
      <div style="display:none">
        <p>${rich(c.scenario || '')}</p>
        ${c.question ? `<p><strong>${rich(c.question)}</strong></p>` : ''}
        <div class="reveal-box" style="margin:0.5rem 0 0">
          <button data-act="reveal">
            <span>${esc(c.solutionTitle || 'Çözüm')}</span>
            <span class="hint">göster</span>
          </button>
          <div style="display:none">${rich(c.solutionText || '')}</div>
        </div>
      </div>
    </div>`;
}

function pagerHTML(list, i) {
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  if (!prev && !next) return '';
  return `<nav class="fl-pager">
    ${prev ? `<a href="#" data-act="flow-topic" data-topic="${esc(prev.id)}"><small>Önceki</small>${esc(topicShort(prev.title))}</a>` : '<span></span>'}
    ${next ? `<a href="#" class="fl-next" data-act="flow-topic" data-topic="${esc(next.id)}"><small>Sonraki</small>${esc(topicShort(next.title))}</a>` : '<span></span>'}
  </nav>
  <p class="fl-keys"><span class="kbd">←</span> <span class="kbd">→</span> konular arasında geç</p>`;
}

/* ---------- olaylar (yalnız bu görünüme ait) ---------- */

function bagla(host) {
  if (bagli) return;
  bagli = true;

  host.addEventListener('click', e => {
    const el = e.target.closest('[data-fl]');
    if (!el) {
      if (ui.menu && !e.target.closest('.fl-menu')) { ui.menu = false; render(); }
      return;
    }
    const fl = el.dataset.fl;
    if (fl === 'menu') { ui.menu = !ui.menu; render(); }
    else if (fl === 'ders') { setSubject(el.dataset.id); scrollTo({ top: 0 }); }
    else if (fl === 'toc') { ui.toc = !ui.toc; render(); }
    else if (fl === 'notlar') {
      notlarAc(el.dataset.id);
      document.querySelector('.nav [data-view="notlar"]')?.click();
    }
  });

  host.addEventListener('input', e => {
    if (e.target.dataset.fl !== 'ara') return;
    ui.q = e.target.value;
    const pos = e.target.selectionStart;
    render();
    const inp = host.querySelector('.fl-search');
    if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
  });

  document.addEventListener('keydown', e => {
    if (!host.classList.contains('on') || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'Escape' && (ui.menu || ui.toc)) { ui.menu = false; ui.toc = false; render(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const list = topicsOf(cur.subjectId);
    const i = list.findIndex(x => x.id === cur.topicId);
    const hedef = list[i + (e.key === 'ArrowRight' ? 1 : -1)];
    if (!hedef) return;
    e.preventDefault();
    open(hedef.id);
    scrollTo({ top: 0 });
  });
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

  const html = legacyVisualHTML(t);
  if (html) slot.innerHTML = html; else slot.remove();
  mountVisualExtra(t);
}

/**
 * İkincil görsel panel. t.visualExtra = { visualType, visualData } — ör. zümre
 * konusunda hem soy ağacı hem tereke hesap makinesi birlikte gösterilir.
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

/** Eski (statik) görsel verisini okunur bir şema olarak gösterir. */
function legacyVisualHTML(t) {
  const vd = t.visualData || {};
  let body = '';

  if (Array.isArray(vd.rows) && Array.isArray(vd.headers)) {
    body = `<table>
      <thead><tr>${vd.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${vd.rows.map(r => `<tr>${(Array.isArray(r) ? r : r.cells || []).map(c => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;
  } else if (Array.isArray(vd.steps)) {
    body = `<ol>${vd.steps.map(s => `<li>${rich(s.label || s.title || s)}${s.desc ? `: <span style="color:var(--ink-2)">${rich(s.desc)}</span>` : ''}</li>`).join('')}</ol>`;
  } else if (Array.isArray(vd.levels)) {
    body = `<ol>${vd.levels.map(l => `<li>${rich(l.title || l.label || l)}${l.desc ? `: <span style="color:var(--ink-2)">${rich(l.desc)}</span>` : ''}</li>`).join('')}</ol>`;
  } else if (Array.isArray(vd.branches)) {
    body = `<ul>${vd.branches.map(b => `<li>${rich(b.title || b.label || b)}${b.desc ? `: <span style="color:var(--ink-2)">${rich(b.desc)}</span>` : ''}</li>`).join('')}</ul>`;
  } else if (Array.isArray(vd.items)) {
    body = `<ul>${vd.items.map(x => `<li>${rich(x.title || x.label || x.text || x)}</li>`).join('')}</ul>`;
  } else {
    return '';
  }

  return `<div class="visual-legacy"><div class="lbl">Şema</div>${body}</div>`;
}

export function practiceTopic() { return cur.topicId; }
