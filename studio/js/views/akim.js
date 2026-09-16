/* ==========================================================================
   views/akim.js — AKIŞ MODU: SONU OLMAYAN SORU AKIŞI
   ----------------------------------------------------------------------
   practice.js'ten farkı: seans özeti ekranı YOK. Tek soru → cevap → anında
   sonraki soru. Yanlıştan sonra aynı kuraldan bir kardeş soru kısa gecikmeyle
   geri gelir (engine.flowReinforce). Kuyruk azalınca karma motorundan yeniden
   doldurulur (engine.flowFeed). Çıkışta TEK kapanış ekranı.

   DOM/CSS practice.js ile ORTAKTIR (.q-screen, .q-shell, .feedback …); bu
   dosya aynı görsel dili kullanır, ayrı bir tasarım dili açmaz. Elim, Gemini
   istemi ve Takip kuyruğu mantığı da aynı modüllerden gelir — kopya yok,
   kaynak tektir.
   ========================================================================== */

import { esc, rich, richBlock, splitStem, fmtSec, $, toast } from '../ui.js';
import { subjectName, topicById } from '../data.js';
import { recordAnswer, markLastAnswerLogic, markLastAnswerAttention, save, saveSession, state, TARGET_SEC } from '../store.js';
import {
  scheduleAfterAnswer, reScheduleAsLogic, flowFeed, flowReinforce, flowScore, flowMilestone,
  FLOW_REFILL_AT, FLOW_REINFORCE_DELAY
} from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';
import { kuralButtonHTML } from '../kural.js';
import { buildGeminiPrompt, queueSessionForTakip, pushSessionToDriveDirectly, pushToLocalServer } from './practice.js';

let A = null;       // aktif akış seansı
let tick = null;    // süre sayacı
let lastRun = null; // kapanış ekranı özeti

export function hasSession() { return !!A; }

/* ---------- kurulum ---------- */

export function start() {
  const f = flowFeed();
  const seedSeen = new Set(state().answers.slice(-50).map(a => a.qId));

  A = {
    queue: [],            // sıradaki sorular (baş = şu anki)
    log: [],              // cevap kayıtları (ham, kapanışta özetlenir)
    answered: false,
    qStart: performance.now(),
    startedAt: performance.now(),
    usedIds: seedSeen,
    milestones: [],       // "kural otomatikleşti" anları
    elimUsed: false,
    geminiAsked: false,
    geminiAskedPreAnswer: false
  };

  for (const q of f.questions) {
    if (!A.usedIds.has(q.id)) { A.queue.push(q); A.usedIds.add(q.id); }
  }
  if (!A.queue.length) {
    // Karma motoru hiç soru vermediyse boş akış açma; dürüstçe söyle.
    A = null;
    toast('Akış için soru bulunamadı.');
    return false;
  }

  lastRun = null;
  render();
  return true;
}

/* ---------- render ---------- */

