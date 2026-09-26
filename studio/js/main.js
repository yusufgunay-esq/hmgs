/* أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
   بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
   رَبِّ يَسِّرْ وَلَا تُعَسِّرْ رَبِّ تَمِّمْ بِالْخَيْرِ
   ==========================================================================
   main.js — ROUTER + TEK OLAY DİNLEYİCİ
   Inline onclick yok: tüm etkileşim document seviyesinde data-act ile yakalanır.
   Bu sayede yeniden render sonrası handler bağlamak gerekmez.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { $, $$, toast } from './ui.js';
import { initData, initDataAsync, populateData, topicById, questionById } from './data.js';
import { load, save, daysLeft, state, getSettings, updateSettings, importTakipExams, reconcilePastData } from './store.js';
import { requestDriveLoginAndDownload, clearVaultIndexedDB, syncStudioProgress, requestSilentToken, fetchVaultFromDrive } from './vault-client.js';
import { applySrsPolicy } from './engine.js';
import { kuralToggle } from './kural.js';


import * as today from './views/today.js';
import * as odevler from './views/odevler.js';
import * as practice from './views/practice.js';
import * as exam from './views/exam.js';
import * as flow from './views/flow.js';
import * as progress from './views/progress.js';
import * as pratik from './views/pratik.js';
import * as akim from './views/akim.js';
import * as notlar from './views/notlar.js';
import { rota, adimSorulari, kagitSorulari, konuSetSorulari } from './rota.js';


const VIEWS = ['today', 'odevler', 'flow', 'notlar', 'akim', 'practice', 'pratik', 'exam', 'progress'];
let currentView = 'today';
let lastAction = null;

/* ---------- tema ve yazı boyutu yönetimi ---------- */

export function applyTheme(theme) {
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0B0E14' : '#FAF9F6');

  const icon = $('#themeIcon');
  if (icon) {
    if (isDark) {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
  }
}

export function applyFontSize(fontSize) {
  if (fontSize === 'large') {
    document.documentElement.setAttribute('data-font-size', 'large');
  } else {
    document.documentElement.removeAttribute('data-font-size');
  }
}

try {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const s = getSettings();
    if (s.theme === 'system') applyTheme('system');
  });
} catch (e) {}

/* ---------- yönlendirme ---------- */

