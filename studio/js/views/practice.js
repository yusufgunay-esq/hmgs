/* ==========================================================================
   views/practice.js — SÜRE ÖLÇEN SORU MOTORU
   Her cevap telemetriye yazılır, SRS'e işlenir. Süre ölçümü pazarlıksızdır.
   ========================================================================== */

import { esc, rich, richBlock, splitStem, fmtSec, emptyState, $, toast } from '../ui.js';
import { subjectName, questionsOf, questionsOfTopic, questionsOfTopics, shuffle, topicById, pastExamQuestions } from '../data.js';
import { recordAnswer, markLastAnswerLogic, save, saveSession, state, TARGET_SEC } from '../store.js';
import { scheduleAfterAnswer, reScheduleAsLogic, dueQuestions, unseenQuestions, buildKarmaSet } from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';

let S = null;   // aktif seans
let tick = null;

/** Seans kur. opts: { mode, subjectId, topicId, topicIds, count, customLabel, targetScope } */
export function startSession(opts = {}) {
  const { mode = 'mixed', subjectId = null, topicId = null, topicIds = null, count = 15, customLabel = null, targetScope = 'core' } = opts;
  let pool = [];
  let label = '';

  let karmaMeta = null;

  if (mode === 'karma') {
    // Sınav biçimli harmanlanmış set: ders payı ölçülmüş sınav dağılımından
    const built = buildKarmaSet(count, targetScope);
    pool = built.questions;
    karmaMeta = { plan: built.plan, due: built.due, gaps: built.gaps };
    label = customLabel || 'Karma set';
  } else if (mode === 'review') {
    let due = dueQuestions();
    if (subjectId) due = due.filter(d => d.q.subjectId === subjectId);
    pool = due.map(d => d.q);
    if (targetScope === 'core') {
      const coreOnly = pool.filter(q => q.examTarget === 'hmgs_core');
      if (coreOnly.length) pool = coreOnly;
    }
    label = subjectId ? `Tekrar · ${subjectName(subjectId)}` : 'Tekrar seansı';
  } else if (mode === 'topics' && Array.isArray(topicIds) && topicIds.length) {
    pool = shuffle(questionsOfTopics(topicIds, targetScope));
    if (!pool.length && targetScope === 'core') pool = shuffle(questionsOfTopics(topicIds, 'all'));
    const titles = topicIds.map(id => topicById.get(id)?.title).filter(Boolean);
    label = customLabel || (titles.length === 1 ? titles[0] : (titles.length ? `${titles[0]} (+${titles.length - 1} konu)` : 'Seçili Konular'));
  } else if (mode === 'topic' || (topicId && mode !== 'subject' && mode !== 'pastExam' && mode !== 'review')) {
    pool = shuffle(questionsOfTopic(topicId, targetScope));
    if (!pool.length && targetScope === 'core') pool = shuffle(questionsOfTopic(topicId, 'all'));
    label = customLabel || topicById.get(topicId)?.title || 'Konu soruları';
  } else if (mode === 'subject') {
    pool = shuffle(questionsOf(subjectId, targetScope));
    if (!pool.length && targetScope === 'core') pool = shuffle(questionsOf(subjectId, 'all'));
    label = customLabel || subjectName(subjectId);
  } else if (mode === 'unseen') {
    let unseen = unseenQuestions(subjectId);
    if (targetScope === 'core') {
      const coreOnly = unseen.filter(q => q.examTarget === 'hmgs_core');
      if (coreOnly.length) unseen = coreOnly;
    }
    pool = shuffle(unseen);
    label = 'Yeni sorular';
  } else if (mode === 'pastExam') {
    pool = shuffle(pastExamQuestions());
    label = 'Çıkmış sorular · karışık pratik';
  } else {
    let raw = subjectId ? questionsOf(subjectId, targetScope) : allQuestions();
    if (targetScope === 'core') {
      const coreOnly = raw.filter(q => q.examTarget === 'hmgs_core');
      if (coreOnly.length) raw = coreOnly;
    }
    pool = shuffle(raw);
    label = customLabel || (subjectId ? subjectName(subjectId) : 'Karma set');
  }

  if (!pool.length) {
    S = null;
    render();
    toast('Bu kriterde çözülecek soru yok.');
    return false;
  }

  // Ders adı cevaptan önce gizlenir: sınavda da yazmıyor. Soruya bakıp hangi
  // dersin kuralı olduğunu seçmek işin yarısı; etiket gösterilirse o yarı
  // bedava veriliyor ve karma setin tek kazancı kayboluyor.
  const hideSubject = (mode === 'karma' || mode === 'pastExam');

  S = {
    mode, label, count, subjectId, topicId, karmaMeta, hideSubject, targetScope,
    questions: pool.slice(0, Math.max(1, count)),
    i: 0,
    answered: false,
    startedAt: performance.now(),
    qStart: performance.now(),
    log: [],
    summarySaved: false
  };
  render();
  return true;
}

