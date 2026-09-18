/* ==========================================================================
   views/today.js — BUGÜN: TEK KARAR EKRANI
   Kullanıcı bu ekranda ne çalışacağına karar vermez; koç karar verir ve
   gerekçesini söyler. Seçenekler ikincil kalır.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, $, pct } from '../ui.js';
import { subjectName, topicById, aiQuestions, pastExamQuestions } from '../data.js';
import { daysLeft, streak, lastExam, PASS_CORRECT, state, getDailyPlan } from '../store.js';
import { nextAction, todayProgress, srsSummary, allSubjectMastery,
  MASTERY_LABEL, bleedingTopics, bleedingTags, dueQuestions,
  examGap, worstExamSubjects, answerQualitySignals } from '../engine.js';
import { bugun as planBugun, planDurumu } from '../pregel.js';

/** Koç planı bugün için bir kez tazelenir — her render'da ağ isteği yok. */
let planRefreshed = false;

export function render() {
  const host = $('#view-today');
  if (!host) return;

  // Bugünün planı elde varsa ağa çıkma; yoksa arkada bir kez çek. Çekim
  // bitince odevler.js Bugün'ü yeniden çizer, sayı yerine oturur.
  if (!planRefreshed && !getDailyPlan()) {
    planRefreshed = true;
    import('./odevler.js')
      .then(m => m.fetchTasks())
      .catch(() => {});
  }

  const act = nextAction();
  const prog = todayProgress();
  const srs = srsSummary();
  const d = daysLeft();
  const st = streak();
  const ex = lastExam();
  const due = dueQuestions();
  const dueBySubject = groupDue(due);
  const nextDue = nextDueDate();
  const bleeding = bleedingTopics(5);
  const bleedingT = bleedingTags(6);
  const mastery = allSubjectMastery().filter(s => s.pool > 0);

  const auto = mastery.filter(s => s.mastery.state === 'auto').length;
  const effort = mastery.filter(s => s.mastery.state === 'effort').length;
  const untouched = mastery.filter(s => s.mastery.state === 'none').length;

  // Deneme teşhisi — ham veriden, bayat /api/profil'e bağlı değil.
  const gap = examGap();
  const worst = worstExamSubjects(5);
  const sig = answerQualitySignals();

  const aiCount = aiQuestions().length;
  const realCount = pastExamQuestions().length;

  host.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <div class="hero-kicker">Sırada bu var</div>
        <div class="hero-title">${esc(act.title)}</div>
        <p class="hero-why">${esc(act.why)}</p>
        <div class="hero-actions">
          <div class="hero-main-cta">
            <button class="btn" data-act="do-next">${esc(act.cta)}</button>
          </div>
          <div class="hero-alts">
            <span class="hero-alts-label">Alternatifler:</span>
            ${act.alts.map((a, i) => `<button class="btn btn-2 btn-s" data-act="do-alt" data-alt="${i}">${esc(a.label)}</button>`).join('')}
            <button class="btn btn-2 btn-s" data-act="start-hmgs-benzeri" title="3.8 Flash ve Sonnet tarafından üretilen ${aiCount} HMGS benzeri soru">HMGS Benzeri (${aiCount})</button>
            <button class="btn btn-2 btn-s" data-act="start-deadlines" title="Sınavın yaklaşık %12'si olan süre ve parasal sınır soruları (20 Soru)">Süreler ve Sayılar (20)</button>
          </div>
        </div>
      </div>

      ${pregelHTML()}

      <div class="card" style="margin-top:1.25rem;border-left:3px solid var(--ok)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem">
          <div>
            <h3 style="font-size:1rem;font-weight:700;margin:0">HMGS Gerçek Çıkmış Sorular</h3>
            <p style="font-size:0.85rem;color:var(--ink-2);margin:0.2rem 0 0">
              Önceki HMGS sınavlarından çıkmış ${realCount} gerçek soru, orijinal kaynağıyla.
            </p>
          </div>
          <span class="chip" style="font-size:0.75rem">${realCount} Soru</span>
        </div>
        <div class="btn-row" style="margin-top:0.85rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-s" data-act="practice-pastexam" style="background:var(--ok);color:#fff">Çıkmış Soruları Çöz (${realCount})</button>
        </div>
      </div>

      <div class="card" style="margin-top:1.25rem;border-left:3px solid var(--accent)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem;flex-wrap:wrap;gap:0.5rem">
          <div>
            <h3 style="font-size:1rem;font-weight:700;margin:0">HMGS Benzeri Soru İstasyonu</h3>
            <p style="font-size:0.85rem;color:var(--ink-2);margin:0.2rem 0 0">
              3.8 Flash ve Sonnet ile üretilmiş ${aiCount} özgün soru, ÖSYM soru kalıpları ve güncel mevzuat denetimi.
            </p>
          </div>
          <span class="chip accent" style="font-size:0.75rem">${aiCount} Soru Hazır</span>
        </div>
        <div class="btn-row" style="margin-top:0.85rem;display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-s" data-act="start-hmgs-benzeri" style="background:var(--accent);color:#fff">Hızlı Pratik (20 Soru)</button>
          <button class="btn btn-2 btn-s" data-act="practice-hmgs-benzeri-all">Tüm Havuz (${aiCount} Soru)</button>
          <button class="btn btn-2 btn-s" data-act="exam-start-ai">Tam Deneme Sınavı (120 Soru)</button>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:1.25rem">
        <div class="metric">
          <div class="metric-k">Sınava kalan</div>
          <div class="metric-v">${d}<span style="font-size:0.85rem;font-weight:600"> gün</span></div>
          <div class="metric-n">27 Eylül 2026 · 2026-HMGS/2</div>
        </div>
        <div class="metric">
          <div class="metric-k">Bugünkü hedef</div>
          <div class="metric-v">${prog.solved}<span style="font-size:0.85rem;font-weight:600;color:var(--ink-3)"> / ${prog.target}</span></div>
          <div class="track"><i style="width:${prog.pct}%"></i></div>
          <div class="metric-n">${prog.solved ? `${prog.correct} doğru · ${pct(prog.solved ? (prog.correct / prog.solved) * 100 : 0)}` : 'henüz başlamadın'}</div>
          <div class="metric-n">${hedefNotu(prog)}</div>
        </div>
        <div class="metric">
          <div class="metric-k">Son deneme neti</div>
          <div class="metric-v" style="${ex ? (ex.pass ? 'color:var(--ok)' : 'color:var(--no)') : 'color:var(--ink-3)'}">${ex ? ex.net : '–'}</div>
          <div class="track ${ex && ex.pass ? 'ok' : 'no'}"><i style="width:${ex ? Math.min(100, (ex.correct / PASS_CORRECT) * 100) : 0}%"></i></div>
          <div class="metric-n">${ex ? `baraj ${PASS_CORRECT} net · ${new Date(ex.at).toLocaleDateString('tr-TR')}` : 'henüz deneme çözülmedi'}</div>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:1rem">
        <div class="metric">
          <div class="metric-k">Yanlışlarım · tekrar sırası</div>
          <div class="metric-v" style="${srs.due ? 'color:var(--warn)' : ''}">${srs.due}</div>
          <div class="metric-n">${srs.tracked} soru takipte · ${srs.graduated} mezun${srs.struggling ? ` · ${srs.struggling} inatçı` : ''}</div>
          ${srs.due
            ? `<button class="btn btn-s" style="margin-top:0.5rem;width:100%"
                 data-act="review-due" data-count="${Math.min(srs.due, 20)}">Yanlışlarımı çöz (${Math.min(srs.due, 20)})</button>`
            : (srs.tracked
                ? `<div class="metric-n" style="margin-top:0.4rem">${nextDue ? `en yakın vade ${nextDue}` : 'hepsi mezun oldu'}</div>`
                : `<div class="metric-n" style="margin-top:0.4rem">henüz yanlış kaydı yok</div>`)}
        </div>
        <div class="metric">
          <div class="metric-k">Otomatikleşen ders</div>
          <div class="metric-v" style="color:var(--ok)">${auto}<span style="font-size:0.85rem;font-weight:600;color:var(--ink-3)"> / ${mastery.length}</span></div>
          <div class="metric-n">${effort} eforlu · ${untouched} hiç çözülmedi</div>
        </div>
        <div class="metric">
          <div class="metric-k">Çalışma serisi</div>
          <div class="metric-v">${st}<span style="font-size:0.85rem;font-weight:600"> gün</span></div>
          <div class="metric-n">${st >= 3 ? 'seriyi bozma' : 'seri kurmaya başla'}</div>
        </div>
      </div>

      ${diagnosisHTML(gap, worst, sig)}

      ${due.length ? `
        <div class="section-label">Yanlışlarım · vadesi gelenler (Leitner 1-3-7-14-30)</div>
        ${dueBySubject.map(g => `
          <div class="subj">
            <div>
              <div class="subj-name">${esc(g.name)}</div>
              <div class="subj-meta">${g.n} soru vadesinde${g.stuck ? ` · ${g.stuck} tanesine 2+ kez takıldın` : ''}</div>
            </div>
            <div class="subj-right">
              <span class="chip amber">${g.n}</span>
              <button class="btn btn-2 btn-s" data-act="review-subject"
                data-subject="${esc(g.id)}" data-count="${Math.min(g.n, 20)}">Çöz</button>
            </div>
          </div>`).join('')}
        <div class="btn-row" style="margin-top:0.6rem">
          <button class="btn" data-act="review-due" data-count="${Math.min(due.length, 20)}">
            Hepsini karışık çöz (${Math.min(due.length, 20)} soru)</button>
        </div>` : ''}

      ${bleeding.length ? `
        <div class="section-label">Kanayan konular · en çok hata yaptıkların</div>
        ${bleeding.map(b => `
          <div class="subj">
            <div>
              <div class="subj-name">${esc(b.topic.title.replace(/^\s*\d+\.\s*/, ''))}</div>
              <div class="subj-meta">${esc(subjectName(b.topic.subjectId))} · ${b.wrong}/${b.n} yanlış</div>
            </div>
            <div class="subj-right">
              <span class="chip red">%${Math.round(b.rate * 100)} hata</span>
              <button class="btn btn-2 btn-s" data-act="go-flow-topic" data-topic="${esc(b.topicId)}">Konuyu oku</button>
            </div>
          </div>`).join('')}` : ''}

      ${bleedingT.length ? `
        <div class="section-label">Zorlandığın etiketler · statik zorluk değil, senin verinden</div>
        ${bleedingT.map(b => `
          <div class="subj">
            <div>
              <div class="subj-name">${esc(b.tag)}</div>
              <div class="subj-meta">${b.wrong}/${b.n} yanlış</div>
            </div>
            <div class="subj-right">
              <span class="chip amber">%${Math.round(b.rate * 100)} hata</span>
            </div>
          </div>`).join('')}` : ''}

      <div class="section-label">Dersler · otomatikleşme durumu</div>
      ${renderSubjects(mastery)}
    </div>`;
}

/**
 * Hedefin nereden geldiğini yazar. Sessiz kalmak yanlış olurdu: ekranda
 * "0 / 50" görüp koçun 200 soru taahhüdünü hatırlayan kullanıcı hangisinin
 * doğru olduğunu bilemez. Sayıyı gösterdiğimiz gibi kaynağını da söylüyoruz.
 */
/**
 * 11 GÜNLÜK PLAN KARTI — "bugün ne yapacağım" sorusunun tek cevabı.
 *
 * Kaynak: SINAV_ALGORITMASI.md (238 gerçek ÖSYM sorusundan ölçüldü).
 * Bloklar DONMUŞ DEĞİL: ders önceliği engine.karmaWeights()'ten (sınav ağırlığı ×
 * kapsam açığı × isabet açığı), konu önceliği engine.bleedingTopics()'ten (senin
 * gerçek hataların) türetilir. Yani cevap verdikçe plan kendini günceller.
 *
 * Uydurma sayı yok: hedef = kalan iş ÷ kalan gün. Pazar günü tam deneme.
 */
function pregelHTML() {
  const p = planBugun();
  const d = planDurumu();

  if (p.bitti) {
    return `<div class="card" style="margin-top:1.25rem;border-left:3px solid var(--ok)">
      <div class="metric-k">11 günlük plan</div>
      <p class="hint" style="margin:0.4rem 0 0">Sınav geçti. Plan kapandı.</p></div>`;
  }

  const baslik = p.gun ? `${p.gun}. gün / 11` : 'Plan penceresi dışında';
  const durum = p.denemeGunu
    ? '<span class="chip accent">deneme günü</span>'
    : p.kapanis
      ? '<span class="chip amber">kapanış · yeni konu yok</span>'
      : '';

  const bloklar = p.bloklar.length
    ? p.bloklar.map(b => `
        <div class="subj">
          <div>
            <div class="subj-name">${esc(b.name)}</div>
            <div class="subj-meta">sınavda ${b.examQ} soru · bugün ~${b.soru} soru${
              b.thin ? ' · <span style="color:var(--warn)">havuz ince, kâğıttan da çalış</span>' : ''}</div>
            ${b.neden ? `<div class="subj-meta" style="color:var(--warn)">${esc(b.neden)}</div>` : ''}
            ${b.konular.length ? `<div class="chip-row" style="margin-top:0.35rem">${
              b.konular.map(k => `<button class="chip" data-act="go-flow-topic" data-topic="${esc(k.topicId)}"
                title="${esc(k.title)} · ${k.n} çözüm, %${Math.round(k.rate * 100)} hata">${
                esc(String(k.title).replace(/^\s*\d+\.\s*/, '').slice(0, 42))}</button>`).join('')
            }</div>` : ''}
          </div>
          <div class="subj-right">
            <button class="btn btn-2 btn-s" data-act="go-flow-topic" data-topic="${
              b.konular.length ? esc(b.konular[0].topicId) : ''}">${b.konular.length ? 'Konuyu oku' : '—'}</button>
            <button class="btn btn-s" data-act="practice-subject" data-subject="${esc(b.subjectId)}">Çöz</button>
          </div>
        </div>`).join('')
    : '<p class="hint" style="margin:0">Bugün için önerilen ders yok — havuza bak, koç önerisini izle.</p>';

  return `
    <div class="section-label" style="margin-top:1.5rem">Bugünün planı · ${esc(baslik)} ${durum}</div>
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:baseline;gap:0.75rem;flex-wrap:wrap">
        <div style="font-size:1.15rem;font-weight:700">${p.hedef} soru</div>
        <div class="hint" style="margin:0">bugün çözülen <b>${p.cozulen}</b> · sınava ${p.kalan} gün</div>
        <div class="hint" style="margin:0;margin-left:auto">plan toplamı ${d.cozulen} / ${d.toplamHedef} (%${d.yuzde})</div>
      </div>
      <div class="track no" style="margin:0.6rem 0 0"><i style="width:${Math.min(100, p.hedef ? (p.cozulen / p.hedef) * 100 : 0)}%"></i></div>
      ${p.denemeGunu
        ? `<div class="trap" style="margin-top:0.85rem"><div class="lbl">Bugün deneme günü</div>
             <p>120 soru · 155 dakika · sabah 10:15'te başla, boş bırakmadan. Deneme bitince net
             ve ders kırılımı ölçülür; bütün tahminler o gün gerçek sayıya döner.</p>
             <div class="btn-row" style="margin-top:0.6rem">
               <button class="btn btn-s" data-act="go-exam">Denemeye git</button></div></div>`
        : `<div class="btn-row" style="margin-top:0.85rem">
             <button class="btn btn-s" data-act="pregel-set" data-count="${p.hedef}">Bugünkü akışı başlat (~${p.hedef} soru)</button>
           </div>`}
      <div style="margin-top:1rem">${bloklar}</div>
    </div>`;
}

function hedefNotu(prog) {
  if (prog.targetSource === 'plan' && prog.plan) {
    const okuma = prog.plan.readingTasks;
    return `Koç planı: ${prog.plan.quizTasks} test görevi`
      + (okuma ? ` · ${okuma} okuma görevi (Stüdyo dışı)` : '')
      + ' · kağıtta çözülenler bu sayıya girmez';
  }
  return `Koç planı bugün yüklenmedi · Stüdyo tabanı ${prog.target}`
    + ' · kağıtta çözülenler bu sayıya girmez';
}

/**
 * Deneme teşhisi bloğu. Yalnızca deneme varsa çizilir. Sayılar net cinsindendir
 * ("31 net açık", "HMK −6 net") — süs değil, sınav puanına doğrudan etki.
 */
function diagnosisHTML(gap, worst, sig) {
  if (!gap) return '';
  const fastWrong = sig && sig.n >= 20 && sig.fastWrongRate >= 0.15;
  return `
    <div class="section-label">Deneme teşhisi · son ${new Date(gap.at).toLocaleDateString('tr-TR')}</div>
    <div class="card" style="margin-bottom:1rem">
      <div style="display:flex;align-items:baseline;gap:0.75rem;flex-wrap:wrap">
        <div style="font-size:1.15rem;font-weight:700;color:${gap.gap > 0 ? 'var(--no)' : 'var(--ok)'}">${gap.net} net</div>
        <div class="hint" style="margin:0">${gap.gap > 0
          ? `84 net için <b style="color:var(--no)">${gap.gap} net açık</b>`
          : 'Barajın üstünde — güvenlik payını büyüt'}</div>
        ${gap.pace ? `<span class="chip">~${gap.pace} sn/soru</span>` : ''}
      </div>
      ${fastWrong ? `
        <div class="trap" style="margin-top:0.85rem">
          <div class="lbl">Hızlı + yanlış</div>
          <p>${sig.n} cevabın ${sig.fastWrongN} tanesi hedef sürenin altında verilip yanlış çıkmış (%${Math.round(sig.fastWrongRate * 100)}).
          Bu "bilmediğini bilmeme" sinyalidir: soru kökünü okumadan tahmin etmek. 75 saniyeye kadar bütçen var — yavaşla, önce kökü ve "hangisi değildir" tuzağını gör.</p>
        </div>` : ''}
      ${worst.length ? `
        <div style="margin-top:0.9rem;display:flex;flex-direction:column;gap:0.55rem">
          ${worst.map(x => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem">
              <div style="min-width:0">
                <div style="font-size:0.9rem;font-weight:600">${esc(x.name)}</div>
                <div class="hint" style="margin:0">sınavda ${x.examQ} soru · isabet %${Math.round(x.acc * 100)}${x.blank ? ` · ${x.blank} boş` : ''}</div>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;flex-shrink:0">
                <span class="chip red">−${Math.round(x.leak * 10) / 10} net</span>
                <button class="btn btn-2 btn-s" data-act="practice-subject" data-subject="${esc(x.id)}">Çöz</button>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

/** Vadesi gelen tekrarları ders bazında topla — en çok bekleyen üstte. */
function groupDue(due) {
  const by = {};
  due.forEach(d => {
    const id = d.q.subjectId || '—';
    by[id] = by[id] || { id, name: subjectName(id) || id, n: 0, stuck: 0 };
    by[id].n++;
    if ((d.srs.lapses || 0) >= 2) by[id].stuck++;
  });
  return Object.values(by).sort((a, b) => b.n - a.n);
}

/** Vadesi gelen yoksa: bir sonraki vade ne zaman. */
function nextDueDate() {
  const rows = Object.values(state().srs || {})
    .map(r => r.dueAt).filter(Boolean).map(x => new Date(x))
    .filter(d => d > new Date()).sort((a, b) => a - b);
  if (!rows.length) return null;
  try { return rows[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }); }
  catch (e) { return rows[0].toISOString().slice(0, 10); }
}

function renderSubjects(rows) {
  const order = { effort: 0, aware: 1, thin: 2, none: 3, auto: 4 };
  const sorted = rows.slice().sort((a, b) =>
    (order[a.mastery.state] - order[b.mastery.state]) || (b.examQ - a.examQ));

  return sorted.map(s => {
    const m = s.mastery;
    const lab = MASTERY_LABEL[m.state];
    const accTxt = m.n ? `%${Math.round(m.acc * 100)} · ${Math.round(m.medianSec)} sn` : 'veri yok';
    return `<div class="subj">
      <div>
        <div class="subj-name"><span class="dot ${lab.dot}" style="display:inline-block;margin-right:0.45rem"></span>${esc(s.name)}</div>
        <div class="subj-meta">Sınavda ${s.examQ} soru · havuzda ${s.pool} · ${accTxt}</div>
      </div>
      <div class="subj-right">
        <span class="chip ${lab.chip}">${lab.txt}</span>
        <button class="btn btn-2 btn-s" data-act="go-flow-subject" data-subject="${esc(s.id)}">Oku</button>
        <button class="btn btn-2 btn-s" data-act="practice-subject" data-subject="${esc(s.id)}">Çöz</button>
      </div>
    </div>`;
  }).join('');
}

export function currentAction() { return nextAction(); }
