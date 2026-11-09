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
import { SUBJECTS, subjectName, topicsOf, topicById, questionsOfTopic, questionById, V3_TYPES } from '../data.js';
import { SINAV_KONULARI } from '../sinav-konulari.js';
import { markTopicRead, save, state } from '../store.js';
import { topicMastery, MASTERY_LABEL } from '../engine.js';
import { kitapPaneliHTML, ozetEtiketiHTML, kitapVar } from '../kitap.js';
import { DERSLER } from '../notlar-data.js';
import { openDers as notlarAc } from './notlar.js';

let cur = { subjectId: 'medeni_hukuk', topicId: null };
const ui = { menu: false, toc: false, q: '', sinav: false, sinavTum: true };
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
  ui.toc = false; ui.sinav = false;
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
  if (ui.sinav) ui.sinavTum = false;
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
  if (t && !ui.sinav) { markTopicRead(t.id); save(); }

  host.innerHTML = `
    <div class="wrap">
      <div class="flow-layout${ui.toc ? ' toc-open' : ''}${ui.sinav ? ' sinav' : ''}">
        ${sideHTML(list, t)}
        <div class="read">${ui.sinav ? sinavHTML() : t ? topicHTML(t, list) : '<p class="hint">Bu derste henüz konu yok.</p>'}</div>
      </div>
    </div>`;

  if (t && !ui.sinav) mountVisual(t);
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
      <div class="fl-mod" role="tablist">
        <button role="tab" aria-selected="${!ui.sinav}" class="${ui.sinav ? '' : 'on'}" data-fl="mod-oku">Konular</button>
        <button role="tab" aria-selected="${ui.sinav}" class="${ui.sinav ? 'on' : ''}" data-fl="mod-sinav">Sınavda en çok</button>
      </div>
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
            const on = !ui.sinav && t && x.id === t.id;
            return `<a href="#" data-act="flow-topic" data-topic="${esc(x.id)}"
              class="${on ? 'on' : ''}${okundu(x.id) ? ' is-read' : ''}" title="${esc(topicHeading(x.title))}">
              <span class="n">${n}</span><span class="tt">${esc(x.sade && x.sade.baslik ? x.sade.baslik : topicShort(x.title))}</span><span class="dot ${lab.dot}" title="${esc(lab.txt)}"></span>
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

/* ---------- sınavda en çok sorulanlar ----------
   Dört sınavın 460 sorusu elle konulara ayrıldı (sinav-konulari.js). Kart
   sayıyı, kaç sınavda geldiğini ve kaçını çözdüğünü gösterir; "Çöz" yalnız o
   konunun sınav sorularını açar, görmediklerin önce gelir. */

const SINAVLAR = ['2024_09', '2025_05', '2025_09', '2026_04'];
const tamId = k => 'hmgs_' + k;

export function sinavSorulari(i) {
  const k = SINAV_KONULARI[Number(i)];
  if (!k) return [];
  const gorulen = new Set(state().answers.map(a => a.qId));
  const qs = k.q.map(x => questionById.get(tamId(x))).filter(Boolean);
  return [...qs.filter(q => !gorulen.has(q.id)), ...qs.filter(q => gorulen.has(q.id))];
}
export function sinavKonuAdi(i) { return (SINAV_KONULARI[Number(i)] || {}).ad || 'Sınav konusu'; }

function sinavHTML() {
  const gorulen = new Set(state().answers.map(a => a.qId));
  const tum = ui.sinavTum;
  const satirlar = SINAV_KONULARI.map((k, i) => {
    const sinav = SINAVLAR.map(p => k.q.some(x => x.startsWith(p)));
    return { ...k, i, n: k.q.length, sinav, kac: sinav.filter(Boolean).length,
      cozulen: k.q.filter(x => gorulen.has(tamId(x))).length };
  })
    .filter(k => tum || k.d === cur.subjectId)
    .sort((a, b) => b.n - a.n || b.kac - a.kac);
  const liste = tum ? satirlar.slice(0, 24) : satirlar;
  const enCok = Math.max(1, ...liste.map(k => k.n));

  const kart = (k, sira) => `
    <article class="sk-kart">
      <div class="sk-ust">
        <span class="sk-sira">${sira + 1}</span>
        ${tum ? `<span class="sk-ders">${esc(subjectName(k.d))}</span>` : ''}
      </div>
      <h3 class="sk-ad">${esc(k.ad)}</h3>
      <div class="sk-olcu">
        <span class="sk-n"><b>${k.n}</b> soru</span>
        <span class="sk-bar"><i style="width:${Math.round((k.n / enCok) * 100)}%"></i></span>
      </div>
      <div class="sk-alt">
        <span class="sk-sinav" title="Hangi sınavlarda geldi">${k.sinav.map(v => `<i class="${v ? 'on' : ''}"></i>`).join('')}<span>${k.kac} sınavda</span></span>
        <span class="sk-coz-n">${k.cozulen === k.n ? 'hepsini gördün' : k.cozulen ? `${k.cozulen}/${k.n} görüldü` : ''}</span>
        <button class="btn btn-s${k.cozulen === k.n ? ' btn-2' : ''}" data-act="sinav-konu-coz" data-i="${k.i}">${k.cozulen === k.n ? 'Yeniden çöz' : 'Çöz'}</button>
      </div>
    </article>`;

  const s = SUBJECTS.find(x => x.id === cur.subjectId);
  return `
    <p class="fl-eyebrow">Dört sınav · 460 soru</p>
    <h2>Sınavda en çok sorulanlar</h2>
    <div class="sk-filtre" role="tablist">
      <button role="tab" class="${tum ? 'on' : ''}" aria-selected="${tum}" data-fl="sinav-tum" data-v="1">Bütün dersler</button>
      <button role="tab" class="${tum ? '' : 'on'}" aria-selected="${!tum}" data-fl="sinav-tum" data-v="0">${esc(s ? s.name : subjectName(cur.subjectId))}</button>
    </div>
    <div class="sk-grid">${liste.map(kart).join('') || '<p class="hint">Bu dersten sınavda soru gelmedi.</p>'}</div>`;
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

/* ---------- madde temizliği ----------
   HMGS kanun maddesinin numarasını sormuyor; okurken göz de takılmasın.
   Sayılar (süre, yeter sayı, tutar) kalır, yalnız "m. 12" türü künye gider. */
const MADDE_PAREN = /\s*\((?:[^()]*?(?:\bm\.|\bmd\.|\bmadde|sayılı|\bsk\b)\s*\d[^()]*|[A-ZÇĞİÖŞÜ]{2,6}\s*\d[\d\/]*)\)/g;
const MADDE_ONEK = /(?:\d{3,4}\s*sayılı\s*[^,.;]{0,40}?\s*)?(?:(?<![A-Za-zÇĞİÖŞÜçğıöşü])[A-ZÇĞİÖŞÜ]{2,6}\s+)?(?<![A-Za-zçğıöşü])(?:[mM]\.|md\.|madde)\s*\d[\dIVX\/.,\-–&\s]*(?:ve\s*\d[\d\/]*\s*)?(?:uyarınca|gereğince|hükmüne göre|hükmü gereği|kapsamında|uyarinca|’(?:ye|ya|e|a)\s*göre|'(?:ye|ya|e|a)\s*göre)\s*,?\s*/g;
const MADDE_CIPLAK = /\s*[,;]?\s*(?<![A-Za-zÇĞİÖŞÜçğıöşü])(?:[A-ZÇĞİÖŞÜ]{2,6}\s+)?(?<![A-Za-zçğıöşü])[mM]d?\.\s*\d[\dIVX\/\-–]*(?:[.,]\d+)*(?:\s*(?:&|ve|,)\s*(?:[mM]\.\s*)?\d[\dIVX\/\-–]*)*(?:['’][a-zçğıöşü]{1,4})?/g;
function maddesiz(s) {
  let out = String(s || '')
    .replace(/`[^`]*\bm\.\s*\d[^`]*`/g, '')
    .replace(MADDE_PAREN, '')
    .replace(MADDE_ONEK, '')
    .replace(MADDE_CIPLAK, '')
    .replace(/\(\s*[,;&]?\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/^[\s,;:]+/, '')
    .replace(/(^|[.!?]\s+)([a-zçğıöşü])/g, (m, a, b) => a + b.toLocaleUpperCase('tr'))
    .trim();
  return out;
}
/** "TMK m. 8 & m. 28 — Hak Ehliyeti" → "Hak Ehliyeti"; yalnız künyeyse boş. */
function refBaslik(ref) {
  const parca = String(ref || '').split(/\s+[—–]\s+/);
  const kuyruk = parca.length > 1 ? parca.slice(1).join(' – ') : '';
  const b = maddesiz(kuyruk || (/\bm\.\s*\d/.test(parca[0]) ? '' : parca[0]));
  return b.replace(/^[-–—:\s]+/, '');
}
const temizBaslik = title => maddesiz(topicHeading(title)).replace(/\s*[-–—:]\s*$/, '');

/* ---------- sade okuma (topics.js → t.sade) ----------
   sade = { giris, bloklar:[{ b, m, o }], tuzak:[...], akil }
   b başlık · m anlatım (richBlock) · o örnek olay */
function sadeHTML(t, list, i, qs) {
  const S = t.sade;
  return `
    <p class="fl-eyebrow">${esc(subjectName(t.subjectId))} · Konu ${i + 1} / ${list.length}</p>
    <h2>${esc(S.baslik || temizBaslik(t.title))}</h2>
    ${S.giris ? `<p class="sd-giris">${rich(S.giris)}</p>` : ''}
    ${seritHTML(t.subjectId)}
    ${(S.bloklar || []).map((k, n) => `
      <section class="sd-blok">
        <h3><span class="sd-no">${n + 1}</span>${esc(k.b)}</h3>
        ${richBlock(k.m || '')}
        ${k.o ? `<div class="sd-olay"><span class="lbl">Örnek olay</span><p>${rich(k.o)}</p></div>` : ''}
      </section>`).join('')}
    <div class="visual-slot" id="visual-slot" data-v3="true"></div>
    ${(S.tuzak || []).length ? `<div class="trap sd-tuzak">
      <div class="lbl">Sınavda dikkat</div>
      <ul>${S.tuzak.map(x => `<li>${rich(x)}</li>`).join('')}</ul>
    </div>` : ''}
    ${S.akil ? `<div class="sd-akil"><span class="lbl">Akılda kalsın</span><p>${rich(S.akil)}</p></div>` : ''}
    <div class="flow-end">
      ${qs.length
        ? `<button class="btn" data-act="flow-practice" data-topic="${esc(t.id)}">Bu konunun ${qs.length} sorusunu çöz</button>`
        : `<button class="btn btn-2" data-act="flow-practice-subject" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} sorularını çöz</button>`}
      <button class="btn btn-2" data-act="akim-ders-start" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} akışı</button>
    </div>
    ${pagerHTML(list, i)}`;
}

function topicHTML(t, list) {
  const qs = questionsOfTopic(t.id);
  if (t.sade && Array.isArray(t.sade.bloklar)) {
    return sadeHTML(t, list, list.findIndex(x => x.id === t.id), qs);
  }
  const m = topicMastery(t.id);
  const lab = MASTERY_LABEL[m.state];
  const isV3 = V3_TYPES.has(t.visualType);
  const i = list.findIndex(x => x.id === t.id);

  return `
    <p class="fl-eyebrow">${esc(subjectName(t.subjectId))} · Konu ${i + 1} / ${list.length}</p>
    <h2>${esc(temizBaslik(t.title))}</h2>

    ${seritHTML(t.subjectId)}

    ${m.state !== 'none' ? `<div class="fl-chips">
      <span class="chip ${lab.chip}"><span class="dot ${lab.dot}"></span>${lab.txt}</span>
      ${m.n ? `<span class="chip">${m.n} çözüm · %${Math.round(m.acc * 100)} doğru · ${Math.round(m.medianSec)} sn</span>` : ''}
    </div>` : ''}

    ${kitapPaneliHTML(t.subjectId)}

    ${kitapVar(t.subjectId) ? ozetEtiketiHTML(t.subjectId) : ''}
    ${(t.chunks || []).map(c => `
      <section>
        ${refBaslik(c.legalRef) ? `<h3 class="sd-h">${esc(refBaslik(c.legalRef))}</h3>` : ''}
        ${richBlock(maddesiz(c.text || ''))}
        ${c.detail ? detailHTML(maddesiz(c.detail)) : ''}
      </section>`).join('')}

    <div class="visual-slot" id="visual-slot" data-v3="${isV3}"></div>
    ${t.visualExtra ? '<div class="visual-slot" id="visual-slot-extra" data-v3="true"></div>' : ''}

    ${(t.examTraps || []).map(tr => `
      <div class="trap">
        <div class="lbl">Sınav tuzağı</div>
        <p>${rich(maddesiz(typeof tr === 'string' ? tr : (tr.desc || tr.text || tr.trap || tr.title || '')))}</p>
      </div>`).join('')}

    ${t.interactiveCase ? caseHTML(t.interactiveCase) : ''}

    <div class="flow-end">
      ${qs.length
        ? `<button class="btn" data-act="flow-practice" data-topic="${esc(t.id)}">Bu konunun ${qs.length} sorusunu çöz</button>`
        : `<button class="btn btn-2" data-act="flow-practice-subject" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} sorularını çöz</button>`}
      <button class="btn btn-2" data-act="akim-ders-start" data-subject="${esc(t.subjectId)}">${esc(subjectName(t.subjectId))} akışı</button>
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
        <p>${rich(maddesiz(c.scenario || ''))}</p>
        ${c.question ? `<p><strong>${rich(maddesiz(c.question))}</strong></p>` : ''}
        <div class="reveal-box" style="margin:0.5rem 0 0">
          <button data-act="reveal">
            <span>${esc(c.solutionTitle || 'Çözüm')}</span>
            <span class="hint">göster</span>
          </button>
          <div style="display:none">${rich(maddesiz(c.solutionText || ''))}</div>
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
    else if (fl === 'mod-oku') { ui.sinav = false; render(); }
    else if (fl === 'mod-sinav') { ui.sinav = true; ui.menu = false; render(); scrollTo({ top: 0 }); }
    else if (fl === 'sinav-tum') { ui.sinavTum = el.dataset.v === '1'; render(); }
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
  if (t.sade && !isV3) { slot.remove(); return; }

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
