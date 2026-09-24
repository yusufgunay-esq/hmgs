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
import { daysLeft, streak, lastExam, PASS_CORRECT, state } from '../store.js';
import { nextAction, srsSummary, allSubjectMastery,
  MASTERY_LABEL, bleedingTopics, bleedingTags, dueQuestions,
  examGap, worstExamSubjects, answerQualitySignals } from '../engine.js';
import { rota } from '../rota.js';
import { active as examActive } from './exam.js';

export function render() {
  const host = $('#view-today');
  if (!host) return;

  const r = rota({ examActive: examActive() });
  const srs = srsSummary();
  const d = daysLeft();
  const st = streak();
  const ex = lastExam();
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

  // SON DÖRT GÜN (23 Eylül 2026): ekranda yalnız rota ve üç sayı kalır.
  // Aşağıdaki panoların (kanayan konular, etiketler, ders listesi, teşhis)
  // hepsi 2-4 cevaplık örneklemlerden "%100 hata" üretiyordu ve her biri
  // rotadan sapan bir düğme taşıyordu. Zayıf konular artık rotada "Konu ödevi"
  // olarak geliyor; ders seçimi akışın karma motorunda.
  if (r.D >= 0 && r.D <= 4) {
    host.innerHTML = `
    <div class="wrap">
      ${rotaHTML(r)}
      <div class="grid grid-3" style="margin-top:1.25rem">
        <div class="metric">
          <div class="metric-k">Sınava kalan</div>
          <div class="metric-v">${d}<span style="font-size:0.85rem;font-weight:600"> gün</span></div>
          <div class="metric-n">27 Eylül Pazar · 10.15 · binaya 10.00'a kadar</div>
        </div>
        <div class="metric">
          <div class="metric-k">Bugün çözülen</div>
          <div class="metric-v">${r.bugun.toplam}<span style="font-size:0.85rem;font-weight:600;color:var(--ink-3)"> soru</span></div>
          <div class="metric-n">${r.bugun.toplam ? `${r.bugun.dogru} doğru · ${pct((r.bugun.dogru / r.bugun.toplam) * 100)}` : 'henüz başlamadın'} · deneme hariç</div>
        </div>
        <div class="metric">
          <div class="metric-k">Son deneme</div>
          <div class="metric-v" style="${ex ? (ex.pass ? 'color:var(--ok)' : 'color:var(--no)') : 'color:var(--ink-3)'}">${ex ? ex.correct : '–'}<span style="font-size:0.85rem;font-weight:600;color:var(--ink-3)"> / ${PASS_CORRECT} doğru</span></div>
          <div class="track ${ex && ex.pass ? 'ok' : 'no'}"><i style="width:${ex ? Math.min(100, (ex.correct / PASS_CORRECT) * 100) : 0}%"></i></div>
          <div class="metric-n">${ex ? `${new Date(ex.at).toLocaleDateString('tr-TR')}${ex.durationMs ? ` · ${Math.round(ex.durationMs / 60000)} dk kullandın` : ''}` : 'henüz deneme çözülmedi'}</div>
        </div>
      </div>
      ${r.D === 0 ? '' : `<details class="today-serbest" style="margin-top:1.25rem">
        <summary class="section-label" style="cursor:pointer">Rotanın dışında çalışmak istersen</summary>
        <div class="btn-row" style="margin-top:0.6rem">
          <button class="btn btn-2 btn-s" data-act="practice-pastexam">Arşiv soruları · ${realCount}</button>
          <button class="btn btn-2 btn-s" data-act="start-deadlines">Süreler ve sayılar · 20</button>
          <button class="btn btn-2 btn-s" data-act="practice-core-karma">Karma akış</button>
          <button class="btn btn-2 btn-s" data-act="go-exam">Deneme sayfası</button>
        </div>
      </details>`}
    </div>`;
    return;
  }

  host.innerHTML = `
    <div class="wrap">
      ${rotaHTML(r)}

      <div class="grid grid-3" style="margin-top:1.25rem">
        <div class="metric">
          <div class="metric-k">Sınava kalan</div>
          <div class="metric-v">${d}<span style="font-size:0.85rem;font-weight:600"> gün</span></div>
          <div class="metric-n">27 Eylül 2026 · 2026-HMGS/2</div>
        </div>
        <div class="metric">
          <div class="metric-k">Bugün çözülen</div>
          <div class="metric-v">${r.bugun.toplam}<span style="font-size:0.85rem;font-weight:600;color:var(--ink-3)"> soru</span></div>
          <div class="metric-n">${r.bugun.toplam ? `${r.bugun.dogru} doğru · ${pct((r.bugun.dogru / r.bugun.toplam) * 100)}` : 'henüz başlamadın'}</div>
          <div class="metric-n">deneme cevapları hariç</div>
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
                ? `<div class="metric-n" style="margin-top:0.4rem">${nextDue ? `sıradaki tekrar ${nextDue}` : 'bekleyen tekrar yok'}</div>`
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

      <div class="section-label">Serbest çalışma</div>
      <div class="btn-row">
        <button class="btn btn-2 btn-s" data-act="practice-pastexam">Arşiv soruları · ${realCount}</button>
        <button class="btn btn-2 btn-s" data-act="start-hmgs-benzeri">HMGS benzeri · 20</button>
        <button class="btn btn-2 btn-s" data-act="start-deadlines">Süreler ve sayılar · 20</button>
        <button class="btn btn-2 btn-s" data-act="practice-core-karma">Karma akış</button>
        <button class="btn btn-2 btn-s" data-act="go-exam">Deneme sayfası</button>
      </div>

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
 * GÜNÜN ROTASI — Bugün ekranının kahramanı.
 * Karar rota.js'te verilir; burası yalnız çizer. Üstte sıradaki adım ve
 * gerekçesi, altta günün tamamı. Her satırın kendi düğmesi var: sıraya uymak
 * zorunlu değil, ama önerilen yol hep en üstte duruyor.
 */
const GUN_ADI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function rotaHTML(r) {
  if (r.kart && (r.kart.tur === 'sinav' || r.kart.tur === 'bitti')) return sinavKarti(r);

  const s = r.simdi;
  const sirali = r.adimlar.filter(a => !a.bilgi && !a.istege && !a.sinirsiz);
  const isabet = r.bugun.toplam ? Math.round((r.bugun.dogru / r.bugun.toplam) * 100) : 0;

  let kicker, title, why, cta;
  if (!s) {
    // Sınırlı adımların hepsi bitti: kahraman akış. Tavan yok, gün bir sayıyla bitmez.
    const ak = r.adimlar.find(a => a.tur === 'akis');
    kicker = 'Liste bitti · akış açık';
    title = r.bugun.toplam ? `Bugün ${r.bugun.toplam} soru · isabet %${isabet}` : 'Akışa gir';
    why = ak ? ak.neden : 'Karışık, sınav biçiminde ve sonu yok.';
    cta = '<button class="btn" data-act="rota-go" data-step="akis">Akışa devam et</button>';
  } else {
    const no = sirali.indexOf(s) + 1;
    const kalan = s.plan - s.yapilan;
    kicker = s.sinirsiz ? 'Sırada' : `Sırada · ${no > 0 ? no : 1} / ${Math.max(1, sirali.length)}${s.tur === 'konu' ? ' · konu onarımı' : ''}`;
    title = s.tur === 'deneme' || s.sinirsiz ? s.baslik : `${s.baslik} · ${kalan} soru`;
    why = s.neden;
    cta = (s.topicId ? `<button class="btn btn-2" data-act="go-flow-topic" data-topic="${esc(s.topicId)}">Önce konuyu oku</button>` : '')
      + `<button class="btn" data-act="rota-go" data-step="${esc(s.id)}">${esc(s.cta)}</button>`
      + (s.saat ? `<span class="hint" style="margin:0">önerilen başlangıç ${esc(s.saat)}</span>` : '');
  }

  const satirlar = r.adimlar.map(a => {
    const st = a.bilgi ? 'info' : a.bitti ? 'done' : a === s ? 'now' : 'todo';
    const sayi = a.bilgi ? ''
      : a.tur === 'deneme' ? (a.bitti ? 'bitti' : '120 soru')
        : a.sinirsiz ? `bugün ${a.yapilan} · sınırsız`
          : `${a.yapilan} / ${a.plan}`;
    const btn = a.bilgi || a.bitti || a === s ? ''
      : `<button class="btn btn-2 btn-s" data-act="rota-go" data-step="${esc(a.id)}">${a.sinirsiz ? 'Aç' : 'Başla'}</button>`;
    const alt = a.bilgi ? `<div class="rota-meta">${esc(a.neden)}</div>`
      : a.alt ? `<div class="rota-meta">${esc(a.alt)}</div>` : '';
    return `<div class="rota-row ${st}">
        <span class="rota-dot" aria-hidden="true"></span>
        <div class="rota-main"><div class="rota-name">${esc(a.baslik)}</div>${alt}</div>
        <div class="rota-count">${esc(sayi)}</div>
        <div class="rota-act">${btn}</div>
      </div>`;
  }).join('');

  const gunAdi = GUN_ADI[new Date(r.today + 'T12:00:00Z').getUTCDay()];
  const yuzde = r.toplamPlan ? Math.min(100, Math.round((r.toplamYapilan / r.toplamPlan) * 100)) : 0;

  return `
    <div class="hero rota-hero">
      <div class="hero-kicker">${esc(kicker)}</div>
      <div class="hero-title">${esc(title)}</div>
      <p class="hero-why">${esc(why)}</p>
      <div class="hero-main-cta">${cta}</div>

      <div class="rota">
        <div class="rota-head">
          <span>Günün rotası · ${gunAdi} · sınava ${r.D} gün</span>
          <span>liste ${r.toplamYapilan} / ${r.toplamPlan}</span>
        </div>
        <div class="track" style="margin:0.2rem 0 0.6rem"><i style="width:${yuzde}%"></i></div>
        ${satirlar}
        <div class="rota-foot">Liste bittiğinde akış açık kalır, sonu yok. Kâğıtta çözdüklerin bu sayılara girmez.</div>
      </div>
    </div>`;
}

/** Sınav günü ve sonrası: soru yok, yalnız yapılacaklar. */
function sinavKarti(r) {
  if (r.kart.tur === 'bitti') {
    return `
    <div class="hero rota-hero">
      <div class="hero-kicker">27 Eylül 2026</div>
      <div class="hero-title">Geçmiş olsun</div>
      <p class="hero-why" style="margin-bottom:0">Sınav bitti. Bu ekranın işi de bitti; emeğin kâğıtta.</p>
    </div>`;
  }
  return `
    <div class="hero rota-hero">
      <div class="hero-kicker">Bugün</div>
      <div class="hero-title">Sınav günü</div>
      <p class="hero-why">Bugün soru çözme; bildiğin yeterli. Aşağıdakiler dışında yapılacak iş yok.</p>
      <div class="rota">
        <div class="rota-row todo"><span class="rota-dot"></span><div class="rota-main"><div class="rota-name">Saat 10.00'dan önce binada ol</div><div class="rota-meta">10.00'dan sonra binaya alınmıyor (PGM ilanı). Sınav 10.15'te başlıyor.</div></div><div class="rota-count"></div><div class="rota-act"></div></div>
        <div class="rota-row todo"><span class="rota-dot"></span><div class="rota-main"><div class="rota-name">Kimlik ve sınava giriş belgesi</div><div class="rota-meta">Çıkmadan önce bir kez daha kontrol et.</div></div><div class="rota-count"></div><div class="rota-act"></div></div>
        <div class="rota-row todo"><span class="rota-dot"></span><div class="rota-main"><div class="rota-name">120 soru · 155 dakika</div><div class="rota-meta">Soru başına ~75 saniye. Takıldığını işaretle geç, ikinci turda dön; boş bırakma.</div></div><div class="rota-count"></div><div class="rota-act"></div></div>
      </div>
    </div>`;
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

/** Vadesi gelen yoksa: sıradaki tekrar kaç soru sonra (v3: vade soru sayacıdır, gün değil). */
function nextDueDate() {
  const n = state().answers.length;
  const rows = Object.values(state().srs || {})
    .map(r => r && r.dueN).filter(x => x != null && x > n).sort((a, b) => a - b);
  if (!rows.length) return null;
  return `${rows[0] - n} soru sonra`;
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
