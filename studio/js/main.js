/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   main.js — ROUTER + TEK OLAY DİNLEYİCİ
   Inline onclick yok: tüm etkileşim document seviyesinde data-act ile yakalanır.
   Bu sayede yeniden render sonrası handler bağlamak gerekmez.
   ========================================================================== */

import { $, $$, toast } from './ui.js';
import { initData, initDataAsync, populateData, topicById, questionById } from './data.js';
import { load, save, daysLeft, state } from './store.js';
import { requestDriveLoginAndDownload, clearVaultIndexedDB } from './vault-client.js';
import * as today from './views/today.js';
import * as odevler from './views/odevler.js';
import * as practice from './views/practice.js';
import * as exam from './views/exam.js';
import * as flow from './views/flow.js';
import * as progress from './views/progress.js';
import * as pratik from './views/pratik.js';


const VIEWS = ['today', 'odevler', 'flow', 'practice', 'pratik', 'exam', 'progress'];
let currentView = 'today';
let lastAction = null;

/* ---------- yönlendirme ---------- */

function show(view, push = true) {
  if (!VIEWS.includes(view)) view = 'today';

  // Sınav sürüyorsa kazayla çıkmayı engelle
  if (currentView === 'exam' && view !== 'exam' && exam.active()) {
    if (!confirm('Deneme sınavı sürüyor. Çıkarsan sonuç kaydedilmez. Çıkmak istiyor musun?')) return;
    exam.reset();
  }

  currentView = view;
  VIEWS.forEach(v => $('#view-' + v)?.classList.toggle('on', v === view));
  $$('.nav button').forEach(b => b.setAttribute('aria-current', String(b.dataset.view === view)));

  try {
    if (view === 'today') today.render();
    if (view === 'odevler') odevler.fetchTasks();
    if (view === 'flow') flow.render();
    if (view === 'practice') practice.render();
    if (view === 'pratik') pratik.render();
    if (view === 'exam') exam.render();
    if (view === 'progress') progress.render();
  } catch (err) {
    console.error(`[studio] view render hatası (${view}):`, err);
    const host = $('#view-' + view);
    if (host) {
      host.innerHTML = `<div class="wrap" style="padding:2rem 1rem"><div class="card" style="border-left:4px solid var(--no)">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;color:var(--no)">Görünüm Yükleme Hatası (${view})</h3>
        <p style="color:var(--ink-2);font-size:0.9rem;margin-bottom:1rem">Bir görünüm oluşturulurken hata oluştu: <code>${err.message}</code></p>
        <button class="btn" onclick="location.reload()">Yeniden Yükle</button>
      </div></div>`;
    }
  }

  if (push) {
    try { history.pushState({ view }, '', '#' + view); } catch (e) {}
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/** Koçun döndürdüğü action nesnesini uygular. */
function runAction(a) {
  if (!a) return;
  if (a.view === 'practice') {
    if (practice.startSession(a)) show('practice');
    else show('today');
  } else if (a.view === 'exam') {
    show('exam');
    if (a.mode === 'start') exam.start();
  } else {
    show(a.view || 'today');
  }
}

/* ---------- tek olay dinleyici ---------- */

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act], [data-view]');

  if (!el) return;

  if (el.dataset.view) { e.preventDefault(); show(el.dataset.view); return; }
  const act = el.dataset.act;
  if (!act) return;
  e.preventDefault();

  switch (act) {
    /* --- gezinme --- */
    case 'go-today':   show('today'); break;
    case 'go-exam':    show('exam'); break;
    case 'go-flow-subject': flow.setSubject(el.dataset.subject); show('flow'); break;
    case 'go-flow-topic':   if (flow.open(el.dataset.topic)) show('flow'); break;

    /* --- pratik alanı (üretilmiş vaka) --- */
    case 'pratik-ac':           pratik.ac(el.dataset.gen); break;
    case 'pratik-geri':         pratik.geri(); break;
    case 'pratik-yeni':         pratik.yeni(); break;
    // pratik.js şu an kalipSec/sonsuzaGec dışa aktarmıyor; buton kalırsa
    // TypeError atmasın diye korumalı çağrı.
    case 'pratik-kalip':        if (typeof pratik.kalipSec === 'function') pratik.kalipSec(el.dataset.kalip); break;
    case 'pratik-sonsuz':       if (typeof pratik.sonsuzaGec === 'function') pratik.sonsuzaGec(); break;
    case 'pratik-sonsuz-basla': pratik.sonsuzBasla(); break;

    /* --- ödevler sekmesi (koç görevleri, HMGS Stüdyo şeması) --- */
    case 'odev-yenile': odevler.fetchTasks(true); break;
    case 'odev-quiz': {
      const subj = el.dataset.subj || '';
      const topic = el.dataset.topic || '';
      const topics = el.dataset.topics ? el.dataset.topics.split(',').map(s => s.trim()).filter(Boolean) : [];
      const count = Number(el.dataset.count) || 15;

      let sessionOpts;
      if (topics.length > 1) {
        sessionOpts = { mode: 'topics', topicIds: topics, count };
      } else if (topics.length === 1 || topic) {
        sessionOpts = { mode: 'topic', topicId: topic || topics[0], count };
      } else if (subj) {
        sessionOpts = { mode: 'subject', subjectId: subj, count };
      } else {
        sessionOpts = { mode: 'mixed', count };
      }

      const ok = practice.startSession(sessionOpts);
      if (ok) show('practice');   // havuz boşsa startSession zaten uyarı basıyor
      break;
    }
    case 'odev-pratik': {
      const gen = el.dataset.gen || '';
      show('pratik');
      if (gen && gen !== 'notes') pratik.ac(gen);
      break;
    }

    /* --- bugün ekranı --- */
    case 'do-next': {
      lastAction = today.currentAction();
      runAction(lastAction.action);
      break;
    }
    case 'do-alt': {
      const a = (lastAction || today.currentAction()).alts[Number(el.dataset.alt)];
      runAction(a?.action);
      break;
    }
    case 'practice-subject':
      if (practice.startSession({ mode: 'subject', subjectId: el.dataset.subject, count: 15 })) show('practice');
      break;

    /* --- yanlışlarım (SRS tekrarı) — kalıcı giriş, koç ödevine bağlı değil --- */
    case 'review-due': {
      const n = Number(el.dataset.count) || 20;
      if (practice.startSession({ mode: 'review', count: n })) show('practice');
      break;
    }
    case 'review-subject': {
      const n = Number(el.dataset.count) || 20;
      if (practice.startSession({ mode: 'review', subjectId: el.dataset.subject, count: n })) show('practice');
      break;
    }
    case 'practice-pastexam':
      if (practice.startSession({ mode: 'pastExam', count: 999 })) show('practice');
      break;

    /* --- akış --- */
    case 'flow-subject': flow.setSubject(el.dataset.subject); break;
    case 'flow-topic':   flow.open(el.dataset.topic); break;
    case 'flow-practice':
      if (practice.startSession({ mode: 'topic', topicId: el.dataset.topic, count: 99 })) show('practice');
      break;
    case 'flow-practice-subject':
      if (practice.startSession({ mode: 'subject', subjectId: el.dataset.subject, count: 15 })) show('practice');
      break;
    case 'reveal': {
      const body = el.nextElementSibling;
      if (body) {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : 'block';
        const hint = el.querySelector('.hint');
        if (hint) hint.textContent = open ? 'göster' : 'kapat';
      }
      break;
    }

    /* --- soru çözme --- */
    case 'pick':     practice.pick(el.dataset.key); break;
    case 'dontknow': practice.dontKnow(); break;
    case 'next':     practice.next(); break;
    case 'quit':     practice.quit(); break;
    case 'again':    if (!practice.repeatSession()) show('today'); break;
    case 'push-session': practice.pushSession(); break;

    /* --- şık / öncül eleme (pratik + sınav ortak) --- */
    case 'eliminate': {
      if (currentView === 'exam') exam.eliminateOption(el.dataset.key);
      else practice.eliminateOption(el.dataset.key);
      break;
    }
    case 'eliminate-premise': {
      if (currentView === 'exam') exam.eliminatePremise(el.dataset.numeral);
      else practice.eliminatePremise(el.dataset.numeral);
      break;
    }

    /* --- sınav --- */
    case 'exam-start':  exam.start(); break;
    case 'exam-start-real': exam.startReal(el.dataset.source); break;
    case 'exam-pick':   exam.pick(el.dataset.key); break;
    case 'exam-clear':  exam.clear(); break;
    case 'exam-mark':   exam.mark(); break;
    case 'exam-goto':   exam.goto(Number(el.dataset.i)); break;
    case 'exam-prev':   exam.prev(); break;
    case 'exam-next':   exam.next(); break;
    case 'exam-finish': exam.finish(false); break;
    case 'exam-export-stats': exam.exportStats(); break;
    case 'exam-review-wrong': {
      const ids = exam.wrongIdsOfLast();
      const qs = ids.map(id => questionById.get(id)).filter(Boolean);
      if (!qs.length) { toast('Yanlış soru yok.'); break; }
      if (practice.startSession({ mode: 'review', count: qs.length })) { show('practice'); break; }
      toast('Tekrar seansı kurulamadı.');
      break;
    }

    /* --- ilerleme & veri kasası --- */
    case 'export':    progress.doExport(); break;
    case 'reset-all': if (progress.doReset()) show('today'); break;

    case 'drive-connect-vault':
    case 'sync-vault': {
      const btn = el;
      const oldText = btn.innerHTML;
      btn.innerHTML = '⏳ Drive İndiriliyor...';
      btn.disabled = true;
      try {
        const vault = await requestDriveLoginAndDownload();
        populateData(vault);
        toast(`Kütüphane güncellendi: ${vault.counts.questions} soru, ${vault.counts.topics} konu ✓`, 'ok');
        const initial = (location.hash || '#today').slice(1);
        show(VIEWS.includes(initial) ? initial : 'today', false);
      } catch (err) {
        console.error('[vault sync error]', err);
        toast(`İndirme başarısız: ${err.message}`, 'no');
        btn.innerHTML = oldText;
        btn.disabled = false;
      }
      break;
    }

    case 'clear-vault-cache': {
      if (confirm('Telefonunuzdaki çevrimdışı soru/konu kütüphanesi silinecek. Tekrar Drive\'dan indirmeniz gerekecek.\n\nEmin misiniz?')) {
        await clearVaultIndexedDB();
        toast('Yerel kütüphane temizlendi.');
        location.reload();
      }
      break;
    }

    default: break;
  }
});

