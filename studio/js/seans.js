/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   seans.js — SEANS SAATİ VE MOLA (tek doğruluk kaynağı)
   ==========================================================================
   Bu dosya öncesinde Stüdyo'da tek bir süre vardı: soru ekrandayken geçen
   performance.now() farkı. O süre iki ayrı şeyi aynı kovaya atıyordu ve
   ikisini de yanlış ölçüyordu:

   1. Sekmeden çıkıp yarım saat sonra dönülürse o yarım saat sorunun
      "çözüm süresi" olarak yazılıyordu.
   2. Cevap verildikten sonra açıklamayı okurken, ya da soru ile soru
      arasında geçen zaman hiçbir yere yazılmıyordu. Seansın toplam süresi
      soru sürelerinin toplamı sayıldığı için, bir saatte beş soru çözülen
      bir oturum kayıtta "2 dakikalık çalışma" olarak görünüyordu.

   Bu yüzden burada üç ayrı süre tutulur ve asla birbirinin yerine geçmez:

     aktifMs : soru ekranda AÇIKKEN, sekme görünürken ve kullanıcı
               etkileşimdeyken geçen süre. "Gerçekten soru çözülen" zaman.
     molaMs  : açıkça mola verilen zaman. Kayıp değildir, verimlilik
               oranını düşürmez.
     duvarMs : seansın başlangıcından bitişine kadar geçen gerçek zaman.

   Bunlardan türeyen tek anlamlı sayı:
     boşMs   = duvarMs - aktifMs - molaMs   (ekran açık, kimse yok)
     odakOranı = aktifMs / (duvarMs - molaMs)

   Odak oranı seansın verimliliğidir. Bir saatte beş soru, soru başına 20
   saniye ile çözülmüşse odak oranı yüzde 3 çıkar ve kayıt bunu söyler.

   MOLA soru ortasında başlamaz. Blok süresi dolduğunda yalnız bayrak
   kalkar; mola, o an ekrandaki soru cevaplanıp "devam" denince başlar.
   Sebep: olay sorusunun ortasında kesmek, kurulan vakayı kafadan siler,
   molanın kazandırdığından fazlasını götürür.

   Kullanım (practice.js ve akim.js aynısını kullanır):
     seans.begin({ mode, label })      seans başlar
     seans.qBegin()                    soru ekrana gelince
     seans.qElapsed()                  ekrandaki sayaç için (ms, aktif)
     seans.qEnd()                      cevap verilince -> { ms, rawMs, idleMs }
     seans.gate(devamFn)               "devam"dan önce; mola varsa true döner
     seans.end()                       seans özeti -> saat alanları
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { state, save } from './store.js';

/* ---------- ayarlar ---------- */

/** Soru ekranda açıkken hiçbir tuşa/fareye dokunulmadan geçebilecek süre.
    Bunun ötesi "çözüm" değil, boşta bekleme sayılır. Uzun bir olay sorusu
    okunurken fareye dokunulmayabilir; bu yüzden eşik hedef sürenin (75 sn)
    yaklaşık iki katıdır, kısa tutulup okuma cezalandırılmaz. */
const IDLE_MS = 150 * 1000;

/** Varsayılan pomodoro bloğu. 25/5 değil, çünkü ölçüt sınav:
    HMGS 155 dakika kesintisizdir (bkz. views/exam.js DURATION_MS).
    25 dakikalık bloklarla çalışan bir kafa, 155 dakikanın son yarısında
    kendini ilk kez orada bulur. 50 dakika, sınav süresinin tam yarısıdır. */
const DEFAULT_WORK_MIN = 50;
const DEFAULT_BREAK_MIN = 10;

/** Odak izi — G tuşuyla Gemini'ye gidip pencereden çıkmak "yapay zeka turu",
    başka bir sebeple çıkmak "kaçış" sayılır (bkz. PLAN_ODAK_IZI_VE_ISTEM.md).
    G'ye basıldıktan sonra bu kadar ms içinde pencere odağı çıkarsa tur
    yapay zeka sayılır; zırh süresi dolduysa aynı çıkış kaçıştır. */
