/* ==========================================================================
   views/exam.js — 120 SORULUK SINAV SİMÜLASYONU
   Gerçek ders dağılımı · geri sayım · boş bırakma · soru haritası
   Kural: HMGS'de yanlış cezası yoktur → net = doğru. Asla boş bırakma.
   ========================================================================== */

import { esc, rich, splitStem, fmtClock, emptyState, $, toast } from '../ui.js';
import { buildExamSet, subjectName, SUBJECTS, topicById, pastExamList, pastExamQuestions } from '../data.js';
import { recordAnswer, save, saveExam, state, EXAM_TOTAL, PASS_CORRECT } from '../store.js';
import { scheduleAfterAnswer, scoreOf } from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';
import { bookLocationFor, NO_BOOK_SUBJECTS } from '../book-map.js';

/** ÖSYM HMGS: 120 soru / 150 dakika. */
const DURATION_MS = 150 * 60 * 1000;

let E = null;
let clock = null;
let lastResult = null;

export function start() {
  const checkbox = document.getElementById('exam-only-tagged');
  const onlyTagged = checkbox ? checkbox.checked : false;
  const { questions, shortfall } = buildExamSet(onlyTagged);
  return beginExam(questions, { shortfall, label: onlyTagged ? 'Karma deneme (Konu Etiketli)' : 'Karma deneme', real: null });
}

/**
 * Gerçek bir HMGS sınavını olduğu gibi (orijinal soru sırasıyla, karıştırmadan)
 * baştan sona çözer — resmi sınav koşulunun taklidi. `sourceId` verilmezse
 * elde bulunan tüm çıkmış sorular tek sette birleşir.
 */
export function startReal(sourceId) {
  const questions = pastExamQuestions(sourceId);
  if (questions.length < 20) {
    toast('Bu sınav için havuz çok küçük.');
    return false;
  }
  const list = pastExamList();
  const label = sourceId
    ? (list.find(x => x.id === sourceId)?.label || 'Gerçek deneme')
    : 'Çıkmış sorular (tüm sınavlar)';
  return beginExam(questions, { shortfall: [], label, real: sourceId || 'all' });
}

function beginExam(questions, { shortfall, label, real }) {
  if (questions.length < 20) {
    toast('Deneme için havuz çok küçük.');
    return false;
  }
  E = {
    questions,
    i: 0,
    answers: new Array(questions.length).fill(null),  // 'A'..'E' veya null = boş
    marked: new Set(),
    times: new Array(questions.length).fill(0),
    qStart: performance.now(),
    startedAt: Date.now(),
    endsAt: Date.now() + DURATION_MS,
    shortfall,
    label,
    real,
    finished: false
  };
  if (shortfall.length) {
    const miss = shortfall.reduce((a, s) => a + (s.want - s.got), 0);
    toast(`Havuz yetersiz: ${miss} soru eksik. Deneme ${questions.length} soruyla kuruldu.`);
  }
  render();
  return true;
}

export function active() { return !!E && !E.finished; }

