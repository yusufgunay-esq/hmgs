/* ==========================================================================
   views/practice.js — SÜRE ÖLÇEN SORU MOTORU
   Her cevap telemetriye yazılır, SRS'e işlenir. Süre ölçümü pazarlıksızdır.
   ========================================================================== */

import { esc, rich, richBlock, splitStem, fmtSec, emptyState, $, toast } from '../ui.js';
import { subjectName, questionsOf, questionsOfTopic, questionsOfTopics, shuffle, topicById, pastExamQuestions } from '../data.js';
import { recordAnswer, save, saveSession, state, TARGET_SEC } from '../store.js';
import { scheduleAfterAnswer, dueQuestions, unseenQuestions } from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';

let S = null;   // aktif seans
let tick = null;

/** Seans kur. opts: { mode, subjectId, topicId, topicIds, count, customLabel } */
export function startSession(opts = {}) {
  const { mode = 'mixed', subjectId = null, topicId = null, topicIds = null, count = 15, customLabel = null } = opts;
  let pool = [];
  let label = '';

  if (mode === 'review') {
    // Vadesi gelen yanlışlar. subjectId verilirse yalnız o ders.
    // (27 Ağu 2026: ders süzgeci eklendi — "Yanlışlarım" ekranı ders ders
    //  çözdürebilsin diye. Süzgeçsiz çağrı eskisi gibi çalışır.)
    let due = dueQuestions();
    if (subjectId) due = due.filter(d => d.q.subjectId === subjectId);
    pool = due.map(d => d.q);
    label = subjectId ? `Tekrar · ${subjectName(subjectId)}` : 'Tekrar seansı';
  } else if (mode === 'topics' && Array.isArray(topicIds) && topicIds.length) {
    pool = shuffle(questionsOfTopics(topicIds));
    const titles = topicIds.map(id => topicById.get(id)?.title).filter(Boolean);
    label = customLabel || (titles.length === 1 ? titles[0] : (titles.length ? `${titles[0]} (+${titles.length - 1} konu)` : 'Seçili Konular'));
  } else if (mode === 'topic' || (topicId && mode !== 'subject' && mode !== 'pastExam' && mode !== 'review')) {
    pool = shuffle(questionsOfTopic(topicId));
    label = customLabel || topicById.get(topicId)?.title || 'Konu soruları';
  } else if (mode === 'subject') {
    pool = shuffle(questionsOf(subjectId));
    label = customLabel || subjectName(subjectId);
  } else if (mode === 'unseen') {
    pool = shuffle(unseenQuestions(subjectId));
    label = 'Yeni sorular';
  } else if (mode === 'pastExam') {
    pool = shuffle(pastExamQuestions());
    label = 'Çıkmış sorular · karışık pratik';
  } else {
    pool = shuffle(subjectId ? questionsOf(subjectId) : allQuestions());
    label = customLabel || (subjectId ? subjectName(subjectId) : 'Karma set');
  }

  if (!pool.length) {
    S = null;
    render();
    toast('Bu kriterde çözülecek soru yok.');
    return false;
  }

  S = {
    mode, label, count, subjectId, topicId,
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
export function endSession() { S = null; stopTick(); }

/* ---------- render ---------- */

export function render() {
  const host = $('#view-practice');
  if (!host) return;

  if (!S) {
    host.innerHTML = `<div class="wrap">${emptyState({
      icon: '◦',
      title: 'Açık bir seans yok',
      body: 'Bugün ekranındaki öneriyle başlamak en verimlisi — ne çalışacağına karar vermek de enerji harcar.',
      cta: { act: 'go-today', label: 'Bugün ekranına dön' }
    })}
    <div class="card" style="margin-top:1rem">
      <h3 style="font-size:1rem;font-weight:700;margin-bottom:0.4rem">Sadece çıkmış sorular</h3>
      <p style="font-size:0.9rem;color:var(--ink-2);margin-bottom:0.9rem">
        Süresiz, karışık pratik — yalnız resmi HMGS sınavlarından (Nisan 2026 + Eylül 2025) gerçek çıkmış sorular.
        Bunları orijinal sınav koşulunda, tek oturumda çözmek istersen <strong>Deneme</strong> sekmesindeki
        "Gerçek çıkmış sınavlar" bölümünü kullan.
      </p>
      <button class="btn btn-2" data-act="practice-pastexam">Çıkmış soruları çöz</button>
    </div></div>`;
    return;
  }

  if (S.i >= S.questions.length) { renderSummary(host); return; }

  const q = S.questions[S.i];
  const { premise, ask } = splitStem(q.stem);
  const prog = ((S.i) / S.questions.length) * 100;
  const topic = q.topicId ? topicById.get(q.topicId) : null;

  host.innerHTML = `
    <div class="wrap-read">
      <div class="q-progress"><i style="width:${prog}%"></i></div>
      <div class="q-head">
        <span class="chip accent">${esc(S.label)}</span>
        <span>${S.i + 1} / ${S.questions.length}</span>
        <span>${esc(subjectName(q.subjectId))}</span>
        ${q.difficulty && q.difficulty !== 'etiketsiz' ? `<span class="chip">${esc(q.difficulty)}</span>` : ''}
        <span class="q-timer" id="q-timer">0 sn</span>
      </div>
    </div>

    <div class="q-shell" id="q-shell">
      <div class="q-main">
        <div class="card">
          ${premiseHTML(premise)}
          <div class="q-ask">${rich(ask)}</div>
          <div class="opts" id="opts">
            ${q.options.map(o => optionRowHTML(o, { pickAct: 'pick' })).join('')}
          </div>
        </div>

        <div class="btn-row" style="margin-top:1.25rem">
          <button class="btn btn-2 btn-s" data-act="dontknow">Bilmiyorum · çözümü göster</button>
          <button class="btn btn-2 btn-s" data-act="quit">Seansı bitir</button>
          <span class="hint" style="margin-left:auto">
            <span class="kbd">A</span>–<span class="kbd">E</span> seç · <span class="kbd">Enter</span> devam
          </span>
        </div>
        ${topic ? `<p class="hint" style="margin-top:0.8rem">Bağlı konu: ${esc(topic.title)}</p>` : ''}
      </div>
      <aside class="q-side"><div id="fb"></div></aside>
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
          <span class="fb-time chip ${slow ? 'amber' : 'green'}">${fmtSec(sec)}${slow ? ` · hedef ${TARGET_SEC} sn` : ''}</span>
        </div>
        <div class="fb-body">
          ${explanationHTML(q, chosen)}
        </div>
        <div class="fb-footer">
          ${q.legalBasis ? `<span class="basis">${esc(q.legalBasis)}</span>` : ''}
          <span class="srs-note">${esc(sched.note)}</span>
        </div>
      </div>`;
  }
  const next = document.createElement('div');
  next.className = 'btn-row';
  next.style.marginTop = '1.1rem';
  next.innerHTML = `<button class="btn" data-act="next">${S.i + 1 >= S.questions.length ? 'Seansı bitir' : 'Sonraki soru'}</button>`;
  fb?.appendChild(next);

  $('#q-shell')?.classList.add('answered');

  // Telefonda çözüm şıkların ALTINA açılır; kullanıcı kendi kaydırmasın diye
  // oraya götürüyoruz. Masaüstünde çözüm zaten sağda beliriyor — orada
  // kaydırmak yerine "Sonraki" düğmesine odaklanmak (Enter ile devam) doğru.
  // matchMedia yoksa (smoke testin jsdom ortamı) masaüstü dalına düşer.
  const darEkran = typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 760px)').matches;
  if (darEkran) {
    requestAnimationFrame(() => fb?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  } else {
    $('[data-act="next"]')?.focus();
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

  host.innerHTML = `
    <div class="wrap-read">
      <h1 class="page">Seans bitti</h1>
      <p class="page-sub">${esc(S.label)} · ${done.length} soru</p>

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
          <div class="metric-v">${wrongs.length}</div>
          <div class="metric-n">yarın yeniden sorulacak</div>
        </div>
      </div>

      ${avg > TARGET_SEC ? `<div class="trap"><div class="lbl">Hız notu</div><p>Ortalaman hedefin üstünde. Sınavda 120 soru için soru başına ortalama 75 saniyen var — doğruluk yerleştiyse bundan sonraki iş hızı düşürmek.</p></div>` : ''}
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
      <div class="lbl">HMGS Takip'e gönder</div>
      <p style="margin-bottom:0.75rem">Bu seansın ders kırılımı çalışma kaydına yazılacak. İstersen bir not düş — nasıl geçtiğini sonra hatırlarsın.</p>
      <label style="display:block;font-size:0.82rem;font-weight:600;color:var(--ink-2);margin-bottom:0.3rem">
        📝 Hissiyat Notu <span style="font-weight:400;opacity:.7">(nasıl geçti, zorluk, dikkat hataları…)</span>
      </label>
      <textarea id="sess-note" rows="3"
        placeholder="Örn: Saat çok geçti, dikkat hatası yaptım — bilgi eksiği değil."
        style="width:100%;padding:0.6rem 0.75rem;border:1px solid var(--line);border-radius:8px;font:inherit;font-size:0.95rem;resize:vertical;background:var(--bg);color:inherit;margin-bottom:0.75rem"
        ${sent ? 'disabled' : ''}>${esc(S.note || '')}</textarea>
      <label style="display:block;font-size:0.82rem;font-weight:600;color:var(--ink-2);margin-bottom:0.3rem">
        ✏️ Highlight / Çözüm Nüansı <span style="font-weight:400;opacity:.7">(öğrendiğin incelik, sık hata, çakılan konu…)</span>
      </label>
      <textarea id="sess-highlight" rows="3"
        placeholder="Örn: Muris muvazaasında ispat yükü davalıda — Yargıtay HGK 2020."
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

  // Notu ve highlight'ı localStorage'daki seans kaydına işle (id ile — sıraya güvenme).
  const sess = state().sessions.find(x => x.id === S.sessionId);
  if (sess) {
    sess.note = note;
    sess.highlights = highlights;
    save();
  }

  S.pushState = 'busy';
  setSyncUI(true, 'Gönderiliyor…');

  try {
    // Önce güncel liste (notu ve highlight'ı ile birlikte) export dosyasına yazılsın.
    const saveRes = await fetch('/api/save-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: state().sessions })
    });
    if (!saveRes.ok) throw new Error('Seanslar yerel dosyaya yazılamadı.');

    const res = await fetch('/api/push-sessions', { method: 'POST' });
    const data = await res.json().catch(() => ({ status: 'error', message: 'Sunucu yanıtı okunamadı.' }));

    if (data.status === 'ok') {
      S.pushState = 'ok';
      S.pushMsg = 'Takip uygulamasını açtığında kayıt orada olacak.';
      render();
      toast('Seans HMGS Takip kuyruğuna gönderildi ✓');
    } else {
      S.pushState = 'err';
      S.pushMsg = data.message || 'Gönderilemedi.';
      setSyncUI(false, S.pushMsg);
      toast('Gönderilemedi — not kaydedildi, sonra tekrar deneyebilirsin.');
    }
  } catch (e) {
    S.pushState = 'err';
    S.pushMsg = 'Stüdyo sunucusuna ulaşılamadı (baslat.bat ile açtın mı?).';
    setSyncUI(false, S.pushMsg);
    toast('Gönderilemedi — not kaydedildi.');
  }
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
  pushSessionsToServer();
}

/**
 * Güncel seans listesini yerel Stüdyo sunucusuna (studio_server.py,
 * /api/save-sessions) gönderir — bu dosyayı HMGS_Takip_App/sync/hmgs-sync.mjs
 * (sessions-push) okuyup Drive kuyruğuna ekler. Sunucu çalışmıyorsa (ör. eski
 * `python -m http.server` ile açılmışsa) sessizce başarısız olur; oturum zaten
 * localStorage'a kaydedildi, sadece otomatik aktarım o durumda çalışmaz.
 */
function pushSessionsToServer() {
  try {
    fetch('/api/save-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: state().sessions })
    }).catch(() => {});
  } catch (_) { /* fetch bile yoksa sessizce geç */ }
}