export function render() {
  const host = $('#view-akim');
  if (!host) return;

  if (!A) {
    document.body.classList.remove('in-session');
    host.innerHTML = lastRun ? closingHTML(lastRun) : landingHTML();
    return;
  }

  document.body.classList.add('in-session');

  if (!A.queue.length) {
    // Kuyruk beklenmedik şekilde boşaldı → kapanışa geç.
    finish();
    return;
  }

  const q = A.queue[0];
  const { premise, ask } = splitStem(q.stem);
  const topic = q.topicId ? topicById.get(q.topicId) : null;
  const meter = flowScore();

  host.innerHTML = `
    <div class="q-screen">
      <div class="q-strip akim-strip">
        <div class="q-strip-left">
          <button class="btn btn-2 btn-s" data-act="akim-quit" title="Akışı bitir">
            <span class="q-quit-x">✕</span><span>Bitir</span>
          </button>
          <span class="q-strip-subj">Akış</span>
        </div>
        <div class="q-strip-center">
          <div class="flow-meter" id="flow-meter">
            <div class="flow-meter-track"><div class="flow-meter-fill" id="flow-meter-fill" style="width:${Math.round(meter.score * 100)}%"></div></div>
            <span class="flow-meter-label" id="flow-meter-label">${esc(meter.label)}</span>
          </div>
        </div>
        <div class="q-strip-right">
          <span class="chip accent" id="akim-count">${A.log.length} soru</span>
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
              ${q.options.map(o => optionRowHTML(o, { pickAct: 'akim-pick' })).join('')}
            </div>
          </div>

          <div class="q-main-foot" id="q-actions">
            <button class="btn btn-2 btn-s" data-act="akim-dontknow">Bilmiyorum · çözümü göster</button>
            <button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Soruyu ve beş şıkkı ipucu istemi olarak kopyalar — doğru şık gönderilmez (G)">İpucu İste <span class="kbd">G</span></button>
            <button class="btn btn-2 btn-s" data-act="akim-quit">Akışı bitir</button>
            <span class="hint">
              <span class="kbd">A</span>–<span class="kbd">E</span> seç · <span class="kbd">G</span> Gemini · <span class="kbd">Enter</span> devam
            </span>
          </div>
          ${topic ? `<p class="hint q-topic-hint">Bağlı konu: ${esc(topic.title)}</p>` : ''}
        </div>
        <aside class="q-side"><div id="fb"></div></aside>
      </div>
    </div>`;

  if (!A.answered) {
    A.qStart = performance.now();
    startTick();
  } else {
    // Dönüşte (örn. başka görünüme gidip gelince) cevabı yeniden çiz, soruyu
    // sıfırlayıp ikinci kez kaydetme.
    const last = A.log[A.log.length - 1];
    if (last && last.qId === A.queue[0].id) {
      paintResult(A.queue[0], last.chosen, last, last.sched, last.ms);
    }
  }
}

function landingHTML() {
  return `<div class="wrap" style="padding:4rem 1rem;max-width:380px;margin:0 auto">
    <div class="card" style="text-align:center;padding:2.5rem 1.5rem">
      <div class="big" style="font-size:1.6rem;margin-bottom:0.75rem">◎</div>
      <h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.5rem">Akış Modu</h3>
      <p style="color:var(--ink-2);font-size:0.92rem;line-height:1.55;margin-bottom:1.5rem">
        Seans özeti yok, bitiş ekranı yok. Soru çöz → anında geri bildirim al →
        sonraki soru. Yanlış yaptığın kural kısa sonra geri gelir.
      </p>
      <button class="btn" data-act="akim-start" style="width:100%;justify-content:center">Akışı Başlat</button>
    </div>
  </div>`;
}

function closingHTML(run) {
  const acc = run.total ? Math.round((run.correct / run.total) * 100) : 0;
  const avg = run.total ? Math.round(run.durationSec / run.total) : 0;
  return `<div class="wrap-read">
    <h1 class="page">Akış bitti</h1>
    <p class="page-sub">${run.total} soru · ${Math.round(run.durationSec / 60)} dakika kesintisiz</p>

    <div class="grid grid-3" style="margin-bottom:1.5rem">
      <div class="metric">
        <div class="metric-k">İsabet</div>
        <div class="metric-v">%${acc}</div>
        <div class="metric-n">${run.correct} / ${run.total} doğru</div>
      </div>
      <div class="metric">
        <div class="metric-k">Tempo</div>
        <div class="metric-v" style="${avg > TARGET_SEC ? 'color:var(--warn)' : 'color:var(--ok)'}">${avg || '–'}<span style="font-size:0.9rem;font-weight:600"> sn</span></div>
        <div class="metric-n">hedef ${TARGET_SEC} sn</div>
      </div>
      <div class="metric">
        <div class="metric-k">Otomatikleşen kural</div>
        <div class="metric-v" style="color:var(--ok)">${run.milestones}</div>
        <div class="metric-n">${run.milestones ? 'tekrar sırasından çıktı' : 'henüz yok'}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem">
      <p class="hint" style="margin:0">
        Bu akışın çözümleri çalışma kaydına (Takip) yazıldı. Aralıklı tekrar ve
        otomatikleşme skorun da güncellendi — devam ettiğin an kaldığın yerden.
      </p>
    </div>

    <div class="btn-row">
      <button class="btn" data-act="akim-start">Tekrar Başla</button>
      <button class="btn btn-2" data-act="go-today">Bugün ekranına dön</button>
    </div>
  </div>`;
}

