/* ==========================================================================
   views/pratik.js — PRATİK ALANI (Dinamik Mevzuat Simülatörleri)

   Burası TEKRAR ve UYGULAMA yeridir:
   10 Temel Hukuk Kurumunda Sonsuz, Tohumlu, İnteraktif Simülatörler.
   Apple Intelligence ve saf minimalizm estetiği; sıfır emoji, sıfır RGB/parıltı.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { esc, $, toast } from '../ui.js';
import { subjectName } from '../data.js';
import { recordDrill, drillStats } from '../store.js';
import * as miras from '../gen/miras.js';
import * as ciro from '../gen/ciro.js';
import * as icra from '../gen/icra.js';
import * as ehliyet from '../gen/ehliyet.js';
import * as gaiplik from '../gen/gaiplik.js';
import * as alacak_devri from '../gen/alacak_devri.js';
import * as kira from '../gen/kira.js';
import * as hmk_sure from '../gen/hmk_sure.js';
import * as bosanma from '../gen/bosanma.js';
import * as ceza_suc from '../gen/ceza_suc.js';

/* ---------- KATEGORİ TANIMLARI ---------- */
export const CATEGORIES = [
  { id: 'all', label: 'Tüm Simülatörler' },
  { id: 'medeni_aile', label: 'Medeni & Aile' },
  { id: 'borclar_kira', label: 'Borçlar & Ticaret' },
  { id: 'usul_icra', label: 'Usul & İcra' },
  { id: 'ceza_cmk', label: 'Ceza Hukuku' }
];