function allQuestions() {
  return (window.QUESTIONS_DATA || []);
}

export function hasSession() { return !!S && S.i < S.questions.length; }
export function endSession() {
  S = null;
  stopTick();
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('in-session');
  }
}

/* ---------- render ---------- */

export function render() {
  const host = $('#view-practice');
  if (!host) return;

  if (!S) {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('in-session');
    }
    host.innerHTML = `<div class="wrap">${emptyState({
      icon: '◦',
      title: 'Açık bir seans yok',
      body: 'Bugün ekranındaki öneriyle başlamak en verimlisi — ne çalışacağına karar vermek de enerji harcar.',
      cta: { act: 'go-today', label: 'Bugün ekranına dön' }
    })}
    <div class="card" style="margin-top:1rem">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.4rem">Soru Havuzu ve Hızlı Pratik</h3>
      <p style="font-size:0.9rem;color:var(--ink-2);margin-bottom:0.9rem">
        Sınava kalan kritik günlerde doğrudan HMGS sınav ayarındaki sorularla çalışabilir veya ileri düzey (Hakimlik) sorularıyla derinleşebilirsin.
      </p>
      <div class="btn-row" style="display:flex;gap:0.5rem;flex-wrap:wrap">
        <button class="btn btn-2" data-act="practice-core-karma">HMGS Çekirdek Karma (20 Soru)</button>
        <button class="btn btn-2" data-act="practice-all-karma">Tüm Havuz Karma (İleri Dahil)</button>
        <button class="btn btn-2" data-act="practice-pastexam">Çıkmış Soruları Çöz</button>
      </div>
    </div></div>`;
    return;
  }

  if (S.i >= S.questions.length) {
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('in-session');
    }
    renderSummary(host);
    return;
  }

  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.add('in-session');
  }

  const q = S.questions[S.i];
  const { premise, ask } = splitStem(q.stem);
  const prog = ((S.i) / S.questions.length) * 100;
  const topic = q.topicId ? topicById.get(q.topicId) : null;

  host.innerHTML = `
    <div class="q-screen">
      <div class="q-strip">
        <div class="q-strip-left">
          <button class="btn btn-2 btn-s" data-act="quit" title="Seansı bitir">
            <span class="q-quit-x">✕</span>
            <span>Bitir</span>
          </button>
          <span class="q-strip-subj" id="q-subj">${S.hideSubject ? '<span class="hint">ders gizli</span>' : esc(subjectName(q.subjectId))}</span>
          ${q.examTargetLabel ? `<span class="chip ${q.examTarget === 'hmgs_core' ? 'accent' : 'warn'}">${esc(q.examTargetLabel)}</span>` : ''}
        </div>
        <div class="q-strip-center">
          <div class="q-progress-box">
            <div class="q-progress-track"><div class="q-progress-bar" style="width:${prog}%"></div></div>
            <span class="q-progress-count">${S.i + 1} / ${S.questions.length}</span>
          </div>
        </div>
        <div class="q-strip-right">
          <span class="chip accent">${esc(S.label)}</span>
          ${q.difficulty && q.difficulty !== 'etiketsiz' ? `<span class="chip">${esc(q.difficulty)}</span>` : ''}
          <span class="q-timer" id="q-timer">0 sn</span>
          <button class="icon-btn" data-act="toggle-font-size" title="Metin Boyutunu Değiştir" aria-label="Metin boyutu">
            <span style="font-family:var(--sans);font-size:0.72rem;font-weight:700">A±</span>
          </button>
          <button class="icon-btn" data-act="toggle-theme" title="Karanlık / Aydınlık Tema" aria-label="Tema değiştir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
      </div>

      <div class="q-shell" id="q-shell">
        <div class="q-main">
          <div class="card q-card">
            ${premiseHTML(premise)}
            <div class="q-ask">${rich(ask)}</div>
            <div class="opts" id="opts">
              ${q.options.map(o => optionRowHTML(o, { pickAct: 'pick' })).join('')}
            </div>
          </div>

          <div class="q-main-foot" id="q-actions">
            <button class="btn btn-2 btn-s" data-act="dontknow">Bilmiyorum · çözümü göster</button>
            <button class="btn btn-2 btn-s" data-act="ask-gemini" title="Kavramı ve soruyu Gemini için kopyala (G)">Gemini'ye Sor <span class="kbd">G</span></button>
            <button class="btn btn-2 btn-s" data-act="quit">Seansı bitir</button>
            <span class="hint">
              <span class="kbd">A</span>–<span class="kbd">E</span> seç · <span class="kbd">G</span> Gemini · <span class="kbd">Enter</span> devam
            </span>
          </div>
          ${topic ? `<p class="hint q-topic-hint">Bağlı konu: ${esc(topic.title)}</p>` : ''}
        </div>
        <aside class="q-side"><div id="fb"></div></aside>
      </div>
    </div>`;

  S.answered = false;
  S.qStart = performance.now();
  startTick();
}

