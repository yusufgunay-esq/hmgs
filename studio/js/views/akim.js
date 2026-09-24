/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
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

   20 Eylül 2026 — AKIŞ YENİDEN KURULDU (kullanıcı: "dopamin; seri yok,
   pop-up yok, patlama yok; bırakmak istemeyeyim"). Üç değişiklik:
   1. BAHİS: şık seç → Eminim / Sanırım / Mantıkla. Ödül tahmin hatası.
      (En alt düzey eski "Mantık" rozetinin yerine geçti; rozet kaldırıldı.)
   2. HARİTA: 650 HMGS karesi, yanan kare sönmez (engine.hmgsMap).
   3. SÜRTÜNME: doğruluğu yargılayan akış ölçeri, düşük isabette zorla
      açılan mola perdesi ve kırmızıya dönen saat kaldırıldı; yerine 10
      soruluk tur noktaları ve ince, nötr bir zaman çizgisi geldi.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, rich, richBlock, splitStem, fmtSec, stripEmoji, $, toast } from '../ui.js';
import { subjectName, topicById, tierOf } from '../data.js';
import { recordAnswer, markLastAnswerAttention, save, saveSession, state, TARGET_SEC } from '../store.js';
import * as seans from '../seans.js';
import {
  scheduleAfterAnswer, flowFeed, flowReinforce, flowMilestone, hmgsCoverage,
  hmgsMap, hmgsMapRow, tileState, answersSincePrev, calibration, CONF,
  FLOW_REFILL_AT, FLOW_REINFORCE_DELAY, FLOW_BATCH
} from '../engine.js';
import { premiseHTML, optionRowHTML, toggleOption, togglePremise } from '../elim.js';
import { kuralButtonHTML } from '../kural.js';
import { kurtarmaRadariHTML } from '../tuyolar.js';
import { buildGeminiPrompt, queueSessionForTakip, pushSessionToDriveDirectly, pushToLocalServer } from './practice.js';

let A = null;       // aktif akış seansı
let tick = null;    // süre sayacı
let lastRun = null; // kapanış ekranı özeti

export function hasSession() { return !!A; }
/** Ekrandaki soru (test ve teşhis için; salt okunur kullan). */
export function currentQuestion() { return A && A.queue[0] || null; }

/* ---------- kurulum ---------- */

/**
 * @param {{scope?:string, label?:string}} opts  scope: 'core' | 'all' (buildKarmaSet'e
 *   geçer — practice-all-karma gibi çağrılar ileri/ileri havuz havuzunu da ister).
 *   label: üst şeritte görünen isim — hangi kapıdan girildiğini kullanıcıya söyler
 *   (ör. "HMGS Çekirdek Karma"), akış davranışını değiştirmez, tek kaynak yine karma motoru.
 */
