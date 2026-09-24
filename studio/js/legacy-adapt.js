/* ==========================================================================
   legacy-adapt.js — ESKİ ŞEMAYI V3 MOTORUNUN ÇİZEBİLDİĞİ KALIBA TAŞIR
   ----------------------------------------------------------------------
   NEDEN VAR (18 Eylül 2026, "Kuralı çalış" kapsam denetimi):

   124 konudan 47'si (comparison_table 17, hierarchy_pyramid 5, timeline 9,
   decision_tree 12, flowchart 4) V3 motorunun bildiği bir visualType
   taşımıyordu. kural.js bu yüzden o konularda düğmeyi hiç basmıyordu —
   sessizce, iz bırakmadan. Röntgen ölçümü: bu 47 konu CMK, İş Hukuku,
   İdare Hukuku'nun büyük kısmı ve tüm tier-3 derslerini kapsıyor; gerçek
   sınavın ~%40'ı (97/240, 4 sınav röntgeninde de tutarlı).

   Bu dosya YENİ İÇERİK YAZMAZ. 47 konunun visualData'sındaki metin
   (title/desc/law/norm/period/question) olduğu gibi taşınır; yalnızca
   V3'ün zaten çizebildiği bir kalıbın beklediği alan adına yeniden
   haritalanır. Hangi eski tip hangi V3 kalıbına gider, VERİ ŞEKLİ belirler:

     comparison_table   -> guess_table            satır/sütun -> gizli hücre tahmini
     hierarchy_pyramid  -> interactive_hierarchy   katman -> tıkla-aç piramit
     timeline            -> step_reveal             dönem -> sırayla aç
     decision_tree (düz) -> step_reveal             adım -> sırayla aç
     flowchart (düz)     -> step_reveal             adım -> sırayla aç
     decision_tree/flowchart (DALLI) -> branch_graph  yazarın kendi düğüm
        grafiği (options/target, yes/no veya nodes+edges) TEK bir iç şemaya
        normalize edilip kullanıcı tıklaya tıklaya YAZARIN GRAFİĞİNİ gezer.
        Bu dosyada 4 konu var: tpc_felsefe_002, tpc_felsefe_003,
        tpc_milletlerarasi_003, tpc_genel_kamu_002. İlk sürümde (18 Eylül,
        sabah) bunlar "düzleştirmek dalları sıraymış gibi gösterir" diye
        bilinçli atlanmıştı. Yusuf'un talebi üzerine (18 Eylül, öğleden
        sonra: "hepsini içine sindiği gibi yap") flatten YERİNE grafiği
        OLDUĞU GİBİ gezen bir görünüm eklendi — hâlâ içerik uydurmuyoruz,
        yalnızca yazarın zaten kurduğu düğüm/kenar bağlantısını okuyup
        tıklanabilir hale getiriyoruz. decision_sim'e GİTMİYORUZ: o motor
        kategori eşleştirme mantığı bekliyor, bu sıfırdan yazılmış kural
        demek olurdu (CLAUDE.md: toplu şablon/uydurma yasağı).

   Veri, aynı visualType altında farklı yazarlar arasında alan adı
   tutarlılığı taşımıyordu (örn. timeline kimi konuda `milestones`, kimi
   `steps`, kimi `events`). Aşağıdaki eşlemeler bunun için birden çok alan
   adını dener — içerik değişmiyor, hangi anahtarın okunacağı değişiyor.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc } from './ui.js';

/** "tip"/"trap" alanındaki sınav tuzağı metnini okur; baştaki emoji/pictogram atılır (estetik kural: arayüzde emoji yok). */
function trapOf(vd) {
  const raw = vd.trap || vd.tip || '';
  const s = String(raw).replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim();
  return s || null;
}