function startTick() {
  stopTick();
  tick = setInterval(() => {
    if (!S || S.answered) return;
    const el = $('#q-timer');
    if (!el) return;
    const sec = (performance.now() - S.qStart) / 1000;
    el.textContent = fmtSec(sec);
    el.classList.toggle('slow', sec > TARGET_SEC);
  }, 250);
}
function stopTick() { if (tick) { clearInterval(tick); tick = null; } }

/* ---------- cevaplama ---------- */

export function pick(key) {
  if (!S || S.answered) return;
  const q = S.questions[S.i];
  const ms = performance.now() - S.qStart;
  S.answered = true;
  stopTick();

  const row = recordAnswer(q, key, ms, S.mode === 'review' ? 'review' : 'practice');
  const sched = scheduleAfterAnswer(q.id, row.ok);
  save();
  S.log.push({ ...row, sched });

  paintResult(q, key, row, sched, ms);
}

/** "Bilmiyorum" = boş bırakma. Yanlış sayılır ama seçim kaydedilmez. */
export function dontKnow() {
  if (!S || S.answered) return;
  const q = S.questions[S.i];
  const ms = performance.now() - S.qStart;
  S.answered = true;
  stopTick();

  const row = recordAnswer(q, null, ms, S.mode === 'review' ? 'review' : 'practice');
  const sched = scheduleAfterAnswer(q.id, false);
  save();
  S.log.push({ ...row, sched });

  paintResult(q, null, row, sched, ms);
}

function paintResult(q, chosen, row, sched, ms) {
  const sec = ms / 1000;
  $$opts().forEach(b => {
    b.classList.add('done');
    const k = b.dataset.key;
    if (k === q.correct) b.classList.add(chosen === q.correct ? 'pick-ok' : 'reveal');
    else if (k === chosen) b.classList.add('pick-no');
    else b.classList.add('dim');
  });

  const slow = sec > TARGET_SEC;
  const verdict = row.ok ? 'Doğru' : (chosen === null ? 'Boş bıraktın' : 'Yanlış');
  const icon = row.ok ? '✓' : (chosen === null ? '–' : '✕');

  const logicBadgeHTML = row.ok ? `
    <button class="badge-logic" data-act="toggle-logic" id="badge-logic" title="Mantıkla çözdüm / Konu eksik (M)">
      <span class="badge-logic-dot"></span>
      <span>Mantık</span>
      <span class="kbd-hint">M</span>
    </button>
  ` : '';

  const fb = $('#fb');
  if (fb) {
    const isLast = S.i + 1 >= S.questions.length;
    const logicBtnHTML = row.ok ? `
      <button class="btn btn-logic" data-act="next-logic" title="Mantıkla çözüldü olarak işaretle ve geç (M)">
        <span>Mantıkla Geç</span>
        <span class="kbd-hint">M</span>
      </button>
    ` : '';

    fb.innerHTML = `
      <div class="feedback ${row.ok ? 'ok' : 'no'}">
        <div class="fb-head">
          <span class="fb-icon">${icon}</span>
          <div class="fb-head-text">
            <div class="fb-verdict">${verdict}</div>
            <div class="fb-correct">Doğru şık: <b>${esc(q.correct)}</b></div>
          </div>
          ${logicBadgeHTML}
          <span class="fb-time chip ${slow ? 'amber' : 'green'}">${fmtSec(sec)}${slow ? ` · hedef ${TARGET_SEC} sn` : ''}</span>
        </div>
        <div class="fb-body">
          ${explanationHTML(q, chosen)}
          ${q.legalBasis ? `<div class="fb-basis-wrap"><span class="basis">${esc(q.legalBasis)}</span></div>` : ''}
        </div>
        <div class="fb-actions">
          <div class="btn-row">
            <button class="btn" data-act="next">${isLast ? 'Seansı bitir' : 'Sonraki soru'}</button>
            <button class="btn btn-2 btn-s" data-act="ask-gemini" title="Kavramı ve soruyu Gemini için kopyala (G)">Gemini'ye Sor <span class="kbd">G</span></button>
            ${logicBtnHTML}
          </div>
          <div class="fb-actions-meta">
            <span class="srs-note">${esc(sched.note)}</span>
            <span class="hint"><span class="kbd">Enter</span> devam${row.ok ? ' · <span class="kbd">M</span> mantık' : ''} · <span class="kbd">G</span> Gemini</span>
          </div>
        </div>
      </div>`;
  }

  // Sol kontrol alanını cevaplanmış duruma göre senkronize et
  const btnDontKnow = document.querySelector('#q-actions [data-act="dontknow"]');
  if (btnDontKnow) btnDontKnow.style.display = 'none';
  const qHint = document.querySelector('#q-actions .hint');
  if (qHint) {
    qHint.innerHTML = `<span class="kbd">Enter</span> sonraki soru${row.ok ? ' · <span class="kbd">M</span> mantıkla geç' : ''} · <span class="kbd">G</span> Gemini`;
  }

  // Gizlenen ders adı cevaptan sonra açılır
  if (S.hideSubject) {
    const el = $('#q-subj');
    if (el) el.textContent = subjectName(q.subjectId);
  }

  $('#q-shell')?.classList.add('answered');

  // Çözüm alanlarının daima en baştan okunmasını sağla
  const fbBody = fb?.querySelector('.fb-body');
  if (fbBody) fbBody.scrollTop = 0;
  const qSide = document.querySelector('.q-side');
  if (qSide) qSide.scrollTop = 0;

  // Geniş ekranda sessiz odakla, yarım ekran ve mobilde çözümü yumuşakça odakla
  const darEkran = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 1150px)').matches;
  if (darEkran) {
    requestAnimationFrame(() => fb?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    $('[data-act="next"]')?.focus({ preventScroll: true });
  }
}