export function start(opts = {}) {
  const scope = opts.scope || 'core';
  // Oturum boyu edinim-bloğu hafızası: sonu olmayan kuyruk buildKarmaSet'i
  // her dolumda yeniden çağırır ve motor "cevaplanmış" sayıya bakar — bir
  // bloğun soruları kuyrukta bekleyip henüz cevaplanmadıysa motor kendi
  // başına dersi hâlâ "taze" sanır ve ikinci bir blok verir (ölçüldü, 18
  // Eylül 2026). Bu Set'i biriktirip her çağrıya geri vermek bunu keser.
  const blockedSubjects = new Set();
  const f = flowFeed(FLOW_BATCH, scope, { blockedSubjects });
  (f.blockedThisCall || []).forEach(id => blockedSubjects.add(id));
  // usedIds = şu an KUYRUKTA olan sorular. Eskiden son 50 cevap ve oturumda
  // cevaplanan her soru da buradaydı; tekrar politikası v3'te (soru sayacı)
  // yanlış yapılan soru AYNI akışta birkaç soru sonra geri gelmeli, bu küme
  // onu oturum boyunca engelliyordu. Görülmüş ama vadesi gelmemiş soruyu
  // motor zaten vermiyor (candidatesOf / dueQuestions / flowReinforce).
  const seedSeen = new Set();

  A = {
    scope,
    label: opts.label || 'Akış',
    hedef: Number(opts.hedef) || 0,   // Bugün rotasının bu akışa verdiği pay (0 = yok)
    hedefTamam: false,
    queue: [],            // sıradaki sorular (baş = şu anki)
    log: [],              // cevap kayıtları (ham, kapanışta özetlenir)
    answered: false,
    qStart: performance.now(),
    startedAt: performance.now(),
    usedIds: seedSeen,
    blockedSubjects,      // bkz. yukarısı — oturum boyu edinim-bloğu hafızası
    milestones: [],       // "kural otomatikleşti" anları
    armed: null,          // seçilmiş ama bahsi konmamış şık
    litIds: new Set(),    // bu akışta yanan harita kareleri
    sealed: new Set(),    // bu akışta tamamen yanan dersler
    elimUsed: false,
    geminiAsked: false,
    geminiAskedPreAnswer: false
  };

  seans.begin({ mode: 'flow', label: A.label });
  seans.onKacis(ms => toast(`${Math.round(ms / 1000)} sn dışarıdaydın.`));

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
  // 20 Eylül 2026: flowScore göstergesi ve ona bağlı otomatik mola kaldırıldı.
  // Gösterge doğruluğu yargılıyordu: ilk denemede %55 isabetle ekran çoğu
  // zaman "Isınıyor / Mola ver" yazıyor, üstüne "iki cevap arası ≤ 8 sn"
  // kesintisizlik ölçütü açıklamayı OKUMAYI cezalandırıyordu. Sonra da
  // soruların ortasında tam ekran mola perdesi açıyordu. Akışı bozan tam
  // olarak buydu. Yerine yalnız artan şeyler geldi: tur noktaları ve harita.

  host.innerHTML = `
    <div class="q-screen">
      <div class="q-strip akim-strip">
        <div class="q-strip-left">
          <button class="q-quit-link" data-act="akim-quit" title="Akışı bitir">
            <span class="q-quit-x">✕</span><span>Bitir</span>
          </button>
          <span class="q-strip-subj akim-label">${esc(A.label)}</span>
        </div>
        <div class="q-strip-center">${roundHTML()}</div>
        <div class="q-strip-right">
          <span id="akim-break-slot">${breakChipHTML()}</span>
          <span class="akim-map-chip" id="akim-map-chip" title="HMGS haritası: yanan kare / toplam (arşiv + HMGS benzeri)">${mapChipText()}</span>
          <button class="icon-btn" data-act="toggle-font-size" title="Metin Boyutunu Değiştir" aria-label="Metin boyutu">
            <span style="font-family:var(--sans);font-size:0.72rem;font-weight:700">A±</span>
          </button>
          <button class="icon-btn" data-act="toggle-theme" title="Karanlık / Aydınlık Tema" aria-label="Tema değiştir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </div>
        <div class="akim-timeline" aria-hidden="true"><div class="akim-timeline-fill" id="akim-timeline"></div></div>
      </div>

      <div class="q-shell" id="q-shell">
        <div class="q-main">
          <div class="card q-card akim-card">
            ${premiseHTML(premise)}
            <div class="q-ask">${rich(ask)}</div>
            <div class="opts" id="opts">
              ${q.options.map(o => optionRowHTML(o, { pickAct: 'akim-pick' })).join('')}
            </div>
            <div class="akim-bet" id="akim-bet" hidden>
              <span class="akim-bet-k" id="akim-bet-k">Ne kadar eminsin?</span>
              <div class="akim-bet-row" id="akim-bet-hint" hidden>
                <button class="akim-bet-btn hint" data-act="akim-conf" data-conf="hint" title="İpucunu okudun: bu soru bahse girmez, birkaç soru sonra yardımsız yeniden gelecek."><span>Cevabı kilitle</span><span class="kbd">Enter</span></button>
              </div>
              <div class="akim-bet-row" id="akim-bet-row">
                <button class="akim-bet-btn sure"  data-act="akim-conf" data-conf="sure"><span>Eminim</span><span class="kbd">1</span></button>
                <button class="akim-bet-btn think" data-act="akim-conf" data-conf="think"><span>Sanırım</span><span class="kbd">2</span></button>
                <button class="akim-bet-btn guess" data-act="akim-conf" data-conf="guess" title="Kuralı bilmiyordum; elemeyle ya da mantıkla buldum. Doğru çıksa bile bu soru tekrar gelecek."><span>Mantıkla</span><span class="kbd">3</span></button>
              </div>
            </div>
          </div>

          <div class="q-main-foot" id="q-actions">
            <button class="btn btn-2 btn-s" data-act="akim-dontknow">Bilmiyorum · çözümü göster</button>
            <button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Soruyu ve beş şıkkı ipucu istemi olarak kopyalar — doğru şık gönderilmez (G)">İpucu İste <span class="kbd">G</span></button>
            <span class="hint">
              <span class="kbd">A</span>–<span class="kbd">E</span> seç · <span class="kbd">1</span><span class="kbd">2</span><span class="kbd">3</span> bahis · <span class="kbd">Enter</span> devam
            </span>
          </div>
          ${topic ? `<p class="hint q-topic-hint">Bağlı konu: ${esc(topic.title)}</p>` : ''}
        </div>
        <aside class="q-side"><div id="fb"></div></aside>
      </div>
    </div>`;

  if (!A.answered) {
    /* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ · بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ · رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ */
    A.armed = null;
    A.qStart = performance.now();
    seans.qBegin();
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

/* ---------- tur, harita, mola: şeritteki üç sakin gösterge ---------- */

/** Tur: 10 soruluk yakın hedef. Noktalar yalnız dolar, renkleri doğruluğu
    yargılamaz (yanlış da tur doldurur: işin kendisi sayılır, isabet değil). */
export const ROUND = 10;

function roundState() {
  const n = A ? A.log.length : 0;
  if (A && A.answered && n > 0) return { idx: Math.ceil(n / ROUND), filled: ((n - 1) % ROUND) + 1 };
  return { idx: Math.floor(n / ROUND) + 1, filled: n % ROUND };
}

function roundHTML() {
  const { idx, filled } = roundState();
  let dots = '';
  for (let i = 0; i < ROUND; i++) {
    const on = i < filled;
    const fresh = A && A.answered && i === filled - 1;
    dots += `<span class="akim-dot${on ? ' on' : ''}${fresh ? ' fresh' : ''}"></span>`;
  }
  return `<div class="akim-round" id="akim-round" title="Tur: ${ROUND} soruluk kısa hedef. Yarıda bırakırsan hiçbir şey kaybolmaz.">
    <span class="akim-round-k">Tur ${idx}</span><span class="akim-dots">${dots}</span>
  </div>`;
}

function mapChipText() {
  const m = hmgsMap();
  return `<b>${m.lit}</b><span class="akim-map-of">/${m.total}</span>`;
}

/** Blok süresi dolduysa şeritte sessiz bir teklif; ekranı kapatmaz. */
function breakChipHTML() {
  if (!seans.breakDue()) return '';
  return `<button class="akim-break-chip" data-act="akim-break" title="Blok süresi doldu. İstersen mola; istemezsen akış sürer.">Mola?</button>`;
}

export function takeBreak() {
  if (!A) return;
  seans.startBreak(() => {
    const slot = $('#akim-break-slot');
    if (slot) slot.innerHTML = breakChipHTML();
  });
  const slot = $('#akim-break-slot');
  if (slot) slot.innerHTML = '';
}

function mapRowHTML(subjectId, nowId, justSealed) {
  const row = hmgsMapRow(subjectId);
  if (!row) return '';
  const tiles = row.tiles.map(t =>
    `<i class="mt ${t.s}${t.id === nowId ? ' now' : ''}${t.tier === 2 ? ' t2' : ''}"></i>`).join('');
  const done = row.lit === row.total;
  return `<div class="akim-maprow${done ? ' sealed' : ''}">
    <div class="akim-maprow-head">
      <span class="akim-maprow-name">${esc(subjectName(subjectId))}</span>
      <span class="akim-maprow-n"><b>${row.lit}</b> / ${row.total}${row.open ? ` · <span class="akim-open-n">${row.open} bekliyor</span>` : ''}</span>
    </div>
    <div class="akim-tiles">${tiles}</div>
    ${justSealed ? `<div class="akim-sealed-line">Bu dersin HMGS soruları tamamen yandı.</div>` : ''}
  </div>`;
}

function fullMapHTML(highlight = new Set()) {
  const m = hmgsMap();
  if (!m.total) return '';
  const rows = m.rows.map(r => {
    const tiles = r.tiles.map(t =>
      `<i class="mt ${t.s}${highlight.has(t.id) ? ' now' : ''}${t.tier === 2 ? ' t2' : ''}"></i>`).join('');
    return `<div class="akim-maprow compact${r.lit === r.total ? ' sealed' : ''}">
      <div class="akim-maprow-head">
        <span class="akim-maprow-name">${esc(subjectName(r.subjectId))}</span>
        <span class="akim-maprow-n"><b>${r.lit}</b> / ${r.total}</span>
      </div>
      <div class="akim-tiles">${tiles}</div>
    </div>`;
  }).join('');
  const pct = Math.round((m.lit / m.total) * 100);
  return `<div class="akim-map">
    <div class="akim-map-head">
      <div><span class="akim-map-big">${m.lit}</span><span class="akim-map-tot"> / ${m.total} kare yandı</span></div>
      <div class="akim-map-legend">
        <span><i class="mt yandi"></i>oturdu</span><span><i class="mt acik"></i>geri gelecek</span><span><i class="mt bos"></i>görülmedi</span>
      </div>
    </div>
    <div class="akim-map-bar"><div style="width:${pct}%"></div></div>
    <div class="akim-map-rows">${rows}</div>
  </div>`;
}

function landingHTML() {
  return `<div class="wrap-read akim-landing">
    <h1 class="page">Akış</h1>
    <p class="page-sub">Her kare bir HMGS sorusu. Doğru çözüp oturttuğun kare yanar ve bir daha sönmez;
      gelmediğin gün hiçbir şey kaybolmaz.</p>
    <div class="akim-how">
      <div><b>Şıkkı seç, bahsini koy.</b> Eminim · Sanırım · Mantıkla. “Mantıkla” dediğin soru, doğru çıksa bile tekrar gelir. Emin olduğun bir yanlış, en iyi öğrenilen hatadır.</div>
      <div><b>Yanlışlar açık halka olur.</b> Birkaç soru sonra geri gelir; doğru çözünce kare yanar.</div>
      <div><b>On soru bir tur.</b> Bitirince yalnız bir satır özet, ekran kapanmaz.</div>
    </div>
    <button class="btn akim-go" data-act="akim-start">Akışı Başlat</button>
    ${fullMapHTML()}
  </div>`;
}

/** "3 kaçış · toplam 2 dk 10 sn" gibi bir süreyi dk/sn olarak yazar. */
function fmtDkSn(ms) {
  const sn = Math.round(ms / 1000);
  const dk = Math.floor(sn / 60);
  const kalanSn = sn % 60;
  return dk > 0 ? `${dk} dk ${kalanSn} sn` : `${kalanSn} sn`;
}

/** Odak izi özeti: kaçış yoksa "Kaçış yok.", varsa kaçış + yapay zeka turu satırı. */
function odakIziHTML(run) {
  const kacisPart = run.escapes
    ? `${run.escapes} kaçış · toplam ${fmtDkSn(run.escapeMs)}`
    : 'Kaçış yok.';
  const aiPart = run.aiTrips
    ? `${run.aiTrips} yapay zeka turu · ort. ${fmtDkSn(run.aiMs / run.aiTrips)}`
    : null;
  return aiPart ? `${kacisPart}  |  ${aiPart}` : kacisPart;
}

/**
 * Kapanış ekranı: devam etmek dolu/büyük buton, çıkmak metin bağlantısı
 * (18 Eylül 2026, kullanıcı talimatı). Başlık "bitti" değil "durdu".
 * 20 Eylül: haritada bu akışta yanan kareler vurgulanır, bahis isabeti eklendi.
 */
function closingHTML(run) {
  const acc = run.total ? Math.round((run.correct / run.total) * 100) : 0;
  const cal = run.calib;
  const calRow = (k, label) => cal[k].n
    ? `<div class="akim-cal-row"><span>${label}</span><span><b>${cal[k].ok}/${cal[k].n}</b> doğru · %${Math.round(cal[k].ok / cal[k].n * 100)}</span></div>` : '';
  const calHTML = (cal.sure.n + cal.think.n + cal.guess.n)
    ? `<div class="card akim-cal"><div class="akim-cal-k">Bahis isabetin</div>
        ${calRow('sure', 'Eminim dediklerin')}${calRow('think', 'Sanırım dediklerin')}${calRow('guess', 'Mantıkla bulduklarının')}
        ${run.hintN ? `<div class="akim-cal-row"><span>İpucuyla çözdüklerin</span><span><b>${run.hintN}</b> soru · bahse girmedi</span></div>` : ''}
        <p class="hint" style="margin:0.6rem 0 0">Sınavda yanlış doğruyu götürmüyor: mantıkla bulduklarının isabeti %20'nin üstündeyse bilgin sandığından fazla.</p>
      </div>` : '';
  return `<div class="wrap-read akim-landing">
    <h1 class="page">Akış durdu</h1>
    <p class="page-sub">${run.total} soru · ${Math.round(run.durationSec / 60)} dakika · %${acc} isabet</p>
    <p class="page-sub" style="margin-top:-0.35rem">${esc(odakIziHTML(run))}</p>

    <div class="grid grid-3" style="margin-bottom:1.25rem">
      <div class="metric">
        <div class="metric-k">Yanan kare</div>
        <div class="metric-v" style="color:var(--ok)">+${run.litGain}</div>
        <div class="metric-n">haritaya eklendi</div>
      </div>
      <div class="metric">
        <div class="metric-k">Oturan kural</div>
        <div class="metric-v">${run.milestones}</div>
        <div class="metric-n">${run.milestones ? 'yanlıştan doğruya döndü' : 'henüz yok'}</div>
      </div>
      <div class="metric">
        <div class="metric-k">Açık halka</div>
        <div class="metric-v" style="color:var(--warn)">${run.openNow}</div>
        <div class="metric-n">geri gelecek soru</div>
      </div>
    </div>
    ${calHTML}

    <div class="btn-row" style="margin:1.25rem 0 0.5rem">
      <button class="btn akim-go" data-act="akim-start">Akışa Devam Et</button>
    </div>
    <button class="btn-link" data-act="go-today">Bugün ekranına dön</button>
    <p class="hint" style="margin:0.75rem 0 1.25rem">Bu akışın çözümleri çalışma kaydına (Takip) yazıldı. ${coverageLine()}</p>
    ${fullMapHTML(run.litIds)}
  </div>`;
}

/* ---------- zaman çizgisi ----------
   Sayı yerine ince, nötr bir çizgi: 75 sn'de dolar ve orada durur, kırmızıya
   dönmez. Soru ortasında saate bakmak dikkati böler (akışın "zaman duygusunun
   kaybolması" koşulu); süre cevaptan sonra geri bildirimde saniyesiyle yazar. */

function startTick() {
  stopTick();
  tick = setInterval(() => {
    if (!A || A.answered) return;
    const el = $('#akim-timeline');
    if (!el) return;
    const sec = seans.qElapsed() / 1000;
    el.style.width = Math.min(100, (sec / TARGET_SEC) * 100) + '%';
    el.classList.toggle('full', sec >= TARGET_SEC);
  }, 500);
}
function stopTick() { if (tick) { clearInterval(tick); tick = null; } }

/* ---------- cevaplama: seç → bahis → sonuç ---------- */

/** Şıkkı seçer ama kilitlemez; bahis satırını açar. Aynı şık/başka şık serbest. */
export function arm(key) {
  if (!A || A.answered) return;
  const q = A.queue[0];
  if (!q.options.some(o => o.key === key)) return;
  A.armed = key;
  $$opts().forEach(b => b.classList.toggle('armed', b.dataset.key === key));
  const bet = $('#akim-bet');
  if (bet) {
    bet.hidden = false;
    paintBet();
    const darEkran = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    if (darEkran) requestAnimationFrame(() => bet.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  }
}

/**
 * Bahis şeridini duruma göre boyar. Cevaptan önce ipucu istenmişse üç
 * düğmelik bahis kalkar, yerine tek "kilitle" düğmesi gelir: o noktada
 * sorulacak güven sorusu kalmamıştır (bkz. engine.js CONF.hint).
 */
function paintBet() {
  const helped = !!A && A.geminiAskedPreAnswer;
  const k = $('#akim-bet-k'), row = $('#akim-bet-row'), hint = $('#akim-bet-hint');
  if (k) k.textContent = helped ? 'İpucunu okudun' : 'Ne kadar eminsin?';
  if (row) row.hidden = helped;
  if (hint) hint.hidden = !helped;
}

export function isArmed() { return !!A && !A.answered && !!A.armed; }

/** Bahsi koyar ve cevabı kilitler. */
export function commit(conf = 'think') {
  if (!A || A.answered || !A.armed) return;
  pick(A.armed, conf);
}

/**
 * Cevabı kaydeder. `conf` verilmezse "sanırım" sayılır (eski çağrılar ve
 * testler tek adımda cevaplar).
 */
export function pick(key, conf = 'think') {
  if (!A || A.answered) return;
  const q = A.queue[0];
  // Cevaptan önce ipucu istendiyse bahis sorulmaz; sorulmuş olsa bile (eski
  // çağrı, klavye alışkanlığı) 'hint' olarak kaydedilir. Bkz. engine.js CONF.
  const c = A.geminiAskedPreAnswer ? 'hint' : (CONF[conf] ? conf : 'think');
  const before = tierOf(q) !== 3 ? tileState(q.id) : null;
  const t = seans.qEnd();
  const ms = t.ms;
  A.answered = true;
  A.armed = null;
  stopTick();

  const row = recordAnswer(q, key, ms, 'flow', {
    usedElim: A.elimUsed, askedGemini: A.geminiAsked, rawMs: t.rawMs, idleMs: t.idleMs,
    logicGuess: CONF[c].logic
  });
  row.conf = c;
  const sched = scheduleAfterAnswer(q.id, row.ok, CONF[c].logic);
  save();
  finishAnswer(q, key, row, sched, ms, before);
}

export function dontKnow() {
  if (!A || A.answered) return;
  const q = A.queue[0];
  const before = tierOf(q) !== 3 ? tileState(q.id) : null;
  const t = seans.qEnd();
  const ms = t.ms;
  A.answered = true;
  A.armed = null;
  stopTick();

  const row = recordAnswer(q, null, ms, 'flow', { usedElim: A.elimUsed, askedGemini: A.geminiAsked, rawMs: t.rawMs, idleMs: t.idleMs });
  const sched = scheduleAfterAnswer(q.id, false);
  save();
  finishAnswer(q, null, row, sched, ms, before);
}

function finishAnswer(q, chosen, row, sched, ms, before) {
  const after = before !== null ? tileState(q.id) : null;
  const lit = before !== null && before !== 'yandi' && after === 'yandi';
  let sealed = false;
  if (lit) {
    A.litIds.add(q.id);
    const r = hmgsMapRow(q.subjectId);
    if (r && r.lit === r.total && !A.sealed.has(q.subjectId)) { A.sealed.add(q.subjectId); sealed = true; }
  }
  const gap = sched && sched.kind === 'mezun' ? answersSincePrev(q.id) : null;
  A.log.push({ ...row, sched, q, lit, sealed, gap });
  // Bugün rotasından girildiyse günün akış payı dolunca bir kez haber ver.
  // Akış kapanmaz (kapanışsız tasarım korunur); yalnız hedefin bittiği söylenir.
  if (A.hedef && !A.hedefTamam && A.log.length >= A.hedef) {
    A.hedefTamam = true;
    toast('Günün akış payı tamam. İstersen devam et, istersen Bugün ekranına dön.');
  }
  paintResult(q, chosen, row, sched, ms);
}

/**
 * Sonuç cümlesi: doğru/yanlış × bahis. Kısa, somut, abartısız. Hepsi gerçek
 * bir duruma karşılık gelir (tekrar gelecek mi, kare yandı mı).
 */
export function verdictOf(row, sched, entry) {
  if (row.chosen === null) return { head: 'Boş bıraktın', sub: 'Birkaç soru sonra yeniden gelecek. Sınavda boş bırakma: yanlış doğruyu götürmüyor.', tone: 'no' };
  if (sched && sched.kind === 'mezun') {
    const g = entry && entry.gap != null ? `${entry.gap} soru önce yanlış yapmıştın. ` : '';
    return { head: 'Oturdu', sub: `${g}Bu sefer doğru: kare yandı, tekrar sırasından çıktı.`, tone: 'win' };
  }
  const c = row.conf;
  if (c === 'hint') {
    return row.ok
      ? { head: 'Doğru, ipucuyla', sub: 'Kuralı ipucundan öğrendin. Bu soru bahse girmedi; birkaç soru sonra yardımsız yeniden gelecek.', tone: 'ok' }
      : { head: 'Yanlış, ipucuna rağmen', sub: 'Açıklamayı tekrar oku: kural değil, kuralın bu olaya uygulanması kaymış olabilir. Soru yine gelecek.', tone: 'no' };
  }
  if (row.ok) {
    if (c === 'sure')  return { head: 'Doğru', sub: 'Emindin, haklıydın.', tone: 'ok' };
    if (c === 'guess') return { head: 'Doğru, ama kuralı bilmiyordun', sub: 'Mantıkla buldun: birkaç soru sonra yine gelecek, o zaman kuralla çöz.', tone: 'ok' };
    return { head: 'Doğru', sub: 'Sezgin doğru çıktı.', tone: 'ok' };
  }
  if (c === 'sure')  return { head: 'Yanlış, ama emindin', sub: 'Bu en iyi öğrenilen hata türü: şimdi dikkatle okuduğun açıklama kalıcı olur. Birkaç soru sonra yine gelecek.', tone: 'hyper' };
  if (c === 'guess') return { head: 'Yanlış', sub: 'Bilmediğini biliyordun. Birkaç soru sonra yine gelecek.', tone: 'no' };
  return { head: 'Yanlış', sub: 'Birkaç soru sonra yine gelecek.', tone: 'no' };
}

/** Tur bittiyse tek satırlık özet (ekranı kapatmaz). */
function roundSummaryHTML() {
  const n = A.log.length;
  if (!n || n % ROUND !== 0) return '';
  const last = A.log.slice(-ROUND);
  const ok = last.filter(r => r.ok).length;
  const lit = last.filter(r => r.lit).length;
  const mez = last.filter(r => r.sched && r.sched.kind === 'mezun').length;
  const parts = [`${ok}/${ROUND} doğru`];
  if (lit) parts.push(`${lit} kare yandı`);
  if (mez) parts.push(`${mez} kural oturdu`);
  return `<div class="akim-round-done"><b>Tur ${n / ROUND} tamam</b> · ${parts.join(' · ')}</div>`;
}

function paintResult(q, chosen, row, sched, ms) {
  const sec = ms / 1000;
  const entry = A.log[A.log.length - 1];
  $$opts().forEach(b => {
    b.classList.remove('armed');
    b.classList.add('done');
    const k = b.dataset.key;
    if (k === q.correct) b.classList.add(chosen === q.correct ? 'pick-ok' : 'reveal');
    else if (k === chosen) b.classList.add('pick-no');
    else b.classList.add('dim');
  });
  const bet = $('#akim-bet');
  if (bet) bet.hidden = true;

  const v = verdictOf(row, sched, entry);
  const icon = row.ok ? '✓' : (chosen === null ? '–' : '✕');
  const confChip = row.conf ? `<span class="chip akim-conf-chip ${row.conf}">${esc(CONF[row.conf].label)}</span>` : '';

  // Cevaptan SONRAKİ "Mantık" rozeti 20 Eylül 2026'da kaldırıldı: aynı kararı
  // bahis şeridi cevaptan ÖNCE alıyor (CONF.guess = "Mantıkla", logic:true).
  // İki ayrı noktada aynı soruyu sormak hem tekrarlıydı hem de sonradan
  // verilen karar doğruyu gördükten sonra veriliyordu (kalibrasyon kirlenir).

  const attentionBadge = !row.ok ? `
    <button class="badge-logic" data-act="akim-toggle-attention" id="badge-attention" title="Bildim ama dikkatsizlik yaptım — konu değil, dikkat eksikliği">
      <span class="badge-logic-dot"></span><span>Dikkat</span>
    </button>` : '';

  const milestone = flowMilestone(sched);
  if (milestone && !A.milestones.includes(milestone + ':' + q.topicId)) {
    A.milestones.push(milestone + ':' + q.topicId);
  }

  const geminiBtn = chosen === null
    ? `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Doğru şıkkı ve uygulama açıklamasını analiz istemi olarak kopyalar (G)">Boşu Analiz Et <span class="kbd">G</span></button>`
    : row.ok
      ? `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Doğru şıkkı, diğer şıkların tuzağını ve uygulama açıklamasını sağlama istemi olarak kopyalar (G)">Sağlamasını Yap <span class="kbd">G</span></button>`
      : `<button class="btn btn-2 btn-s" data-act="akim-ask-gemini" title="Seçtiğin şık, doğru şık ve uygulama açıklaması analiz istemi olarak kopyalanır (G)">Yanlışı Analiz Et <span class="kbd">G</span></button>`;

  const mapBlock = tierOf(q) !== 3
    ? mapRowHTML(q.subjectId, q.id, entry && entry.sealed)
    : `<div class="akim-maprow off"><span class="hint">İleri havuz sorusu · haritanın dışında</span></div>`;

  const radarHTML = kurtarmaRadariHTML({ q, chosen, ok: row.ok, sec, isReview: false, isMarked: false });
  const fb = $('#fb');
  if (fb) {
    fb.innerHTML = `
      <div class="feedback ${row.ok ? 'ok' : 'no'} akim-fb tone-${v.tone}">
        <div class="fb-head">
          <span class="fb-icon">${icon}</span>
          <div class="fb-head-text">
            <div class="fb-verdict">${esc(v.head)}</div>
            <div class="fb-correct">Doğru şık: <b>${esc(q.correct)}</b></div>
          </div>
          ${confChip}${sourceChip(q)}${attentionBadge}
          <span class="fb-time chip">${fmtSec(sec)}</span>
        </div>
        <div class="akim-verdict-sub">${esc(v.sub)}</div>
        ${roundSummaryHTML()}
        ${mapBlock}
        <div class="fb-body">
          <div class="fb-lead">${richBlock(q.explanation || 'Bu soru için gerekçeli açıklama henüz yazılmamış.')}</div>
          ${radarHTML}
          <div class="fb-meta-strip">
            <div class="fb-meta-item"><span class="fb-meta-label">Kaynak</span><span class="fb-meta-val">${esc(sourceText(q))}</span></div>
            <div class="fb-meta-item"><span class="fb-meta-label">Ders</span><span class="fb-meta-val">${esc(subjectName(q.subjectId))}</span></div>
            ${q.legalBasis ? `<div class="fb-meta-item"><span class="fb-meta-label">Mevzuat</span><span class="fb-meta-val">${esc(q.legalBasis)}</span></div>` : ''}
          </div>
          <div class="kural-slot" id="kural-slot" hidden></div>
        </div>
        <div class="fb-actions">
          <div class="btn-row">
            <button class="btn" data-act="akim-next">Devam</button>
            ${geminiBtn}
            ${kuralButtonHTML(q)}
          </div>
          <div class="fb-actions-meta">
            <span class="hint"><span class="kbd">Enter</span> devam${kuralButtonHTML(q) ? ' · <span class="kbd">K</span> kural' : ''} · <span class="kbd">G</span> yapay zeka</span>
          </div>
        </div>
      </div>`;
  }

  // Şeritteki sakin göstergeler: tur noktası ve harita sayacı.
  const rnd = $('#akim-round');
  if (rnd) rnd.outerHTML = roundHTML();
  const brk = $('#akim-break-slot');
  if (brk) brk.innerHTML = breakChipHTML();
  const chip = $('#akim-map-chip');
  if (chip) { chip.innerHTML = mapChipText(); if (entry && entry.lit) { chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); } }
  const tl = $('#akim-timeline');
  if (tl) tl.style.width = '0%';

  const btnDontKnow = document.querySelector('#q-actions [data-act="akim-dontknow"]');
  if (btnDontKnow) btnDontKnow.style.display = 'none';
  const qHint = document.querySelector('#q-actions .hint');
  if (qHint) {
    qHint.innerHTML = `<span class="kbd">Enter</span> sonraki soru · <span class="kbd">G</span> yapay zeka`;
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

/* ---------- sorunun kaynağı ----------
   Akış 18 Eylül'de practice.js'ten ayrılırken practice'teki "Kaynak" satırı
   buraya taşınmamıştı; kullanıcı çözdüğü sorunun arşiv mı, HMGS benzeri
   mi, ileri havuz mı olduğunu göremiyordu (19 Eylül 2026 şikâyeti).
   Cevaptan ÖNCE gösterilmez: sınavda da yazmıyor. */
function sourceChip(q) {
  const t = tierOf(q);
  if (t === 1) return '<span class="chip accent" title="Arşiv sınav sorusu">Arşiv sorusu</span>';
  if (t === 2) return '<span class="chip" title="Gerçek sınavların biçimiyle üretilmiş soru">HMGS benzeri</span>';
  return '<span class="chip" title="İleri düzey soru havuzu; HMGS düzeyinin üstünde">İleri havuz</span>';
}
function sourceText(q) {
  const t = tierOf(q);
  const label = stripEmoji(q.sourceBadgeLabel || q.examMeta?.badgeLabel || '').trim();
  if (t === 1) {
    const no = q.qNumber ? ` · ${q.qNumber}. soru` : '';
    return (label || 'arşiv sınav sorusu') + no;
  }
  if (t === 2) return 'HMGS benzeri (gerçek sınav biçiminde üretilmiş)';
  return label || 'İleri havuz';
}

/** Kapanış satırı için düz metin. */
function coverageLine() {
  const c = hmgsCoverage();
  if (!c.real.total && !c.similar.total) return '';
  return `Gördüğün HMGS soruları: arşiv ${c.real.seen} / ${c.real.total} · HMGS benzeri ${c.similar.seen} / ${c.similar.total}.`;
}

/** "Kaç HMGS sorusu gördüm" satırı. */
export function coverageHTML() {
  const c = hmgsCoverage();
  if (!c.real.total && !c.similar.total) return '';
  return `<p class="hint" style="margin:0.5rem 0 0">
    Gördüğün HMGS soruları: arşiv <b>${c.real.seen} / ${c.real.total}</b> ·
    HMGS benzeri <b>${c.similar.seen} / ${c.similar.total}</b>
  </p>`;
}

function $$opts() { return [...document.querySelectorAll('#opts .opt')]; }

/* ---------- ilerleme ---------- */

export function next() {
  if (!A || !A.answered) return;
  // 20 Eylül 2026: blok dolunca mola artık ekranı kapatmıyor (seans.gate
  // kaldırıldı). Şeritte sessiz bir "Mola?" teklifi çıkar; kullanıcı isterse
  // basar. Akışın ortasında tam ekran perde, akışı bozan şeyin kendisiydi.
  const done = A.queue.shift();
  if (done) A.usedIds.delete(done.id);   // kuyruktan çıktı; vadesi gelince geri gelebilir
  const lastLog = A.log[A.log.length - 1];

  // Yanlıştan sonra aynı kuraldan kardeş soru kısa gecikmeyle geri gelir.
  if (done && lastLog && !lastLog.ok) {
    const r = flowReinforce(done, A.usedIds, A.scope);
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
  const f = flowFeed(FLOW_BATCH, A.scope, { blockedSubjects: A.blockedSubjects });
  (f.blockedThisCall || []).forEach(id => A.blockedSubjects.add(id));
  for (const q of f.questions) {
    if (!A.usedIds.has(q.id)) { A.queue.push(q); A.usedIds.add(q.id); }
  }
}

export function isAnswered() { return !!A && A.answered; }

/* nextLogic() / toggleLogic() 20 Eylül 2026'da silindi — bahis şeridiyle
   birleştirildi (bkz. engine.js CONF notu). Pratik/deneme ekranında
   (practice.js) bahis şeridi olmadığı için oradaki "Mantıkla Geç" duruyor. */

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

/**
 * Sayfa kapanırken/yenilenirken yarım akışı çalışma kaydına yazar (main.js
 * pagehide). Eskiden sekmeyi kapatmak akışın özetini (süre, ders kırılımı)
 * Takip'e hiç göndermiyordu; ham cevaplar duruyor ama çalışma kaydı
 * oluşmuyordu (22 Eylül 2026).
 */
export function flushRun() {
  if (!A || !A.log.length) return;
  try { finalizeRun(); } catch (e) { console.error('[studio] yarım akış kaydedilemedi:', e); }
  A = null;
  stopTick();
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
  // Akışın da duvar saati vardı ama hiç kaydedilmiyordu: startedAt alanı
  // bile yoktu, seans "soru sürelerinin toplamı" kadar sanılıyordu.
  const saat = seans.end() || {};

  const bySubject = {};
  done.forEach(r => {
    const sid = r.q?.subjectId || '__bilinmiyor__';
    bySubject[sid] = bySubject[sid] || { subjectId: sid, total: 0, correct: 0 };
    bySubject[sid].total++; if (r.ok) bySubject[sid].correct++;
  });

  const result = {
    id: 'flow_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    at: saat.endedAt || new Date().toISOString(),
    startedAt: saat.startedAt || new Date().toISOString(),
    endedAt: saat.endedAt || new Date().toISOString(),
    isoDate: new Date().toISOString().slice(0, 10),
    mode: 'flow',
    label: 'Akış',
    durationMinutes: Math.round(durationMs / 60000),
    wallMinutes: saat.wallMs != null ? Math.round(saat.wallMs / 60000) : null,
    activeMinutes: saat.activeMs != null ? Math.round(saat.activeMs / 60000) : Math.round(durationMs / 60000),
    breakMinutes: saat.breakMs != null ? Math.round(saat.breakMs / 60000) : 0,
    idleMinutes: saat.idleMs != null ? Math.round(saat.idleMs / 60000) : null,
    focusRatio: saat.focusRatio ?? null,
    breaksTaken: saat.breaks ?? 0,
    // odak izi (eski kayıtlarda alan yok; okuyan taraf 0 saymalı)
    escapes: saat.escapes ?? 0,
    escapeMinutes: saat.escapeMs != null ? Math.round(saat.escapeMs / 60000) : 0,
    aiTrips: saat.aiTrips ?? 0,
    aiMinutes: saat.aiMs != null ? Math.round(saat.aiMs / 60000) : 0,
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
    milestones: new Set(A.milestones.map(m => m.split(':')[1])).size,
    litGain: A.litIds.size,
    litIds: new Set(A.litIds),
    openNow: hmgsMap().open,
    calib: calibration(done),
    hintN: done.filter(r => r.conf === 'hint').length,
    escapes: saat.escapes ?? 0,
    escapeMs: saat.escapeMs ?? 0,
    aiTrips: saat.aiTrips ?? 0,
    aiMs: saat.aiMs ?? 0
  };
}

/* ---------- şık / öncül eleme (görsel, cevap kaydı değil) ---------- */

export function eliminateOption(key) {
  if (!A || A.answered) return;
  A.elimUsed = true;
  if (A.armed === key) {
    A.armed = null;
    $$opts().forEach(b => b.classList.remove('armed'));
    const bet = $('#akim-bet'); if (bet) bet.hidden = true;
  }
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
  seans.aiTrip();
  const q = A.queue[0];
  const last = A.log[A.log.length - 1];
  const chosen = A.answered && last && last.qId === q.id ? last.chosen : null;

  A.geminiAsked = true;
  if (!A.answered) { A.geminiAskedPreAnswer = true; paintBet(); }
  if (A.answered && last && last.qId === q.id) {
    last.askedGemini = true;
    const storeAnswers = state().answers;
    const storeRow = storeAnswers.findLast?.(a => a.qId === q.id) ||
      [...storeAnswers].reverse().find(a => a.qId === q.id);
    if (storeRow) { storeRow.askedGemini = true; save(); }
  }

  // Bahis istemi belirler: aynı yanlış, "Eminim"de yanlış kuralın onarımını,
  // "Mantıkla"da sıfırdan anlatımı ister. Cevaptan önce ipucu istendiyse satır
  // zaten 'hint' olarak kaydedilir (pick()), ikinci tur konuyu tekrar anlatmaz.
  const conf = A.answered && last && last.qId === q.id ? (last.conf || null) : null;
  const built = buildGeminiPrompt(q, { answered: !!A.answered, chosen, conf });
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
