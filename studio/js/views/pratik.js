/* ==========================================================================
   views/pratik.js — PRATİK ALANI (Mevzuat Üreteçleri + Notlarından Tekrar)

   Burası TEKRAR ve UYGULAMA yeridir:
   1. Dinamik Mevzuat Üreteçleri (Miras payı, Ciro zinciri) — sonsuz, seed'li.
   2. "Notlarından Tekrar" — HMGS_Takip_App'teki GERÇEK ve GÜNCEL notlardan
      (keywords[]/notes, hmgs_2026_data.json) her açılışta canlı çekilir.

   9 Ağustos 2026 notu: Bu dosyada önceden 4 SABİT ("hardcode") "Kişisel
   Çalışma Notu Simülatörü" vardı (Yokluk/Butlan, Sınırlı Ehliyetsiz, Gaiplik,
   Alacağın Devri) — o an hangi notlar varsa elle seçilip HTML/JS içine
   gömülmüştü, kullanıcı yeni not ekledikçe hiç değişmiyordu. Proje kuralı
   ("Pratik/Quiz/Simülatör özellikleri asla hardcode olamaz", bkz.
   HMGS_Takip_App/CLAUDE.md) gereği kaldırıldı. Yerine studio_server.py'nin
   yeni GET /api/takip-notes uç noktası (SALT OKUNUR, hiçbir dosyaya yazmaz)
   üzerinden anlık çekilen, konu bazlı "tekrarlanan kavram / açık soru"
   listesi geldi. Bilerek YAPILMAYAN: burada sahte bir "doğru cevap" veya
   tanım ÜRETİLMİYOR — notlar zaten projenin kendi kuralına göre "içerik
   kaynağı değil, indekstir"; kullanıcı kartı görüp kendi hafızasından/
   kitabından hatırlamaya çalışır, sayfa numarası ona kitaptaki yeri gösterir.
   ========================================================================== */

import { esc, $, toast } from '../ui.js';
import { subjectName } from '../data.js';
import { recordDrill, drillStats, save } from '../store.js';
import * as miras from '../gen/miras.js';
import * as ciro from '../gen/ciro.js';
import * as icra from '../gen/icra.js';
import * as ehliyet from '../gen/ehliyet.js';

/* ---------- DİNAMİK ÜRETEÇLER ---------- */
export const GENERATORS = [
  {
    id: 'miras',
    subjectId: 'medeni_hukuk',
    topicId: 'tpc_medeni_012',
    title: 'Miras payı — soy ağacı ve pay doldurma',
    desc: 'Rastgele bir aile kurulur, yasal payları ve saklı payları sen doldurursun.',
    basis: 'TMK m. 495-506',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'altsoy', label: 'Eş + altsoy' },
      { id: 'halefiyet', label: 'Halefiyet (torunlar)' },
      { id: 'anababa', label: '2. zümre' },
      { id: 'kardes', label: 'Kardeşe halefiyet' },
      { id: 'buyukanababa', label: '3. zümre' },
      { id: 'yalnizes', label: 'Tek başına eş' }
    ],
    uret: (seed, kalip) => miras.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'ciro',
    subjectId: 'ticaret_hukuku',
    topicId: null,
    title: 'Ciro zinciri — yetkili hamil ve def\'iler',
    desc: 'Bir bono/çek ve arkasındaki ciro silsilesi üretilir. Zincir bağlı mı, borçlu def\'i ileri sürebilir mi?',
    basis: 'TTK m. 681-690, 790',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'temiz', label: 'Temiz zincir' },
      { id: 'beyaz', label: 'Beyaz ciro' },
      { id: 'kirik', label: 'Kopuk silsile' },
      { id: 'tahsil', label: 'Tahsil cirosu' },
      { id: 'rehin', label: 'Rehin cirosu' },
      { id: 'gecikmis', label: 'Gecikmiş ciro' },
      { id: 'menfi', label: '"Ciro edilemez"' },
      { id: 'kotuniyet', label: 'Bile bile zarara' }
    ],
    uret: (seed, kalip) => ciro.uretPratik(seed, kalip || undefined)
  },
  // 12 Ağustos 2026: gen/icra.js ve gen/ehliyet.js dosyaları vardı ama bu
  // diziye kayıtlı olmadıkları için Stüdyo'da hiç görünmüyorlardı.
  {
    id: 'icra',
    subjectId: 'icra_iflas',   // data.js'teki gerçek ders id'si
    topicId: null,
    title: 'İlamsız icra & itiraz — takibin durması ve kaldırma',
    desc: 'Takip talebinden itirazın kaldırılmasına: itiraz süresinde mi, takip durur mu, icra mahkemesine gidilir mi?',
    basis: 'İİK m. 58-72',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'imza_itiraz', label: 'İmzaya itiraz' },
      { id: 'borca_itiraz', label: 'Borca itiraz' },
      { id: 'gecikmis_itiraz', label: 'Süresi geçmiş itiraz' },
      { id: 'itiraz_yok', label: 'İtirazsız kesinleşme' }
    ],
    uret: (seed, kalip) => icra.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'ehliyet',
    subjectId: 'medeni_hukuk',
    topicId: null,
    title: 'Hukuki işlem sakatlıkları — ehliyet ve geçersizlik',
    desc: 'Yaş, ayırt etme gücü ve işlem türüne göre ehliyet grubu ile yaptırımı (butlan, iptal, bağlamazlık) belirle.',
    basis: 'TMK m. 9-16 · TBK m. 27-39',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'tam_ehliyetsiz', label: 'Tam ehliyetsiz' },
      { id: 'sinirli_ehliyetsiz_bagis', label: 'Karşılıksız kazanım' },
      { id: 'sinirli_ehliyetsiz_kefalet', label: 'Yasak işlem (kefalet)' },
      { id: 'sinirli_ehliyetsiz_onaysiz', label: 'Onaysız borçlandırıcı' },
      { id: 'korkutma_ikrah', label: 'Korkutma (ikrah)' },
      { id: 'muvazaa', label: 'Muvazaa' },
      { id: 'gecerli_islem', label: 'Geçerli işlem' }
    ],
    uret: (seed, kalip) => ehliyet.uretPratik(seed, kalip || undefined)
  }
];