export function render() {
  const host = $('#view-exam');
  if (!host) return;

  if (!E) {
    const reals = pastExamList();
    host.innerHTML = `<div class="wrap">
      <h1 class="page">Deneme sınavı</h1>
      <p class="page-sub">150 dakika · tek oturum · yarıda bırakırsan sonuç kaydedilmez</p>
      ${lastResult ? resultBlock(lastResult, true) : ''}

      ${reals.length ? `
      <div class="card" style="margin-top:1.25rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.4rem">Gerçek çıkmış sınavlar</h3>
        <p style="font-size:0.9rem;color:var(--ink-2);margin-bottom:0.9rem">
          Uydurma soru yok — resmi HMGS sınav kağıdı, orijinal soru sırasıyla, aynı süre baskısı altında.
        </p>
        <div class="btn-row">
          ${reals.map(r => `<button class="btn" data-act="exam-start-real" data-source="${esc(r.id)}">${esc(r.label)} çöz · ${r.count} soru</button>`).join('')}
        </div>
      </div>` : ''}

      <div class="card" style="margin-top:1.25rem">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.6rem">Karma deneme</h3>
        <p style="font-size:0.9rem;color:var(--ink-2);margin-bottom:0.9rem">
          120 soru · gerçek ders dağılımına göre soru bankasından karışık kurulur (çıkmış sorular ile aynı değil).
        </p>
        <p style="font-size:0.9rem;color:var(--ink-2);margin-bottom:1.2rem">
          <strong>HMGS'de yanlış cezası yoktur.</strong> Bilmediğin soruda bile en olası şıkkı işaretlemek her zaman
          boş bırakmaktan iyidir. Sonuç raporunda boş bıraktığın soru varsa uyarılacaksın.
        </p>
        <div style="margin-bottom:1.2rem; display:flex; align-items:center; gap:0.5rem; font-size:0.9rem;">
          <input type="checkbox" id="exam-only-tagged" style="width:1.2rem; height:1.2rem; margin:0; accent-color:var(--accent);" checked>
          <label for="exam-only-tagged" style="color:var(--ink-1); cursor:pointer; font-weight:500;">Sadece konusu belli olan (kalite güvenceli) sorulardan oluştur</label>
        </div>
        <button class="btn btn-2" data-act="exam-start">Karma denemeyi başlat</button>
      </div>
    </div>`;
    return;
  }

  if (E.finished) { host.innerHTML = `<div class="wrap">${resultBlock(lastResult, false)}</div>`; return; }

  const q = E.questions[E.i];
  const { premise, ask } = splitStem(q.stem);
  const chosen = E.answers[E.i];
  const answeredCount = E.answers.filter(a => a !== null).length;

  host.innerHTML = `
    <div class="wrap">
      <div class="exam-bar">
        <span class="exam-clock" id="exam-clock">${fmtClock(E.endsAt - Date.now())}</span>
        ${E.real ? `<span class="chip accent">${esc(E.label)}</span>` : ''}
        <span class="chip">${answeredCount} / ${E.questions.length} işaretli</span>
        <button class="btn btn-2 btn-s" data-act="exam-finish">Sınavı bitir</button>
        <div class="exam-map" id="exam-map">
          ${E.questions.map((_, i) => `<button data-act="exam-goto" data-i="${i}"
            class="${E.answers[i] !== null ? 'answered' : ''} ${E.marked.has(i) ? 'marked' : ''} ${i === E.i ? 'now' : ''}"
            title="Soru ${i + 1}">${i + 1}</button>`).join('')}
        </div>
      </div>

      <div class="wrap-read">
        <div class="q-head">
          <span>Soru ${E.i + 1} / ${E.questions.length}</span>
          <span>${esc(subjectName(q.subjectId))}</span>
          <button class="btn btn-2 btn-s" data-act="exam-mark" style="margin-left:auto">
            ${E.marked.has(E.i) ? 'İşareti kaldır' : 'Sonra dön'}
          </button>
        </div>

        <div class="card">
          ${premiseHTML(premise)}
          <div class="q-ask">${rich(ask)}</div>
          <div class="opts" id="exam-opts">
            ${q.options.map(o => optionRowHTML(o, { pickAct: 'exam-pick', extraClass: chosen === o.key ? 'pick-ok' : '' })).join('')}
          </div>
        </div>

        <div class="btn-row" style="margin-top:1.25rem">
          <button class="btn btn-2" data-act="exam-prev" ${E.i === 0 ? 'disabled' : ''}>Önceki</button>
          <button class="btn" data-act="exam-next" ${E.i >= E.questions.length - 1 ? 'disabled' : ''}>Sonraki</button>
          ${chosen ? `<button class="btn btn-2 btn-s" data-act="exam-clear">İşareti sil</button>` : ''}
          <span class="hint" style="margin-left:auto">Sınav sırasında çözüm gösterilmez</span>
        </div>
      </div>
    </div>`;

  E.qStart = performance.now();
  startClock();
}

function startClock() {
  stopClock();
  clock = setInterval(() => {
    if (!E || E.finished) return stopClock();
    const left = E.endsAt - Date.now();
    const el = $('#exam-clock');
    if (el) {
      el.textContent = fmtClock(left);
      el.classList.toggle('danger', left < 10 * 60 * 1000);
    }
    if (left <= 0) { toast('Süre doldu.'); finish(true); }
  }, 500);
}
function stopClock() { if (clock) { clearInterval(clock); clock = null; } }