function formatExplanationText(text) {
  if (!text) return '';
  return String(text)
    .replace(/([a-zçğıöşüA-ZÇĞİÖŞÜ]+)-\s+([a-zçğıöşüA-ZÇĞİÖŞÜ]+)/g, '$1$2')
    .trim();
}

function explanationHTML(q, chosen) {
  const text = q.explanation || 'Bu soru için gerekçeli açıklama henüz yazılmamış.';
  const formatted = formatExplanationText(text);
  return `<div class="fb-lead">${richBlock(formatted)}</div>`;
}

function $$opts() { return [...document.querySelectorAll('#opts .opt')]; }

/* ---------- şık / öncül eleme (görsel, cevap kaydı değil) ---------- */

export function eliminateOption(key) {
  if (!S || S.answered) return;
  toggleOption('#view-practice', key);
}

export function eliminatePremise(numeral) {
  if (!S || S.answered) return;
  togglePremise('#view-practice', numeral);
}

export function next() {
  if (!S) return;
  if (!S.answered) return;
  S.i += 1;
  render();
}

export function isAnswered() {
  return !!S && S.answered;
}

export function nextLogic() {
  if (!S || !S.answered) return;
  const q = S.questions[S.i];
  const lastLog = S.log[S.log.length - 1];
  if (lastLog && lastLog.ok) {
    markLastAnswerLogic(true);
    reScheduleAsLogic(q.id, true);
    lastLog.logicGuess = true;
    save();
  }
  next();
}

export function toggleLogic() {
  if (!S || !S.answered) return;
  const q = S.questions[S.i];
  const lastLog = S.log[S.log.length - 1];
  if (!lastLog || !lastLog.ok) return;

  const newFlag = !lastLog.logicGuess;
  markLastAnswerLogic(newFlag);
  lastLog.logicGuess = newFlag;

  const sched = newFlag ? reScheduleAsLogic(q.id, true) : scheduleAfterAnswer(q.id, true, false);
  save();

  const badge = $('#badge-logic');
  if (badge) badge.classList.toggle('active', newFlag);
  const srsNote = $('#fb .srs-note');
  if (srsNote) srsNote.textContent = sched.note;
}

export function quit() {
  if (!S) return;
  S.i = S.questions.length;
  render();
}

/* ---------- seans özeti ---------- */