/* ---------- süre sayacı ---------- */

function startTick() {
  stopTick();
  tick = setInterval(() => {
    if (!A || A.answered) return;
    const el = $('#q-timer');
    if (!el) return;
    const sec = (performance.now() - A.qStart) / 1000;
    el.textContent = fmtSec(sec);
    el.classList.toggle('slow', sec > TARGET_SEC);
  }, 250);
}
function stopTick() { if (tick) { clearInterval(tick); tick = null; } }

/* ---------- cevaplama ---------- */

export function pick(key) {
  if (!A || A.answered) return;
  const q = A.queue[0];
  const ms = performance.now() - A.qStart;
  A.answered = true;
  stopTick();

  const row = recordAnswer(q, key, ms, 'flow', { usedElim: A.elimUsed, askedGemini: A.geminiAsked });
  const sched = scheduleAfterAnswer(q.id, row.ok, A.geminiAskedPreAnswer);
  save();
  A.log.push({ ...row, sched, q });
  paintResult(q, key, row, sched, ms);
}

export function dontKnow() {
  if (!A || A.answered) return;
  const q = A.queue[0];
  const ms = performance.now() - A.qStart;
  A.answered = true;
  stopTick();

  const row = recordAnswer(q, null, ms, 'flow', { usedElim: A.elimUsed, askedGemini: A.geminiAsked });
  const sched = scheduleAfterAnswer(q.id, false);
  save();
  A.log.push({ ...row, sched, q });
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

  const logicBadge = row.ok ? `
    <button class="badge-logic" data-act="akim-toggle-logic" id="badge-logic" title="Mantıkla çözdüm / Konu eksik (M)">
      <span class="badge-logic-dot"></span><span>Mantık</span><span class="kbd-hint">M</span>
    </button>` : '';

  const attentionBadge = !row.ok ? `
    <button class="badge-logic" data-act="akim-toggle-attention" id="badge-attention" title="Bildim ama dikkatsizlik yaptım — konu değil, dikkat eksikliği">
      <span class="badge-logic-dot"></span><span>Dikkat</span>
    </button>` : '';

  const milestone = flowMilestone(sched);
  if (milestone && !A.milestones.includes(milestone + ':' + q.topicId)) {
    A.milestones.push(milestone + ':' + q.topicId);
  }

  const logicBtn = row.ok ? `
    <button class="btn btn-logic" data-act="akim-next-logic" title="Mantıkla çözüldü olarak işaretle ve geç (M)">
      <span>Mantıkla Geç</span><span class="kbd-hint">M</span>
    </button>` : '';

  const geminiBtn = chosen === null
    ? `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Doğru şıkkı ve uygulama açıklamasını analiz istemi olarak kopyalar (G)">Boşu Analiz Et <span class="kbd">G</span></button>`
    : row.ok
      ? `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Doğru şıkkı, diğer şıkların tuzağını ve uygulama açıklamasını sağlama istemi olarak kopyalar (G)">Sağlamasını Yap <span class="kbd">G</span></button>`
      : `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Seçtiğin şık, doğru şık ve uygulama açıklaması analiz istemi olarak kopyalanır (G)">Yanlışı Analiz Et <span class="kbd">G</span></button>`;

  const fb = $('#fb');
  if (fb) {
    fb.innerHTML = `
      <div class="feedback ${row.ok ? 'ok' : 'no'}">
        <div class="fb-head">
          <span class="fb-icon">${icon}</span>
          <div class="fb-head-text">
            <div class="fb-verdict">${verdict}</div>
            <div class="fb-correct">Doğru şık: <b>${esc(q.correct)}</b></div>
          </div>
          ${logicBadge}${attentionBadge}
          <span class="fb-time chip ${slow ? 'amber' : 'green'}">${fmtSec(sec)}${slow ? ` · hedef ${TARGET_SEC} sn` : ''}</span>
        </div>
        <div class="fb-body">
          <div class="fb-lead">${richBlock(q.explanation || 'Bu soru için gerekçeli açıklama henüz yazılmamış.')}</div>
          ${q.legalBasis ? `<div class="fb-basis-wrap"><span class="basis">${esc(q.legalBasis)}</span></div>` : ''}
          <div class="kural-slot" id="kural-slot" hidden></div>
        </div>
        <div class="fb-actions">
          <div class="btn-row">
            <button class="btn" data-act="akim-next">Devam</button>
            ${geminiBtn}
            ${logicBtn}
            ${kuralButtonHTML(q)}
          </div>
          <div class="fb-actions-meta">
            <span class="srs-note">${esc(milestone || sched.note)}</span>
            <span class="hint"><span class="kbd">Enter</span> devam${row.ok ? ' · <span class="kbd">M</span> mantık' : ''}${kuralButtonHTML(q) ? ' · <span class="kbd">K</span> kural' : ''} · <span class="kbd">G</span> Gemini</span>
          </div>
        </div>
      </div>`;
  }

  const btnDontKnow = document.querySelector('#q-actions [data-act="akim-dontknow"]');
  if (btnDontKnow) btnDontKnow.style.display = 'none';
  const qHint = document.querySelector('#q-actions .hint');
  if (qHint) {
    qHint.innerHTML = `<span class="kbd">Enter</span> sonraki soru${row.ok ? ' · <span class="kbd">M</span> mantıkla geç' : ''} · <span class="kbd">G</span> Gemini`;
  }

  $('#q-shell')?.classList.add('answered');

  const fbBody = fb?.querySelector('.fb-body');
  if (fbBody) fbBody.scrollTop = 0;
  const qSide = document.querySelector('.q-side');
  if (qSide) qSide.scrollTop = 0;

  const darEkran = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 1150px)').matches;
  if (darEkran) {
    requestAnimationFrame(() => fb?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    $('[data-act="akim-next"]')?.focus({ preventScroll: true });
  }
}