/* ---------- DİNAMİK ÜRETEÇLER (10 TEMEL KURUM) ---------- */
export const GENERATORS = [
  {
    id: 'miras',
    subjectId: 'medeni_hukuk',
    category: 'medeni_aile',
    topicId: 'tpc_medeni_012',
    title: 'Miras payı: soy ağacı ve pay doldurma',
    desc: 'Rastgele bir aile kurgulanır; yasal ve saklı paylar doldurulur.',
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
    id: 'gaiplik',
    subjectId: 'medeni_hukuk',
    category: 'medeni_aile',
    topicId: null,
    title: 'Gaiplik: süre ve mahkeme simülatörü',
    desc: 'Ölüm tehlikesi (1 yıl) veya uzun süre haber alamama (5 yıl) süre ve mahkeme motoru.',
    basis: 'TMK m. 31-35',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'olum_tehlikesi_tam', label: 'Ölüm tehlikesi (1 yıl dolmuş)' },
      { id: 'olum_tehlikesi_erken', label: 'Ölüm tehlikesi (Süre dolmamış)' },
      { id: 'haber_alamama_tam', label: 'Haber alamama (5 yıl dolmuş)' },
      { id: 'haber_alamama_erken', label: 'Haber alamama (Süre dolmamış)' },
      { id: 'evlilik_fesih', label: 'Gaiplik ve evliliğin akıbeti' }
    ],
    uret: (seed, kalip) => gaiplik.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'ehliyet',
    subjectId: 'medeni_hukuk',
    category: 'medeni_aile',
    topicId: null,
    title: 'Hukuki işlem sakatlıkları: ehliyet ve geçersizlik',
    desc: 'Yaş, ayırt etme gücü ve işlem türüne göre ehliyet grubu ile yaptırımı belirle.',
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
  },
  {
    id: 'bosanma',
    subjectId: 'medeni_hukuk',
    category: 'medeni_aile',
    topicId: null,
    title: 'Boşanma sebepleri: kusur ve süre simülatörü',
    desc: 'Zina, hayata kast ve evlilik birliğinin sarsılmasında af, süre ve tazminat kuralları.',
    basis: 'TMK m. 161-178',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'zina_sure_af', label: 'Zina (6 ay/5 yıl ve af)' },
      { id: 'hayata_kast_af', label: 'Hayata kast ve pek kötü muamele' },
      { id: 'evlilik_birligi_kusur', label: 'Evlilik birliğinin sarsılması' },
      { id: 'tazminat_zamani', label: 'Maddi ve manevi tazminat zamanaşımı' }
    ],
    uret: (seed, kalip) => bosanma.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'kira',
    subjectId: 'borclar_hukuku',
    category: 'borclar_kira',
    topicId: null,
    title: 'Kira hukuku: tahliye ve süre simülatörü',
    desc: 'Temerrüt ihtarı (30 gün), tahliye taahhüdü, 3 yıllık kiralama yasağı ve 10 yıllık uzama.',
    basis: 'TBK m. 315 · 342 · 347 · 350-355',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'temerrut_ihtar', label: 'Temerrüt ihtarı (30 gün)' },
      { id: 'tahliye_taahhudu', label: 'Tahliye taahhüdü ve süre' },
      { id: 'gereksinim_ve_yasak', label: 'İhtiyaç ve 3 yıl yasağı' },
      { id: 'depozito_siniri', label: 'Depozito güvence sınırı' },
      { id: 'on_yillik_uzama', label: '10 yıllık uzama ve fesih' }
    ],
    uret: (seed, kalip) => kira.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'alacak_devri',
    subjectId: 'borclar_hukuku',
    category: 'borclar_kira',
    topicId: null,
    title: 'Alacağın devri: şekil ve def\'iler',
    desc: 'Yazılı şekil şartı, borçlunun savunmaları (m. 188) ve devir vaadinin geçerliliği.',
    basis: 'TBK m. 183-193',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'yazili_gecerli', label: 'Yazılı devir (Geçerli)' },
      { id: 'sozlu_gecersiz', label: 'Sözlü devir (Geçersiz)' },
      { id: 'devir_vaadi', label: 'Alacağın devri vaadi' },
      { id: 'borclunun_defisi', label: 'Borçlunun def\'i ileri sürmesi' }
    ],
    uret: (seed, kalip) => alacak_devri.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'ciro',
    subjectId: 'ticaret_hukuku',
    category: 'borclar_kira',
    topicId: null,
    title: 'Ciro zinciri: yetkili hamil ve def\'iler',
    desc: 'Bono veya çek arkasındaki ciro silsilesi üretilir. Zincir bağlı mı, borçlu def\'i ileri sürebilir mi?',
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
  {
    id: 'icra',
    subjectId: 'icra_iflas',
    category: 'usul_icra',
    topicId: null,
    title: 'İlamsız icra: itiraz ve takibin durması',
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
    id: 'hmk_sure',
    subjectId: 'hmk',
    category: 'usul_icra',
    topicId: null,
    title: 'HMK süreler ve usul hamleleri',
    desc: 'Cevap süresi (2 hafta), ek süre talebi, hakimin kesin süre ihtarı ve istinaf başvuru süresi.',
    basis: 'HMK m. 116 · 117 · 127 · 344 · 345',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'cevap_suresi_temel', label: '2 haftalık cevap süresi' },
      { id: 'ek_cevap_suresi', label: 'Cevap için ek süre (2 hafta)' },
      { id: 'kesin_sure_ihtari', label: 'Hakimin kesin süre ihtarı' },
      { id: 'istinaf_suresi', label: 'İstinaf kanun yolu süresi' },
      { id: 'ilk_itiraz_yetki', label: 'Yetki ilk itirazı' }
    ],
    uret: (seed, kalip) => hmk_sure.uretPratik(seed, kalip || undefined)
  },
  {
    id: 'ceza_suc',
    subjectId: 'ceza_hukuku',
    category: 'ceza_cmk',
    topicId: null,
    title: 'Ceza suç tipleri ve iştirak dereceleri',
    desc: 'Tehdit vs. şantaj, hırsızlık vs. yağma ve müşterek faillik ile yardım etme ayrımı.',
    basis: 'TCK m. 37 · 39 · 106 · 107 · 142 · 148',
    kaliplar: [
      { id: '', label: 'Karışık' },
      { id: 'tehdit_santaj_ayrimi', label: 'Tehdit ve şantaj ayrımı' },
      { id: 'hirsizlik_yagma_ayrimi', label: 'Hırsızlık ve yağma ayrımı' },
      { id: 'musterek_faillik', label: 'Fiili birlikte işleme (Müşterek fail)' },
      { id: 'yardim_etme', label: 'Yardım etme (Şeriklik)' }
    ],
    uret: (seed, kalip) => ceza_suc.uretPratik(seed, kalip || undefined)
  }
];

const genById = id => GENERATORS.find(g => g.id === id);

let cur = {
  mode: 'catalog', // 'catalog' veya 'generator'
  genId: null,
  filterCategory: 'all',
  kalip: '',
  seed: null,
  pkg: null,
  gen: null,
  t0: 0,
  sayac: 0,
  sonsuz: false,
  seri: 0,
  enIyiSeri: 0,
  vakaHata: 0
};

const yeniSeed = () => 1 + Math.floor(Math.random() * 999999);

/* ---------- SLOT COMMIT DİNLENMESİ (DRILL İSTATİSTİĞİ) ---------- */
let slotCommitBound = false;
function initSlotCommitListener() {
  if (slotCommitBound || typeof window === 'undefined') return;
  slotCommitBound = true;
  window.addEventListener('hv3-slot-commit', e => {
    if (cur.mode !== 'generator' || !cur.genId) return;
    const ok = !!(e.detail && e.detail.ok);
    recordDrill(cur.genId, ok);
    if (cur.sonsuz) {
      if (ok) {
        cur.seri++;
        if (cur.seri > cur.enIyiSeri) cur.enIyiSeri = cur.seri;
      } else {
        cur.seri = 0;
      }
      const chipSeri = $('#pratik-chip-seri');
      if (chipSeri) {
        chipSeri.className = 'chip ' + (cur.seri >= 3 ? 'green' : '');
        chipSeri.textContent = `Seri: ${cur.seri}${cur.enIyiSeri > cur.seri ? ` · en iyi ${cur.enIyiSeri}` : ''}`;
      }
    }
  });
}