function renderSummary(host) {
  if (!S.summarySaved) {
    finalizeSession();
    S.summarySaved = true;
  }

  const done = S.log;
  const ok = done.filter(r => r.ok).length;
  const acc = done.length ? Math.round((ok / done.length) * 100) : 0;
  const secs = done.map(r => r.ms / 1000);
  const avg = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
  const slowest = done.slice().sort((a, b) => b.ms - a.ms)[0];
  const wrongs = done.filter(r => !r.ok);
  const logics = done.filter(r => r.logicGuess);

  host.innerHTML = `
    <div class="wrap-read">
      <h1 class="page">Seans bitti</h1>
      <p class="page-sub">${esc(S.label)} · ${done.length} soru</p>
      ${S.karmaMeta && S.karmaMeta.gaps && S.karmaMeta.gaps.length ? `
        <div class="card" style="margin-bottom:1.25rem">
          <div class="metric-k">Bu dersleri karma set taşıyamıyor</div>
          <p class="hint" style="margin:.4rem 0 .6rem">
            Havuzda yeterli soru yok, sınavda ise
            ${S.karmaMeta.gaps.reduce((a, g) => a + g.examQ, 0)} soru ediyorlar.
            Bunlar kâğıttan çalışılacak; uygulama sessizce atlamıyor.
          </p>
          <div class="chip-row">
            ${S.karmaMeta.gaps.map(g => `<span class="chip amber">${esc(g.name)} · sınavda ${g.examQ}, havuzda ${g.pool}</span>`).join('')}
          </div>
        </div>` : ''}

      <div class="grid grid-3" style="margin-bottom:1.5rem">
        <div class="metric">
          <div class="metric-k">Doğruluk</div>
          <div class="metric-v">%${acc}</div>
          <div class="metric-n">${ok} / ${done.length} doğru</div>
        </div>
        <div class="metric">
          <div class="metric-k">Ortalama süre</div>
          <div class="metric-v" style="${avg > TARGET_SEC ? 'color:var(--warn)' : 'color:var(--ok)'}">${Math.round(avg)}<span style="font-size:0.9rem;font-weight:600"> sn</span></div>
          <div class="metric-n">hedef ${TARGET_SEC} sn</div>
        </div>
        <div class="metric">
          <div class="metric-k">Tekrar sırasına giren</div>
          <div class="metric-v">${wrongs.length + logics.length}</div>
          <div class="metric-n">${wrongs.length} yanlış${logics.length ? `, ${logics.length} mantık` : ''}</div>
        </div>
      </div>

      ${avg > TARGET_SEC ? `<div class="trap"><div class="lbl">Hız notu</div><p>Ortalaman hedefin üstünde. Sınavda 120 soru için soru başına ortalama 75 saniyen var; doğruluk yerleştiyse bundan sonraki iş hızı düşürmek.</p></div>` : ''}
      ${slowest && slowest.ms / 1000 > TARGET_SEC * 2 ? `<p class="hint">En uzun süren soru: ${esc(slowest.qId)} · ${fmtSec(slowest.ms / 1000)}</p>` : ''}

      ${wrongs.length ? `
        <div class="section-label">Yanlış yaptıkların</div>
        ${wrongs.map(r => {
          const q = S.questions.find(x => x.id === r.qId);
          const t = q?.topicId ? topicById.get(q.topicId) : null;
          return `<div class="subj">
            <div>
              <div class="subj-name">${esc((q?.stem || '').slice(0, 95))}${(q?.stem || '').length > 95 ? '…' : ''}</div>
              <div class="subj-meta">${esc(subjectName(q?.subjectId))}${t ? ' · ' + esc(t.title) : ' · konuya bağlı değil'}</div>
            </div>
            <div class="subj-right">
              ${t ? `<button class="btn btn-2 btn-s" data-act="go-flow-topic" data-topic="${esc(t.id)}">Konuyu oku</button>` : ''}
            </div>
          </div>`;
        }).join('')}` : ''}

      ${logics.length ? `
        <div class="section-label">Mantıkla çözülenler (Teorik Açıklar)</div>
        ${logics.map(r => {
          const q = S.questions.find(x => x.id === r.qId);
          const t = q?.topicId ? topicById.get(q.topicId) : null;
          return `<div class="subj" style="border-left: 3px solid var(--warn)">
            <div>
              <div class="subj-name">${esc((q?.stem || '').slice(0, 95))}${(q?.stem || '').length > 95 ? '…' : ''}</div>
              <div class="subj-meta">${esc(subjectName(q?.subjectId))}${t ? ' · ' + esc(t.title) : ' · konuya bağlı değil'} · <span style="color:var(--warn);font-weight:600">Mantıkla Geçildi</span></div>
            </div>
            <div class="subj-right">
              ${t ? `<button class="btn btn-2 btn-s" data-act="go-flow-topic" data-topic="${esc(t.id)}">Konuyu oku</button>` : ''}
            </div>
          </div>`;
        }).join('')}` : ''}


      ${syncPanelHTML()}

      <div class="btn-row" style="margin-top:2rem">
        <button class="btn" data-act="go-today">Bugün ekranına dön</button>
        <button class="btn btn-2" data-act="again">Aynı türden bir set daha</button>
      </div>
    </div>`;
}

/**
 * Seans sonu ekranındaki "HMGS Takip'e gönder" paneli.
 * İki iş yapar: seansa serbest bir not eklettirir (ör. "saat çok geç, dikkat
 * hataları") ve gönderimi kullanıcının onayına bağlar. Otomatik aktarım zaten
 * arka planda var (pushSessionsToServer -> studio_sessions_export.json) ama o
 * dosyayı Drive kuyruğuna taşıyan adım ayrı bir süreç; bu düğme onu tetikler.
 */