const AI_ARM_MS = 10000;
/** Kaçışın toast'la bildirilmesi için gereken minimum süre (ms). Kısa
    tıklama kırıntıları (odak kaybı üretip hemen dönen) rahatsız etmesin. */
const KACIS_TOAST_MS = 15000;

const AYAR_KEY = 'pomodoro';

/* ---------- durum ---------- */

let SS = null;       // açık seans; yoksa null
let idleTimer = null;
let lastInput = 0;   // performance.now()

function now() { return performance.now(); }

/** Stüdyo'nun test koşusu Node'da, DOM olmadan çalışır (bkz. studio/test/).
    Saat mantığı orada da çalışmalı; yalnız ekrana dokunan kısımlar susar. */
const DOM = typeof document !== 'undefined' && typeof window !== 'undefined';

/** Pomodoro ayarı store.settings içinde yaşar, seansla birlikte ölmez. */
export function ayar() {
  const s = (state().settings || {})[AYAR_KEY] || {};
  return {
    on: s.on !== false,                                   // varsayılan açık
    workMin: Number(s.workMin) > 0 ? Number(s.workMin) : DEFAULT_WORK_MIN,
    breakMin: Number(s.breakMin) >= 0 ? Number(s.breakMin) : DEFAULT_BREAK_MIN
  };
}

export function ayarla(patch) {
  const st = state();
  st.settings = st.settings || {};
  st.settings[AYAR_KEY] = { ...ayar(), ...patch };
  save();
  if (SS) {
    const a = ayar();
    SS.workMs = a.workMin * 60000;
    SS.breakMs = a.breakMin * 60000;
    SS.pomoOn = a.on;
  }
  return ayar();
}

/* ---------- seans ---------- */

/**
 * Yeni seans başlatır. Aynı anda tek seans olur; açık seans varsa kapatılır.
 * @param {object} meta { mode, label }
 */
export function begin(meta = {}) {
  const a = ayar();
  SS = {
    mode: meta.mode || null,
    label: meta.label || null,
    startedAtISO: new Date().toISOString(),
    t0: now(),

    aktifMs: 0,        // biten soruların aktif sürelerinin toplamı
    molaMs: 0,         // açık molalarda geçen toplam
    bosMs: 0,          // boşta yakalanan toplam (soru açıkken kimse yok)

    // açık sorunun sayaçları
    qAccum: 0,         // birikmiş aktif ms
    qRunSince: null,   // sayaç işliyorsa başlangıç damgası, duraksadıysa null
    qT0: null,         // sorunun ekrana geldiği an (duvar saati için)
    qIdleMs: 0,        // bu soruda boşa geçen
    qIdleSince: null,  // boşta yakalandıysa ne zamandan beri

    // mola
    pomoOn: a.on,
    workMs: a.workMin * 60000,
    breakMs: a.breakMin * 60000,
    blockT0: now(),    // içinde bulunulan bloğun başı
    blockMs: 0,        // bu blokta çalışılan (aktif + kısa boşluk) süre
    blocksDone: 0,
    breakDue: false,
    onBreak: false,
    breakEndsAt: 0,
    breakT0: null,
    molaSebep: null,   // 'blok' | 'akis' | 'elle'

    // odak izi
    aiArmedUntil: 0,   // aiTrip() sonrası bu ana kadar çıkış "yapay zeka" sayılır
    disari: null,      // { since, tur: 'ai'|'kacis' } | null — pencere şu an odak dışında mı
    kacisSay: 0, kacisMs: 0,
    aiSay: 0, aiMs: 0,
    onKacisFn: null
  };
  attachWatchers();
  paintBar();
  return SS;
}

export function active() { return !!SS; }

/**
 * G tuşuna basıldı / Gemini butonuna tıklandı. Sonraki AI_ARM_MS içinde
 * pencere odağı çıkarsa bu "yapay zeka turu" sayılır, kaçış değil.
 * akim.askGemini() ve practice.askGemini() ikisi de bunu çağırır — tuştan
 * da butondan da aynı fonksiyon geçtiği için tek yer yeter.
 */
