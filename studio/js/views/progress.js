/* ==========================================================================
   views/progress.js — İLERLEME: GERÇEK VERİ, SÜSLEME YOK
   Deneme net geçmişi, hız eğilimi, ders kırılımı ve veri bütünlüğü raporu.
   Kural: hesaplanamayan metrik gösterilmez, "–" yazılır. Uydurma yok.
   ========================================================================== */

import { esc, $, fmtClock, toast } from '../ui.js';
import { SUBJECTS, subjectName, integrity, topicById } from '../data.js';
import { state, exportJSON, hardReset, PASS_CORRECT, TARGET_SEC, save } from '../store.js';
import { allSubjectMastery, MASTERY_LABEL, srsSummary, BOXES } from '../engine.js';

export function render() {
  const host = $('#view-progress');
  if (!host) return;
  const S = state();
  const exams = S.exams;
  const srs = srsSummary();
  const rep = integrity();
  const answers = S.answers;

  const totalSolved = answers.length;
  const totalCorrect = answers.filter(a => a.ok).length;
  const acc = totalSolved ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  const times = answers.map(a => a.ms / 1000).filter(s => s > 1 && s < 900).sort((x, y) => x - y);
  const med = times.length ? times[Math.floor(times.length / 2)] : 0;

  host.innerHTML = `
    <div class="wrap">
      <h1 class="page">İlerleme</h1>
      <p class="page-sub">Buradaki her sayı ham cevap günlüğünden hesaplanır — hiçbiri elle girilmez.</p>

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
          <div class="metric-n">${srs.due} vadesinde · ${srs.graduated} mezun · ${srs.struggling} inatçı</div>
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

      <div class="section-label">Tekrar kutuları</div>
      <div class="card">
        <p class="hint" style="margin-bottom:0.9rem">Bir soru doğru çözüldükçe üst kutuya çıkar, aralık uzar. Yanlışta kutu 0'a döner.</p>
        ${boxBars(S.srs)}
      </div>

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

      <div class="section-label">Google Drive Soru & Konu Kasası</div>
      <div class="card">
        <p class="hint" style="margin-bottom:0.75rem">
          Sorular ve konular kişisel Google Drive kasanızdan telefonunuza IndexedDB olarak indirilir ve %100 çevrimdışı çalışır.
          ${localStorage.getItem('hmgs_vault_last_synced') ? `<br><span style="color:var(--ok);font-size:0.8rem">✓ Son Eşitleme: ${new Date(localStorage.getItem('hmgs_vault_last_synced')).toLocaleString('tr-TR')}</span>` : ''}
        </p>
        <div class="btn-row">
          <button class="btn btn-s" data-act="sync-vault">☁️ Drive'dan Kütüphaneyi Yenile</button>
          <button class="btn btn-2 btn-s" data-act="clear-vault-cache" style="color:var(--warn)">Yerel Önbelleği Temizle</button>
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
        return `<div title="${esc(new Date(e.at).toLocaleDateString('tr-TR'))} · ${e.net} net"
          style="flex:1;min-width:1.1rem;max-width:3.5rem;height:${h}%;border-radius:5px 5px 0 0;
          background:${e.pass ? 'var(--ok)' : 'var(--accent)'};position:relative">
          <span style="position:absolute;top:-1.15rem;left:0;right:0;text-align:center;font-size:0.7rem;font-weight:700;color:var(--ink-2)">${e.net}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="hint" style="margin-bottom:1rem">Kesikli çizgi: ${PASS_CORRECT} net barajı. En iyi: ${best} net.</p>
    <table class="tbl">
      <thead><tr><th>Tarih</th><th class="num">Net</th><th class="num">Puan</th><th class="num">Boş</th><th class="num">Süre</th></tr></thead>
      <tbody>
        ${exams.slice().reverse().map(e => `<tr>
          <td>${esc(new Date(e.at).toLocaleDateString('tr-TR'))}</td>
          <td class="num" style="font-weight:700;color:${e.pass ? 'var(--ok)' : 'var(--no)'}">${e.net}</td>
          <td class="num">${e.points}</td>
          <td class="num" style="${e.blank ? 'color:var(--warn)' : ''}">${e.blank}</td>
          <td class="num">${fmtClock(e.durationMs)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

function boxBars(srs) {
  const counts = new Array(BOXES.length + 1).fill(0);
  Object.values(srs).forEach(r => { counts[Math.min(r.box, BOXES.length)]++; });
  const max = Math.max(1, ...counts);
  const labels = [...BOXES.map(d => `${d} gün`), 'mezun'];
  return counts.map((c, i) => `
    <div style="display:grid;grid-template-columns:5rem 1fr 2.5rem;gap:0.75rem;align-items:center;margin-bottom:0.4rem">
      <span class="hint">${esc(labels[i])}</span>
      <div class="track" style="margin:0"><i style="width:${(c / max) * 100}%;background:${i === BOXES.length ? 'var(--ok)' : 'var(--accent)'}"></i></div>
      <span class="hint" style="text-align:right">${c}</span>
    </div>`).join('');
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