/* ---------- etkileşim ---------- */

function accrueTime() {
  if (!E) return;
  E.times[E.i] += performance.now() - E.qStart;
  E.qStart = performance.now();
}

export function pick(key) {
  if (!E || E.finished) return;
  accrueTime();
  E.answers[E.i] = key;
  if (E.i < E.questions.length - 1) { E.i += 1; render(); }
  else render();
}

export function clear() { if (E) { E.answers[E.i] = null; render(); } }

/* ---------- şık / öncül eleme (görsel, cevap kaydı değil) ---------- */

export function eliminateOption(key) {
  if (!E || E.finished) return;
  toggleOption('#view-exam', key);
}

export function eliminatePremise(numeral) {
  if (!E || E.finished) return;
  togglePremise('#view-exam', numeral);
}
export function mark() {
  if (!E) return;
  E.marked.has(E.i) ? E.marked.delete(E.i) : E.marked.add(E.i);
  render();
}
export function goto(i) { if (E) { accrueTime(); E.i = Math.max(0, Math.min(E.questions.length - 1, i)); render(); } }
export function prev() { goto(E ? E.i - 1 : 0); }
export function next() { goto(E ? E.i + 1 : 0); }

export function finish(auto = false) {
  if (!E || E.finished) return;
  const blanks = E.answers.filter(a => a === null).length;
  if (!auto && blanks > 0) {
    if (!confirm(`${blanks} soruyu boş bıraktın. HMGS'de yanlış cezası yok — boş bırakmak her zaman kayıptır.\n\nYine de bitirmek istiyor musun?`)) return;
  }
  accrueTime();
  stopClock();

  // Her cevabı telemetriye ve SRS'e işle
  const bySubject = {};
  const byTopic = {};
  let correct = 0;
  E.questions.forEach((q, i) => {
    const chosen = E.answers[i];
    const ok = chosen === q.correct;
    if (ok) correct++;
    recordAnswer(q, chosen, E.times[i] || 0, 'exam');
    scheduleAfterAnswer(q.id, ok);
    const k = q.subjectId;
    bySubject[k] = bySubject[k] || { total: 0, correct: 0, blank: 0 };
    bySubject[k].total++;
    if (ok) bySubject[k].correct++;
    if (chosen === null) bySubject[k].blank++;

    // Konu bazlı kırılım: topicId varsa onunla, yoksa derse ait "etiketsiz" havuzla grupla.
    const hasTopic = q.topicId && topicById.has(q.topicId);
    const tKey = hasTopic ? q.topicId : `__untagged__${q.subjectId}`;
    byTopic[tKey] = byTopic[tKey] || { subjectId: q.subjectId, topicId: hasTopic ? q.topicId : null, total: 0, correct: 0, blank: 0 };
    byTopic[tKey].total++;
    if (ok) byTopic[tKey].correct++;
    if (chosen === null) byTopic[tKey].blank++;
  });

  const total = E.questions.length;
  const sc = scoreOf(correct, total);
  const result = {
    at: new Date().toISOString(),
    label: E.label,
    real: E.real,
    durationMs: Date.now() - E.startedAt,
    total, correct,
    wrong: E.answers.filter((a, i) => a !== null && a !== E.questions[i].correct).length,
    blank: blanks,
    net: sc.net,
    points: sc.points,
    pass: sc.pass,
    bySubject,
    byTopic,
    shortfall: E.shortfall,
    wrongIds: E.questions.filter((q, i) => E.answers[i] !== q.correct).map(q => q.id)
  };

  saveExam(result);
  save();
  lastResult = result;
  E.finished = true;
  render();
}

/* ---------- sonuç ---------- */