function $$opts() { return [...document.querySelectorAll('#opts .opt')]; }

/* ---------- ilerleme ---------- */

export function next() {
  if (!A || !A.answered) return;
  const done = A.queue.shift();
  const lastLog = A.log[A.log.length - 1];

  // Yanlıştan sonra aynı kuraldan kardeş soru kısa gecikmeyle geri gelir.
  if (done && lastLog && !lastLog.ok) {
    const r = flowReinforce(done, A.usedIds);
    if (r) {
      A.queue.splice(Math.min(FLOW_REINFORCE_DELAY, A.queue.length), 0, r);
      A.usedIds.add(r.id);
    }
  }

  refill();

  // Soru bazlı sinyalleri sıfırla
  A.elimUsed = false;
  A.geminiAsked = false;
  A.geminiAskedPreAnswer = false;
  A.answered = false;
  render();
}

function refill() {
  if (A.queue.length >= FLOW_REFILL_AT) return;
  const f = flowFeed();
  for (const q of f.questions) {
    if (!A.usedIds.has(q.id)) { A.queue.push(q); A.usedIds.add(q.id); }
  }
}

export function isAnswered() { return !!A && A.answered; }

export function nextLogic() {
  if (!A || !A.answered) return;
  const lastLog = A.log[A.log.length - 1];
  if (lastLog && lastLog.ok) {
    markLastAnswerLogic(true);
    reScheduleAsLogic(lastLog.q.id, true);
    lastLog.logicGuess = true;
    save();
  }
  next();
}

export function toggleLogic() {
  if (!A || !A.answered) return;
  const lastLog = A.log[A.log.length - 1];
  if (!lastLog || !lastLog.ok) return;

  const newFlag = !lastLog.logicGuess;
  markLastAnswerLogic(newFlag);
  lastLog.logicGuess = newFlag;

  const sched = newFlag ? reScheduleAsLogic(lastLog.q.id, true) : scheduleAfterAnswer(lastLog.q.id, true, false);
  save();

  const badge = $('#badge-logic');
  if (badge) badge.classList.toggle('active', newFlag);
  const srsNote = $('#fb .srs-note');
  if (srsNote) srsNote.textContent = sched.note;
}