function syncPanelHTML() {
  const sent = S.pushState === 'ok';
  return `
    <div class="trap" style="margin-top:2rem" id="sync-panel">
      <div class="lbl">HMGS Takip'e Gönder</div>
      <p style="margin-bottom:0.75rem">Bu seansın ders kırılımı çalışma kaydına yazılacak. İstersen bir not düş (nasıl geçtiğini sonra hatırlarsın).</p>
      <label style="display:block;font-size:0.82rem;font-weight:600;color:var(--ink-2);margin-bottom:0.3rem">
        Hissiyat Notu <span style="font-weight:400;opacity:.7">(nasıl geçti, zorluk, dikkat hataları…)</span>
      </label>
      <textarea id="sess-note" rows="3"
        placeholder="Örn: Saat çok geçti, dikkat hatası yaptım (bilgi eksiği değil)."
        style="width:100%;padding:0.6rem 0.75rem;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:0.95rem;resize:vertical;background:var(--bg);color:inherit;margin-bottom:0.75rem"
        ${sent ? 'disabled' : ''}>${esc(S.note || '')}</textarea>
      <label style="display:block;font-size:0.82rem;font-weight:600;color:var(--ink-2);margin-bottom:0.3rem">
        Vurgu ve Çözüm Nüansı <span style="font-weight:400;opacity:.7">(öğrendiğin incelik, sık hata, takılınan konu…)</span>
      </label>
      <textarea id="sess-highlight" rows="3"
        placeholder="Örn: Muris muvazaasında ispat yükü davalıda; Yargıtay HGK 2020."
        style="width:100%;padding:0.6rem 0.75rem;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:0.95rem;resize:vertical;background:var(--bg);color:inherit"
        ${sent ? 'disabled' : ''}>${esc(S.highlights || '')}</textarea>
      <div class="btn-row" style="margin-top:0.75rem">
        <button class="btn${sent ? ' btn-2' : ''}" data-act="push-session" ${sent ? 'disabled' : ''}>
          ${sent ? 'Gönderildi ✓' : "Takip'e gönder"}
        </button>
        <span id="sync-status" class="hint" style="margin:0;align-self:center">${esc(S.pushMsg || '')}</span>
      </div>
    </div>`;
}

/**
 * Notu seansa yazar, güncel seans listesini sunucuya bastırır, sonra
 * sessions-push'u tetikler. Not gönderim başarısız olsa da kaydedilir —
 * kullanıcı yazdığını kaybetmesin, HMGS_Sync.bat ile sonra gönderebilsin.
 */
export async function pushSession() {
  if (!S || S.pushState === 'ok' || S.pushState === 'busy') return;

  const ta = $('#sess-note');
  const note = (ta?.value || '').trim();
  S.note = note;

  const hlEl = $('#sess-highlight');
  const highlights = (hlEl?.value || '').trim();
  S.highlights = highlights;

  // Notu ve highlight'ı localStorage'daki seans kaydına işle (id ile; sıraya güvenme).
  const sess = state().sessions.find(x => x.id === S.sessionId);
  if (sess) {
    sess.note = note;
    sess.highlights = highlights;
    save();
  }

  S.pushState = 'busy';
  setSyncUI(true, 'Kaydediliyor…');

  const targetSess = sess || {
    id: S.sessionId || ('sess_' + Date.now()),
    note,
    highlights,
    isoDate: new Date().toISOString().slice(0, 10),
    mode: S.mode,
    label: S.label,
    total: S.questions ? S.questions.length : 0
  };

  // 1. Tarayıcı içi Takip kuyruğuna yaz (aynı origin / GitHub Pages anında görür)
  queueSessionForTakip(targetSess);

  // 2. Varsa yerel sunucuya arka planda sessizce haber ver
  notifyLocalServerIfAny();

  // 3. Tarayıcıda aktif Google Drive oturumu varsa doğrudan Drive'a yaz
  let driveSynced = false;
  try {
    driveSynced = await pushSessionToDriveDirectly(targetSess);
  } catch (_) {}

  S.pushState = 'ok';
  if (driveSynced) {
    S.pushMsg = 'Takip uygulamasına ve Google Drive bulutuna aktarıldı.';
  } else {
    S.pushMsg = 'Takip kuyruğuna kaydedildi (uygulama açıldığında eşitlenecek).';
  }
  render();
  toast('Seans Takip kaydına eklendi ✓');
}

function setSyncUI(busy, msg) {
  const btn = $('[data-act="push-session"]');
  if (btn) btn.disabled = !!busy;
  const st = $('#sync-status');
  if (st) st.textContent = msg || '';
}

export function repeatSession() {
  if (!S) return false;
  const { mode, count, subjectId } = S;
  return startSession({ mode, count: count || S.questions.length, subjectId });
}

/* ---------- HMGS Takip App'e otomatik aktarım ---------- */

/**
 * Seans bitince (renderSummary ilk kez çağrıldığında) ders/konu bazlı bir özet
 * kaydı oluşturur ve store.js'e yazar. Ham `answers` kaydına dokunmaz — bu
 * sadece Takip uygulamasının okuyacağı bir özet.
 *
 * Ders adı ve konu başlığı burada, tarayıcıda, Stüdyo'nun kendi topicById/
 * subjectName verisinden ÇÖZÜLEREK kaydedilir — Node tarafındaki sync script'in
 * Stüdyo'nun konu taksonomisini bilmesine gerek kalmasın (uydurma isim riski
 * olmasın).
 */