const ADAPTERS = {
  comparison_table: (vd) => {
    const headers = (vd.headers || []).slice(1); // ilk sütun başlığı "label" kolonuna gider, tekrar basılmaz
    const rows = (vd.rows || []).map(r => {
      const arr = Array.isArray(r) ? r : (r.cells || []);
      const [label, ...rest] = arr;
      return { label, cells: rest.map(text => ({ text })) };
    }).filter(r => r.label);
    if (!rows.length) return null;
    return { type: 'guess_table', data: { title: vd.title, headers, rows, trap: trapOf(vd) } };
  },

  hierarchy_pyramid: (vd) => {
    const levels = (vd.levels || []).map(l => ({
      label: l.title || l.label || l.level,
      law: l.norm || l.law,
      desc: l.desc,
      exceptions: l.exceptions
    })).filter(l => l.label);
    if (!levels.length) return null;
    return { type: 'interactive_hierarchy', data: { title: vd.title, levels, trap: trapOf(vd) } };
  },

  timeline: (vd) => {
    const items = vd.milestones || vd.steps || vd.events || [];
    const steps = items.map(m => {
      const hasTitle = !!m.title;
      return {
        label: m.title || m.label,
        desc: m.desc,
        law: m.legalRef || m.law,
        note: m.period || m.time || m.date || (hasTitle ? m.label : null)
      };
    }).filter(s => s.label);
    if (!steps.length) return null;
    return { type: 'step_reveal', data: { title: vd.title, steps, trap: trapOf(vd) } };
  },

  decision_tree: (vd) => {
    const raw = vd.steps || vd.nodes || [];
    if (!raw.length || isBranching(raw)) return null; // dallıysa branch_graph yolu devralır
    const steps = raw.map(s => ({
      label: s.label || s.question || s.title,
      desc: s.desc,
      note: s.note
    })).filter(s => s.label);
    if (!steps.length) return null;
    return { type: 'step_reveal', data: { title: vd.title, steps, trap: trapOf(vd) } };
  },

  flowchart: (vd) => {
    // Yalnız düz `steps` listesini kabul eder. `nodes`+`edges` gerçek bir
    // grafiktir — o zaman branch_graph yolu devralır (aşağıda normalizeGraph).
    const raw = Array.isArray(vd.steps) ? vd.steps : [];
    if (!raw.length) return null;
    const steps = raw.map(s => ({ label: s.label, desc: s.desc, law: s.law, note: s.note })).filter(s => s.label);
    if (!steps.length) return null;
    return { type: 'step_reveal', data: { title: vd.title, steps, trap: trapOf(vd) } };
  }
};

/** Adım listesi aslında dallanıyor mu (options/yes-no/target)? Öyleyse step_reveal'a düzleştirmiyoruz. */
function isBranching(raw) {
  return raw.some(s => (s.options && s.options.length > 1) || s.yes || s.no || s.target);
}

/** { type, data } döner — type V3'ün RENDERERS tablosunda bilinen bir kalıptır. Uyarlanamazsa (veya dallıysa) null. */
export function adaptLegacy(t) {
  if (!t || !t.visualType || !t.visualData) return null;
  const fn = ADAPTERS[t.visualType];
  if (!fn) return null;
  try {
    return fn(t.visualData);
  } catch (e) {
    console.warn('[legacy-adapt] hata:', t.id, e);
    return null;
  }
}

/** Bu konu adaptasyonla V3'e taşınabilir mi? (kural.js:konu() bunu sorar) */
export function adaptable(t) {
  return !!adaptLegacy(t);
}

/* ==========================================================================
   DALLI KARAR GRAFİKLERİ (branch_graph) — decision_sim'e sığmayan, step_reveal'a
   düzleşmeyen 4 konu. Üç ham şema TEK bir iç grafiğe normalize edilir:
     { title, trap, start, nodes: Map<id, {text, options:[{label,to,result}]}> }
   Sonra kullanıcı düğmeye tıklaya tıklaya YAZARIN KENDİ GRAFİĞİNİ gezer.
   ========================================================================== */

function normalizeGraph(t) {
  const vd = t.visualData || {};
  const nodes = new Map();
  let start = null;

  if (Array.isArray(vd.nodes) && Array.isArray(vd.edges)) {
    // nodes + edges (tpc_felsefe_003 tipi)
    const outs = new Map();
    vd.edges.forEach(e => { if (!outs.has(e.from)) outs.set(e.from, []); outs.get(e.from).push(e); });
    vd.nodes.forEach(n => {
      const out = outs.get(n.id) || [];
      if (!out.length) nodes.set(n.id, { text: n.label, options: [] });
      else nodes.set(n.id, { text: n.label, options: out.map(e => ({ label: e.label || '', to: e.to })) });
    });
    start = vd.nodes[0] && vd.nodes[0].id;
  } else if (Array.isArray(vd.nodes)) {
    // nodes + yes/no veya nodes + result (tpc_milletlerarasi_003 tipi)
    vd.nodes.forEach(n => {
      if (n.result) {
        nodes.set(n.id, { text: n.result, options: [] });
      } else {
        const opts = [];
        if (n.yes) opts.push({ label: 'Evet', to: n.yes });
        if (n.no) opts.push({ label: 'Hayır', to: n.no });
        nodes.set(n.id, { text: n.question, options: opts });
      }
    });
    start = (vd.nodes[0] && vd.nodes[0].id) || 'start';
  } else if (Array.isArray(vd.steps)) {
    // steps + options(target/result) (tpc_felsefe_002 / tpc_genel_kamu_002 tipi)
    vd.steps.forEach((s, i) => {
      const id = s.id || (i === 0 ? '__start__' : 'step_' + i);
      nodes.set(id, {
        text: s.question,
        options: (s.options || []).map(o => ({ label: o.label, to: o.target || null, result: o.result || null }))
      });
    });
    start = (vd.steps[0] && vd.steps[0].id) || '__start__';
  }

  if (!nodes.size || !start || !nodes.has(start)) return null;
  return { title: vd.title, trap: trapOf(vd), start, nodes };
}