/* ---------- NOTLARINDAN TEKRAR (canlı, hardcode YOK) ---------- */
// HMGS_Takip_App/hmgs_2026_data.json'dan studio_server.py'nin salt-okunur
// /api/takip-notes uç noktası üzerinden çekilir. Sonuç önbelleğe alınır;
// "Yenile" ile veya pratik ekranına her girişte tazelenir.
let notesCache = null;   // { ok, generatedAt, entryCount, subjects:[{subject, items:[...]}]}
let notesLoading = false;
let notesErr = null;

async function fetchTakipNotes(force) {
  if (notesLoading) return;
  if (notesCache && !force) return;
  notesLoading = true;
  notesErr = null;
  const host = $('#view-pratik');
  if (host && !notesCache) host.innerHTML = katalogHTML();

  const endpoints = [
    '/api/takip-notes',
    'http://localhost:8766/api/takip-notes',
    'http://127.0.0.1:8766/api/takip-notes'
  ];

  let loaded = false;
  let lastErr = null;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) {
          notesCache = data;
          loaded = true;
          break;
        }
      }
    } catch (e) {
      lastErr = e.name === 'AbortError' ? 'Zaman aşımı (4sn)' : (e.message || String(e));
    }
  }

  if (!loaded) {
    notesErr = lastErr || 'Notlar alınamadı';
    console.warn('[pratik] /api/takip-notes okunamadı:', notesErr);
  }

  notesLoading = false;
  const h = $('#view-pratik');
  if (h && cur.mode === 'catalog') h.innerHTML = katalogHTML();
  if (h && cur.mode === 'catalog') bindKatalogEvents(h);
}

const genById = id => GENERATORS.find(g => g.id === id);

let cur = {
  mode: 'catalog', // 'catalog', 'generator', 'notes'
  genId: null, notesSubject: null, kalip: '', seed: null, pkg: null, gen: null,
  t0: 0, sayac: 0, sonsuz: false, seri: 0, enIyiSeri: 0, vakaHata: 0
};

const yeniSeed = () => 1 + Math.floor(Math.random() * 999999);

/* ---------- EKRAN RENDER ---------- */

export function render() {
  const host = $('#view-pratik');
  if (!host) return;

  if (cur.mode === 'notes' && cur.notesSubject) {
    renderNotesSubjectView(host);
    return;
  }

  if (cur.mode === 'generator' && cur.genId) {
    renderGeneratorView(host);
    return;
  }

  // Varsayılan: Katalog ekranı
  host.innerHTML = katalogHTML();
  bindKatalogEvents(host);
  if (!notesCache && !notesLoading) fetchTakipNotes(false);
}