/* ---------- EKRAN RENDER ---------- */

export function render() {
  initSlotCommitListener();
  const host = $('#view-pratik');
  if (!host) return;

  if (cur.mode === 'generator' && cur.genId) {
    renderGeneratorView(host);
    return;
  }

  // Varsayılan: Katalog ekranı
  host.innerHTML = katalogHTML();
  bindKatalogEvents(host);
}

function katalogHTML() {
  const hepsi = drillStats(null);
  const filteredGenerators = cur.filterCategory === 'all'
    ? GENERATORS
    : GENERATORS.filter(g => g.category === cur.filterCategory);

  return `
    <div class="wrap">
      <div class="pratik-header-row">
        <div>
          <div class="section-kicker">Mevzuat Simülasyonu ve İnteraktif Muhakeme</div>
          <h2 class="pratik-main-title">Pratik ve Simülasyon Alanı</h2>
          <p class="pratik-subtitle">
            Konu sayfası kuralları öğrenme, burası ise dinamik vakalarla refleks kazanma yeridir.
            HMGS sınavında en yüksek soru ağırlığına sahip kritik kurumlar için tohumlu, sınırsız simülatörler.
          </p>
        </div>
        <div class="pratik-global-metric">
          <span class="metric-val">${hepsi.n ? `%${Math.round(hepsi.ok / hepsi.n * 100)}` : '%0'}</span>
          <span class="metric-lbl">${hepsi.n ? `${hepsi.ok}/${hepsi.n} doğru hücre` : 'Henüz vaka çözülmedi'}</span>
        </div>
      </div>

      <div class="pratik-spotlight-card">
        <div class="spotlight-content">
          <div class="spotlight-kicker">Kesintisiz Karma Seans</div>
          <h3 class="spotlight-title">Sonsuz Üreteç Modu</h3>
          <p class="spotlight-desc">
            Tüm mevzuat üreteçlerinden aralıksız vaka üretilir, başarı serin ölçülür ve zorlandığın senaryolar karşına daha sık getirilir.
          </p>
          <div class="spotlight-meta">
            <span class="spotlight-tag">10 Temel Hukuk Alanı</span>
            <span class="spotlight-tag">Canlı Seri Sayacı</span>
            <span class="spotlight-tag">Sıfır Ezber</span>
          </div>
        </div>
        <div class="spotlight-action">
          <button class="btn btn-spotlight" data-act="pratik-sonsuz-basla">Başlat →</button>
          <span class="spotlight-subtext">Karma havuzdan sonsuz akış</span>
        </div>
      </div>

      <div class="pratik-filter-wrapper">
        <div class="pratik-filter-bar">
          ${CATEGORIES.map(cat => {
            const count = cat.id === 'all' ? GENERATORS.length : GENERATORS.filter(g => g.category === cat.id).length;
            const isActive = cur.filterCategory === cat.id;
            return `<button class="pratik-pill ${isActive ? 'is-active' : ''}" data-filter-category="${cat.id}">
              ${cat.label}
              <span class="pill-count">${count}</span>
            </button>`;
          }).join('')}
        </div>
      </div>

      <div class="pratik-grid">
        ${filteredGenerators.map(g => {
          const st = drillStats(g.id);
          const topKaliplar = (g.kaliplar || []).filter(k => k.id).slice(0, 3);
          const remainCount = (g.kaliplar || []).filter(k => k.id).length - topKaliplar.length;
          return `
            <div class="pratik-card" data-gen-ac="${esc(g.id)}">
              <div class="card-head">
                <span class="card-subj">${esc(subjectName(g.subjectId))}</span>
                <span class="card-basis">${esc(g.basis)}</span>
              </div>
              <div class="card-body">
                <div class="card-title">${esc(g.title)}</div>
                <div class="card-desc">${esc(g.desc)}</div>
                <div class="card-tags">
                  ${topKaliplar.map(k => `<span class="card-tag">${esc(k.label)}</span>`).join('')}
                  ${remainCount > 0 ? `<span class="card-tag-more">+${remainCount} kalıp</span>` : ''}
                </div>
              </div>
              <div class="card-foot">
                <span class="card-stat">${st.n ? `${st.ok}/${st.n} doğru (%${Math.round(st.ok / st.n * 100)})` : 'Henüz çözülmedi'}</span>
                <button class="btn btn-s btn-card-start">Başla →</button>
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function bindKatalogEvents(host) {
  host.querySelectorAll('[data-gen-ac]').forEach(b => {
    b.onclick = () => ac(b.dataset.genAc);
  });
  host.querySelectorAll('[data-filter-category]').forEach(b => {
    b.onclick = (e) => {
      e.stopPropagation();
      cur.filterCategory = b.dataset.filterCategory;
      render();
    };
  });
  const btnSonsuz = host.querySelector('[data-act="pratik-sonsuz-basla"]');
  if (btnSonsuz) btnSonsuz.onclick = () => sonsuzBasla();
}

/* ---------- DİNAMİK ÜRETEÇ EKRANI ---------- */

function renderGeneratorView(host) {
  const g = genById(cur.genId);
  if (!g) { cur.mode = 'catalog'; return render(); }
  if (!cur.pkg) yeniVaka();
  if (!cur.pkg) return;

  const st = drillStats(cur.sonsuz ? null : g.id);

  host.innerHTML = `
    <div class="wrap">
      <div class="btn-row" style="margin-bottom:1.25rem">
        <button class="btn btn-2 btn-s" id="btn-pratik-geri">‹ Pratik alanı</button>
        <span class="chip">${esc(cur.gen.basis)}</span>
        ${st.n ? `<span class="chip">${st.ok}/${st.n} · %${Math.round(st.ok / st.n * 100)}</span>` : ''}
        ${cur.sonsuz ? `<span class="chip ${cur.seri >= 3 ? 'green' : ''}" id="pratik-chip-seri">Seri: ${cur.seri}${cur.enIyiSeri > cur.seri ? ` · en iyi ${cur.enIyiSeri}` : ''}</span>` : ''}
        <span style="margin-left:auto"></span>
        <button class="btn" id="btn-pratik-yeni">Yeni vaka →</button>
      </div>

      <h2>${esc(cur.sonsuz ? 'Sonsuz mod' : cur.gen.title)}</h2>
      <div class="basisline">
        Vaka #${cur.seed} · ${esc(cur.pkg.baslik || cur.pkg.title || '')} · ${esc(cur.gen.title)} (bu oturumda ${cur.sayac} vaka)
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
      if (!V3 || typeof V3.render !== 'function') {
        box.innerHTML = '<p class="hint">Görsel motor yüklenemedi.</p>';
        return;
      }
      try {
        V3.render(box, `pr_p${i}_${cur.seed}`, p.visualData, { visualType: p.visualType });
      } catch (e) {
        console.warn('[pratik] panel çizilemedi:', e);
        box.remove();
      }
      return;
    }
    panelHost.appendChild(box);
  });

  const fillHost = $('#pratik-fill');
  if (!fillHost) return;
  if (!V3 || typeof V3.render !== 'function') {
    fillHost.innerHTML = '<p class="hint">Görsel motor yüklenemedi.</p>';
    return;
  }
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
    cur.gen = g;
    cur.genId = g.id;
    cur.kalip = '';
  } else {
    cur.gen = genById(cur.genId);
  }
  cur.seed = yeniSeed();
  try {
    cur.pkg = cur.gen.uret(cur.seed, cur.kalip);
    cur.vakaHata = 0;
  } catch (e) {
    console.error('[pratik] üreteç hatası:', cur.gen ? cur.gen.id : cur.genId, e);
    cur.vakaHata++;
    if (cur.vakaHata < 3) return yeniVaka();
    cur.pkg = null;
    toast('Vaka üretilemedi: ' + (cur.gen ? cur.gen.id : cur.genId));
    return;
  }
  cur.t0 = Date.now();
  cur.sayac++;
}

/* ---------- DIŞ EYLEMLER ---------- */

export function ac(genId) {
  cur = {
    ...cur,
    mode: 'generator',
    genId,
    gen: genById(genId),
    kalip: '',
    seed: null,
    pkg: null,
    sonsuz: false,
    sayac: 0,
    seri: 0
  };
  render();
}

/** Geriye dönük uyum: eski çağrılar olursa sessizce katalog moduna döner */
export function acNotes() {
  cur.mode = 'catalog';
  render();
}

export function sonsuzBasla() {
  cur = {
    ...cur,
    mode: 'generator',
    genId: GENERATORS[0].id,
    gen: GENERATORS[0],
    kalip: '',
    seed: null,
    pkg: null,
    sonsuz: true,
    sayac: 0,
    seri: 0,
    enIyiSeri: 0
  };
  render();
}

export function geri() {
  cur.mode = 'catalog';
  cur.genId = null;
  cur.sonsuz = false;
  render();
}

export function yeni() {
  cur.pkg = null;
  render();
}

export function aktif() {
  return cur.pkg;
}
