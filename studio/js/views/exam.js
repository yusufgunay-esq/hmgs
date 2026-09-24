/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   views/exam.js — 120 SORULUK SINAV SİMÜLASYONU
   Gerçek ders dağılımı · geri sayım · boş bırakma · soru haritası
   Kural: HMGS'de yanlış cezası yoktur → net = doğru. Asla boş bırakma.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, rich, richBlock, stripEmoji, splitStem, fmtClock, emptyState, $, toast } from '../ui.js';
import { buildAlgorithmicExamSet, getAlgorithmicExamPreview, subjectName, SUBJECTS, topicById, questionById, pastExamList, pastExamQuestions, denemeSetList, denemeSetQuestions } from '../data.js';
import { recordAnswer, save, saveExam, state, lastExam, EXAM_TOTAL, PASS_CORRECT } from '../store.js';
import { scheduleAfterAnswer, scoreOf } from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';
import { bookLocationFor, NO_BOOK_SUBJECTS } from '../book-map.js';
import { pushStudioQueueToDrive, getActiveToken, setActiveToken, requestSilentToken } from '../vault-client.js';
import { buildGeminiPrompt } from './practice.js';
import { arsivLabel, denemeLabel, arsivStartLabel, denemeStartLabel, SECTION } from '../labels.js';
import { kurtarmaRadariHTML } from '../tuyolar.js';

/** HMGS: 120 soru / 155 dakika (Adalet Bakanlığı PGM, 27 Eylül 2026 ilanı:
 *  "cevaplama süresi 155 dakika"). Eskiden 150 yazıyordu. */
const DURATION_MS = 155 * 60 * 1000;

/** Bu kadar süre dururken "bitir"e basılırsa önce kuşkulu sorulara çağır. */
const ERKEN_BITIS_MS = 20 * 60 * 1000;

let E = null;
let clock = null;
let lastResult = null;

/** Çözüm ekranı: aktif süzgeç, okuyucudaki sıra ve ekranın açık olup olmadığı. */
const rv = { f: 'fix', pos: 0 };
let reviewOpen = false;

/**
 * Akıllı Algoritmik Deneme Sınavını başlatır.
 * Öncelik: Görülmemiş soru öncelikli; Arşiv -> Deneme -> YZ -> Soru Bankası.
 */
export function startSmart() {
  const s = state();
  const seen = new Map((s.answers || []).map(a => [a.qId, new Date(a.at || 0).getTime()]));
  const { questions, shortfall, stats } = buildAlgorithmicExamSet(seen);
  const label = `Akıllı Deneme (${stats.unseen} yeni soru)`;
  return beginExam(questions, {
    shortfall,
    label,
    real: 'smart_algorithmic',
    stats
  });
}


/**
 * Gerçek bir HMGS sınavını olduğu gibi (orijinal soru sırasıyla, karıştırmadan)
 * baştan sona çözer — resmi sınav koşulunun taklidi. `sourceId` verilmezse
 * elde bulunan tüm arşiv soruları tek sette birleşir.
 */
export function startReal(sourceId) {
  const questions = pastExamQuestions(sourceId);
  if (questions.length < 20) {
    toast('Bu sınav için havuz çok küçük.');
    return false;
  }
  const label = sourceId
    ? arsivStartLabel(sourceId)
    : 'Arşiv sınavları (tüm)';
  return beginExam(questions, { shortfall: [], label, real: sourceId || 'all' });
}

/**
 * Hazır bir tam kâğıdı orijinal sırasıyla başlatır.
 * Bugün rotası (rota.js) son provayı en az görülmüş kâğıttan kurar.
 */
export function startQuestions(questions, label, real) {
  return beginExam(questions, { shortfall: [], label: label || 'Deneme', real: real || null });
}

/**
 * Deneme setini orijinal soru sırasıyla başlatır.
 * sourceId verilmezse tüm deneme soruları birleşir.
 */
export function startDenemeSet(sourceId) {
  const questions = denemeSetQuestions(sourceId);
  if (questions.length < 20) {
    toast('Bu deneme için havuz çok küçük.');
    return false;
  }
  const label = denemeStartLabel(sourceId);
  return beginExam(questions, { shortfall: [], label, real: sourceId || 'deneme_all' });
}

export const startYekti = startDenemeSet;

function beginExam(questions, { shortfall, label, real, stats }) {
  /* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ · بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ · رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ */
  if (questions.length < 20) {
    toast('Deneme için havuz çok küçük.');
    return false;
  }
  const durationMs = questions.length <= 100 ? (130 * 60 * 1000) : DURATION_MS;
  E = {
    questions,
    i: 0,
    answers: new Array(questions.length).fill(null),  // 'A'..'E' veya null = boş
    marked: new Set(),
    times: new Array(questions.length).fill(0),
    qStart: performance.now(),
    startedAt: Date.now(),
    endsAt: Date.now() + durationMs,
    shortfall: shortfall || [],
    label,
    real,
    stats: stats || null,
    finished: false
  };
  if (shortfall && shortfall.length) {
    const miss = shortfall.reduce((a, s) => a + (s.want - s.got), 0);
    toast(`Havuz yetersiz: ${miss} soru eksik. Deneme ${questions.length} soruyla kuruldu.`);
  }
  render();
  return true;
}