function notesReviewSectionHTML() {
  if (notesLoading && !notesCache) {
    return `<div class="card pk-d" style="display:flex;align-items:center;justify-content:space-between">
      <span>Notların Takip uygulamasından çekiliyor…</span>
      <button class="btn btn-s" data-act="notes-retry">Yenile</button>
    </div>`;
  }
  if (notesErr && !notesCache) {
    return `<div class="card pk-d">
      Notlarına ulaşılamadı (${esc(notesErr)}). Takip uygulamasının sunucusu (server.py, port 8000)
      ve Stüdyo sunucusu aynı anda açık mı kontrol et.
      <button class="btn btn-s" data-act="notes-retry" style="margin-left:0.5rem;">Tekrar dene</button>
    </div>`;
  }
  const subjects = (notesCache && notesCache.subjects) || [];
  if (!subjects.length) {
    return `<div class="card pk-d">Henüz Takip uygulamasında anahtar kelime/not girilmemiş — bir kayıt ekleyince burada tekrar listesi belirir.</div>`;
  }
  return `
    <div class="grid grid-2" style="margin-top:0.75rem">
      ${subjects.map(s => {
        const tekrar = s.items.filter(i => i.count >= 2).length;
        const acik = s.items.filter(i => i.open).length;
        return `<button class="card pratik-card" data-notes-ac="${esc(s.subject)}" style="text-align:left;cursor:pointer;">
          <div class="pk-t" style="font-weight:700;color:var(--accent-ink);">${esc(s.subject)}</div>
          <div class="pk-d" style="margin:0.35rem 0;">${s.items.length} kavram/not${tekrar ? ` · <b>${tekrar} tekrarlanan</b>` : ''}${acik ? ` · ${acik} açık soru` : ''}</div>
        </button>`;
      }).join('')}
    </div>
    <div class="pk-d" style="margin-top:0.5rem;opacity:0.75;">
      Son güncelleme: ${notesCache.generatedAt ? new Date(notesCache.generatedAt).toLocaleString('tr-TR') : '—'}
      · <button class="btn btn-s" data-act="notes-retry">Yenile</button>
    </div>`;
}

function katalogHTML() {
  const hepsi = drillStats(null);
  return `
    <div class="wrap">
      <h2>Pratik & Simülasyon Alanı</h2>
      <div class="basisline">
        Konu sayfası öğrenme yeri; burası <b>tekrar ve uygulama</b> yeridir.
        Hem mevzuat üreteçlerinden sonsuz vaka çözebilir, hem de Takip uygulamasındaki
        <b>gerçek notlarından</b> canlı üretilen tekrar listesiyle kendini test edebilirsin.
        ${hepsi.n ? `Şu ana kadar ${hepsi.n} hücre, %${Math.round(hepsi.ok / hepsi.n * 100)} doğru.` : ''}
      </div>

      <h3 style="margin-top:1.5rem;font-size:1.1rem;font-weight:700;color:var(--ink);">🔁 Notlarından Tekrar (canlı, Takip uygulamasından)</h3>
      ${notesReviewSectionHTML()}

      <h3 style="margin-top:2rem;font-size:1.1rem;font-weight:700;color:var(--ink);">🚀 Dinamik Mevzuat Üreteçleri</h3>
      <div class="grid grid-2" style="margin-top:0.75rem">
        ${GENERATORS.map(g => {
          const st = drillStats(g.id);
          return `<button class="card pratik-card" data-gen-ac="${esc(g.id)}" style="text-align:left;cursor:pointer;">
            <div class="pk-t" style="font-weight:700;color:var(--ink);">${esc(g.title)}</div>
            <div class="pk-d" style="margin:0.35rem 0;">${esc(g.desc)}</div>
            <div class="pk-m">${esc(subjectName(g.subjectId))} · ${esc(g.basis)}${st.n ? ` · ${st.ok}/${st.n} doğru` : ''}</div>
          </button>`;
        }).join('')}
      </div>

      <div class="card" style="margin-top:1.5rem;display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap">
        <div style="flex:1;min-width:16rem">
          <div class="pk-t" style="font-weight:700;">Sonsuz Üreteç Modu ∞</div>
          <div class="pk-d" style="margin:0">
            Tüm mevzuat üreteçlerinden durmadan vaka gelir; seri sayacı tutulur ve
            <b>zorlandığın senaryolar daha sık</b> çıkar.
          </div>
        </div>
        <button class="btn" data-act="pratik-sonsuz-basla">Başlat ∞</button>
      </div>
    </div>`;
}