/* ---------- form değişiklikleri (açılır listeler) ---------- */

document.addEventListener('change', e => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'flow-subject-select') flow.setSubject(el.value);
});

/* ---------- klavye ---------- */

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const k = e.key.toUpperCase();
  const letter = ['A', 'B', 'C', 'D', 'E'].includes(k) ? k
    : ({ '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E' })[k];

  if (currentView === 'practice') {
    if (letter) { practice.pick(letter); e.preventDefault(); }
    else if (e.key === 'Enter' || e.key === ' ') { practice.next(); e.preventDefault(); }
    else if (k === 'B') { practice.dontKnow(); e.preventDefault(); }
  } else if (currentView === 'exam' && exam.active()) {
    if (letter) { exam.pick(letter); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { exam.next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { exam.prev(); e.preventDefault(); }
  }
});

/* ---------- geri tuşu ---------- */

window.addEventListener('popstate', e => {
  show(e.state?.view || 'today', false);
});

window.addEventListener('beforeunload', e => {
  if (exam.active()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- Drive Bağlantı Ekranı (İlk Açılış / Mobil PWA) ---------- */

function renderDriveConnectScreen() {
  const host = $('#view-today');
  if (!host) return;

  host.innerHTML = `
    <div class="wrap" style="padding:2.5rem 1rem;max-width:540px;margin:0 auto">
      <div class="card" style="border-top:4px solid var(--accent);text-align:center;padding:2rem 1.5rem">
        <div style="font-size:2.8rem;margin-bottom:1rem">⚖️ ☁️</div>
        <h2 style="font-size:1.35rem;font-weight:800;color:var(--ink);margin-bottom:0.6rem">
          HMGS Stüdyo Kütüphanesi
        </h2>
        <p style="color:var(--ink-2);font-size:0.92rem;line-height:1.6;margin-bottom:1.5rem">
          Soru bankaları (<b>3.065 soru</b>) ve interaktif konu anlatımları (<b>124 konu</b>) telif ve gizlilik güvenliği için şahsi Google Drive kasanızda saklanır.
          <br><br>
          Aşağıdaki butona dokunarak kütüphaneyi telefonunuza bir kez indirin. İndirildikten sonra uygulama <b>%100 internetsiz (çevrimdışı)</b> çalışır.
        </p>

        <button class="btn" data-act="drive-connect-vault" style="width:100%;font-size:1rem;padding:0.9rem 1.2rem;justify-content:center;display:flex;align-items:center;gap:0.6rem;font-weight:700">
          <span>🔑</span> Google Drive ile Kütüphaneyi İndir
        </button>

        <div style="margin-top:1.5rem;padding-top:1.2rem;border-top:1px solid var(--line);font-size:0.8rem;color:var(--ink-3)">
          <span>Bağlı Hesap: Google Cloud Client Synced</span> · <span>Offline PWA Hazır</span>
        </div>
      </div>
    </div>
  `;
}

/* ---------- başlangıç ---------- */

async function boot() {
  window.__STUDIO_LOADED__ = true;
  try {
    load();
    const rep = await initDataAsync();

    const d = daysLeft();
    const cd = $('#countdown');
    if (cd) cd.innerHTML = `Sınava <b>${d} gün</b>`;

    if (rep.needAuth || rep.questions === 0) {
      renderDriveConnectScreen();
      return;
    }

    const initial = (location.hash || '#today').slice(1);
    show(VIEWS.includes(initial) ? initial : 'today', false);
    try { history.replaceState({ view: currentView }, '', '#' + currentView); } catch (e) {}

    // Veri sorunlarını sessizce geçme
    if (rep.brokenTopicIds > 0) console.warn(`[uyarı] ${rep.brokenTopicIds} soru var olmayan bir konuya işaret ediyor.`);
    if (rep.emptySubjects.length) console.warn('[uyarı] havuzu boş ders:', rep.emptySubjects.join(', '));
  } catch (err) {
    console.error('[studio] boot hatası:', err);
    const host = $('#view-today');
    if (host) {
      host.innerHTML = `<div class="wrap" style="padding:2rem 1rem"><div class="card" style="border-left:4px solid var(--no)">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;color:var(--no)">Başlatma Hatası</h3>
        <p style="color:var(--ink-2);font-size:0.9rem;margin-bottom:1rem">Uygulama başlatılırken hata oluştu: <code>${err.message}</code></p>
        <button class="btn" onclick="location.reload()">Yeniden Yükle</button>
      </div></div>`;
    }
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