export function active() { return !!E && !E.finished; }

function activeResult() {
  return lastResult || lastExam();
}

export function render() {
  const host = $('#view-exam');
  if (!host) return;

  const res = activeResult();

  if (!E && reviewOpen && res) {
    host.innerHTML = `<div class="wrap">${resultBlock(res, false)}</div>`;
    return;
  }

  if (!E) {
    const reals = pastExamList();
    const denemeSets = denemeSetList();
    const s = state();
    const seen = new Map((s.answers || []).map(a => [a.qId, new Date(a.at || 0).getTime()]));
    const prev = getAlgorithmicExamPreview(seen);

    host.innerHTML = `<div class="wrap">
      <h1 class="page">Deneme Sınavı</h1>
      <p class="page-sub">120 soru · 155 dakika · resmi ders dağılımı</p>
      ${res ? resultBlock(res, true) : ''}

      <!-- 1. BİRİNCİL ODAK: AKILLI ALGORİTMİK DENEME -->
      <div class="card" style="margin-top:1.25rem;border:1px solid rgba(var(--accent-rgb, 99, 102, 241), 0.25);background:var(--surface)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.6rem;flex-wrap:wrap;gap:0.5rem">
          <div>
            <span class="chip accent" style="font-size:0.75rem;margin-bottom:0.35rem;display:inline-block">Kişisel Deneme Motoru</span>
            <h2 style="font-size:1.2rem;font-weight:700;margin:0;color:var(--ink)">Akıllı Deneme Sınavı</h2>
          </div>
          <span style="font-size:0.85rem;color:var(--ink-2);font-weight:600">120 Soru · 155 Dakika</span>
        </div>
        <p style="font-size:0.92rem;color:var(--ink-2);line-height:1.5;margin-bottom:1.1rem">
          Görmediğin sorular öncelikli, 20 ders kotasına tam uyumlu kişiselleştirilmiş sınav provası.
        </p>

        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.75rem;padding-top:0.75rem;border-top:1px solid var(--border)">
          <span style="font-size:0.85rem;color:var(--ink-2)">
            Havuzda <strong style="color:var(--ink)">${prev.unseenAvailable}</strong> çözülmemiş soru hazır
          </span>
          <button class="btn" data-act="exam-start-smart" style="font-size:0.95rem;padding:0.65rem 1.3rem;font-weight:600">
            Akıllı Denemeyi Başlat
          </button>
        </div>
      </div>

      <!-- 2. BÖLÜM: RESMİ ÇIKMIŞ SINAVLAR -->
      ${reals.length ? `
      <div style="margin-top:2rem">
        <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 0.75rem 0;color:var(--ink)">${esc(SECTION.arsiv())}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:0.85rem">
          ${reals.map(r => {
            const past = (s.exams || []).filter(e => e.real === r.id);
            const lastPast = past.length ? past[past.length - 1] : null;
            return `
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;padding:1rem;gap:0.75rem">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
                  <h4 style="font-size:0.95rem;font-weight:600;margin:0;color:var(--ink)">${esc(arsivLabel(r.id))}</h4>
                  ${lastPast ? `<span class="chip ${lastPast.pass ? 'accent' : ''}" style="font-size:0.72rem">${lastPast.net} net</span>` : ''}
                </div>
                <span style="font-size:0.82rem;color:var(--ink-2)">${r.count} soru · ${r.count <= 100 ? '130' : '155'} dakika</span>
              </div>
              <button class="btn btn-2 btn-s" data-act="exam-start-real" data-source="${esc(r.id)}" style="align-self:flex-start">
                ${lastPast ? 'Tekrar Çöz' : 'Sınavı Başlat'}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      <!-- 3. BÖLÜM: DENEME SETLERİ -->
      ${denemeSets.length ? `
      <div style="margin-top:2rem">
        <h3 style="font-size:1.05rem;font-weight:700;margin:0 0 0.75rem 0;color:var(--ink)">${esc(SECTION.denemeleri())}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:0.85rem">
          ${denemeSets.map(r => {
            const past = (s.exams || []).filter(e => e.real === r.id);
            const lastPast = past.length ? past[past.length - 1] : null;
            return `
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;padding:1rem;gap:0.75rem">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
                  <h4 style="font-size:0.95rem;font-weight:600;margin:0;color:var(--ink)">${esc(denemeLabel(r.id))}</h4>
                  ${lastPast ? `<span class="chip ${lastPast.pass ? 'accent' : ''}" style="font-size:0.72rem">${lastPast.net} net</span>` : ''}
                </div>
                <span style="font-size:0.82rem;color:var(--ink-2)">${r.count} soru · 155 dakika</span>
              </div>
              <button class="btn btn-2 btn-s" data-act="exam-start-deneme" data-source="${esc(r.id)}" style="align-self:flex-start">
                ${lastPast ? 'Tekrar Çöz' : 'Denemeyi Başlat'}
              </button>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

    </div>`;
    return;
  }

  if (E.finished) { host.innerHTML = `<div class="wrap">${resultBlock(lastResult, false)}</div>`; return; }

  /* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ · بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ · رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ */
  const q = E.questions[E.i];
  const { premise, ask } = splitStem(q.stem);
  const chosen = E.answers[E.i];
  const answeredCount = E.answers.filter(a => a !== null).length;

  host.innerHTML = `
    <div class="wrap">
      <div class="exam-bar">
        <span class="exam-clock" id="exam-clock">${fmtClock(E.endsAt - Date.now())}</span>
        <span class="chip" id="exam-pace" title="Kalan süre ÷ işaretlenmemiş soru. Bütçe büyükse acele ediyorsun: kökü ikinci kez oku, şıkları tek tek ele.">${paceText()}</span>
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
          ${''/* Hedef/kaynak rozeti yok: sınavda da sorunun kaynağı yazmaz. */}
          ${q.difficulty && q.difficulty !== 'etiketsiz' ? `<span class="chip">${esc(q.difficulty)}</span>` : ''}
          <button class="btn btn-2 btn-s exam-doubt${E.marked.has(E.i) ? ' on' : ''}" data-act="exam-mark" style="margin-left:auto"
            title="Bu soruda kuşkun olduğunu işaretler. Soru haritasında işaretli kalır, sonuç ekranında da kuşkulu sayılır (K)">
            ${E.marked.has(E.i) ? 'Kuşkuyu kaldır' : 'Kuşkuluyum'} <span class="kbd">K</span>
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
          <span class="hint" style="margin-left:auto">Çözümler sınav bitince açılır · emin değilsen <span class="kbd">K</span></span>
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
    const pe = $('#exam-pace');
    if (pe) pe.textContent = paceText();
    if (left <= 0) { toast('Süre doldu.'); finish(true); }
  }, 500);
}
function stopClock() { if (clock) { clearInterval(clock); clock = null; } }

/**
 * Tempo göstergesi. 14 Eylül denemesi 155 dakikanın 72'sinde bitti; o
 * denemede 40-75 sn ayrılan sorularda isabet %64, 10-40 sn'de %38 idi.
 * Sorun yavaşlık değil acele: bu yüzden gösterge "kalan bütçe"yi söyler.
 */
function paceText() {
  if (!E) return '';
  const left = Math.max(0, E.endsAt - Date.now());
  const open = E.answers.filter(a => a === null).length;
  if (!open) return E.marked.size ? `${E.marked.size} kuşkulu soruna dön` : 'hepsi işaretli';
  return `soru başı ~${Math.round(left / 1000 / open)} sn bütçen var`;
}

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
  const left = E.endsAt - Date.now();
  if (!auto && left > ERKEN_BITIS_MS) {
    const dk = Math.round(left / 60000);
    const once = lastExam();
    const gecmis = once && once.durationMs ? ` Son denemen ${Math.round(once.durationMs / 60000)} dakikada bitti.` : '';
    if (E.marked.size) {
      if (!confirm(`${dk} dakikan duruyor.${gecmis} Gerçek sınavda bu süre, kuşkulu işaretlediğin ${E.marked.size} soruya dönmek içindir.\n\nTamam: yine de bitir · İptal: ilk kuşkulu soruya git`)) {
        goto(Math.min(...E.marked));
        return;
      }
    } else if (!confirm(`${dk} dakikan duruyor.${gecmis} Bitirmeden önce "hangisi yanlıştır / değildir" diye soran köklere bir kez daha bak.\n\nYine de bitirmek istiyor musun?`)) return;
  }
  if (!auto && blanks > 0) {
    if (!confirm(`${blanks} soruyu boş bıraktın. HMGS'de yanlış cezası yok — boş bırakmak her zaman kayıptır.\n\nYine de bitirmek istiyor musun?`)) return;
  }
  accrueTime();
  stopClock();

  // Her cevabı telemetriye ve SRS'e işle
  const bySubject = {};
  const byTopic = {};
  let correct = 0;
  let kavram = 0;   // kuşku işaretlemeden yanlış: kafadaki kural yanlış
  let sans = 0;     // kuşkuluyken doğru: net gerçek değil, soru geri gelmeli
  E.questions.forEach((q, i) => {
    const chosen = E.answers[i];
    const ok = chosen === q.correct;
    const doubt = E.marked.has(i);
    if (ok) correct++;
    if (!ok && !doubt && chosen !== null) kavram++;
    if (ok && doubt) sans++;
    // Denemede akımdaki üç düğmelik bahis şeridi YOK. Gerekçesi: 155 dakikalık
    // simülasyonda her soruya ikinci bir karar eklemek ölçtüğümüz şeyi, yani
    // sınav temposunu bozar. Onun yerine tek kuşku işareti iki uçlu bahse
    // çevrilir: işaretlenmemiş cevap "Eminim", işaretli cevap "Mantıkla".
    const conf = doubt ? 'guess' : 'sure';
    const row = recordAnswer(q, chosen, E.times[i] || 0, 'exam', { logicGuess: doubt });
    row.conf = conf;
    // Kuşkuyla bulunan doğru "öğrenildi" sayılmaz; soru tekrar sırasında kalır.
    scheduleAfterAnswer(q.id, ok && !doubt);
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

  // Yanlış ve boş soruların dökümü sonuç ekranına gömülür. Önceden yalnız
  // sayaç ve ders kırılımı basılıyordu: 120 soruluk denemeden sonra tek bir
  // yanlışı okumak için ayrı seans başlatmak gerekiyordu. Soru nesnesinin
  // tamamı değil, ekranda gösterilecek alanlar saklanır.
  const review = [];
  E.questions.forEach((q, i) => {
    const chosen = E.answers[i];
    const ok = chosen === q.correct;
    const doubt = E.marked.has(i);
    // Kuşkusuz doğrunun öğretecek bir şeyi yok; 120 sorunun tamamını saklamak
    // da tarayıcı kotasını gereksiz yere yer.
    if (ok && !doubt) return;
    review.push({
      no: i + 1,
      qId: q.id,
      subjectId: q.subjectId,
      topicId: q.topicId || null,
      stem: q.stem,
      options: Array.isArray(q.options) ? q.options : [],
      correct: q.correct,
      chosen: chosen === null ? null : chosen,
      ok,
      doubt,
      bucket: chosen === null ? 'bos' : (ok ? 'sans' : (doubt ? 'eksik' : 'kavram')),
      ms: Math.round(E.times[i] || 0),
      explanation: q.explanation || '',
      legalBasis: q.legalBasis || '',
      sourceBadgeLabel: q.sourceBadgeLabel || ''
    });
  });

  const result = {
    id: 'exam_' + Date.now(),
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
    kavram,
    sans,
    doubtCount: E.marked.size,
    bySubject,
    byTopic,
    shortfall: E.shortfall,
    review,
    // Sınav haritası: her soru için yalnız kimlik ve kova. Temiz doğruların
    // metni saklanmaz; çözüm ekranı onları soru havuzundan okur.
    map: E.questions.map((q, i) => {
      const chosen = E.answers[i];
      const doubt = E.marked.has(i);
      const b = chosen === null ? 'bos'
        : chosen === q.correct ? (doubt ? 'sans' : 'ok')
          : (doubt ? 'eksik' : 'kavram');
      return { qId: q.id, b };
    }),
    wrongIds: E.questions.filter((q, i) => E.answers[i] !== q.correct).map(q => q.id),
    // Tekrar havuzu: yanlışlar, boşlar ve kuşkuyla bulunan doğrular.
    repeatIds: E.questions
      .filter((q, i) => E.answers[i] !== q.correct || E.marked.has(i))
      .map(q => q.id)
  };

  saveExam(result);
  save();
  pushExamToLocalServer().catch(() => {});
  // 18 Eylül 2026, kullanıcı talimatı: "denemeleri de benim yapıştırmamam
  // lazım... aynı link zaten GitHub'da hepsi." Pratik seanslarıyla AYNI kuyruk
  // dosyasına (hmgs_studio_queue.json → exams[]) yazar; Takip açılışta bunu
  // okuyup denemeler[]'e idempotent çevirir (studioExamId ile). Notu
  // kullanıcının yazacağı bir alan yok (deneme ekranında serbest not girişi
  // pratik seansındaki gibi değil, tamamı sayılardan hesaplanıyor), o yüzden
  // pratik seansındaki 7 saniyelik bekleme payına burada gerek yok — anında
  // dener.
  pushExamToDriveDirectly(result).catch(() => {});
  lastResult = result;
  rv.f = 'fix'; rv.pos = 0;
  E.finished = true;
  render();
}

/**
 * Deneme sonucunu yerel Stüdyo sunucusuna (localhost:8766) yazar.
 * localStorage'da hapis kalmaması için: sonuç `studio_sessions_export.json`'a
 * `exams[]` olarak düşer, böylece diskte kalıcı bir kayıt olur ve
 * HMGS_Takip_App ile paylaşılabilir. GitHub Pages/telefonda bu uç yoktur —
 * hata sessizce yutulur, kullanıcıya ağ hatası gösterilmez.
 */
async function pushExamToLocalServer() {
  if (typeof window === 'undefined') return;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isLocal) return;
  try {
    await fetch('/api/save-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exams: state().exams || [] })
    });
  } catch (_) { /* yerel sunucu kapalıysa sessizce geç */ }
}

/**
 * Deneme sonucunu Drive'daki `HMGS/hmgs_studio_queue.json` kuyruğuna yazar —
 * `practice.js`'teki `pushSessionToDriveDirectly` ile birebir aynı yol
 * (aynı dosya, aynı jeton, aynı sessiz-yenileme). GitHub Pages'te Stüdyo ve
 * Takip aynı origin olduğu için paylaşılan jeton (`hmgs_gtoken`) çalışır;
 * yalnız o jetonun ~1 saatlik ömrü dolmuşsa önce sessizce (popup'sız)
 * yenilemeyi dener, o da olmazsa sessizce vazgeçer (kullanıcıya hata
 * gösterilmez — "Kopyala" düğmesi hâlâ orada, elle yedek yol).
 */
async function pushExamToDriveDirectly(examResult) {
  if (!examResult || !examResult.id) return false;
  let token = getActiveToken();
  if (!token) {
    try { token = await requestSilentToken(); } catch (_) { token = null; }
  }
  if (!token) return false;
  setActiveToken(token);
  try {
    const s = state();
    return await pushStudioQueueToDrive(token, s.sessions || [], (s.answers || []).slice(-2000), s.exams || []);
  } catch (err) {
    console.warn('[sync] Deneme Drive kuyruk güncelleme uyarısı:', err);
    return false;
  }
}

/* ---------- sonuç ve çözüm analizi ---------- */

/**
 * Cevap kovaları, düzeltme sırasıyla: önce kafadaki yanlış kural, sonra
 * bilinen eksik, sonra kayıp puan, en sonda şansla gelen doğru. `ok` temiz
 * doğrudur; haritada görünür, düzeltme listesine girmez.
 */
const BUCKETS = {
  kavram: { label: 'Fark etmeden yanlış', order: 0, note: 'Kuşkun yoktu ama yanlış çıktı: kafandaki kural bu açıklamayla çelişiyor.' },
  eksik:  { label: 'Kuşkuluyken yanlış',  order: 1, note: 'Bilmediğini biliyordun; düz konu eksiği.' },
  bos:    { label: 'Boş',                 order: 2, note: 'Yanlış cezası yok; en olası şıkkı işaretlemek her zaman daha iyi.' },
  sans:   { label: 'Kurtarılmış doğru',   order: 3, note: 'Kuşkuyla tutturdun; sınav günü aynı şans gelmeyebilir.' },
  ok:     { label: 'Doğru',               order: 4, note: '' }
};

/** Eski kayıtlarda (kuşku işareti yokken kaydedilmiş denemeler) uyum katmanı. */
function reviewRows(r) {
  if (Array.isArray(r.review)) return r.review;
  return (r.misses || []).map((m, i) => ({
    ...m, no: i + 1, ok: false, doubt: false,
    bucket: m.chosen === null ? 'bos' : 'kavram', ms: 0
  }));
}

/** Denemenin bütün soruları, sınav sırasıyla: { no, qId, b, row }. */
function entries(r) {
  const rows = reviewRows(r);
  if (!Array.isArray(r.map)) return rows.map(x => ({ no: x.no, qId: x.qId, b: x.bucket, row: x }));
  const byNo = new Map(rows.map(x => [x.no, x]));
  return r.map.map((e, i) => ({ no: i + 1, qId: e.qId, b: e.b, row: byNo.get(i + 1) || null }));
}

function listFor(r, f) {
  const all = entries(r);
  if (f === 'hepsi') return all;
  if (f === 'fix') {
    return all.filter(e => e.b !== 'ok')
      .sort((a, b) => (BUCKETS[a.b].order - BUCKETS[b.b].order) || (a.no - b.no));
  }
  return all.filter(e => e.b === f);
}

/** Okuyucuda gösterilecek soru: önce saklanan kopya, yoksa havuz. */
function contentOf(e) {
  if (e.row) return e.row;
  const q = questionById.get(e.qId);
  if (!q) return null;
  return {
    no: e.no, qId: q.id, subjectId: q.subjectId, topicId: q.topicId || null,
    stem: q.stem, options: Array.isArray(q.options) ? q.options : [],
    correct: q.correct, chosen: e.b === 'ok' ? q.correct : null,
    ok: e.b === 'ok', doubt: false, bucket: e.b, ms: 0,
    explanation: q.explanation || '', legalBasis: q.legalBasis || '',
    sourceBadgeLabel: q.sourceBadgeLabel || ''
  };
}

export function reviewing() { return (!!E && E.finished) || (!E && reviewOpen && !!lastResult); }
export function openReview() { if (lastResult) { reviewOpen = true; rv.f = 'fix'; rv.pos = 0; render(); } }
export function closeReview() { reviewOpen = false; render(); }
export function backToList() { E = null; reviewOpen = false; stopClock(); render(); }

export function setFilter(f) {
  if (!lastResult) return;
  rv.f = f; rv.pos = 0;
  paintReview();
}
export function rvNext() { step(1); }
export function rvPrev() { step(-1); }
function step(d) {
  if (!lastResult || !reviewing()) return;
  const n = listFor(lastResult, rv.f).length;
  if (!n) return;
  const to = rv.pos + d;
  if (to < 0 || to >= n) return;
  rv.pos = to;
  paintReview();
}
/** Haritadaki bir kareye basıldı: o soru okuyucuya gelir. */
export function rvGoto(no) {
  if (!lastResult) return;
  let list = listFor(lastResult, rv.f);
  let i = list.findIndex(e => e.no === no);
  if (i < 0) { rv.f = 'hepsi'; list = listFor(lastResult, 'hepsi'); i = list.findIndex(e => e.no === no); }
  if (i < 0) return;
  rv.pos = i;
  paintReview();
  const el = document.getElementById('rv-reader');
  if (el && el.getBoundingClientRect && el.getBoundingClientRect().top > window.innerHeight * 0.6) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Okuyucudaki soruyu analiz istemi olarak panoya kopyalar (G). */
export function rvAnalyze() {
  if (!lastResult || !reviewing()) return;
  const e = listFor(lastResult, rv.f)[rv.pos];
  if (!e) return;
  const q = questionById.get(e.qId) || contentOf(e);
  const m = contentOf(e);
  if (!q || !m) return;
  const conf = m.chosen === null ? null : (m.doubt ? 'guess' : 'sure');
  const built = buildGeminiPrompt(q, { answered: true, chosen: m.chosen, conf });
  const done = () => toast('Analiz istemi kopyalandı. Yapay zekaya yapıştır.');
  try {
    navigator.clipboard.writeText(built.text).then(done).catch(() => prompt('İstemi kopyala:', built.text));
  } catch (_) { prompt('İstemi kopyala:', built.text); }
  try {
    fetch('/api/gemini-bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: built.text }) }).catch(() => {});
  } catch (_) {}
}

/** Gezinmede sayfayı baştan çizmeden yalnız üç bölgeyi yeniler. */
function paintReview() {
  const r = lastResult;
  const map = document.getElementById('rv-map');
  const reader = document.getElementById('rv-reader');
  if (!r || !map || !reader) { render(); return; }
  map.innerHTML = mapInner(r);
  reader.innerHTML = readerInner(r);
}

function counts(r) {
  const c = { ok: 0, kavram: 0, eksik: 0, bos: 0, sans: 0 };
  for (const e of entries(r)) c[e.b] = (c[e.b] || 0) + 1;
  if (!Array.isArray(r.map)) c.ok = Math.max(0, r.correct - c.sans);
  return c;
}

/** Üst şerit: net, baraj çubuğu ve beş sayı, tek satırda. */
function scoreHTML(r) {
  const pct = Math.min(100, Math.round((r.correct / PASS_CORRECT) * 100));
  const c = counts(r);
  const gap = PASS_CORRECT - r.correct;
  const stat = (k, v, cls) => `<div class="rv-stat"><span class="rv-stat-v ${v ? cls : 'zero'}">${v}</span><span class="rv-stat-k">${k}</span></div>`;
  return `
    <section class="rv-score">
      <div class="rv-score-main">
        <div class="rv-net ${r.pass ? 'pass' : 'fail'}">${r.net}<span>net</span></div>
        <div class="rv-score-sub">
          <div>${r.points} puan · baraj ${PASS_CORRECT} net</div>
          <div class="rv-bar ${r.pass ? 'ok' : 'no'}"><i style="width:${pct}%"></i></div>
          <div class="rv-score-verdict">${r.pass ? 'Baraj üstündesin; güvenli hedef 95 net.' : `Baraja ${gap} net var.`}</div>
        </div>
      </div>
      <div class="rv-stats">
        ${stat('Doğru', r.correct, 'ok')}
        ${stat('Yanlış', r.wrong, 'no')}
        ${stat('Boş', r.blank, 'warn')}
        <span class="rv-stats-sep"></span>
        ${stat('Fark etmeden yanlış', c.kavram, 'no')}
        ${stat('Kurtarılmış doğru', c.sans, 'ok')}
      </div>
    </section>`;
}

function mapInner(r) {
  const all = entries(r);
  const list = listFor(r, rv.f);
  const cur = list[rv.pos];
  const inList = new Set(list.map(e => e.no));
  const c = counts(r);
  const fixN = all.length - (c.ok || 0);

  const chip = (k, label, n) => n
    ? `<button class="rv-chip${rv.f === k ? ' on' : ''}" data-act="exam-filter" data-f="${k}">${k === 'fix' || k === 'hepsi' ? '' : `<i class="rv-sw ${k}"></i>`}${esc(label)}<b>${n}</b></button>`
    : '';

  return `
    <div class="rv-tiles">
      ${all.map(e => `<button class="rv-tile ${e.b}${cur && cur.no === e.no ? ' now' : ''}${inList.has(e.no) ? '' : ' out'}"
        data-act="rv-goto" data-no="${e.no}" title="Soru ${e.no} · ${esc(BUCKETS[e.b].label)}">${e.no}</button>`).join('')}
    </div>
    <div class="rv-chips">
      ${chip('fix', 'Düzeltilecekler', fixN)}
      ${chip('kavram', BUCKETS.kavram.label, c.kavram)}
      ${chip('eksik', BUCKETS.eksik.label, c.eksik)}
      ${chip('bos', BUCKETS.bos.label, c.bos)}
      ${chip('sans', BUCKETS.sans.label, c.sans)}
      ${chip('hepsi', 'Tümü', all.length)}
    </div>
    ${r.doubtCount === 0 ? `<p class="rv-hint">Bu denemede hiç kuşku işaretlemedin, yanlışlar tek kovada duruyor. Sınavda <span class="kbd">K</span> ile işaretlersen bilmediğin ile yanlış bildiğin ayrılır.</p>` : ''}`;
}

function readerInner(r) {
  const list = listFor(r, rv.f);
  if (!list.length) {
    return `<div class="rv-empty">Düzeltilecek soru yok. Bu denemede yanlışın, boşun ya da kuşkulu doğrun kalmadı.</div>`;
  }
  if (rv.pos >= list.length) rv.pos = list.length - 1;
  const e = list[rv.pos];
  const m = contentOf(e);
  const nav = `
    <div class="rv-nav">
      <button class="rv-nav-btn" data-act="rv-prev" ${rv.pos === 0 ? 'disabled' : ''} aria-label="Önceki">‹</button>
      <span class="rv-nav-pos">${rv.pos + 1} <span>/ ${list.length}</span></span>
      <button class="rv-nav-btn" data-act="rv-next" ${rv.pos >= list.length - 1 ? 'disabled' : ''} aria-label="Sonraki">›</button>
    </div>`;

  if (!m) {
    return `<div class="rv-bar-top">${nav}</div><div class="rv-empty">Soru ${e.no} artık soru havuzunda bulunmuyor.</div>`;
  }

  const b = BUCKETS[m.bucket] || BUCKETS.kavram;
  const topic = m.topicId ? topicById.get(m.topicId) : null;
  const { premise, ask } = splitStem(m.stem);
  const sec = m.ms ? Math.round(m.ms / 1000) : 0;

  const opts = (m.options || []).map(o => {
    const isC = o.key === m.correct;
    const isP = o.key === m.chosen;
    const cls = isC ? 'right' : (isP ? 'picked' : '');
    const tag = isC && isP ? 'Doğru · senin cevabın' : isC ? 'Doğru cevap' : isP ? 'Senin cevabın' : '';
    return `<div class="rv-opt ${cls}">
      <span class="rv-opt-k">${esc(o.key)}</span>
      <span class="rv-opt-t">${rich(o.text)}</span>
      ${tag ? `<span class="rv-opt-tag">${tag}</span>` : ''}
    </div>`;
  }).join('');

  const g = m.chosen === null ? 'Boşu analiz et' : (m.chosen === m.correct ? 'Sağlamasını yap' : 'Yanlışı analiz et');

  return `
    <div class="rv-bar-top">
      <div class="rv-meta">
        <span class="rv-qno">Soru ${m.no}</span>
        <span class="rv-dot"></span>
        <span>${esc(subjectName(m.subjectId))}</span>
        ${topic ? `<span class="rv-dot"></span><span>${esc(topic.title)}</span>` : ''}
      </div>
      ${nav}
    </div>
    <article class="rv-q" data-no="${m.no}">
      <div class="rv-tagline">
        <span class="rv-tag ${m.bucket}">${esc(b.label)}</span>
        ${b.note ? `<span class="rv-tag-note">${b.note}</span>` : ''}
        ${sec ? `<span class="rv-sec">${sec} sn</span>` : ''}
      </div>
      <div class="rv-stem">
        ${premiseHTML(premise)}
        <div class="q-ask">${rich(ask)}</div>
      </div>
      <div class="rv-opts">${opts}</div>
      ${m.explanation || m.legalBasis ? `
      <section class="rv-why">
        <div class="rv-why-h"><span>Çözüm</span>${m.legalBasis ? `<span class="rv-basis">${esc(m.legalBasis)}</span>` : ''}</div>
        ${m.explanation ? `<div class="rv-why-b">${richBlock(m.explanation)}</div>` : ''}
      </section>` : ''}
      ${kurtarmaRadariHTML({
        q: m,
        chosen: m.chosen,
        ok: m.ok,
        sec: m.ms ? m.ms / 1000 : 0,
        isReview: true,
        isMarked: m.doubt || m.bucket === 'eksik' || m.bucket === 'sans'
      })}
      <div class="rv-actions">
        <button class="btn btn-2 btn-s" data-act="rv-analyze">${g} <span class="kbd">G</span></button>
        <span class="rv-keys"><span class="kbd">←</span> <span class="kbd">→</span> soru değiştir</span>
      </div>
    </article>`;
}

function resultBlock(r, compact) {
  if (!r) return '';

  if (compact) {
    const n = listFor(r, 'fix').length;
    return `
      <div class="section-label">Son deneme${r.label ? ' · ' + esc(r.label) : ''}</div>
      ${scoreHTML(r)}
      <div class="btn-row" style="margin-top:0.9rem">
        <button class="btn" data-act="exam-open-review">Çözümleri aç${n ? ` (${n} soru)` : ''}</button>
        ${n ? `<button class="btn btn-2" data-act="exam-review-wrong">Tekrar havuzunu çöz</button>` : ''}
      </div>`;
  }

  return `
    <div class="rv">
      <h1 class="page">Deneme çözümleri</h1>
      <p class="page-sub">${r.label ? esc(r.label) + ' · ' : ''}${new Date(r.at).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })} · ${fmtClock(r.durationMs)} sürdü</p>

      ${scoreHTML(r)}

      ${r.shortfall && r.shortfall.length ? `<div class="trap" style="margin-top:1rem"><div class="lbl">Havuz eksiği</div>
        <p>Bu deneme gerçek dağılımı tam kuramadı: ${r.shortfall.map(s => `${esc(s.subject)} ${s.got}/${s.want}`).join(', ')}.
        Net, eksik dersler yüzünden olduğundan farklı okunabilir.</p></div>` : ''}

      <section class="rv-mapwrap" id="rv-map">${mapInner(r)}</section>

      <section class="rv-reader" id="rv-reader">${readerInner(r)}</section>

      <details class="rv-tables">
        <summary>Ders ve konu kırılımı</summary>
        <div class="card" style="margin-top:0.75rem">
          ${subjectBreakdownHTML(r)}
          ${topicBreakdownHTML(r)}
        </div>
      </details>

      <div class="btn-row" style="margin-top:1.5rem">
        <button class="btn" data-act="exam-review-wrong">Düzeltilecekleri pratikte çöz (${(r.repeatIds || r.wrongIds || []).length})</button>
        <button class="btn btn-2" data-act="exam-back">Denemelere dön</button>
        <button class="btn btn-2" data-act="exam-export-stats">Takip uygulamasına aktar</button>
      </div>
    </div>`;
}

/** Dökümü saklanan soru kaydından şık metnini çözer. */
function textOfOpt(m, key) {
  const o = (m.options || []).find(x => x.key === key);
  return o ? String(o.text || '').trim() : '';
}

/** Ders kırılımı, en zayıf dersten başlayarak. */
function subjectBreakdownHTML(r) {
  const rows = SUBJECTS.map(s => {
    const b = r.bySubject[s.id];
    if (!b) return null;
    const acc = b.total ? Math.round((b.correct / b.total) * 100) : 0;
    return { s, b, acc };
  }).filter(Boolean).sort((a, b) => a.acc - b.acc);

  return `
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
    </table>`;
}

/**
 * Konu bazlı kırılım, ders kırılımının altına daha ince taneli. topicId'si
 * olmayan sorular derse ait "etiketsiz" havuzda toplanır ve ayrı, açıkça
 * işaretli bir satır olarak gösterilir (uydurma konu adı yok). Kitap sütunu
 * book-map.js'teki gerçek içindekiler dökümünden gelir; karşılığı olmayan
 * derste "–" yazılır, sessizce bir şey uydurulmaz.
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
      "Konu etiketi yok" satırları karma denemede kullanılan, henüz tek bir alt konuya bağlanmamış sorulardır; bunlarda ders bazlı kırılıma bak.
      Arşiv sınavlarda bu oran daha düşük, konu kırılımı orada daha güvenilir.
    </p>`;
}

export function wrongIdsOfLast() { return lastResult ? lastResult.wrongIds : []; }
/** Tekrar havuzu: yanlışlar, boşlar ve kuşkuyla bulunan doğrular. */
export function repeatIdsOfLast() {
  if (!lastResult) return [];
  return lastResult.repeatIds || lastResult.wrongIds || [];
}
export function reset() { E = null; reviewOpen = false; rv.f = 'fix'; rv.pos = 0; stopClock(); }

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
    toast('Deneme istatistikleri panoya kopyalandı. Takip uygulamasından yapıştırabilirsiniz.');
  }).catch(() => {
    prompt('İstatistikleri kopyalayın:', jsonStr);
  });
}