function bindKatalogEvents(host) {
  host.querySelectorAll('[data-gen-ac]').forEach(b => {
    b.onclick = () => ac(b.dataset.genAc);
  });
  host.querySelectorAll('[data-notes-ac]').forEach(b => {
    b.onclick = () => acNotes(b.dataset.notesAc);
  });
  host.querySelectorAll('[data-act="notes-retry"]').forEach(b => {
    b.onclick = () => fetchTakipNotes(true);
  });
  const btnSonsuz = host.querySelector('[data-act="pratik-sonsuz-basla"]');
  if (btnSonsuz) btnSonsuz.onclick = () => sonsuzBasla();
}

/* ---------- DİNAMİK ÜRETEÇ EKRANI ---------- */

function renderGeneratorView(host) {
  const g = genById(cur.genId);
  if (!g) { cur.mode = 'catalog'; return render(); }
  if (!cur.pkg) yeniVaka();

  const st = drillStats(cur.sonsuz ? null : g.id);

  host.innerHTML = `
    <div class="wrap">
      <div class="btn-row" style="margin-bottom:1.25rem">
        <button class="btn btn-2 btn-s" id="btn-pratik-geri">‹ Pratik alanı</button>
        <span class="chip">${esc(cur.gen.basis)}</span>
        ${st.n ? `<span class="chip">${st.ok}/${st.n} · %${Math.round(st.ok / st.n * 100)}</span>` : ''}
        ${cur.sonsuz ? `<span class="chip ${cur.seri >= 3 ? 'green' : ''}">🔥 seri ${cur.seri}${cur.enIyiSeri > cur.seri ? ` · en iyi ${cur.enIyiSeri}` : ''}</span>` : ''}
        <span style="margin-left:auto"></span>
        <button class="btn" id="btn-pratik-yeni">Yeni vaka →</button>
      </div>

      <h2>${esc(cur.sonsuz ? 'Sonsuz mod' : cur.gen.title)}</h2>
      <div class="basisline">
        Vaka #${cur.seed} · ${esc(cur.pkg.baslik || '')} · ${esc(cur.gen.title)} — bu oturumda ${cur.sayac} vaka
      </div>

      <div id="pratik-panels"></div>
      <div class="visual-slot hv3-host" id="pratik-fill"></div>

      <div class="flow-end" style="margin-top:2rem;">
        <button class="btn" id="btn-pratik-yeni-2">Yeni vaka çöz →</button>
      </div>
    </div>`;

  $('#btn-pratik-geri').onclick = () => geri();
  $('#btn-pratik-yeni').onclick = () => yeni();
  const b2 = $('#btn-pratik-yeni-2');
  if (b2) b2.onclick = () => yeni();

  ciz();
}

/* ---------- NOTLARINDAN TEKRAR: KONU DETAY EKRANI ---------- */
// Sahte "doğru cevap" ÜRETMEZ — kart sadece geri çağırma (recall) ipucu ve
// varsa sayfa numarasını gösterir; kullanıcı hatırlar ya da kitaba bakar.