function show(view, push = true) {
  // Ödevler sekmesi 23 Eylül 2026'da kaldırıldı: ödevler artık Bugün
  // rotasında "Konu ödevi" adımı (rota.js konuOdevleri). Eski bağlantılar Bugün'e düşer.
  if (view === 'odevler') view = 'today';
  if (!VIEWS.includes(view)) view = 'today';

  // Sınav sürüyorsa kazayla çıkmayı engelle
  if (currentView === 'exam' && view !== 'exam' && exam.active()) {
    if (!confirm('Deneme sınavı sürüyor. Çıkarsan sonuç kaydedilmez. Çıkmak istiyor musun?')) return;
    exam.reset();
  }

  currentView = view;
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute('data-view', view);
    document.body.classList.toggle('view-practice', view === 'practice');
    document.body.classList.toggle('in-session',
      (view === 'practice' && practice.hasSession()) || (view === 'akim' && akim.hasSession()));
  }
  VIEWS.forEach(v => $('#view-' + v)?.classList.toggle('on', v === view));
  $$('.nav button').forEach(b => b.setAttribute('aria-current', String(b.dataset.view === view)));

  try {
    if (view === 'today') today.render();
    if (view === 'odevler') odevler.fetchTasks();
    if (view === 'flow') flow.render();
    if (view === 'akim') akim.render();
    if (view === 'practice') practice.render();
    if (view === 'pratik') pratik.render();
    if (view === 'exam') exam.render();
    if (view === 'progress') progress.render();
    if (view === 'notlar') notlar.render();
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

/**
 * Koçun döndürdüğü action nesnesini uygular.
 * 'karma' önerisi artık pratik'in sabit sayılı, kapanış ekranlı seansına değil
 * akış'ın kapanışsız kuyruğuna giriyor — stüdyo kullanıcıyı gerçekten flow'a
 * atmalı, sayfadan çıkmaya değil soru çözmeye devam etmeye yönlendirmeli
 * (18 Eylül 2026, kullanıcı talimatı). action nesnesinin şekli (view/mode/
 * count) engine.js testleriyle kilitli, burada yalnız yönlendirme değişiyor.
 */
function runAction(a) {
  if (!a) return;
  if (a.view === 'practice' && a.mode === 'karma') {
    if (akim.start({ scope: a.targetScope || 'core' })) show('akim');
    else show('today');
  } else if (a.view === 'practice') {
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
  // `:not(body)` ŞART: show() görünüm adını <body data-view="…"> üzerine de yazar
  // (CSS kancası). Bu nitelik seçiciye takılırsa, soru/çözüm ekranında etkileşimsiz
  // bir alana (açıklama metni, boşluk) yapılan HER tıklama closest() ile body'yi
  // bulur, show(aynı görünüm) → render() çalışır. practice.js render() içinde
  // S.answered=false ve S.qStart=performance.now() yaptığı için sonuç: cevap
  // silinir, soru geri gelir ve süre ölçümü sıfırlanır (exam.js'te E.qStart aynı).
  const el = e.target.closest('[data-act], [data-view]:not(body)');

  if (!el) return;

  if (el.dataset.view) { e.preventDefault(); show(el.dataset.view); return; }
  const act = el.dataset.act;
  if (!act) return;
  e.preventDefault();

  switch (act) {
    /* --- tema ve görünüm --- */
    case 'toggle-theme': {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      updateSettings({ theme: next });
      applyTheme(next);
      break;
    }
    case 'toggle-font-size': {
      const isLarge = document.documentElement.getAttribute('data-font-size') === 'large';
      const next = isLarge ? 'normal' : 'large';
      updateSettings({ fontSize: next });
      applyFontSize(next);
      break;
    }

    /* --- gezinme --- */
    case 'go-today':   show('today'); break;
    case 'go-exam':    show('exam'); break;
    case 'go-akim':    show('akim'); break;
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

      sessionOpts.tag = 'odev';   // Bugün rotası koç ödevini bununla sayar
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
    case 'start-deadlines':
      if (practice.startSession({ mode: 'deadlines', count: 20, customLabel: 'Süreler ve Parasal Sınırlar' })) show('practice');
      break;

    /* --- günün rotası (rota.js): bir adımı ya da sıradakini başlat --- */
    case 'rota-go': {
      const r = rota({ examActive: exam.active() });
      const adim = r.adimlar.find(a => a.id === el.dataset.step)
        || (el.dataset.step === 'akis' ? r.adimlar.find(a => a.tur === 'akis') : null);
      rotaBaslat(adim);
      break;
    }
    case 'rota-next': {
      const r = rota({ examActive: exam.active() });
      if (r.simdi && !r.kart) rotaBaslat(r.simdi);
      else show('today');
      break;
    }

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
    case 'practice-hmgs-benzeri':
      if (practice.startSession({ mode: 'hmgsBenzeri', count: 50, customLabel: 'HMGS Benzeri Sorular' })) show('practice');
      break;
    case 'practice-hmgs-benzeri-all':
      if (practice.startSession({ mode: 'hmgsBenzeri', count: 999, customLabel: 'HMGS Benzeri Tüm Havuz' })) show('practice');
      break;
    case 'start-hmgs-benzeri':
      if (practice.startSession({ mode: 'hmgsBenzeri', count: 20, customLabel: 'HMGS Benzeri Hızlı Pratik (20 Soru)' })) show('practice');
      break;
    case 'practice-pastexam':
      if (practice.startSession({ mode: 'pastExam', count: 999 })) show('practice');
      break;
    case 'practice-core-karma':
      if (akim.start({ scope: 'core', label: 'HMGS Çekirdek Karma' })) show('akim');
      break;
    case 'practice-all-karma':
      if (akim.start({ scope: 'all', label: 'Tüm Havuz Karma (İleri Dahil)' })) show('akim');
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

    /* --- kural köprüsü: yanlıştan interaktif kural alıştırmasına --- */
    case 'kural': {
      // Seans durumu korunur: render() ÇAĞRILMAZ, yalnız geri bildirim kartının
      // içine bir panel açılır. practice.js render()'ı S.answered/qStart'ı
      // sıfırladığı için burada render etmek cevabı silerdi.
      kuralToggle(el.dataset.topic, el.dataset.qid);
      break;
    }

    /* --- soru çözme --- */
    // Soru ekranının bahis şeridi (Akış ile aynı sözleşme): şık seç → güven
    // düğmesiyle kilitle. Bu iki eylem practice.js'te çiziliyordu ama burada
    // karşılığı yoktu; dokunmatik ekranda şıklara basmak hiçbir şey yapmıyordu.
    case 'practice-arm':  practice.arm(el.dataset.key); break;
    case 'practice-conf': practice.commit(el.dataset.conf); break;
    case 'pick':         practice.pick(el.dataset.key); break;
    case 'dontknow':     practice.dontKnow(); break;
    case 'ask-gemini':   practice.askGemini(); break;
    case 'next':            practice.next(); break;
    case 'next-logic':      practice.nextLogic(); break;
    case 'toggle-logic':    practice.toggleLogic(); break;
    case 'toggle-attention':practice.toggleAttention(); break;
    case 'quit':            practice.quit(); break;
    case 'again':        if (!practice.repeatSession()) show('today'); break;
    case 'push-session': practice.pushSession(); break;
    case 'copy-session-to-takip': practice.copySessionToClipboard(); break;
    // Seans/akış kapanışlarındaki ana buton: kapanmayan karma akışına geçer.
    // Sabit sayılı bir seans bitince bile devam yolu her zaman bu.
    case 'continue-flow': if (akim.start()) show('akim'); else show('today'); break;

    /* --- akış modu --- */
    case 'akim-start':         akim.startSecili(); break;
    case 'akim-ders':          akim.toggleDers(el.dataset.id); break;
    case 'akim-ders-hepsi':    akim.dersHepsi(); break;
    case 'akim-ders-temizle':  akim.dersTemizle(); break;
    case 'akim-ders-start':    if (akim.startDers(el.dataset.subject)) show('akim'); break;
    case 'akim-quit':          akim.quit(); break;
    case 'akim-pick':          akim.arm(el.dataset.key); break;
    case 'akim-conf':          akim.commit(el.dataset.conf); break;
    case 'akim-break':         akim.takeBreak(); break;
    case 'akim-dontknow':      akim.dontKnow(); break;
    case 'akim-next':          akim.next(); break;
    case 'akim-toggle-attention': akim.toggleAttention(); break;
    case 'akim-ask-gemini':    akim.askGemini(); break;

    /* --- şık / öncül eleme (pratik + sınav ortak) --- */
    case 'eliminate': {
      if (currentView === 'exam') exam.eliminateOption(el.dataset.key);
      else if (currentView === 'akim') akim.eliminateOption(el.dataset.key);
      else practice.eliminateOption(el.dataset.key);
      break;
    }
    case 'eliminate-premise': {
      if (currentView === 'exam') exam.eliminatePremise(el.dataset.numeral);
      else if (currentView === 'akim') akim.eliminatePremise(el.dataset.numeral);
      else practice.eliminatePremise(el.dataset.numeral);
      break;
    }

    /* --- sınav --- */
    case 'exam-start-smart': exam.startSmart(); break;
    case 'exam-start-real': exam.startReal(el.dataset.source); break;
    case 'exam-start-deneme':
    case 'exam-start-yekti': if (exam.startDenemeSet(el.dataset.source)) show('exam'); break;
    case 'exam-pick':   exam.pick(el.dataset.key); break;
    case 'exam-clear':  exam.clear(); break;
    case 'exam-mark':   exam.mark(); break;
    case 'exam-next-blank': exam.nextBlank(); break;
    case 'exam-goto':   exam.goto(Number(el.dataset.i)); break;
    case 'exam-prev':   exam.prev(); break;
    case 'exam-next':   exam.next(); break;
    case 'exam-finish': exam.finish(false); break;
    case 'exam-export-stats': exam.exportStats(); break;
    case 'exam-filter': exam.setFilter(el.dataset.f); break;
    case 'exam-open-review': {
      const examId = el.dataset.examId;
      exam.openReview(examId);
      show('exam');
      break;
    }
    case 'exam-back': exam.backToList(); break;
    case 'rv-goto': exam.rvGoto(Number(el.dataset.no)); break;
    case 'rv-prev': exam.rvPrev(); break;
    case 'rv-next': exam.rvNext(); break;
    case 'rv-analyze': exam.rvAnalyze(); break;
    case 'rv-toggle-attention': exam.rvToggleAttention(); break;
    case 'exam-review-wrong': {
      const examId = el.dataset.examId;
      const qs = exam.getRepeatQuestionsForExam(examId);
      if (!qs.length) {
        toast('Bu denemede tekrar edilecek soru bulunamadı.');
        break;
      }
      const ex = examId ? exam.getExamById(examId) : exam.activeResult();
      const examTitle = ex ? (ex.label || 'Deneme') : 'Deneme';
      const dateStr = ex && ex.at ? new Date(ex.at).toLocaleDateString('tr-TR') : '';
      const customLabel = `Deneme Tekrarı · ${examTitle}${dateStr ? ' (' + dateStr + ')' : ''} · ${qs.length} soru`;
      const ok = practice.startSession({ questions: qs, customLabel });
      if (ok) {
        show('practice');
        break;
      }
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
      btn.innerHTML = 'Eşitleniyor...';
      btn.disabled = true;
      try {
        const vault = await requestDriveLoginAndDownload();
        populateData(vault);
        const pSync = await syncStudioProgress(false);
        toast(pSync ? 'Kütüphane ve ilerleme eşitlendi ✓' : 'Kütüphane güncellendi ✓', 'ok');
        const initial = (location.hash || '#today').slice(1);
        show(VIEWS.includes(initial) ? initial : 'today', false);
      } catch (err) {

        console.error('[vault sync error]', err);
        toast(`Bağlantı hatası: ${err.message}`, 'no');
        btn.innerHTML = oldText;
        btn.disabled = false;
      }
      break;
    }

    case 'clear-vault-cache': {
      if (confirm('Kayıtlı kütüphane silinecek. Tekrar eşitlemeniz gerekecek.\n\nEmin misiniz?')) {
        await clearVaultIndexedDB();
        toast('Önbellek temizlendi.');
        location.reload();
      }
      break;
    }

    /* BUG (17 Eyl 2026): loadMasterVault() bir kez IndexedDB'ye kasa
       yazdıktan sonra Drive'daki güncel sürümü BİR DAHA HİÇ KONTROL ETMİYOR —
       "sync-vault" eylemini tetikleyecek görünür bir buton da (ilk açılış
       ekranı dışında) hiçbir yerde yoktu. Sonuç: PC'de yeni soru ekleyip
       kasayı Drive'a gönderseniz bile, zaten bir kez eşitlenmiş her cihaz
       (telefon/tarayıcı) o günkü eski kopyada sonsuza kadar takılı kalıyordu.
       Düzeltme: üst çubuğa her zaman erişilebilir küçük bir "Kütüphaneyi
       Yenile" butonu eklendi (bkz. studio.html) — mevcut sync-vault
       mantığını simge butonuna uyacak şekilde (metne dönüştürmeden) çağırır. */
    case 'sync-vault-quiet': {
      const btn = el;
      btn.disabled = true;
      btn.style.opacity = '0.45';
      try {
        const vault = await requestDriveLoginAndDownload();
        populateData(vault);
        const pSync = await syncStudioProgress(false);
        toast(pSync ? 'Kütüphane ve ilerleme eşitlendi ✓' : 'Kütüphane güncellendi ✓', 'ok');
        const initial = (location.hash || '#today').slice(1);
        show(VIEWS.includes(initial) ? initial : 'today', false);
      } catch (err) {
        console.error('[vault sync error]', err);
        toast(`Bağlantı hatası: ${err.message}`, 'no');
      } finally {
        btn.disabled = false;
        btn.style.opacity = '';
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
    if (k === 'G') { practice.askGemini(); e.preventDefault(); return; }
    if (k === 'K' && practice.isAnswered()) {
      const btn = document.querySelector('#view-practice [data-act="kural"]');
      if (btn) { kuralToggle(btn.dataset.topic, btn.dataset.qid); e.preventDefault(); }
      return;
    }
    if (practice.isAnswered()) {
      if (e.key === 'Enter' || e.key === ' ') { practice.next(); e.preventDefault(); }
      else if (k === 'M') { practice.nextLogic(); e.preventDefault(); }
    } else {
      // Akış ile aynı: şık seçiliyse 1-2-3 bahis (Enter = Sanırım), değilse 1-5 şık.
      const conf = practice.isArmed() ? ({ '1': 'sure', '2': 'think', '3': 'guess' })[e.key] : null;
      if (conf) { practice.commit(conf); e.preventDefault(); }
      else if (practice.isArmed() && e.key === 'Enter') { practice.commit('think'); e.preventDefault(); }
      else if (letter) { practice.arm(letter); e.preventDefault(); }
    }
  } else if (currentView === 'akim' && akim.hasSession()) {
    if (e.key === 'Escape') { akim.quit(); e.preventDefault(); return; }
    if (k === 'G') { akim.askGemini(); e.preventDefault(); return; }
    if (k === 'K' && akim.isAnswered()) {
      const btn = document.querySelector('#view-akim [data-act="kural"]');
      if (btn) { kuralToggle(btn.dataset.topic, btn.dataset.qid); e.preventDefault(); }
      return;
    }
    if (akim.isAnswered()) {
      // M (mantık) kısayolu 20 Eylül 2026'da kaldırıldı: karar artık cevaptan
      // ÖNCE, bahis şeridinde veriliyor (3 = Mantıkla).
      if (e.key === 'Enter' || e.key === ' ') { akim.next(); e.preventDefault(); }
    } else {
      // Şık seçildiyse 1-2-3 bahistir (Enter = Sanırım); seçilmediyse 1-5 şıktır.
      const conf = akim.isArmed() ? ({ '1': 'sure', '2': 'think', '3': 'guess' })[e.key] : null;
      if (conf) { akim.commit(conf); e.preventDefault(); }
      else if (akim.isArmed() && e.key === 'Enter') { akim.commit('think'); e.preventDefault(); }
      else if (letter) { akim.arm(letter); e.preventDefault(); }
    }
  } else if (currentView === 'exam' && exam.active()) {
    // K: bu soruda kuşkum var. Hem soru haritasında işaretli kalır hem de
    // sonuç ekranında cevabı "kuşkulu" kovasına yazar.
    if (k === 'K') { exam.mark(); e.preventDefault(); return; }
    if (letter) { exam.pick(letter); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { exam.next(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { exam.prev(); e.preventDefault(); }
  } else if (currentView === 'exam' && exam.reviewing()) {
    // Çözüm ekranı: oklar soru değiştirir, G analiz istemini kopyalar, D dikkat hatasını işaretler.
    if (e.key === 'ArrowRight') { exam.rvNext(); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { exam.rvPrev(); e.preventDefault(); }
    else if (k === 'G') { exam.rvAnalyze(); e.preventDefault(); }
    else if (k === 'D') { exam.rvToggleAttention(); e.preventDefault(); }
  }
});

/* ---------- geri tuşu ---------- */

window.addEventListener('popstate', e => {
  show(e.state?.view || 'today', false);
});

window.addEventListener('beforeunload', e => {
  if (exam.active()) { e.preventDefault(); e.returnValue = ''; }
});

/* ---------- Kütüphane Eşitleme Ekranı (İlk Açılış) ---------- */

function renderDriveConnectScreen() {
  const host = $('#view-today');
  if (!host) return;

  host.innerHTML = `
    <div class="wrap" style="padding:4rem 1rem;max-width:380px;margin:0 auto">
      <div class="card" style="text-align:center;padding:2.5rem 1.5rem">
        <div style="display:flex;justify-content:center;margin-bottom:1rem">
          <div style="width:48px;height:48px;border-radius:12px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center">
            <svg style="width:24px;height:24px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
            </svg>
          </div>
        </div>
        <h2 style="font-size:1.25rem;font-weight:700;color:var(--ink);margin-bottom:0.5rem">
          HMGS Stüdyo
        </h2>
        <p style="color:var(--ink-2);font-size:0.9rem;line-height:1.5;margin-bottom:1.75rem">
          Çalışmaya başlamak için kütüphanenizi eşitleyin.
        </p>

        <button class="btn" data-act="drive-connect-vault" style="width:100%;font-size:0.95rem;padding:0.8rem 1.2rem;justify-content:center;display:flex;align-items:center;gap:0.5rem;font-weight:600">
          Kütüphaneyi Eşitle
        </button>
      </div>
    </div>
  `;
}


/* ---------- Takip Uygulaması Deneme Köprüsü ---------- */

async function syncTakipExams() {
  if (typeof window === 'undefined') return;
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    let exams = [];
    if (isLocal) {
      try {
        const res = await fetch('/api/takip-denemeler');
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.exams)) exams = data.exams;
        }
      } catch (err) {}
    }
    if (!exams.length) {
      try {
        const resExp = await fetch('studio_sessions_export.json');
        if (resExp.ok) {
          const dataExp = await resExp.json();
          if (Array.isArray(dataExp.exams)) exams = dataExp.exams;
        }
      } catch (err) {}
    }
    if (exams.length) {
      const changed = importTakipExams(exams);
      if (changed) {
        if (currentView === 'today') today.render();
        else if (currentView === 'progress') progress.render($('#view-progress'));
      }
    }
  } catch (e) {
    // sessiz geçiş
  }
}


/* ---------- günün rotası: adım başlatıcı ----------
   Karar rota.js'te; burası yalnız adımı doğru seansa çevirir. Adım ne kadar
   kaldıysa seans o kadar soruyla açılır, cevaplar `set` etiketiyle kaydolur ve
   Bugün ekranı ilerlemeyi oradan sayar. */
function rotaBaslat(adim) {
  if (!adim) { show('today'); return; }
  const kalan = Math.max(1, (adim.plan || 0) - (adim.yapilan || 0));
  const L = adim.launch || {};
  let ok = false;
  switch (L.tur) {
    case 'hap':
      notlar.openHap();
      show('notlar');
      return;
    case 'deneme-devam':
    case 'deneme-sayfa':
      show('exam'); return;
    case 'deneme': {
      const sec = L.secim || {};
      ok = sec.kind === 'real' ? exam.startReal(sec.source)
        : sec.kind === 'set' ? exam.startQuestions(kagitSorulari(sec.source), sec.label, sec.source)
          : sec.kind === 'ai' ? exam.startAi()
            : exam.start();
      if (ok !== false) show('exam');
      return;
    }
    case 'srs':
      ok = practice.startSession({ mode: 'review', count: kalan, tag: 'srs' });
      break;
    case 'tekrar': {
      const qs = adimSorulari('tekrar').slice(0, 30);
      if (!qs.length) { toast('Denemenin bütün yanlışlarını zaten çözdün.'); today.render(); return; }
      ok = practice.startSession({ questions: qs, customLabel: `Deneme tekrarı · ${qs.length} soru`, tag: 'tekrar' });
      break;
    }
    case 'sure':
      ok = practice.startSession({ mode: 'deadlines', count: kalan, customLabel: 'Süreler ve sayılar', tag: 'sure' });
      break;
    case 'inatci': {
      const qs = adimSorulari('inatci').slice(0, kalan);
      ok = practice.startSession({ questions: qs, customLabel: `İnatçı sorular · ${qs.length}`, tag: 'inatci' });
      break;
    }
    case 'odev':
      ok = practice.startSession({ mode: 'topic', topicId: L.topicId, count: kalan, tag: 'odev' });
      break;
    case 'konu': {
      // Konu onarımı: önce kardeş sorular (kuralı kur), sonra yanlışlar (sına).
      const qs = konuSetSorulari(L.key);
      if (!qs.length) { toast('Bu konunun bugünlük onarımı bitti.'); today.render(); return; }
      ok = practice.startSession({ questions: qs, customLabel: `Konu onarımı · ${adim.baslik}`, tag: 'konu:' + L.key });
      break;
    }
    case 'akis':
      if (akim.start({ label: 'Günün akışı', hedef: adim.plan ? kalan : 0 })) show('akim');
      return;
    default:
      show('today'); return;
  }
  if (ok) show('practice');
}

/* ---------- başlangıç ---------- */

async function boot() {
  window.__STUDIO_LOADED__ = true;
  console.log('%c© 2026 Yusuf GÜNAY — Tüm hakları saklıdır. İzinsiz kullanım ve kopyalama yasaktır.', 'font-weight:600;color:#6f7ce6');
  try {
    load();
    const curSettings = getSettings();
    applyTheme(curSettings.theme || 'system');
    applyFontSize(curSettings.fontSize || 'normal');

    const rep = await initDataAsync();

    // Veritabanindaki soru ve cevap anahtari duzeltmelerini gecmis verilere geriye donuk uygula
    try {
      reconcilePastData(questionById);
    } catch (e) {
      console.warn('[reconcile]', e);
    }

    const d = daysLeft();
    const cd = $('#countdown');
    if (cd) cd.innerHTML = d > 0 ? `Sınava <b>${d} gün</b>` : '<b>Sınav günü</b>';

    if (rep.needAuth || rep.questions === 0) {
      renderDriveConnectScreen();
      return;
    }

    // Tekrar politikası v2 (19 Eylül 2026): eski Leitner kayıtlarını yalnız
    // mezun eder/bırakır, kuyruğa soru eklemez. Soru katmanını bildiği için
    // veri yüklendikten SONRA çalışır; Drive birleştirmesinden sonra tekrar.
    try { if (applySrsPolicy() > 0) save(); } catch (e) { console.warn('[srs politika]', e); }

    const initial = (location.hash || '#today').slice(1);
    show(VIEWS.includes(initial) ? initial : 'today', false);
    try { history.replaceState({ view: currentView }, '', '#' + currentView); } catch (e) {}

    // Arka planda Drive'daki güncel ilerlemeyi sessizce birleştir
    syncStudioProgress(false).then(res => {
      if (res) {
        try { reconcilePastData(questionById); } catch (e) {}
        try { if (applySrsPolicy() > 0) save(); } catch (e) {}
      }
      if (res && currentView === 'progress') progress.render($('#view-progress'));
      if (res && currentView === 'exam') exam.render();
    }).catch(() => {});

    // Oturum açıksa kütüphaneyi de arka planda sessizce kontrol et ve güncelle
    requestSilentToken().then(token => {
      if (token) {
        fetchVaultFromDrive(token).then(v => {
          if (v && Array.isArray(v.questions) && v.questions.length >= (questionById.size || 0)) {
            populateData(v);
            try { reconcilePastData(questionById); } catch (e) {}
            if (currentView === 'exam') exam.render();
          }
        }).catch(() => {});
      }
    }).catch(() => {});

    // Takip Uygulamasından gelen denemeleri içeri aktar
    syncTakipExams().catch(() => {});


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

