/* ==========================================================================
   views/practice.js — SÜRE ÖLÇEN SORU MOTORU
   Her cevap telemetriye yazılır, SRS'e işlenir. Süre ölçümü pazarlıksızdır.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, rich, richBlock, stripEmoji, splitStem, fmtSec, emptyState, groupLegalRefs, $, toast } from '../ui.js';
import { subjectName, questionsOf, questionsOfTopic, questionsOfTopics, shuffle, topicById, pastExamQuestions, aiQuestions, isCoreTarget } from '../data.js';
import { recordAnswer, markLastAnswerLogic, markLastAnswerAttention, save, saveSession, state, TARGET_SEC } from '../store.js';
import { scheduleAfterAnswer, reScheduleAsLogic, dueQuestions, unseenQuestions, buildKarmaSet, buildDeadlinesSet } from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';
import { kuralButtonHTML } from '../kural.js';
import { pushStudioQueueToDrive, getActiveToken, setActiveToken } from '../vault-client.js';
import { tuyoSec } from '../tuyolar.js';

let S = null;   // aktif seans
let tick = null;

/** Seans kur. opts: { mode, subjectId, topicId, topicIds, count, customLabel, targetScope } */
export function startSession(opts = {}) {
  const { mode = 'mixed', subjectId = null, topicId = null, topicIds = null, count = 15, customLabel = null, targetScope = 'core', questions = null } = opts;
  let pool = [];
  let label = '';

  let karmaMeta = null;

  // Hazır havuz: çağıran taraf soruları zaten seçmişse (örn. deneme sonucundaki
  // yanlışlar) havuz kurallarına hiç girilmez. Aksi halde "yanlışları çöz"
  // butonu, vadesi gelmiş tekrarları çözerdi — etiket ile davranış ayrışırdı.
  // Boş dizi "verilmemiş" sayılmaz: çağıran açıkça "bu sorular" dediyse ve liste
  // boşsa sessizce tüm havuza düşmek yerine seans kurulmaz.
  const explicit = Array.isArray(questions) ? questions.slice() : null;

  if (explicit) {
    pool = explicit;
    label = customLabel || 'Seçili sorular';
  } else if (mode === 'karma') {
    // Sınav biçimli harmanlanmış set: ders payı ölçülmüş sınav dağılımından
    const built = buildKarmaSet(count, targetScope);
    pool = built.questions;
    karmaMeta = { plan: built.plan, due: built.due, gaps: built.gaps };
    label = customLabel || 'Karma set';
  } else if (mode === 'deadlines') {
    const built = buildDeadlinesSet(count);
    pool = built.questions;
    label = customLabel || 'Süreler ve Parasal Sınırlar';
  } else if (mode === 'review') {
    let due = dueQuestions();
    if (subjectId) due = due.filter(d => d.q.subjectId === subjectId);
    pool = due.map(d => d.q);
    if (targetScope === 'core') {
      const coreOnly = pool.filter(isCoreTarget);
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
      const coreOnly = unseen.filter(isCoreTarget);
      if (coreOnly.length) unseen = coreOnly;
    }
    pool = shuffle(unseen);
    label = 'Yeni sorular';
  } else if (mode === 'pastExam') {
    pool = shuffle(pastExamQuestions());
    label = 'Çıkmış sorular · karışık pratik';
  } else if (mode === 'hmgsBenzeri' || mode === 'aiHmgs') {
    const raw = aiQuestions(subjectId);
    pool = shuffle(raw);
    label = customLabel || (subjectId ? `HMGS Benzeri (AI) · ${subjectName(subjectId)}` : 'HMGS Benzeri Sorular (AI)');
  } else {
    let raw = subjectId ? questionsOf(subjectId, targetScope) : allQuestions();
    if (targetScope === 'core') {
      const coreOnly = raw.filter(isCoreTarget);
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
    // Explicit havuz verildiğinde count kesme uygulanmaz: çağıran kaç soruyu
    // kastettiğini havuzun kendisiyle söylemiştir.
    questions: explicit ? pool : pool.slice(0, Math.max(1, count)),
    i: 0,
    answered: false,
    startedAt: performance.now(),
    qStart: performance.now(),
    log: [],
    summarySaved: false,
    // Soru bazlı davranış sinyalleri — her soru geçişinde sıfırlanır
    elimUsed: false,
    geminiAsked: false,
    // Cevap VERİLMEDEN Gemini'ye sorulduysa ipucu alındı → SRS logicGuess gibi davranır
    geminiAskedPreAnswer: false
  };
  render();
  return true;
}

function allQuestions() {
  return (window.QUESTIONS_DATA || []);
}

export function hasSession() { return !!S && S.i < S.questions.length; }
export function currentQuestion() { return S && S.questions ? S.questions[S.i] : null; }
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
        <button class="btn" data-act="start-hmgs-benzeri" style="background:var(--accent);color:#fff">HMGS Benzeri Hızlı Pratik (20 Soru)</button>
        <button class="btn btn-2" data-act="practice-hmgs-benzeri-all">HMGS Benzeri Tüm Havuz (${aiQuestions().length} Soru)</button>
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
          <button class="q-quit-link" data-act="quit" title="Seansı bitir">
            <span class="q-quit-x">✕</span>
            <span>Bitir</span>
          </button>
          <span class="q-strip-subj" id="q-subj">${S.hideSubject ? '<span class="hint">ders gizli</span>' : esc(subjectName(q.subjectId))}</span>
          ${''/* Kaynak/hedef rozeti bilinçli olarak yok: sınavda sorunun kaynağı yazmıyor.
               "Bu hâkimlik sorusu, zor olacak" beklentisi cevabı da değiştiriyor. Kaynak,
               cevaptan sonraki geri bildirimde görünür (aşağıda sourceBadgeLabel). */}
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
            <button class="btn btn-2 btn-s" data-act="ask-gemini" title="Soruyu ve beş şıkkı ipucu istemi olarak kopyalar — doğru şık gönderilmez (G)">İpucu İste <span class="kbd">G</span></button>
            <button class="q-quit-link" data-act="quit">Seansı bitir</button>
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

  // Cevap öncesi Gemini'ye sorulmuşsa (ipucu) → logicGuess gibi davranır: SRS'te
  // kutu ilerlemez, mastery/hız ortalamasına da girmez (satıra da yazılır).
  const treatAsLogic = S.geminiAskedPreAnswer;
  const row = recordAnswer(q, key, ms, S.mode === 'review' ? 'review' : 'practice', {
    usedElim: S.elimUsed,
    askedGemini: S.geminiAsked,
    logicGuess: treatAsLogic
  });
  const sched = scheduleAfterAnswer(q.id, row.ok, treatAsLogic);
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

  const row = recordAnswer(q, null, ms, S.mode === 'review' ? 'review' : 'practice', {
    usedElim: S.elimUsed,
    askedGemini: S.geminiAsked,
    // Boş bırakılan soru zaten yanlış sayılıp kutu 0'a dönüyor; logicGuess
    // burada süreyi (ipucu okuma dahil) hız ortalamasından çıkarmak için var.
    logicGuess: S.geminiAskedPreAnswer
  });
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
  const svgCheck = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><polyline points="4 10.5 8 14.5 16 5.5"></polyline></svg>`;
  const svgCross = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><line x1="5" y1="5" x2="15" y2="15"></line><line x1="15" y1="5" x2="5" y2="15"></line></svg>`;
  const svgDash = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:13px;height:13px;"><line x1="5" y1="10" x2="15" y2="10"></line></svg>`;
  const icon = row.ok ? svgCheck : (chosen === null ? svgDash : svgCross);
  const cleanSource = stripEmoji(q.sourceBadgeLabel);

  const logicBadgeHTML = row.ok ? `
    <button class="badge-logic" data-act="toggle-logic" id="badge-logic" title="Mantıkla çözdüm / Konu eksik (M)">
      <span class="badge-logic-dot"></span>
      <span>Mantık</span>
      <span class="kbd-hint">M</span>
    </button>
  ` : '';

  // Yanlış/boş durumda dikkat hatası toggle'ı
  const attentionBadgeHTML = !row.ok ? `
    <button class="badge-logic" data-act="toggle-attention" id="badge-attention" title="Bildim ama dikkatsizlik yaptım — konu değil, dikkat eksikliği">
      <span class="badge-logic-dot"></span>
      <span>Dikkat</span>
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

    // Buton metni gönderilecek istemi söyler: cevap öncesi ipucu, sonrası analiz.
    // Üç ayrı sonuç durumu için üç ayrı metin — hepsi doğru şıkkı ve uygulama
    // açıklamasını isteme koyar, yalnız istenen soru değişir.
    const geminiBtnHTML = chosen === null
      ? `<button class="btn btn-2 btn-s" data-act="ask-gemini" title="Boş bıraktığın soruyu, doğru şıkkı ve uygulama açıklamasını analiz istemi olarak kopyalar (G)">Boşu Analiz Et <span class="kbd">G</span></button>`
      : row.ok
        ? `<button class="btn btn-2 btn-s" data-act="ask-gemini" title="Doğru şıkkı, diğer şıkların tuzağını ve uygulama açıklamasını sağlama istemi olarak kopyalar (G)">Sağlamasını Yap <span class="kbd">G</span></button>`
        : `<button class="btn btn-2 btn-s" data-act="ask-gemini" title="Seçtiğin şık, doğru şık ve uygulama açıklaması analiz istemi olarak kopyalanır (G)">Yanlışı Analiz Et <span class="kbd">G</span></button>`;

    // Soru tipine özel ÖSYM tüyosu (öncüllü / "ifadelerden hangisi" / olumsuz kök /
    // olay / kısa şıklı) — kaynak: 4 gerçek HMGS sınavının ölçülmüş biçimi.
    // Hızlı yanlışta o tipin "hız tuzağı" versiyonu, normal yanlışta genel versiyonu gösterilir.
    const fastWrong = !row.ok && sec < 40 && chosen !== null;
    const tuyo = tuyoSec(q, { ok: row.ok, hizli: fastWrong });
    const fastWrongHTML = tuyo ? `
      <div class="fast-wrong-hint" style="margin:0.75rem 0;padding:0.6rem 0.85rem;background:var(--card-2, rgba(0,0,0,0.03));border-left:3px solid var(--warn, #f59e0b);border-radius:4px;font-size:0.84rem;color:var(--ink-2);line-height:1.45">
        ${fastWrong ? `<b>Bu soruyu hızlı işaretledin (${Math.round(sec)} sn).</b> ` : ''}<b>${esc(tuyo.baslik)}:</b> ${esc(tuyo.metin)}
      </div>
    ` : '';

    fb.innerHTML = `
      <div class="feedback ${row.ok ? 'ok' : 'no'}">
        <div class="fb-head">
          <div class="fb-head-left">
            <span class="fb-icon">${icon}</span>
            <div class="fb-head-info">
              <span class="fb-verdict">${verdict}</span>
              <span class="fb-dot-sep">·</span>
              <span class="fb-correct">Doğru şık: <b>${esc(q.correct)}</b></span>
            </div>
          </div>
          <div class="fb-head-right">
            ${logicBadgeHTML}${attentionBadgeHTML}
            <span class="fb-time-pill ${slow ? 'slow' : ''}" title="${slow ? `Hedef ${TARGET_SEC} sn aşıldı` : 'Zamanında cevaplandı'}">${fmtSec(sec)}</span>
          </div>
        </div>
        <div class="fb-body">
          ${explanationHTML(q, chosen)}
          ${fastWrongHTML}
          ${(q.legalBasis || cleanSource) ? `
          <div class="fb-meta-strip">
            ${q.legalBasis ? `<div class="fb-meta-item"><span class="fb-meta-label">Mevzuat</span><span class="fb-meta-val">${esc(q.legalBasis)}</span></div>` : ''}
            ${cleanSource ? `<div class="fb-meta-item"><span class="fb-meta-label">Kaynak</span><span class="fb-meta-val">${esc(cleanSource)}</span></div>` : ''}
          </div>` : ''}
          <div class="kural-slot" id="kural-slot" hidden></div>
        </div>
        <div class="fb-actions">
          <div class="fb-primary-action">
            <button class="btn btn-primary btn-next" data-act="next">
              <span>${isLast ? 'Seansı bitir' : 'Sonraki soru'}</span>
              <span class="kbd-pill">Enter ↵</span>
            </button>
          </div>
          ${(geminiBtnHTML || logicBtnHTML || kuralButtonHTML(q)) ? `
          <div class="fb-secondary-actions">
            ${geminiBtnHTML}
            ${kuralButtonHTML(q)}
            ${logicBtnHTML}
          </div>` : ''}
          <div class="fb-actions-meta">
            <span class="srs-note">${esc(sched.note)}</span>
            <span class="hint"><span class="kbd">Enter</span> devam${row.ok ? ' · <span class="kbd">M</span> mantık' : ''}${kuralButtonHTML(q) ? ' · <span class="kbd">K</span> kural' : ''} · <span class="kbd">G</span> Gemini</span>
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
  S.elimUsed = true;
  toggleOption('#view-practice', key);
}