function resultBlock(r, compact) {
  if (!r) return '';
  const pctPass = Math.min(100, Math.round((r.correct / PASS_CORRECT) * 100));
  const rows = SUBJECTS.map(s => {
    const b = r.bySubject[s.id];
    if (!b) return null;
    const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0;
    return { s, b, acc };
  }).filter(Boolean).sort((a, b) => a.acc - b.acc);

  return `
    ${compact ? `<div class="section-label">Son deneme${r.label ? ' · ' + esc(r.label) : ''}</div>` : '<h1 class="page">Deneme sonucu</h1><p class="page-sub">' + (r.label ? esc(r.label) + ' · ' : '') + new Date(r.at).toLocaleString('tr-TR') + ' · ' + fmtClock(r.durationMs) + ' sürdü</p>'}
    <div class="card">
      <div class="result-hero">
        <div class="result-net ${r.pass ? 'pass' : 'fail'}">${r.net}</div>
        <div class="result-label">net · ${r.points} puan · baraj ${PASS_CORRECT} net (70 puan)</div>
        <div class="track ${r.pass ? 'ok' : 'no'}" style="max-width:22rem;margin:1.25rem auto 0"><i style="width:${pctPass}%"></i></div>
        <p style="font-size:0.88rem;color:var(--ink-2);margin-top:0.9rem">
          ${r.pass
            ? `Baraj üstündesin. Güvenlik payı için hedef 95+ net — barajın hemen üstü, sınav günü dalgalanmasına karşı ince bir tampon.`
            : `Baraj için ${PASS_CORRECT - r.correct} net daha gerekiyor. Bu bir baz ölçüm; düşük çıkması normal, ölçülmemiş olması riskliydi.`}
        </p>
      </div>

      <div class="grid grid-3" style="margin-top:0.5rem">
        <div class="metric"><div class="metric-k">Doğru</div><div class="metric-v" style="color:var(--ok)">${r.correct}</div></div>
        <div class="metric"><div class="metric-k">Yanlış</div><div class="metric-v" style="color:var(--no)">${r.wrong}</div></div>
        <div class="metric"><div class="metric-k">Boş</div><div class="metric-v" style="color:${r.blank ? 'var(--warn)' : 'var(--ink-3)'}">${r.blank}</div></div>
      </div>

      ${r.blank > 0 ? `<div class="trap" style="margin-top:1.25rem"><div class="lbl">Boş bırakma uyarısı</div>
        <p>${r.blank} soruyu boş bıraktın. HMGS'de yanlış cezası olmadığı için boş bırakılan her soru garantili kayıptır —
        rastgele işaretlemede bile beklenen kazanç ${Math.round(r.blank / 5)} net. Bir dahaki denemede hepsini işaretle.</p></div>` : ''}

      ${r.shortfall && r.shortfall.length ? `<div class="trap" style="margin-top:1.25rem"><div class="lbl">Havuz eksiği</div>
        <p>Bu deneme gerçek dağılımı tam kuramadı — ${r.shortfall.map(s => `${esc(s.subject)} ${s.got}/${s.want}`).join(', ')}.
        Net, eksik dersler yüzünden olduğundan farklı okunabilir.</p></div>` : ''}

      <div class="section-label">Ders kırılımı · en zayıftan</div>
      <table class="tbl">
        <thead><tr><th>Ders</th><th class="num">Doğru</th><th class="num">Soru</th><th class="num">Başarı</th><th class="num">Boş</th></tr></thead>
        <tbody>
          ${rows.map(({ s, b, acc }) => `<tr>
            <td>${esc(s.name)}</td>
            <td class="num">${b.correct}</td>
            <td class="num">${b.total}</td>
            <td class="num" style="color:${acc >= 70 ? 'var(--ok)' : acc >= 50 ? 'var(--warn)' : 'var(--no)'};font-weight:600">%${acc}</td>
            <td class="num">${b.blank || '–'}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      ${topicBreakdownHTML(r)}

      <div class="btn-row" style="margin-top:1.5rem">
        <button class="btn" data-act="go-today">Bugün ekranına dön</button>
        <button class="btn btn-2" data-act="exam-review-wrong">Yanlışları hemen çöz (${r.wrongIds.length})</button>
        <button class="btn btn-2" data-act="exam-export-stats" style="background:#2563eb;color:#fff;font-weight:700">📋 Takip Uygulamasına Aktar (Kopyala)</button>
      </div>
    </div>`;
}

/**
 * Konu bazlı kırılım — ders kırılımının altına, daha ince taneli.
 * topicId'si olmayan sorular derse ait "etiketsiz" havuzda toplanır ve
 * ayrı, açıkça işaretli bir satır olarak gösterilir (uydurma konu adı yok).
 * Kitap sütunu book-map.js'teki gerçek içindekiler dökümünden gelir;
 * karşılığı olmayan derste "–" yazılır, sessizce bir şey uydurulmaz.
 */
function topicBreakdownHTML(r) {
  const byTopic = r.byTopic;
  if (!byTopic || !Object.keys(byTopic).length) return '';

  const topicRows = Object.entries(byTopic).map(([key, b]) => {
    const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0;
    const topic = b.topicId ? topicById.get(b.topicId) : null;
    const title = topic ? topic.title : `${subjectName(b.subjectId)} — konu etiketi yok`;
    const loc = bookLocationFor(b.topicId, b.subjectId);
    const noBookData = !b.topicId ? null : NO_BOOK_SUBJECTS.has(b.subjectId);
    return { key, subjectName: subjectName(b.subjectId), title, b, acc, loc, untagged: !b.topicId, noBookData };
  }).sort((a, b) => a.acc - b.acc || a.subjectName.localeCompare(b.subjectName, 'tr'));

  return `
    <div class="section-label">Konu kırılımı · en zayıftan</div>
    <table class="tbl">
      <thead><tr><th>Konu</th><th>Ders</th><th class="num">Doğru</th><th class="num">Soru</th><th class="num">Başarı</th><th>Kitapta bak</th></tr></thead>
      <tbody>
        ${topicRows.map(t => `<tr${t.untagged ? ' style="opacity:0.7"' : ''}>
          <td>${esc(t.title)}</td>
          <td>${esc(t.subjectName)}</td>
          <td class="num">${t.b.correct}</td>
          <td class="num">${t.b.total}</td>
          <td class="num" style="color:${t.acc >= 70 ? 'var(--ok)' : t.acc >= 50 ? 'var(--warn)' : 'var(--no)'};font-weight:600">%${t.acc}</td>
          <td style="font-size:0.85rem;color:var(--ink-2)">${t.loc ? esc(t.loc) : (t.untagged ? 'konu etiketi yok' : 'kitap verisi henüz eklenmedi')}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="hint" style="margin-top:0.6rem">
      "Konu etiketi yok" satırları karma denemede kullanılan, henüz tek bir alt konuya bağlanmamış sorulardır — bunlarda ders bazlı kırılıma bak.
      Gerçek çıkmış sınavlarda bu oran daha düşük, konu kırılımı orada daha güvenilir.
    </p>`;
}

export function wrongIdsOfLast() { return lastResult ? lastResult.wrongIds : []; }
export function reset() { E = null; stopClock(); }

export function exportStats() {
  if (!lastResult) { toast('Aktarılacak son deneme sonucu bulunamadı.'); return; }
  const r = lastResult;
  const wrongAnalysis = [];

  if (r.byTopic) {
    Object.entries(r.byTopic).forEach(([key, b]) => {
      const wrongCount = b.total - b.correct - (b.blank || 0);
      if (wrongCount > 0) {
        const topicObj = b.topicId ? topicById.get(b.topicId) : null;
        const topicTitle = topicObj ? topicObj.title : (b.topicId || 'Genel / Etkileşimsiz');
        const sName = subjectName(b.subjectId);
        wrongAnalysis.push({
          subject: sName,
          topic: topicTitle,
          wrongCount: wrongCount,
          note: ''
        });
      }
    });
  }

  const exportPayload = {
    source: 'HMGS_STUDIO',
    type: 'HMGS_STUDIO_EXAM_EXPORT',
    exportedAt: new Date().toISOString(),
    title: r.label || 'HMGS Stüdyo Denemesi',
    date: r.at ? r.at.split('T')[0] : new Date().toISOString().split('T')[0],
    durationMinutes: Math.round((r.durationMs || 0) / 60000),
    totalQ: r.total || 120,
    correct: r.correct || 0,
    wrong: r.wrong || 0,
    empty: r.blank || 0,
    net: r.net || 0,
    wrongAnalysis: wrongAnalysis
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    toast('📋 Deneme istatistikleri panoya kopyalandı! Takip uygulamasından yapıştırabilirsiniz.');
  }).catch(() => {
    prompt('İstatistikleri kopyalayın:', jsonStr);
  });
}
