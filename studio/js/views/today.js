/* ==========================================================================
   views/today.js — BUGÜN: TEK KARAR EKRANI
   Kullanıcı bu ekranda ne çalışacağına karar vermez; koç karar verir ve
   gerekçesini söyler. Seçenekler ikincil kalır.
   ========================================================================== */

import { esc, $, pct } from '../ui.js';
import { subjectName, topicById } from '../data.js';
import { daysLeft, streak, lastExam, PASS_CORRECT, state } from '../store.js';
import {
  nextAction, todayProgress, srsSummary, allSubjectMastery,
  MASTERY_LABEL, bleedingTopics, bleedingTags, dueQuestions
} from '../engine.js';

export function render() {
  const host = $('#view-today');
  if (!host) return;

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

  host.innerHTML = `
    <div class="wrap">
      <div class="hero">
        <div class="hero-kicker">Sırada bu var</div>
        <div class="hero-title">${esc(act.title)}</div>
        <p class="hero-why">${esc(act.why)}</p>
        <div class="btn-row">
          <button class="btn" data-act="do-next">${esc(act.cta)}</button>
          ${act.alts.map((a, i) => `<button class="btn btn-2 btn-s" data-act="do-alt" data-alt="${i}">${esc(a.label)}</button>`).join('')}
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