function renderNotesSubjectView(host) {
  const subj = cur.notesSubject;
  const data = notesCache && notesCache.subjects.find(s => s.subject === subj);
  if (!data) { cur.mode = 'catalog'; return render(); }

  host.innerHTML = `
    <div class="wrap">
      <div class="btn-row" style="margin-bottom:1.25rem">
        <button class="btn btn-2 btn-s" id="btn-notes-geri">‹ Pratik alanı</button>
        <span class="chip">${esc(subj)}</span>
        <span class="chip">${data.items.length} kavram/not</span>
      </div>

      <h2>${esc(subj)} — Notlarından Tekrar</h2>
      <div class="basisline">
        Bu liste Takip uygulamandaki gerçek kayıtlardan geliyor. "N. kez" rozeti aynı kavramın
        farklı günlerde yine yanlış/takıldığın listesine girdiğini gösterir — projenin kendi kuralına göre
        bu, ham yanlış sayısından daha güçlü bir zayıflık sinyalidir. Kartın içeriği bilerek boş: doğru
        cevabı kendi hafızandan veya kitaptan hatırlamaya çalış.
      </div>

      <div class="grid grid-2" style="margin-top:1rem">
        ${data.items.map(it => `
          <div class="card" style="text-align:left;">
            <div class="pk-t" style="font-weight:700;">${esc(it.term)}${it.open ? ' <span class="chip amber">❓ açık soru</span>' : ''}</div>
            <div class="pk-m" style="margin-top:0.35rem;">
              ${it.count >= 2 ? `<span class="chip red">${it.count}. kez</span> ` : ''}
              ${it.pages.length ? `<span class="chip">📖 ${it.pages.map(esc).join(', ')}</span> ` : ''}
              ${it.topics.length ? esc(it.topics.join(', ')) : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  $('#btn-notes-geri').onclick = () => geri();
}

/* ---------- VAKA ÇİZİM (ÜRETEÇLER İÇİN) ---------- */

function ciz() {
  const V3 = window.HMGSV3;
  const panelHost = $('#pratik-panels');
  if (!cur.pkg || !panelHost) return;

  panelHost.innerHTML = '';
  (cur.pkg.panels || []).forEach((p, i) => {
    const box = document.createElement('div');
    if (p.kind === 'html') {
      box.className = 'pratik-panel';
      box.innerHTML = p.html;
    } else if (p.kind === 'v3') {
      box.className = 'visual-slot hv3-host';
      panelHost.appendChild(box);
      if (!V3 || typeof V3.render !== 'function') { box.innerHTML = '<p class="hint">Görsel motor yüklenemedi.</p>'; return; }
      try { V3.render(box, `pr_p${i}_${cur.seed}`, p.visualData, { visualType: p.visualType }); }
      catch (e) { console.warn('[pratik] panel çizilemedi:', e); box.remove(); }
      return;
    }
    panelHost.appendChild(box);
  });

  const fillHost = $('#pratik-fill');
  if (!fillHost) return;
  if (!V3 || typeof V3.render !== 'function') { fillHost.innerHTML = '<p class="hint">Görsel motor yüklenemedi.</p>'; return; }
  try {
    V3.render(fillHost, 'pr_fill_' + cur.seed, cur.pkg.fill, { visualType: 'fill_slots' });
  } catch (e) {
    console.warn('[pratik] doldurma tablosu çizilemedi:', e);
    fillHost.innerHTML = '<p class="hint">Bu vaka çizilemedi, yeni vaka al.</p>';
  }
}

function yeniVaka() {
  if (cur.sonsuz) {
    const g = GENERATORS[Math.floor(Math.random() * GENERATORS.length)];
    cur.gen = g; cur.genId = g.id; cur.kalip = '';
  } else {
    cur.gen = genById(cur.genId);
  }
  cur.seed = yeniSeed();
  try {
    cur.pkg = cur.gen.uret(cur.seed, cur.kalip);
    cur.vakaHata = 0;
  } catch (e) {
    console.error('[pratik] üreteç hatası:', cur.gen.id, e);
    cur.vakaHata++;
    if (cur.vakaHata < 3) return yeniVaka();
    cur.pkg = null;
    toast('Vaka üretilemedi: ' + cur.gen.id);
    return;
  }
  cur.t0 = Date.now();
  cur.sayac++;
}

/* ---------- DIŞ EYLEMLER ---------- */

export function ac(genId) {
  cur = { ...cur, mode: 'generator', genId, gen: genById(genId), notesSubject: null, kalip: '', seed: null, pkg: null, sonsuz: false, sayac: 0, seri: 0 };
  render();
}
export function acNotes(subject) {
  cur = { ...cur, mode: 'notes', notesSubject: subject, genId: null, sonsuz: false };
  render();
}
export function sonsuzBasla() {
  cur = { ...cur, mode: 'generator', genId: GENERATORS[0].id, gen: GENERATORS[0], notesSubject: null, kalip: '', seed: null, pkg: null, sonsuz: true, sayac: 0, seri: 0, enIyiSeri: 0 };
  render();
}
export function geri() { cur.mode = 'catalog'; cur.genId = null; cur.notesSubject = null; cur.sonsuz = false; render(); }
export function yeni() { cur.pkg = null; render(); }
export function aktif() { return cur.pkg; }