export function eliminatePremise(numeral) {
  if (!S || S.answered) return;
  S.elimUsed = true;
  togglePremise('#view-practice', numeral);
}

export function next() {
  if (!S) return;
  if (!S.answered) return;
  S.i += 1;
  // Yeni soru için soru bazlı sinyalleri sıfırla
  S.elimUsed = false;
  S.geminiAsked = false;
  S.geminiAskedPreAnswer = false;
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

/** Yanlış yapılan cevabı dikkat hatası olarak işaretle / kaldır. */
export function toggleAttention() {
  if (!S || !S.answered) return;
  const lastLog = S.log[S.log.length - 1];
  if (!lastLog || lastLog.ok) return;

  const newFlag = !lastLog.attentionError;
  markLastAnswerAttention(newFlag);
  lastLog.attentionError = newFlag;

  const badge = $('#badge-attention');
  if (badge) badge.classList.toggle('active', newFlag);
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
  // Mantıkla/cevaptan önce ipucu istenerek geçilen sorular "net soru çözme"
  // sayılmaz: doğruluk %, ortalama süre ve "en uzun süren soru" bunlardan
  // hesaplanır, hint sırasındaki bekleme/okuma süresi hız gibi görünmesin.
  // "logics" (aşağıda) bu satırları zaten ayrı bir rozet olarak gösteriyordu.
  const clean = done.filter(r => !r.logicGuess);
  const ok = clean.filter(r => r.ok).length;
  const acc = clean.length ? Math.round((ok / clean.length) * 100) : 0;
  const secs = clean.map(r => r.ms / 1000);
  const avg = secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : 0;
  const slowest = clean.slice().sort((a, b) => b.ms - a.ms)[0];
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

      <!-- Buton sırası bilinçli: önce hep "devam et", sonuncu ve en sönük "çık"
           (18 Eylül 2026, kullanıcı talimatı — stüdyo hep soru çözmeye
           yönlendirmeli, sayfadan çıkmaya değil). Kapanmayan akışa geçmek
           birincil; aynı türden sabit set ikincil; Bugün'e dönmek düz metin
           bağlantısı — kaldırılmadı, yalnız görsel ağırlığı en düşük. -->
      <div class="btn-row" style="margin-top:2rem;margin-bottom:0.75rem">
        <button class="btn" data-act="continue-flow">Akışa Devam Et</button>
        <button class="btn btn-2" data-act="again">Aynı türden bir set daha</button>
      </div>
      <button class="btn-link" data-act="go-today">Bugün ekranına dön</button>
    </div>`;
}

/**
 * Seans sonu ekranındaki "HMGS Takip" paneli.
 * Gönderim OTOMATİKTİR — seans bitince (finalizeSession) arka planda kendiliğinden
 * denenir, kullanıcının bir şeye tıklaması gerekmez (18 Eylül 2026, kullanıcı
 * talimatı: "otomatik gitmeli zaten"). Panel sadece durumu gösterir (gönderildi /
 * gönderiliyor / cihazda bekliyor) ve isteğe bağlı bir not alanı sunar; not
 * eklemek veya başarısız bir denemeyi elle tekrar tetiklemek için buton kalır,
 * ama normal akışta hiç dokunulması gerekmez.
 * Önceden "trap" (uyarı/amber) kutusu kullanılıyordu — rutin bir senkron durumu
 * bir hata gibi göründüğü için nötr "card" stiline çevrildi (18 Eylül 2026).
 */
function syncPanelHTML() {
  const st = S.pushState;
  const sent = st === 'ok';
  const busy = st === 'busy';
  const pending = st === 'pending' || !st;
  const chip = sent
    ? '<span class="chip green">Gönderildi ✓</span>'
    : busy
      ? '<span class="chip accent">Gönderiliyor…</span>'
      : pending
        ? '<span class="chip">Birazdan gönderilecek</span>'
        : '<span class="chip">Cihazda bekliyor</span>';
  const statusLine = (!sent && !busy && !pending && S.pushMsg) ? S.pushMsg : '';
  const btnLabel = sent ? 'Gönderildi ✓' : busy ? 'Gönderiliyor…' : pending ? 'Şimdi gönder' : 'Notu kaydet ve tekrar dene';

  return `
    <div class="card" style="margin-top:2rem" id="sync-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:0.6rem;flex-wrap:wrap">
        <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink-3)">HMGS Takip</div>
        ${chip}
      </div>
      <p style="margin-bottom:0.75rem;color:var(--ink-2);font-size:0.9rem">${pending
        ? 'Bu seansın ders kırılımı birazdan kendiliğinden çalışma kaydına gönderilecek. Önce bir not düşmek istersen birkaç saniyen var (nasıl geçti, hangi konu takıldı).'
        : 'Bu seansın ders kırılımı otomatik olarak çalışma kaydına gönderiliyor. İstersen bir not düş (nasıl geçtiğini sonra hatırlarsın).'}</p>
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
      <div class="btn-row" style="margin-top:0.75rem;align-items:center">
        <button class="btn${sent ? ' btn-2' : ''}" data-act="push-session" ${sent || busy ? 'disabled' : ''}>
          ${btnLabel}
        </button>
        ${!sent ? `<button class="btn btn-2" data-act="copy-session-to-takip">Panoya kopyala (Takip'e yapıştır)</button>` : ''}
        <span id="sync-status" class="hint" style="margin:0;align-self:center">${esc(statusLine)}</span>
      </div>
      ${!sent ? `<p class="hint" style="margin-top:0.5rem">
        Yerel geliştirmede Stüdyo ve Takip ayrı adreslerde (8766 / 8000) çalıştığı için
        otomatik gönderim bazen bu ikisi arasında geçemez. Panoya kopyala düğmesi
        Drive'a veya yerel sunucuya hiç ihtiyaç duymaz: Takip'i açtığında oradaki
        "Stüdyo'dan İçe Aktar" ile yapıştırınca seans anında çalışma kaydına düşer.
      </p>` : ''}
    </div>`;
}

/**
 * Otomatik/PC-yerel gönderimin hiçbiri işlemediğinde (Drive jetonu yok, yerel
 * sunucu kapalı, ya da Stüdyo/Takip farklı origin'lerde çalışıyorsa) devreye
 * giren, HİÇBİR ağ/sunucu/OAuth'a ihtiyaç duymayan üçüncü yol. `exam.js`'teki
 * "Takip Uygulamasına Aktar (Kopyala)" ile aynı desen: JSON panoya yazılır,
 * Takip tarafında "Stüdyo'dan İçe Aktar" bunu okur. Format exam export'tan
 * farklı bir `type` taşır ('HMGS_STUDIO_SESSION_EXPORT') çünkü bu bir deneme
 * değil, tek bir pratik/karma seansı — Takip tarafında zaten var olan ve test
 * edilmiş `applyPendingStudioSessions()` dönüştürücüsüne doğrudan verilir
 * (18 Eylül 2026, kullanıcı talimatı: "otomatik gitmeli zaten... çalışmıyor,
 * çöz" — buradaki gerçek arıza yerel geliştirmede Stüdyo/Takip'in farklı
 * port/origin'de çalışması, bu yüzden localStorage kuyruğu ve paylaşılan Drive
 * jetonu ikisi de sessizce devre dışı kalıyordu; bu yol o sınırlamayı atlar).
 */
export function copySessionToClipboard() {
  if (!S || !S.sessionId) return;
  const sess = state().sessions.find(x => x.id === S.sessionId);
  const session = sess || {
    id: S.sessionId,
    note: S.note || '',
    highlights: S.highlights || '',
    isoDate: new Date().toISOString().slice(0, 10),
    mode: S.mode,
    label: S.label,
    total: S.questions ? S.questions.length : 0
  };
  const payload = {
    type: 'HMGS_STUDIO_SESSION_EXPORT',
    source: 'HMGS_STUDIO',
    exportedAt: new Date().toISOString(),
    session
  };
  const jsonStr = JSON.stringify(payload, null, 2);
  const done = () => toast('Seans panoya kopyalandı — Takip\'te "Stüdyo\'dan İçe Aktar" ile yapıştır.');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(done).catch(() => {
      prompt('Seansı kopyalayın:', jsonStr);
    });
  } else {
    prompt('Seansı kopyalayın:', jsonStr);
  }
}

/**
 * Gönderimin gerçek gövdesi. `auto=true` iken seans bittiği an kendiliğinden
 * (finalizeSession'dan) tetiklenir — kullanıcı hiçbir şeye tıklamaz. `auto=false`
 * iken kullanıcı butona bastığında çalışır: textarea'lardaki notu/vurguyu okur,
 * seans kaydına işler, sonra aynı gönderim adımlarını (yerel kuyruk → yerel
 * sunucu → Drive) tekrar dener. Otomatik deneme sessizce kuyruğa düşse bile not
 * eklemek isteyen kullanıcı butonla tekrar deneyebilir; iki yol da aynı yere çıkar.
 */
async function doSync(auto) {
  if (!S || S.pushState === 'ok' || S.pushState === 'busy') return;

  let note = S.note || '';
  let highlights = S.highlights || '';
  if (!auto) {
    const ta = $('#sess-note');
    note = (ta?.value || '').trim();
    S.note = note;

    const hlEl = $('#sess-highlight');
    highlights = (hlEl?.value || '').trim();
    S.highlights = highlights;
  }

  // Notu ve highlight'ı localStorage'daki seans kaydına işle (id ile; sıraya güvenme).
  const sess = state().sessions.find(x => x.id === S.sessionId);
  if (sess && !auto) {
    sess.note = note;
    sess.highlights = highlights;
    save();
  }

  S.pushState = 'busy';
  setSyncUI(true, auto ? 'Otomatik gönderim deneniyor…' : 'Kaydediliyor…');

  const targetSess = sess || {
    id: S.sessionId || ('sess_' + Date.now()),
    note,
    highlights,
    isoDate: new Date().toISOString().slice(0, 10),
    mode: S.mode,
    label: S.label,
    total: S.questions ? S.questions.length : 0
  };

  // 1. Tarayıcı içi Takip kuyruğuna yaz (aynı origin'de Takip anında görür)
  queueSessionForTakip(targetSess);

  // 2. PC'de yerel Stüdyo sunucusu varsa seansı diske yazıp Drive kuyruğuna taşıt.
  //    Bu çağrı GERÇEK sonucu döndürür (sunucu sessions-push'u bizim için koşturur).
  const localPush = await pushToLocalServer();

  // 3. Tarayıcıda aktif Google Drive oturumu varsa doğrudan Drive'a yaz
  let driveSynced = false;
  try {
    driveSynced = await pushSessionToDriveDirectly(targetSess);
  } catch (_) {}

  // Dürüst durum: "Gönderildi ✓" YALNIZCA Drive'a gerçekten ulaşıldığında yazılır.
  // Aksi halde kullanıcıya nerede beklediği ve ne yapması gerektiği açıkça söylenir.
  if (driveSynced || localPush.ok) {
    S.pushState = 'ok';
    S.pushMsg = 'Google Drive\'a gönderildi — Takip uygulamasını açtığında çalışma kaydında görünecek.';
    render();
    if (!auto) toast('Seans Takip kaydına gönderildi ✓');
  } else {
    S.pushState = 'queued';
    S.pushMsg = localPush.attempted
      ? (localPush.message || 'Gönderim tamamlanmadı — Google Drive yetkisi geçersiz olabilir.')
      : 'Seans bu cihazda sıraya alındı. PC\'de Takip uygulamasını açtığında eşitlenir.';
    render();
    if (!auto) toast('Seans sıraya alındı — gönderim tamamlanmadı');
  }
}

/**
 * Kullanıcının "Notu kaydet ve tekrar dene" butonuna basmasıyla çalışır.
 * Otomatik gönderim (finalizeSession) zaten arka planda denenmiştir; bu sadece
 * not eklemek veya kuyrukta kalmış bir denemeyi elle tekrar tetiklemek içindir.
 */
export async function pushSession() {
  return doSync(false);
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
  // Seans sonu ekranındaki "HMGS Takip" paneli notu bu id ile bulup yazar.
  S.sessionId = result.id;

  // Kullanıcı hiçbir ek not girmese dahi seans asla kaybolmasın: cihaz-içi
  // kuyruğa hemen yazılır (ücretsiz, ağ gerekmez, id ile idempotent).
  queueSessionForTakip(result);

  // Gerçek gönderim (yerel sunucu / Drive) OTOMATİKTİR, kullanıcının bir şeye
  // tıklaması gerekmez (18 Eylül 2026, kullanıcı talimatı: "otomatik gitmeli
  // zaten"). AMA anında değil — 8 Ağustos'ta kullanıcı BİLİNÇLİ olarak "not
  // göndermeden önce yazılabilsin" diye düğmeyi elle bıraktırmıştı (bkz.
  // log/2026-08-08_seans_gonder_butonu.md, "cursor tuzağı": bir seans bir kez
  // gönderilince Takip tarafında aynı id ikinci kez işlenmiyor, yani gönderimden
  // SONRA eklenen not hiçbir zaman Takip'e ulaşmıyor). Bu iki isteği birleştirmek
  // için kısa bir bekleme payı var: ekran "birazdan gönderilecek" diye açılır,
  // not alanları o sırada hâlâ açık, kullanıcı isterse "Şimdi gönder"le bekletmeden
  // yollar. Süre dolunca hâlâ bekliyorsa (S.pushState === 'pending') otomatik
  // gönderim kendiliğinden tetiklenir.
  S.pushState = 'pending';
  const sid = result.id;
  setTimeout(() => {
    if (S && S.sessionId === sid && S.pushState === 'pending') {
      doSync(true).catch(() => {});
    }
  }, 7000);
}

/**
 * Seansı doğrudan tarayıcı içi localStorage kuyruğuna (hmgs_pending_studio_sessions)
 * kaydeder veya mevcut kaydı günceller.
 * Takip uygulaması (aynı origin / GitHub Pages) açıldığında bu kuyruğu okuyup
 * anında çalışma kaydına (entries[]) çevirir.
 */
export function queueSessionForTakip(sess) {
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
 * Tarayıcıda aktif Google jetonu varsa seansı Drive'daki
 * `HMGS/hmgs_studio_queue.json` kuyruğuna yazar. Takip uygulaması bir sonraki
 * açılışında bu kuyruğu okuyup `entries[]`e çevirir.
 *
 * NEDEN AYRI DOSYA — eski sürüm doğrudan `hmgs_2026_data.json`'u PATCH'liyordu.
 * Bu iki kuralı birden bozuyordu:
 *   1. TEK YAZAR KURALI — o dosyanın tek yazarı Takip uygulamasıdır. Stüdyo
 *      "oku-değiştir-yaz" yaptığı için Takip tam o sırada kaydederse Stüdyo'nun
 *      bayat kopyası Takip'in yeni kaydını siliyordu.
 *   2. Drive'da dosyanın sahibi Takip'tir; `drive.file` kapsamı başka bir
 *      istemcinin yarattığı dosyayı yazamaz — istek 403 dönüyordu.
 * Kuyruk dosyasının sahibi ve tek yazarı artık Stüdyo'dur; Takip sadece okur.
 */
export async function pushSessionToDriveDirectly(sess) {
  if (!sess || !sess.id) return false;
  let token = getAnyGoogleToken();
  if (!token) return false;
  setActiveToken(token);

  try {
    // Kuyruk dosyası TAM bir anlık görüntüdür (append değil): Stüdyo zaten
    // localStorage'daki sessions[] dizisinin tamamını gönderiyor. Takip tarafı
    // studioSessionId üzerinden idempotent çevirdiği için mükerrer kayıt olmaz.
    const s = state();
    const ok = await pushStudioQueueToDrive(token, s.sessions || [], (s.answers || []).slice(-2000));
    return ok;
  } catch (err) {
    console.warn('[sync] Drive kuyruk güncelleme uyarısı:', err);
    return false;
  }
}

/**
 * Yerel Stüdyo sunucusu (PC'de localhost:8766) varsa iki adımı SIRAYLA çalıştırır:
 *   1) POST /api/save-sessions → güncel seansları studio_sessions_export.json'a yazar
 *   2) POST /api/push-sessions → sunucu `hmgs-sync.mjs sessions-push` çalıştırır ve
 *      seansı Drive'daki pendingStudioSessions kuyruğuna ekler
 * Sıra zorunludur: push, export dosyasını okur; save bitmeden push edilirse bayat içerik gider.
 *
 * GitHub Pages / telefonda bu uçlar yoktur; her hata sessizce yutulur ve kullanıcıya
 * ağ hatası gösterilmez (13 Eyl 2026 sözleşmesi, kriter 1).
 *
 * @returns {Promise<{attempted: boolean, ok: boolean, message: string}>}
 *   attempted: yerel sunucu ortamı mıydı — false ise buton "sıraya alındı" der.
 *   ok: Drive'a yazıldı mı — butonun "Gönderildi ✓" demesinin TEK koşulu budur.
 */
export async function pushToLocalServer() {
  if (typeof window === 'undefined') return { attempted: false, ok: false, message: '' };
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return { attempted: false, ok: false, message: '' };

  try {
    const s = state();
    await fetch('/api/save-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessions: s.sessions || [],
        answers: (s.answers || []).slice(-2000)
      })
    });
  } catch (_) {
    return { attempted: true, ok: false, message: '' };
  }

  try {
    const res = await fetch('/api/push-sessions', { method: 'POST' });
    if (!res.ok) return { attempted: true, ok: false, message: '' };
    const data = await res.json();
    return { attempted: true, ok: data?.status === 'ok', message: data?.message || '' };
  } catch (_) {
    return { attempted: true, ok: false, message: '' };
  }
}

/* ---------- Gemini istemi ---------- */

/**
 * İstem, sorunun KENDİSİNİ taşımak zorundadır: havuzdaki soruların ~%37'si
 * olumsuz köklü ("hangisi değildir / yanlıştır / olamaz"). Şıklar olmadan bu
 * sorular cevaplanamaz — eski istem yalnız `stem` gönderiyordu, o yüzden
 * Gemini'ye soru değil başlık gidiyordu.
 *
 * İki ayrı ihtiyaç, iki ayrı istem:
 *   - Cevaplanmadan  → yol gösterici ipucu. Doğru şık isteme YAZILMAZ.
 *   - Cevaplandıktan → analiz. Seçilen şık + doğru şık + uygulamanın kendi
 *     açıklaması birlikte gider; istenen şey "neden benim şıkkım yanlış".
 *
 * @param {object} q soru nesnesi (stem, options, correct, explanation, …)
 * @param {{answered?:boolean, chosen?:string|null}} [stateArg]
 * @returns {{mode:'hint'|'wrong'|'blank'|'correct', text:string}}
 */
export function buildGeminiPrompt(q, stateArg = {}) {
  const answered = !!stateArg.answered;
  const chosen = stateArg.chosen || null;

  // Dayanaklar künye olarak gider: ham chunk başlıkları
  // ("1136 sk m. 5/a — Avukatlığa Kabulü Engelleyen Mutlak ve Süresiz Suçlar…")
  // istemi 4 satır şişirip bilgi eklemiyordu. groupLegalRefs kanunu bir kez
  // yazar, maddeleri toplar: "1136 sk m. 3, 5/a · 1136 sk m. 3 & m. 4".
  const topic = q.topicId ? topicById.get(q.topicId) : null;
  const refs = [];
  if (q.legalBasis) refs.push(String(q.legalBasis).trim());
  if (topic && Array.isArray(topic.chunks)) {
    for (const c of topic.chunks) {
      if (refs.length >= 4) break;
      if (c && c.legalRef) refs.push(String(c.legalRef).trim());
    }
  }
  const basis = groupLegalRefs(refs, 150);

  const opts = Array.isArray(q.options) ? q.options : [];
  const textOf = k => {
    const o = opts.find(x => x.key === k);
    return o ? String(o.text || '').trim() : '';
  };

  const L = [];
  L.push('HMGS 2026/2 (27 Eylül 2026) hukuk sınavına çalışıyorum. Aşağıdaki soruda takıldım.');
  L.push('');
  L.push(`Ders: ${subjectName(q.subjectId)}`);
  if (topic) L.push(`Konu: ${String(topic.title || '').replace(/^\s*\d+\.\s*/, '')}`);
  if (basis) L.push(`Konu dayanakları: ${basis}`);
  if (q.category === 'Çıkmış Sorular') {
    L.push(`Kaynak: ${stripEmoji(q.sourceBadgeLabel) || 'çıkmış sınav sorusu'}`);
  }
  L.push('');
  L.push('SORU');
  L.push(String(q.stem || '').replace(/\s*\n\s*/g, ' ').trim());
  L.push('');
  L.push('ŞIKLAR');
  for (const o of opts) L.push(`${o.key}) ${String(o.text || '').trim()}`);
  L.push('');

  let mode;
  if (!answered) {
    mode = 'hint';
    L.push('Henüz şık işaretlemedim. Doğru şıkkı söyleme, hiçbir şıkka "doğru" veya "yanlış" etiketi koyma.');
    L.push('Şunları yaz:');
    L.push('1. Soru hangi hükmü yokluyor — tek cümle.');
    L.push('2. Karar hangi iki şık arasında veriliyor, ayrım hangi kanun maddesine ve hangi şarta dayanıyor.');
    L.push('3. Bu ayrımı kendim sınayabilmem için tek cümlelik bir kontrol sorusu yaz.');
    L.push('Kısa yaz. Akademik paragraf, örnek vaka anlatımı ve genel sınav tavsiyesi istemiyorum.');
  } else if (chosen && chosen !== q.correct) {
    mode = 'wrong';
    L.push(`Bu soruyu yanlış işaretledim: ${chosen}) ${textOf(chosen)}`);
    L.push(`Doğru şık: ${q.correct}) ${textOf(q.correct)}`);
    L.push(`Uygulamanın kendi açıklaması: ${String(q.explanation || '').trim()}`);
    L.push('Açıklamanın tamamını tekrar yazma; üstüne ekle.');
    L.push('Şunları yaz:');
    L.push(`1. Benim seçtiğim ${chosen} şıkkı neden yanlış — hangi kavramı ya da şartı karıştırmışım.`);
    L.push(`2. ${q.correct} ile ${chosen} arasındaki ayrım hangi kanun maddesine ve hangi şarta dayanıyor.`);
    L.push('3. Uygulamanın açıklamasında eksik veya yanlış bir bilgi varsa söyle; yoksa "açıklama doğru" de.');
    L.push('4. Aynı konudan, şıkları birbirine benzeyen bir HMGS sorusu yaz; doğru cevabı gerekçesiyle ver.');
  } else if (!chosen) {
    mode = 'blank';
    L.push('Bu soruyu bilmiyordum, boş bıraktım.');
    L.push(`Doğru şık: ${q.correct}) ${textOf(q.correct)}`);
    L.push(`Uygulamanın kendi açıklaması: ${String(q.explanation || '').trim()}`);
    L.push('Açıklamanın tamamını tekrar yazma; üstüne ekle.');
    L.push('Şunları yaz:');
    L.push('1. Doğru şıkkı doğru yapan şart ne — kanun maddesiyle.');
    L.push('2. Diğer dört şık neden yanlış — her biri tek satır, hangi kavramla karıştırılmak isteniyor.');
    L.push('3. Bu konudan, şıkları birbirine benzeyen bir HMGS sorusu yaz; doğru cevabı gerekçesiyle ver.');
  } else {
    mode = 'correct';
    L.push(`Doğru işaretledim (${q.correct}) ama sağlamasını yapmak istiyorum.`);
    L.push(`Uygulamanın kendi açıklaması: ${String(q.explanation || '').trim()}`);
    L.push('Açıklamanın tamamını tekrar yazma; üstüne ekle.');
    L.push('Şunları yaz:');
    L.push('1. Bu şıkkı doğru yapan şart ne, hangi maddeden geliyor.');
    L.push('2. Diğer şıklar nerede tuzak — her biri tek satır, hangi kavramla karıştırılmak isteniyor.');
    L.push('3. Aynı kuralın istisnası varsa yaz; yoksa "istisna yok" de.');
  }

  return { mode, text: L.join('\n') };
}

/** Cihaza göre yapıştırma yönergesi — telefonda "sağ pencere" diye bir şey yok. */
function pasteHint() {
  try {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(pointer: coarse)').matches) {
      return 'Gemini uygulamasına yapıştır (metne dokunup Yapıştır).';
    }
  } catch (_) {}
  return "Gemini'ye yapıştır (Ctrl+V).";
}

/**
 * Mevcut soruyu şıklarıyla, konusuyla ve seçilen cevapla birlikte Gemini'ye
 * yapıştırılmak üzere panoya kopyalar. Uygulama içinde çözüm üretmez —
 * Gemini ayrı bir pencerede/cihazda açık olmalıdır.
 */
export function askGemini() {
  if (!S || S.i >= S.questions.length) return;
  const q = S.questions[S.i];
  const last = S.log[S.log.length - 1];
  const chosen = S.answered && last && last.qId === q.id ? last.chosen : null;

  // Davranış sinyali: bu soru için Gemini'ye soruldu
  S.geminiAsked = true;
  // Cevap VERİLMEDEN sorulduysa → ipucu modu. SRS'te logicGuess gibi davranacak.
  if (!S.answered) S.geminiAskedPreAnswer = true;
  if (S.answered && last && last.qId === q.id) {
    last.askedGemini = true;
    // store'daki son kayıt ile S.log senkron — doğrudan güncelle ve kaydet
    const storeAnswers = state().answers;
    const storeRow = storeAnswers.findLast?.(a => a.qId === q.id) ||
      [...storeAnswers].reverse().find(a => a.qId === q.id);
    if (storeRow) { storeRow.askedGemini = true; save(); }
  }

  const built = buildGeminiPrompt(q, { answered: !!S.answered, chosen });
  const prompt = built.text;
  const cls = built.mode === 'hint' ? 'Soru + 5 şık (doğru şık yok)'
    : built.mode === 'wrong' ? 'Seçtiğin şık + doğru şık + açıklama'
      : built.mode === 'blank' ? 'Boş soru + doğru şık + açıklama'
        : 'Doğru şık + açıklama';
  const msg = `${built.mode === 'hint' ? 'İpucu' : 'Analiz'} istemi kopyalandı — ${cls}. ${pasteHint()}`;

  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prompt).then(() => {
      toast(msg);
    }).catch(() => {
      fallbackCopy(prompt, msg);
    });
  } else {
    fallbackCopy(prompt, msg);
  }

  // Yerel Stüdyo sunucusu açıksa panoya ikinci yoldan da yazar. Sunucu yoksa
  // (telefon, GitHub Pages) sessizce düşer — kullanıcıya yanlış bilgi verilmez,
  // kopyalama işini input içindeki tarayıcı API'si zaten yapmıştır.
  try {
    fetch('/api/gemini-bridge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    }).catch(() => {});
  } catch (_) {}
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
  try {
    ok = document.execCommand('copy');
  } catch (_) {
    ok = false;
  }
  document.body.removeChild(ta);
  toast(ok ? msg : 'İstem hazırlandı ama panoya kopyalanamadı.');
}