export function toggleAttention() {
  if (!A || !A.answered) return;
  const lastLog = A.log[A.log.length - 1];
  if (!lastLog || lastLog.ok) return;

  const newFlag = !lastLog.attentionError;
  markLastAnswerAttention(newFlag);
  lastLog.attentionError = newFlag;

  const badge = $('#badge-attention');
  if (badge) badge.classList.toggle('active', newFlag);
}

/* ---------- çıkış ---------- */

export function quit() {
  if (!A) return;
  finish();
}

function finish() {
  if (!A) return;
  const run = finalizeRun();
  A = null;
  stopTick();
  lastRun = run;
  document.body.classList.remove('in-session');
  render();
}

/**
 * Akışın özetini çalışma kaydına (Takip) yazar. practice.finalizeSession ile
 * aynı kuyruk/push yolunu kullanır; tek fark mode:'flow' ve yanlış dökümü yok.
 * Ham cevap kaydı (answers[]) zaten her cevapta recordAnswer ile güncellendi.
 */
function finalizeRun() {
  const done = A.log;
  const ok = done.filter(r => r.ok).length;
  const durationMs = done.reduce((a, b) => a + (b.ms || 0), 0);

  const bySubject = {};
  done.forEach(r => {
    const sid = r.q?.subjectId || '__bilinmiyor__';
    bySubject[sid] = bySubject[sid] || { subjectId: sid, total: 0, correct: 0 };
    bySubject[sid].total++; if (r.ok) bySubject[sid].correct++;
  });

  const result = {
    id: 'flow_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    at: new Date().toISOString(),
    isoDate: new Date().toISOString().slice(0, 10),
    mode: 'flow',
    label: 'Akış',
    durationMinutes: Math.round(durationMs / 60000),
    total: done.length,
    correct: ok,
    wrong: done.length - ok,
    subjects: Object.values(bySubject).map(b => ({
      subjectId: b.subjectId,
      subjectName: subjectName(b.subjectId),
      total: b.total,
      correct: b.correct
    })),
    answerLog: done.map(r => ({ ...r, q: undefined }))
  };

  saveSession(result);
  save();
  queueSessionForTakip(result);
  pushSessionToDriveDirectly(result).catch(() => {});
  pushToLocalServer().catch(() => {});

  return {
    total: done.length,
    correct: ok,
    durationSec: durationMs / 1000,
    milestones: new Set(A.milestones.map(m => m.split(':')[1])).size
  };
}

/* ---------- şık / öncül eleme (görsel, cevap kaydı değil) ---------- */

export function eliminateOption(key) {
  if (!A || A.answered) return;
  A.elimUsed = true;
  toggleOption('#view-akim', key);
}

export function eliminatePremise(numeral) {
  if (!A || A.answered) return;
  A.elimUsed = true;
  togglePremise('#view-akim', numeral);
}

/* ---------- Gemini istemi ---------- */

export function askGemini() {
  if (!A) return;
  const q = A.queue[0];
  const last = A.log[A.log.length - 1];
  const chosen = A.answered && last && last.qId === q.id ? last.chosen : null;

  A.geminiAsked = true;
  if (!A.answered) A.geminiAskedPreAnswer = true;
  if (A.answered && last && last.qId === q.id) {
    last.askedGemini = true;
    const storeAnswers = state().answers;
    const storeRow = storeAnswers.findLast?.(a => a.qId === q.id) ||
      [...storeAnswers].reverse().find(a => a.qId === q.id);
    if (storeRow) { storeRow.askedGemini = true; save(); }
  }

  const built = buildGeminiPrompt(q, { answered: !!A.answered, chosen });
  const msg = `${built.mode === 'hint' ? 'İpucu' : 'Analiz'} istemi kopyalandı.`;
  copyToClipboard(built.text, msg);
}

function copyToClipboard(text, msg) {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(msg)).catch(() => fallbackCopy(text, msg));
  } else {
    fallbackCopy(text, msg);
  }
}

function fallbackCopy(text, msg) {
  if (typeof document === 'undefined') return;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  document.body.removeChild(ta);
  toast(ok ? msg : 'İstem hazırlandı ama panoya kopyalanamadı.');
}