export function aiTrip() {
  if (!SS) return;
  SS.aiArmedUntil = now() + AI_ARM_MS;
}

/** Kaçış toast'ı göstermek için view'dan bağlanan kanca (döngüsel import'tan kaçmak için). */
export function onKacis(fn) {
  if (SS) SS.onKacisFn = typeof fn === 'function' ? fn : null;
}

/** Seansı kapatır ve saat özetini döndürür. */
export function end() {
  if (!SS) return null;
  // Açık soru varsa süresi çöpe gitmesin.
  if (SS.qRunSince != null) { SS.aktifMs += now() - SS.qRunSince; SS.qRunSince = null; }
  if (SS.onBreak) endBreak(true);
  // Seans açıkken odak dışarıdaysa o açık süreyi de türüne göre kapat.
  if (SS.disari) closeDisari(now());

  const duvarMs = Math.max(0, now() - SS.t0);
  const molaMs = Math.round(SS.molaMs);
  const aktifMs = Math.round(SS.aktifMs);
  const calismaMs = Math.max(0, duvarMs - molaMs);
  const bosMs = Math.max(0, Math.round(calismaMs - aktifMs));

  const out = {
    startedAt: SS.startedAtISO,
    endedAt: new Date().toISOString(),
    wallMs: Math.round(duvarMs),
    activeMs: aktifMs,
    breakMs: molaMs,
    idleMs: bosMs,
    /** aktif / (duvar - mola). 1'e yakın = ekranda geçen her dakika soru
        çözmekle geçmiş. 0'a yakın = ekran açık, çalışma yok. */
    focusRatio: calismaMs > 0 ? Number((aktifMs / calismaMs).toFixed(3)) : null,
    breaks: SS.blocksDone,
    // odak izi — kaçış: G'siz odak çıkışı; yapay zeka turu: G sonrası zırh içinde çıkış
    escapes: SS.kacisSay,
    escapeMs: Math.round(SS.kacisMs),
    aiTrips: SS.aiSay,
    aiMs: Math.round(SS.aiMs)
  };

  detachWatchers();
  SS = null;
  paintBar();
  return out;
}

/** Açık seansın anlık saat durumu (özet ekranı ve şerit için). */
export function snapshot() {
  if (!SS) return null;
  const run = SS.qRunSince != null ? now() - SS.qRunSince : 0;
  const duvarMs = now() - SS.t0;
  const molaMs = SS.molaMs + (SS.onBreak && SS.breakT0 != null ? now() - SS.breakT0 : 0);
  const aktifMs = SS.aktifMs + run;
  const calismaMs = Math.max(0, duvarMs - molaMs);
  return {
    wallMs: duvarMs, activeMs: aktifMs, breakMs: molaMs,
    idleMs: Math.max(0, calismaMs - aktifMs),
    focusRatio: calismaMs > 0 ? aktifMs / calismaMs : null,
    blockLeftMs: Math.max(0, SS.workMs - SS.blockMs),
    blockRatio: SS.workMs > 0 ? Math.min(1, SS.blockMs / SS.workMs) : 0,
    onBreak: SS.onBreak,
    breakDue: SS.breakDue,
    blocksDone: SS.blocksDone,
    escapes: SS.kacisSay,
    escapeMs: Math.round(SS.kacisMs + (SS.disari && SS.disari.tur === 'kacis' ? now() - SS.disari.since : 0)),
    aiTrips: SS.aiSay,
    aiMs: Math.round(SS.aiMs + (SS.disari && SS.disari.tur === 'ai' ? now() - SS.disari.since : 0))
  };
}

/* ---------- soru saati ---------- */

/** Soru ekrana geldi. */
export function qBegin() {
  if (!SS) return;
  SS.qAccum = 0;
  SS.qT0 = now();
  SS.qRunSince = SS.onBreak ? null : now();
  SS.qIdleMs = 0;
  SS.qIdleSince = null;
  lastInput = now();
}

