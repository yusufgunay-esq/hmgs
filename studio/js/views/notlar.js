/* ==========================================================================
   views/notlar.js : HMGS notları
   Üç yüz: Dersler (kart ızgarası → ders sayfası), Sayılar (kendini sına),
   Taktik (sınav iskeleti). Olaylar kendi host'unda, data-na ile yakalanır;
   main.js'teki data-act akışına karışmaz.
   © 2026 Yusuf GÜNAY, Tüm Hakları Saklıdır.
   ========================================================================== */

import { esc } from '../ui.js';
import { DERSLER, SINAV, TAKTIK, ZAMAN } from '../notlar-data.js';

const ui = { mod: 'dersler', ders: null, gizli: false, acik: new Set() };
let bagli = false;

const host = () => document.getElementById('view-notlar');
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const ara = d => `${d.aralik[0]}–${d.aralik[1]}`;
const MAX = Math.max(...DERSLER.map(d => d.soru));

function seg() {
  const b = (k, t) => `<button data-na="mod" data-k="${k}" aria-pressed="${ui.mod === k}">${t}</button>`;
  return `<div class="nt-seg" role="tablist">${b('dersler', 'Dersler')}${b('sayilar', 'Sayılar')}${b('taktik', 'Taktik')}</div>`;
}

function bas() {
  return `<header class="nt-head">
    <p class="nt-eyebrow">Son okuma</p>
    <h1 class="nt-title">Notlar</h1>
    <p class="nt-sub">Dört sınav, 460 soru. Ne çıkıyor, nerede tuzak var, hangi sayı sorulur.</p>
    ${seg()}
  </header>`;
}

/* ---------- Dersler ---------- */

function kart(d, i) {
  const w = Math.round((d.soru / MAX) * 100);
  return `<button class="nt-card" data-na="ders" data-id="${d.id}" style="--i:${i}">
    <span class="nt-card-top"><span class="nt-range">${ara(d)}</span><span class="nt-count">${d.soru} soru</span></span>
    <span class="nt-card-name">${esc(d.ad)}</span>
    <span class="nt-card-sum">${esc(d.ozet)}</span>
    <span class="nt-card-foot">
      <span class="nt-weight"><i style="width:${w}%"></i></span>
      ${d.ters >= 40 ? `<span class="nt-flag">Ters kök %${d.ters}</span>` : ''}
    </span>
  </button>`;
}

function dersler() {
  return `<div class="nt-grid">${DERSLER.map(kart).join('')}</div>`;
}

function tuzakHtml(t) {
  if (typeof t === 'string') return `<li class="nt-trap-note">${md(t)}</li>`;
  return `<li class="nt-trap"><span class="nt-trap-y"><em>Kurulan</em>${md(t.y)}</span><span class="nt-trap-d"><em>Doğrusu</em>${md(t.d)}</span></li>`;
}

function ezberKart(e, key) {
  const acik = !ui.gizli || ui.acik.has(key);
  return `<button class="nt-num${acik ? '' : ' is-hidden'}" data-na="ac" data-key="${key}" ${ui.gizli ? '' : 'tabindex="-1"'}>
    <span class="nt-num-v">${esc(e[0])}</span><span class="nt-num-t">${esc(e[1])}</span></button>`;
}

function sinaBtn() {
  return `<button class="nt-test" data-na="gizle" aria-pressed="${ui.gizli}">${ui.gizli ? 'Hepsini göster' : 'Kendini sına'}</button>`;
}

function dersSayfa(d) {
  const i = DERSLER.indexOf(d);
  const onc = DERSLER[i - 1], snr = DERSLER[i + 1];
  const top = Math.max(...d.cikan.map(c => c[1] || 1));
  const cikan = d.cikan.map(([t, n, s]) => `<li>
      <span class="nt-topic">${esc(t)}${s === 4 ? '<span class="nt-every">her sınavda</span>' : ''}</span>
      <span class="nt-bar"><i style="width:${Math.round(((n || 1) / top) * 100)}%"></i></span>
      <span class="nt-n">${n ?? ''}</span></li>`).join('');

  return `<article class="nt-detail">
    <button class="nt-back" data-na="geri">Tüm dersler</button>
    <div class="nt-d-head">
      <p class="nt-eyebrow">Soru ${ara(d)} · ${d.soru} soru · ters kök %${d.ters}</p>
      <h2 class="nt-d-title">${esc(d.ad)}</h2>
      <p class="nt-d-sum">${esc(d.ozet)}</p>
    </div>

    <div class="nt-cols">
      <section class="nt-block">
        <h3 class="nt-h">Ne çıkıyor</h3>
        <ul class="nt-topics">${cikan}</ul>
        ${d.yok ? `<p class="nt-none"><b>Hiç sorulmadı.</b> ${md(d.yok)}</p>` : ''}
      </section>
      <aside class="nt-callout">
        <h3 class="nt-h">Sınavda</h3>
        <p>${md(d.sinavda)}</p>
      </aside>
    </div>

    <section class="nt-block">
      <h3 class="nt-h">Tuzaklar</h3>
      <ul class="nt-traps">${d.tuzak.map(tuzakHtml).join('')}</ul>
    </section>

    <section class="nt-block">
      <div class="nt-h-row"><h3 class="nt-h">Ezber</h3>${sinaBtn()}</div>
      <div class="nt-nums">${d.ezber.map((e, j) => ezberKart(e, d.id + ':' + j)).join('')}</div>
    </section>

    <nav class="nt-pager">
      ${onc ? `<button data-na="ders" data-id="${onc.id}"><small>Önceki</small>${esc(onc.ad)}</button>` : '<span></span>'}
      ${snr ? `<button class="nt-next" data-na="ders" data-id="${snr.id}"><small>Sonraki</small>${esc(snr.ad)}</button>` : '<span></span>'}
    </nav>
  </article>`;
}

