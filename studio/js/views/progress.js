/* ==========================================================================
   views/progress.js — İLERLEME: GERÇEK VERİ, SÜSLEME YOK
   Deneme net geçmişi, hız eğilimi, ders kırılımı ve veri bütünlüğü raporu.
   Kural: hesaplanamayan metrik gösterilmez, "–" yazılır. Uydurma yok.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, $, fmtClock, toast } from '../ui.js';
import { SUBJECTS, subjectName, integrity, topicById } from '../data.js';
import { state, exportJSON, hardReset, PASS_CORRECT, TARGET_SEC, save } from '../store.js';
import { allSubjectMastery, MASTERY_LABEL, srsSummary, BOXES, examGap, worstExamSubjects, answerQualitySignals } from '../engine.js';
import { adhdSettingsPanelHTML } from '../adhd.js';

/* 23 Kasım 2026: /api/profil bloğu kaldırıldı. Yalnız yerel sunucuda vardı
   (GitHub Pages'te "hesaplanıyor..." kutusunda donuyordu) ve veri gelmeyince
   elle yazılmış yedek sayılar gösteriyordu. Canlı teşhis diagnosisBlock()'ta. */

export function render() {
  const host = $('#view-progress');
  if (!host) return;
  const S = state();
  const exams = S.exams;
  const srs = srsSummary();
  const rep = integrity();
  const answers = S.answers;
  // Doğruluk % ve medyan süre "net çözme" performansını ölçer; mantıkla/
  // ipucuyla (cevaptan önce) çözülen satırlar bu ikisine karışmaz — toplam
  // hacim (totalSolved) yine hepsini sayar, o bir aktivite ölçüsü.
  const cleanAnswers = answers.filter(a => !a.logicGuess);

  const totalSolved = answers.length;
  const totalCorrect = cleanAnswers.filter(a => a.ok).length;
  const acc = cleanAnswers.length ? Math.round((totalCorrect / cleanAnswers.length) * 100) : 0;
  const times = cleanAnswers.map(a => a.ms / 1000).filter(s => s > 1 && s < 900).sort((x, y) => x - y);
  const med = times.length ? times[Math.floor(times.length / 2)] : 0;

  host.innerHTML = `
    <div class="wrap">
      <h1 class="page" title="Buradaki her sayı ham cevap günlüğünden ve kâğıt oturumlarından hesaplanır, hiçbiri elle girilmez.">İlerleme</h1>

      ${diagnosisBlock()}

      <div class="grid grid-3">
        <div class="metric">
          <div class="metric-k">Toplam çözüm</div>
          <div class="metric-v">${totalSolved}</div>
          <div class="metric-n">${totalCorrect} doğru · %${acc}</div>
        </div>
        <div class="metric">
          <div class="metric-k">Medyan süre</div>
          <div class="metric-v" style="color:${med === 0 ? 'var(--ink-3)' : med <= TARGET_SEC ? 'var(--ok)' : 'var(--warn)'}">${med ? Math.round(med) : '–'}<span style="font-size:0.85rem;font-weight:600"> sn</span></div>
          <div class="metric-n">hedef ${TARGET_SEC} sn</div>
        </div>
        <div class="metric">
          <div class="metric-k">Tekrar havuzu</div>
          <div class="metric-v">${srs.tracked}</div>
          <div class="metric-n">${srs.due} vadesinde · ${srs.reviewing} yoklamada · ${srs.ready} sınava hazır${srs.struggling ? ` · ${srs.struggling} inatçı` : ''}</div>
        </div>
      </div>

      <div class="section-label">Deneme geçmişi</div>
      ${exams.length ? examHistory(exams) : `<div class="card"><p class="hint">Henüz deneme çözülmedi. Net tahmini yalnızca tam denemeyle yapılabilir.</p>
        <div class="btn-row" style="margin-top:1rem"><button class="btn btn-s" data-act="go-exam">Denemeye git</button></div></div>`}

      <div class="section-label">Ders kırılımı</div>
      <div class="card" style="padding:0.5rem 1rem">
        <table class="tbl">
          <thead><tr><th>Ders</th><th class="num">Sınav</th><th class="num">Havuz</th><th class="num">Çözüm</th><th class="num">Başarı</th><th class="num">Medyan</th><th>Durum</th></tr></thead>
          <tbody>
            ${allSubjectMastery().sort((a, b) => b.examQ - a.examQ).map(s => {
              const m = s.mastery;
              const lab = MASTERY_LABEL[m.state];
              return `<tr>
                <td>${esc(s.name)}</td>
                <td class="num">${s.examQ}</td>
                <td class="num" style="${s.pool === 0 ? 'color:var(--no);font-weight:700' : ''}">${s.pool}</td>
                <td class="num">${m.n || '–'}</td>
                <td class="num">${m.n ? '%' + Math.round(m.acc * 100) : '–'}</td>
                <td class="num">${m.medianSec ? Math.round(m.medianSec) + ' sn' : '–'}</td>
                <td><span class="chip ${lab.chip}">${lab.txt}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-label" title="Yanlış soru birkaç soru sonra yeniden gelir. Doğru bildiğin soru günler sonra bir kez yoklanır; her hatırlayışta ara uzar. Ara sınav gününü geçince soru sınava hazırdır.">Tekrar durumu</div>
      <div class="card">
        ${boxBars(S.srs)}
        ${kalibrasyonHTML(srs.kalibrasyon)}
      </div>

      ${adhdSettingsPanelHTML()}

      <details class="bakim">
        <summary><span class="section-label" style="margin:0">Bakım</span></summary>
      <div class="section-label">Veri bütünlüğü</div>
      <div class="card">
        <table class="tbl">
          <tbody>
            <tr><td>Konu sayısı</td><td class="num">${rep.topics}</td></tr>
            <tr><td>Soru sayısı</td><td class="num">${rep.questions}</td></tr>
            <tr><td>Konuya bağlı olmayan soru (yetim)</td><td class="num" style="${rep.orphanQuestions ? 'color:var(--warn);font-weight:700' : ''}">${rep.orphanQuestions}</td></tr>
            <tr><td>Çözülmeyen topicId</td><td class="num" style="${rep.brokenTopicIds ? 'color:var(--no);font-weight:700' : 'color:var(--ok)'}">${rep.brokenTopicIds}</td></tr>
            <tr><td>Zorluk etiketi eksik soru</td><td class="num" style="${rep.untaggedDifficulty ? 'color:var(--warn)' : ''}">${rep.untaggedDifficulty}</td></tr>
            <tr><td>Etkileşimli (v3) konu</td><td class="num">${rep.v3Topics} / ${rep.topics}</td></tr>
            <tr><td>Eski görselli konu</td><td class="num" style="${rep.legacyTopics ? 'color:var(--warn)' : ''}">${rep.legacyTopics}</td></tr>
            <tr><td>Havuzu boş ders</td><td class="num" style="${rep.emptySubjects.length ? 'color:var(--no);font-weight:700' : 'color:var(--ok)'}">${rep.emptySubjects.length ? esc(rep.emptySubjects.join(', ')) : 'yok'}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-label">Kütüphane</div>
      <div class="card">
        <p class="hint" style="margin-bottom:0.75rem">
          Çalışma kütüphanesini güncelleyin veya yerel önbelleği temizleyin.
        </p>
        <div class="btn-row">
          <button class="btn btn-s" data-act="sync-vault">Kütüphaneyi Güncelle</button>
          <button class="btn btn-2 btn-s" data-act="clear-vault-cache" style="color:var(--warn)">Önbelleği Temizle</button>
        </div>
      </div>

      <div class="section-label">Veri</div>
      <div class="card">
        <p class="hint" style="margin-bottom:1rem">Ham cevap günlüğünü dışa aktarabilirsin — AI koçun okuyacağı dosya budur.</p>
        <div class="btn-row">
          <button class="btn btn-2 btn-s" data-act="export">Telemetriyi indir (JSON)</button>
          <button class="btn btn-2 btn-s" data-act="reset-all" style="color:var(--no)">Tüm verimi sıfırla</button>
        </div>
      </div>
      </details>
    </div>`;

}

/**
 * İstemci-taraflı deneme teşhisi — bayat /api/profil'e bağlı değil, localStorage'dan canlı.
 * Bu blok "kaç net, nerede sızıyor, hızlı+yanlış oranı ne" der; hesaplanamıyorsa hiç çizilmez.
 */
function diagnosisBlock() {
  const gap = examGap();
  if (!gap) return '';
  const worst = worstExamSubjects(6);
  const sig = answerQualitySignals();
  const fastWrong = sig && sig.n >= 20 && sig.fastWrongRate >= 0.15;

  return `
    <div class="section-label">Deneme teşhisi (canlı · ham veriden)</div>
    <div class="card" style="margin-bottom:1.5rem">
      <div style="display:flex;gap:1.5rem;flex-wrap:wrap;align-items:baseline">
        <div>
          <div style="font-size:0.8rem;color:var(--ink-3)">Son deneme</div>
          <div style="font-size:1.4rem;font-weight:700;color:${gap.gap > 0 ? 'var(--no)' : 'var(--ok)'}">${gap.net} net</div>
          <div class="hint" style="margin:0">${gap.gap > 0 ? `baraj ${PASS_CORRECT} net için <b>${gap.gap} net açık</b>` : 'baraj üstünde'}</div>
        </div>
        <div>
          <div style="font-size:0.8rem;color:var(--ink-3)">Tempo</div>
          <div style="font-size:1.4rem;font-weight:700">${gap.pace ? '~' + gap.pace : '–'}<span style="font-size:0.9rem"> sn/soru</span></div>
          <div class="hint" style="margin:0">hedef ${TARGET_SEC} sn</div>
        </div>
        <div>
          <div style="font-size:0.8rem;color:var(--ink-3)">Hızlı + yanlış</div>
          <div style="font-size:1.4rem;font-weight:700;color:${fastWrong ? 'var(--warn)' : 'var(--ok)'}">${sig.n ? Math.round(sig.fastWrongRate * 100) : '–'}<span style="font-size:0.9rem"> %</span></div>
          <div class="hint" style="margin:0">${fastWrong ? 'okumadan tahmin sinyali' : 'okuma disiplini iyi'}</div>
        </div>
      </div>

      ${worst.length ? `
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
          <div style="font-size:0.85rem;font-weight:600;color:var(--ink-2);margin-bottom:0.6rem">En çok net sızdıran dersler</div>
          ${worst.map(x => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;padding:0.35rem 0">
              <div style="min-width:0">
                <span style="font-size:0.9rem;font-weight:600">${esc(x.name)}</span>
                <span class="hint" style="margin-left:0.5rem">sınavda ${x.examQ} · isabet %${Math.round(x.acc * 100)}${x.blank ? ` · ${x.blank} boş` : ''}</span>
              </div>
              <span class="chip red" style="flex-shrink:0">−${Math.round(x.leak * 10) / 10} net</span>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

function examHistory(exams) {
  const best = Math.max(...exams.map(e => e.net));
  const maxNet = Math.max(best, PASS_CORRECT, 1);
  return `<div class="card">
    <div style="display:flex;align-items:flex-end;gap:0.5rem;height:9rem;padding:0.5rem 0 0;border-bottom:1px solid var(--line);margin-bottom:0.85rem;position:relative">
      <div style="position:absolute;left:0;right:0;bottom:${(PASS_CORRECT / maxNet) * 100}%;border-top:1px dashed var(--no);opacity:0.5"></div>
      ${exams.map(e => {
        const h = Math.max(3, (e.net / maxNet) * 100);
        return `<div title="${esc(new Date(e.at).toLocaleDateString('tr-TR'))} · ${esc(e.label || 'Deneme')} · ${e.net} net (İncelemek için tıkla)"
          data-act="exam-open-review" data-exam-id="${esc(e.id)}"
          style="flex:1;min-width:1.1rem;max-width:3.5rem;height:${h}%;border-radius:5px 5px 0 0;
          background:${e.pass ? 'var(--ok)' : 'var(--accent)'};position:relative;cursor:pointer">
          <span style="position:absolute;top:-1.15rem;left:0;right:0;text-align:center;font-size:0.7rem;font-weight:700;color:var(--ink-2)">${e.net}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="hint" style="margin-bottom:1rem">Kesikli çizgi: ${PASS_CORRECT} net barajı. En iyi: ${best} net. Sütunlara veya butonlara tıklayarak deneme çözümlerine gidebilirsiniz.</p>
    <table class="tbl">
      <thead><tr><th>Tarih</th><th>Sınav</th><th class="num">Net</th><th class="num">Puan</th><th class="num">Boş</th><th class="num">Süre</th><th style="text-align:right">İşlem</th></tr></thead>
      <tbody>
        ${exams.slice().reverse().map(e => {
          const wrongN = (e.repeatIds || e.wrongIds || []).length || e.wrong || 0;
          return `<tr>
          <td>${esc(new Date(e.at).toLocaleDateString('tr-TR'))}</td>
          <td><span style="font-weight:600;color:var(--ink)">${esc(e.label || 'Deneme Sınavı')}</span></td>
          <td class="num" style="font-weight:700;color:${e.pass ? 'var(--ok)' : 'var(--no)'}">${e.net}</td>
          <td class="num">${e.points}</td>
          <td class="num" style="${e.blank ? 'color:var(--warn)' : ''}">${e.blank}</td>
          <td class="num">${fmtClock(e.durationMs)}</td>
          <td style="text-align:right;white-space:nowrap">
            <button class="btn btn-2 btn-s" data-act="exam-open-review" data-exam-id="${esc(e.id)}" style="margin-right:0.35rem;padding:0.25rem 0.6rem;font-size:0.75rem">Çözümler</button>
            ${wrongN ? `<button class="btn btn-s" data-act="exam-review-wrong" data-exam-id="${esc(e.id)}" style="padding:0.25rem 0.6rem;font-size:0.75rem">Yanlışları Çöz (${wrongN})</button>` : ''}
          </td>
        </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;
}

/* Tekrar politikası v4 (23 Kasım 2026, engine.js SRS v4). */
function boxBars(srs) {
  const rows = [
    { label: 'Yanlıştan sonra', n: 0, ok: false },
    { label: 'Yoklama bekliyor', n: 0, ok: false },
    { label: 'Sınava hazır', n: 0, ok: true },
    { label: 'Tamam', n: 0, ok: true },
    { label: 'Bırakıldı', n: 0, ok: true }
  ];
  Object.values(srs).forEach(r => {
    if (!r) return;
    if (r.dropped) rows[4].n++;
    else if (r.hazir) rows[2].n++;
    else if ((r.box || 0) >= BOXES.length || (r.dueN == null && !r.dueD && !r.dueAt)) rows[3].n++;
    else if (r.dueN != null) rows[0].n++;
    else rows[1].n++;
  });
  const max = Math.max(1, ...rows.map(r => r.n));
  return rows.map(r => `
    <div style="display:grid;grid-template-columns:7.5rem 1fr 2.5rem;gap:0.75rem;align-items:center;margin-bottom:0.4rem">
      <span class="hint">${esc(r.label)}</span>
      <div class="track" style="margin:0"><i style="width:${(r.n / max) * 100}%;background:${r.ok ? 'var(--ok)' : 'var(--accent)'}"></i></div>
      <span class="hint" style="text-align:right">${r.n}</span>
    </div>`).join('');
}

/** Aralıkların kendini ayarlaması: modelin tahmini ile gerçek hatırlama. */
function kalibrasyonHTML(k) {
  if (!k || !k.n) return '';
  const pct = x => `%${Math.round(x * 100)}`;
  const yon = k.carpan > 1.02 ? 'aralıklar uzuyor' : k.carpan < 0.98 ? 'aralıklar kısalıyor' : 'aralıklar yerinde';
  return `<p class="hint" style="margin-top:0.6rem" title="Her yoklamada modelin tahmin ettiği hatırlama ile gerçek sonuç karşılaştırılır; aralıklar buna göre ×${k.carpan} ölçeklenir.">${k.n} yoklama · tahmin ${pct(k.tahmin)} · gerçek ${pct(k.gercek)} · ${yon}</p>`;
}

export function doExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hmgs_telemetri_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Telemetri indirildi.');
}

export function doReset() {
  if (!confirm('Tüm çözüm geçmişin, tekrar sıran ve deneme sonuçların silinecek. Bu geri alınamaz.\n\nEmin misin?')) return false;
  hardReset();
  toast('Veriler sıfırlandı.');
  return true;
}