/** Ekrandaki sayaç için: bu soruda şu ana kadar geçen AKTİF süre (ms). */
export function qElapsed() {
  if (!SS) return 0;
  return SS.qAccum + (SS.qRunSince != null ? now() - SS.qRunSince : 0);
}

/**
 * Cevap verildi. Soruyu kapatır ve üç süreyi birden döndürür.
 * @returns {{ms:number, rawMs:number, idleMs:number}}
 *   ms      aktif süre, kayda "çözüm süresi" olarak bu yazılır
 *   rawMs   soru ekranda kaldığı toplam süre (eski davranış, kıyas için)
 *   idleMs  bunun boşa geçen kısmı
 */
export function qEnd() {
  if (!SS) return { ms: 0, rawMs: 0, idleMs: 0 };
  if (SS.qIdleSince != null) { SS.qIdleMs += now() - SS.qIdleSince; SS.qIdleSince = null; }
  if (SS.qRunSince != null) { SS.qAccum += now() - SS.qRunSince; SS.qRunSince = null; }

  const ms = Math.max(0, Math.round(SS.qAccum));
  const rawMs = SS.qT0 != null ? Math.max(0, Math.round(now() - SS.qT0)) : ms;
  const idleMs = Math.max(0, Math.round(SS.qIdleMs));

  SS.aktifMs += ms;
  SS.bosMs += idleMs;
  // Blok saati "çalışılan" zamanı sayar: aktif süre + sorular arası kısa
  // geçişler. Boşta geçen ve mola zaten bloğa yazılmaz, yoksa masadan
  // kalkıp gelmek bloğu bitirmiş gibi görünürdü.
  SS.blockMs += ms;
  checkBlock();
  paintBar();
  return { ms, rawMs, idleMs };
}

/* ---------- duraksatma ---------- */

function pauseQ(at) {
  if (!SS || SS.qRunSince == null) return;
  const cut = Math.max(SS.qRunSince, Math.min(at == null ? now() : at, now()));
  SS.qAccum += cut - SS.qRunSince;
  SS.qRunSince = null;
  SS.qIdleSince = cut;
}

function resumeQ() {
  if (!SS || SS.qRunSince != null || SS.onBreak || SS.qT0 == null) return;
  if (SS.qIdleSince != null) { SS.qIdleMs += now() - SS.qIdleSince; SS.qIdleSince = null; }
  SS.qRunSince = now();
  lastInput = now();
}

/* ---------- boşta yakalama ---------- */

function onInput() {
  lastInput = now();
  if (SS && SS.qIdleSince != null && !SS.onBreak) resumeQ();
}

function onVisibility() {
  if (!SS) return;
  if (document.hidden) pauseQ();
  else { lastInput = now(); resumeQ(); }
}

function idleSweep() {
  if (!SS || SS.onBreak) return;
  if (SS.qRunSince != null) {
    // Son etkileşimden (ya da soru açıldığından) itibaren IDLE_MS kadar
    // serbest okuma hakkı var; ötesi boşta sayılır ve saat o ana geri alınır.
    const from = Math.max(lastInput, SS.qRunSince);
    if (now() - from > IDLE_MS) pauseQ(from + IDLE_MS);
  }
  paintBar();
}

let watching = false;
const INPUT_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'pointermove'];

/* ---------- odak izi: yapay zeka turu mu, kaçış mı ---------- */

/** Dışarıda geçen açık süreyi türüne göre kapatır (sayaçları artırır, disari'yi sıfırlar). */
function closeDisari(at) {
  if (!SS || !SS.disari) return;
  const d = Math.max(0, at - SS.disari.since);
  if (SS.disari.tur === 'ai') { SS.aiSay += 1; SS.aiMs += d; }
  else { SS.kacisSay += 1; SS.kacisMs += d; }
  SS.disari = null;
  return d;
}