function finalizeSession() {
  if (!S) return;
  const done = S.log;
  if (!done.length) return;

  const ok = done.filter(r => r.ok).length;
  const wrong = done.length - ok;
  const durationMs = done.reduce((a, b) => a + (b.ms || 0), 0);

  // Ders bazlı kırılım — karma/mixed setlerde birden fazla ders olabilir.
  const bySubject = {};
  done.forEach(r => {
    const q = S.questions.find(x => x.id === r.qId);
    const sid = q?.subjectId || '__bilinmiyor__';
    bySubject[sid] = bySubject[sid] || { subjectId: sid, total: 0, correct: 0 };
    bySubject[sid].total++;
    if (r.ok) bySubject[sid].correct++;
  });
  const subjects = Object.values(bySubject).map(b => ({
    subjectId: b.subjectId,
    subjectName: subjectName(b.subjectId),
    total: b.total,
    correct: b.correct
  }));

  let topicName = null;
  if (S.mode === 'topic' && S.topicId) {
    const t = topicById.get(S.topicId);
    topicName = t ? t.title : null;
  }

  // ── Ham log kaydı: S.log'un tamamı seans objesine bindirilir ─────────────
  // Her soru kaydına soru nesnesinden türetilen bağlam alanları da eklenir
  // (konu adı, ders adı, karakter sayısı) — sync scripti veya koç neye
  // ihtiyaç duyarsa ham log'dan doğrudan okur, ileride ek alan eklemek için
  // burada hiçbir şey değiştirmek gerekmez.
  const answerLog = done.map(r => {
    const q = S.questions.find(x => x.id === r.qId);
    const t = q?.topicId ? topicById.get(q.topicId) : null;
    const charCount = q
      ? (q.stem || '').length + (q.options || []).reduce((a, o) => a + (o.text || '').length, 0)
      : null;
    const srsState = (state().srs || {})[r.qId] || null;
    return {
      ...r,
      subjectName: subjectName(r.subjectId),
      topicName: t?.title || null,
      questionCharCount: charCount,
      // Soru nesnesinden kaynak bilgisi — çıkmış soru mu, hangi sınav, isRealExam?
      source: q?.source || null,
      category: q?.category || null,
      isRealExam: q?.examMeta?.isRealExam ?? (q?.category === 'Çıkmış Sorular') ?? false,
      // SRS Hafıza & Tekrar Metrikleri
      srsLapses: srsState ? srsState.lapses : 0,
      srsBox: srsState ? srsState.box : 0,
      isDontKnow: r.chosen === null
    };
  });

  const result = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    at: new Date().toISOString(),
    startedAt: S.startedAt
      ? new Date(Date.now() - (performance.now() - S.startedAt)).toISOString()
      : new Date().toISOString(),
    isoDate: new Date().toISOString().slice(0, 10),
    mode: S.mode,
    label: S.label,
    topicName,
    durationMinutes: Math.round(durationMs / 60000),
    total: done.length,
    correct: ok,
    wrong,
    subjects,
    answerLog   // ham kayıt — her şey burada, dışarıdan seçmeye gerek yok
  };

  saveSession(result);
  save();
  // Seans sonu ekranındaki "Takip'e gönder" paneli notu bu id ile bulup yazar.
  S.sessionId = result.id;

  // Kullanıcı hiçbir ek not girmese dahi seans asla kaybolmasın:
  // Seansı otomatik olarak yerel Takip kuyruğuna ekle ve varsa doğrudan Drive'a ilet.
  queueSessionForTakip(result);
  pushSessionToDriveDirectly(result).catch(() => {});
  notifyLocalServerIfAny();
}

/**
 * Seansı doğrudan tarayıcı içi localStorage kuyruğuna (hmgs_pending_studio_sessions)
 * kaydeder veya mevcut kaydı günceller.
 * Takip uygulaması (aynı origin / GitHub Pages) açıldığında bu kuyruğu okuyup
 * anında çalışma kaydına (entries[]) çevirir.
 */
function queueSessionForTakip(sess) {
  if (!sess || !sess.id) return;
  try {
    const KEY = 'hmgs_pending_studio_sessions';
    let queue = [];
    try {
      queue = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (!Array.isArray(queue)) queue = [];
    } catch (_) {
      queue = [];
    }
    const idx = queue.findIndex(x => x.id === sess.id);
    if (idx >= 0) {
      queue[idx] = sess;
    } else {
      queue.push(sess);
    }
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('[sync] Yerel Takip kuyruğuna yazma uyarısı:', e);
  }
}