/* ---------- Sayılar ---------- */

function sayilar() {
  const gruplar = DERSLER.map(d => `<section class="nt-sgroup">
      <h3 class="nt-sgroup-h"><span>${esc(d.ad)}</span><span class="nt-range">${ara(d)}</span></h3>
      <div class="nt-nums">${d.ezber.map((e, j) => ezberKart(e, d.id + ':' + j)).join('')}</div>
    </section>`).join('');
  return `<div class="nt-h-row nt-s-top"><p class="nt-s-lead">Bütün derslerin sayıları ve eşleştirmeleri, sınav sırasıyla. Kapatıp tek tek aç.</p>${sinaBtn()}</div>${gruplar}`;
}

/* ---------- Taktik ---------- */

function serit() {
  let x = 0;
  const parca = DERSLER.map(d => {
    const w = (d.soru / SINAV.soru) * 100;
    const s = `<button class="nt-strip-seg${d.ters >= 40 ? ' is-hot' : ''}" data-na="ders" data-id="${d.id}" style="left:${x}%;width:${w}%" title="${esc(d.ad)} · ${ara(d)}"></button>`;
    x += w;
    return s;
  }).join('');
  const etiket = [1, 19, 34, 46, 58, 70, 76, 85, 91, 97, 120]
    .map(n => `<span style="left:${n === SINAV.soru ? 100 : ((n - 1) / SINAV.soru) * 100}%">${n}</span>`).join('');
  return `<div class="nt-strip">${parca}</div><div class="nt-strip-axis">${etiket}</div>
    <p class="nt-legend"><i class="k"></i> Koyu dilim: kökün en az %40'ı ters. Dilime dokun, dersi aç.</p>`;
}

function taktik() {
  const kural = TAKTIK.map((k, i) => `<li><span class="nt-rule-i">${i + 1}</span><div><b>${esc(k.b)}</b><p>${esc(k.t)}</p></div></li>`).join('');
  const topDk = ZAMAN.reduce((a, z) => a + z[2], 0);
  const zaman = ZAMAN.map(([r, a, dk]) => `<tr><td class="nt-range">${r}</td><td>${esc(a)}</td>
      <td class="nt-tbar"><i style="width:${Math.round((dk / 24) * 100)}%"></i></td><td class="nt-dk">${dk} dk</td></tr>`).join('');
  const ters = [...DERSLER].sort((a, b) => b.ters - a.ters).map(d => `<li>
      <span>${esc(d.ad)}</span><span class="nt-bar${d.ters >= 40 ? ' is-hot' : ''}"><i style="width:${d.ters}%"></i></span><span class="nt-n">%${d.ters}</span></li>`).join('');

  return `<section class="nt-block">
      <div class="nt-facts">
        <div><b>${SINAV.soru}</b><span>soru</span></div>
        <div><b>${SINAV.dakika}</b><span>dakika</span></div>
        <div><b>77,5</b><span>saniye / soru</span></div>
      </div>
      <h3 class="nt-h">Blok haritası</h3>
      <p class="nt-note">Dersler her sınavda aynı soru numaralarında, aynı sayıda geliyor.</p>
      ${serit()}
    </section>
    <section class="nt-block"><h3 class="nt-h">Kurallar</h3><ol class="nt-rules">${kural}</ol></section>
    <div class="nt-cols">
      <section class="nt-block"><h3 class="nt-h">Zaman planı</h3>
        <table class="nt-time"><tbody>${zaman}</tbody>
        <tfoot><tr><td></td><td>Toplam</td><td></td><td class="nt-dk">${topDk} dk</td></tr></tfoot></table>
      </section>
      <section class="nt-block"><h3 class="nt-h">Ters kök oranı</h3><ul class="nt-topics nt-ters">${ters}</ul></section>
    </div>`;
}

/* ---------- yaşam döngüsü ---------- */

function ciz() {
  const h = host();
  if (!h) return;
  let govde;
  if (ui.mod === 'dersler') {
    const d = ui.ders && DERSLER.find(x => x.id === ui.ders);
    govde = d ? dersSayfa(d) : dersler();
  } else if (ui.mod === 'sayilar') govde = sayilar();
  else govde = taktik();
  const detay = ui.mod === 'dersler' && ui.ders;
  h.innerHTML = `<div class="wrap nt">${detay ? '' : bas()}<div class="nt-body" data-mod="${ui.mod}">${govde}</div></div>`;
}

function tikla(e) {
  const el = e.target.closest('[data-na]');
  if (!el || !host().contains(el)) return;
  const na = el.dataset.na;
  if (na === 'mod') { ui.mod = el.dataset.k; ui.ders = null; ciz(); window.scrollTo({ top: 0 }); }
  else if (na === 'ders') { ui.mod = 'dersler'; ui.ders = el.dataset.id; ciz(); window.scrollTo({ top: 0 }); }
  else if (na === 'geri') { ui.ders = null; ciz(); window.scrollTo({ top: 0 }); }
  else if (na === 'gizle') { ui.gizli = !ui.gizli; ui.acik.clear(); ciz(); }
  else if (na === 'ac' && ui.gizli) {
    const k = el.dataset.key;
    ui.acik.has(k) ? ui.acik.delete(k) : ui.acik.add(k);
    el.classList.toggle('is-hidden', !ui.acik.has(k));
  }
}

export function render() {
  const h = host();
  if (!h) return;
  if (!bagli) { h.addEventListener('click', tikla); bagli = true; }
  ciz();
}