/** Bu konu gerçekten dallı bir grafik mi (branch_graph yoluyla gezilebilir mi)? */
export function hasBranchGraph(t) {
  return !!(t && (t.visualType === 'decision_tree' || t.visualType === 'flowchart') && normalizeGraph(t));
}

/**
 * Dallı grafiği #kural-host'a doğrudan çizer (V3 dispatcher'ından geçmez,
 * decision_sim/vb. tablosuna yeni tip eklemez — dosyaya dokunmadan izole kalır).
 * Aynı görsel dili korumak için V3'ün zaten enjekte ettiği hv3-* sınıfları kullanılır.
 */
export function renderBranchGraph(host, t) {
  const g = normalizeGraph(t);
  if (!g || !host) return false;

  // V3'ün global stili (hv3-*) enjekte edilmemiş olabilir — motoru "boş" bir
  // hedefe çizdirip yalnızca CSS enjeksiyonunu tetikliyoruz, dosyasına dokunmadan.
  const V = typeof window !== 'undefined' ? window.HMGSV3 : null;
  if (V && typeof V.render === 'function') {
    try { V.render(document.createElement('div'), 'css_only', {}, { visualType: '__css_only__' }); } catch (e) { /* yalnız CSS için, hata beklenir */ }
  }

  let path = [g.start];
  let leafSeq = 0;

  host.innerHTML = '<div class="hv3"></div>';
  const root = host.querySelector('.hv3');
  draw();
  return true;

  function cur() { return g.nodes.get(path[path.length - 1]); }

  function goTo(id, text) {
    if (id) {
      path.push(id);
    } else {
      const leafId = '__leaf_' + (leafSeq++);
      g.nodes.set(leafId, { text, options: [] });
      path.push(leafId);
    }
    draw();
  }

  function draw() {
    const node = cur();
    const isEnd = !node.options.length;
    const crumb = path.length > 1
      ? `<div class="hv3-nav" style="margin-bottom:10px">
           <button data-el="back">← Geri</button>
           <span class="hv3-cap">${path.length}. durak</span>
           <button data-el="reset">Başa dön</button>
         </div>`
      : '';

    root.innerHTML =
      (g.title ? `<div class="hv3-h">${esc(g.title)}</div>` : '') +
      (path.length === 1 ? `<p class="hv3-hint">Tıkla, ilerle — kendi grafiğinde yürü.</p>` : '') +
      crumb +
      `<div class="hv3-res" style="display:block;background:${isEnd ? 'var(--hv3-green-soft)' : 'var(--hv3-raise)'}">
         <div class="hv3-rt">${esc(node.text || '')}</div>
       </div>` +
      (isEnd
        ? ''
        : `<div class="hv3-qopts" data-el="opts" style="flex-direction:column;align-items:stretch;gap:8px">
             ${node.options.map((o, i) => `<button data-i="${i}">${esc(o.label || '')}</button>`).join('')}
           </div>`) +
      (isEnd && g.trap ? `<div class="hv3-trap"><b>Sınav tuzağı:</b> ${esc(g.trap)}</div>` : '') +
      (isEnd ? `<div class="hv3-nav"><span class="hv3-cap">Uç noktaya ulaşıldı</span><button data-el="reset">Baştan dene</button></div>` : '');

    root.querySelectorAll('[data-el=opts] button').forEach(b => b.addEventListener('click', () => {
      const opt = node.options[+b.dataset.i];
      if (opt.to && g.nodes.has(opt.to)) goTo(opt.to, null);
      else if (opt.result) goTo(null, opt.result);
    }));
    root.querySelectorAll('[data-el=back]').forEach(b => b.addEventListener('click', () => { path.pop(); draw(); }));
    root.querySelectorAll('[data-el=reset]').forEach(b => b.addEventListener('click', () => { path = [g.start]; draw(); }));
  }
}

/** Buton ipucunda ve kural başlığında gösterilecek Türkçe etiket — gerçek etkileşimi anlatır, eski tip adını değil. */
export function legacyLabel(t) {
  if (hasBranchGraph(t)) return 'dallı karar ağacı · kendi yolunu seç';
  return {
    comparison_table: 'gizli hücre tahmini',
    hierarchy_pyramid: 'tıkla-aç piramit',
    timeline: 'sırayla aç zaman çizelgesi',
    decision_tree: 'sırayla aç karar süreci',
    flowchart: 'sırayla aç akış şeması'
  }[t && t.visualType] || null;
}