/**
 * Tarayıcıda veya oturumda kayıtlı bir Google Drive erişim jetonu arar.
 * 1. vault-client aktif jetonu (sessionStorage / bellek)
 * 2. Takip uygulamasının localStorage'a yazdığı hmgs_gtoken
 */
function getAnyGoogleToken() {
  if (typeof window === 'undefined') return null;
  try {
    const st = sessionStorage.getItem('hmgs_access_token');
    if (st) return st;
  } catch (_) {}
  try {
    const raw = localStorage.getItem('hmgs_gtoken');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.t) {
        if (!parsed.exp || Date.now() < parsed.exp) {
          return parsed.t;
        }
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Tarayıcıda aktif Google token varsa, seansı doğrudan Google Drive'daki
 * hmgs_2026_data.json dosyasının pendingStudioSessions[] kuyruğuna ekler/günceller.
 * Böylece farklı cihazlar arasında (ör. masaüstünden telefona) anında eşitlenir.
 */
async function pushSessionToDriveDirectly(sess) {
  if (!sess || !sess.id) return false;
  const token = getAnyGoogleToken();
  if (!token) return false;

  try {
    let fileId = null;
    const q = encodeURIComponent("name='hmgs_2026_data.json' and trashed=false");

    // 1. Önce appDataFolder içinde hmgs_2026_data.json ara
    let res = await fetch(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        fileId = data.files[0].id;
      }
    }

    // appDataFolder'da yoksa kök Drive'da ara (eski sürüm uyumu)
    if (!fileId) {
      res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          fileId = data.files[0].id;
        }
      }
    }

    if (!fileId) return false;

    // 2. Dosyanın mevcut içeriğini oku
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!dlRes.ok) return false;

    const remoteData = await dlRes.json();
    if (!remoteData || typeof remoteData !== 'object') return false;

    if (!Array.isArray(remoteData.pendingStudioSessions)) {
      remoteData.pendingStudioSessions = [];
    }

    const idx = remoteData.pendingStudioSessions.findIndex(s => s.id === sess.id);
    if (idx >= 0) {
      remoteData.pendingStudioSessions[idx] = sess;
    } else {
      remoteData.pendingStudioSessions.push(sess);
    }

    // 3. Dosyayı PATCH ile Drive'a geri yaz
    const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify(remoteData, null, 2)
    });

    return patchRes.ok;
  } catch (err) {
    console.warn('[sync] Google Drive doğrudan kuyruk güncelleme uyarısı:', err);
    return false;
  }
}

/**
 * Geliştirme ortamında (yalnızca localhost üzerinde) yerel studio_server varsa
 * arka planda sessizce haberdar eder. Hata verirse asla kullanıcıya yansıtmaz.
 */
function notifyLocalServerIfAny() {
  if (typeof window === 'undefined') return;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return;

  try {
    const s = state();
    fetch('/api/save-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessions: s.sessions || [],
        answers: (s.answers || []).slice(-2000)
      })
    }).catch(() => {});
  } catch (_) {}
}

/**
 * Mevcut soruyu, konuyu ve ilgili kanun maddesini Gemini masaüstü uygulamasına
 * kolayca yapıştırmak üzere panoya aktarır ve yerel köprüyü tetikler.
 */
export function askGemini() {
  if (!S || S.i >= S.questions.length) return;
  const q = S.questions[S.i];
  const topic = q.topicId ? topicById.get(q.topicId) : null;
  const subj = subjectName(q.subjectId);
  const topicTitle = topic ? topic.title : '';
  const basis = q.legalBasis ? ` (${q.legalBasis})` : '';

  const prompt = `HMGS Hukuk Sorusu Analizi:
Ders: ${subj}
Konu: ${topicTitle}${basis}
Soru: ${q.stem.replace(/\\n+/g, ' ').trim()}

Lütfen bu kavramı açıkla:
1. Kurumun hukuki niteliği ve ilgili kanun maddesi
2. Sistemin temel aktörleri ve aralarındaki hukuki ilişki
3. Akılda kalıcı somut bir pratik olay (örnek vaka)
4. Sınavda tuzak olarak kullanılan çeldirici ayrım`;

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prompt).then(() => {
      toast('Gemini istemi panoya kopyalandı! Sağ pencerede Ctrl+V yapın.');
    }).catch(() => {
      fallbackCopy(prompt);
    });
  } else {
    fallbackCopy(prompt);
  }

  try {
    fetch('/api/gemini-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, activate: true })
    }).catch(() => {});
  } catch (_) {}
}

function fallbackCopy(text) {
  if (typeof document === 'undefined') return;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast('Gemini istemi panoya kopyalandı! Sağ pencerede Ctrl+V yapın.');
  } catch (_) {
    toast('İstem hazırlandı.');
  }
  document.body.removeChild(ta);
}