function onBlur() {
  if (!SS || SS.onBreak) return;
  // Sayfa içi iframe'e tıklamak da blur üretir — bu, pencereden çıkmak değildir.
  if (DOM && document.activeElement && document.activeElement.tagName === 'IFRAME') return;
  SS.disari = { since: now(), tur: now() < SS.aiArmedUntil ? 'ai' : 'kacis' };
  // Dışarıda geçen süre çözüm süresi değildir (ne yapay zeka turunda, ne kaçışta).
  pauseQ();
}

function onFocus() {
  if (!SS || !SS.disari) return;
  const since = SS.disari.since;
  const tur = SS.disari.tur;
  const d = now() - since;
  if (d < 3000) { SS.disari = null; return; } // tıklama kırıntısı, yok say
  closeDisari(now());
  lastInput = now();
  resumeQ();
  if (tur === 'kacis' && d >= KACIS_TOAST_MS && typeof SS.onKacisFn === 'function') {
    SS.onKacisFn(d);
  }
}

function attachWatchers() {
  if (watching || !DOM) return;
  watching = true;
  INPUT_EVENTS.forEach(e => window.addEventListener(e, onInput, { passive: true }));
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  idleTimer = setInterval(idleSweep, 3000);
  lastInput = now();
}

function detachWatchers() {
  if (!watching || !DOM) return;
  watching = false;
  INPUT_EVENTS.forEach(e => window.removeEventListener(e, onInput));
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('focus', onFocus);
  if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
}

/* ---------- mola ---------- */

function checkBlock() {
  if (!SS || !SS.pomoOn || SS.onBreak || SS.breakDue) return;
  if (SS.workMs > 0 && SS.blockMs >= SS.workMs) {
    SS.breakDue = true;
    SS.molaSebep = 'blok';
  }
}

/**
 * Akış skoru dibe vurduğunda mola önerisi. engine.flowScore'un "Mola ver"
 * etiketi bu dosyadan önce yalnız bir yazıydı, hiçbir şeyi durdurmuyordu;
 * çağıran view o etiketi görünce burayı çağırır ve etiket gerçek bir
 * mekanizmaya bağlanır.
 */
export function suggestBreak(sebep = 'akis') {
  if (!SS || SS.onBreak || !SS.pomoOn) return false;
  SS.breakDue = true;
  SS.molaSebep = sebep;
  return true;
}

/** Mola bekliyor mu (soru sınırında sorulur). */
export function breakDue() { return !!(SS && SS.breakDue && !SS.onBreak); }

/**
 * "Devam" düğmesinin kapısı. Mola varsa molayı başlatır, true döner ve
 * çağıran akışı durdurur; mola bitince `resumeFn` çağrılır.
 * Mola yoksa false döner, hiçbir şey olmaz.
 */
export function gate(resumeFn) {
  if (!breakDue()) return false;
  startBreak(resumeFn);
  return true;
}

export function startBreak(resumeFn) {
  if (!SS || SS.onBreak) return;
  pauseQ();
  SS.onBreak = true;
  SS.breakDue = false;
  SS.breakT0 = now();
  SS.breakEndsAt = Date.now() + SS.breakMs;
  SS.afterBreak = typeof resumeFn === 'function' ? resumeFn : null;
  renderOverlay();
}

export function endBreak(silent = false) {
  if (!SS || !SS.onBreak) return;
  if (SS.breakT0 != null) SS.molaMs += now() - SS.breakT0;
  SS.breakT0 = null;
  SS.onBreak = false;
  SS.blocksDone += 1;
  SS.blockMs = 0;
  SS.blockT0 = now();
  removeOverlay();
  lastInput = now();
  resumeQ();
  paintBar();
  const fn = SS.afterBreak;
  SS.afterBreak = null;
  if (!silent && fn) fn();
}

/* ---------- ekran: mola perdesi ve blok şeridi ---------- */

let overlayTimer = null;

function renderOverlay() {
  if (!DOM) return;
  removeOverlay();
  const el = document.createElement('div');
  el.id = 'mola-perde';
  el.className = 'mola-perde';
  el.innerHTML = `
    <div class="mola-kart">
      <div class="mola-ikon">◐</div>
      <h2 class="mola-baslik">Mola</h2>
      <p class="mola-alt" id="mola-alt"></p>
      <div class="mola-saat" id="mola-saat">--:--</div>
      <p class="mola-not">Soru saati durdu. Bu süre seansın verimlilik oranına yazılmaz.</p>
      <div class="mola-dugmeler">
        <button class="btn btn-1" data-act="mola-bitir">Molayı bitir, devam et</button>
        <button class="btn btn-2 btn-s" data-act="mola-uzat">+5 dakika</button>
      </div>
      <div class="mola-ayar">
        <span class="mola-ayar-k">Blok</span>
        ${[25, 50, 75].map(m => `<button class="mola-chip${SS.workMs === m * 60000 ? ' secili' : ''}" data-blok="${m}">${m} dk</button>`).join('')}
        <button class="mola-chip" data-act="mola-kapat">Molasız</button>
      </div>
      <p class="mola-not" style="margin:0.9rem 0 0">
        Sınav 155 dakika kesintisizdir. 25 dakikalık bloklarla çalışan kafa,
        o 155 dakikanın ikinci yarısını ilk kez sınavda görür.
      </p>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('molada');

  const alt = el.querySelector('#mola-alt');
  if (alt) {
    alt.textContent = SS.molaSebep === 'akis'
      ? 'Son sorularda tempo ve isabet birlikte düştü. Zorlayarak devam etmek yanlışı öğretir.'
      : `${Math.round(SS.workMs / 60000)} dakikalık blok doldu.`;
  }

  el.addEventListener('click', ev => {
    const act = ev.target.closest('[data-act]')?.dataset.act;
    if (act === 'mola-bitir') endBreak();
    if (act === 'mola-uzat' && SS) SS.breakEndsAt += 5 * 60000;
    if (act === 'mola-kapat') { ayarla({ on: false }); endBreak(); }
    const blok = ev.target.closest('[data-blok]')?.dataset.blok;
    if (blok) { ayarla({ workMin: Number(blok), on: true }); renderOverlay(); }
  });

  const paint = () => {
    const sec = Math.max(0, Math.round((SS?.breakEndsAt - Date.now()) / 1000));
    const s = document.getElementById('mola-saat');
    if (s) s.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
    if (sec <= 0 && SS?.onBreak) {
      const c = document.querySelector('.mola-kart');
      if (c) c.classList.add('doldu');
    }
  };
  paint();
  overlayTimer = setInterval(paint, 500);
}

function removeOverlay() {
  if (!DOM) return;
  if (overlayTimer) { clearInterval(overlayTimer); overlayTimer = null; }
  document.getElementById('mola-perde')?.remove();
  document.body.classList.remove('molada');
}

/** Ekranın üstünde ince blok şeridi: blok dolarken ilerler, boşta durur. */
function paintBar() {
  if (!DOM) return;
  let bar = document.getElementById('blok-serit');
  if (!SS || !SS.pomoOn || !document.body.classList.contains('in-session')) {
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'blok-serit';
    bar.className = 'blok-serit';
    bar.innerHTML = '<i></i>';
    document.body.appendChild(bar);
  }
  const r = SS.workMs > 0 ? Math.min(1, SS.blockMs / SS.workMs) : 0;
  bar.firstElementChild.style.width = (r * 100).toFixed(1) + '%';
  bar.classList.toggle('bosta', SS.qIdleSince != null);
  bar.classList.toggle('dolu', SS.breakDue);
  bar.title = SS.breakDue
    ? 'Blok doldu, sıradaki soruda mola başlayacak'
    : `Blok: ${Math.round(SS.blockMs / 60000)} / ${Math.round(SS.workMs / 60000)} dk`;
}

export const _test = { IDLE_MS, DEFAULT_WORK_MIN, DEFAULT_BREAK_MIN, AI_ARM_MS, KACIS_TOAST_MS };
