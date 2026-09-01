/* ==========================================================================
   views/odevler.js — KOÇ GÖREVLERİ & ÖDEVLER SEKMESİ
   Yapay Zeka Koç'un atadığı ödevleri canlı çeker (/api/claude-tasks) ve
   ödev kartından doğrudan Stüdyo Soru Testi (practice) veya Mevzuat/Not
   Pratiği (pratik) başlatır.

   12 Ağustos 2026 — ŞEMA ENTEGRASYONU (ANTIGRAVITY_COACH_PROMPT.md §4 ve
   .agents/CLAUDE_STUDIO_SPECS.md):
   Koç artık her göreve `type` ("quiz" | "practice" | "review"), `subjectId`
   ve `generatorId` alanlarını yazıyor. Bu dosya ÖNCE bu alanları okur.
   Eski (alansız) görevler için başlık/not metninden tahmin yalnızca
   GERİYE DÖNÜK YEDEK olarak kalır — alan varsa tahmin çalışmaz.

   Aynı tarihte düzeltilen çökme hatası: `findSubjectId` içinde SUBJECTS
   nesnelerinin `name` alanı yerine olmayan `title` alanı okunuyordu;
   `undefined.toLowerCase()` en az bir ödev varken render()'ı patlatıyordu.
   Ayrıca CSS'te tanımsız değişkenler (--amber, --rose, --rose-border)
   gerçek tasarım belirteçleriyle (--warn, --no, --line) değiştirildi ve
   olay bağlama, projenin kuralı gereği (main.js: "inline onclick yok")
   data-act üzerinden merkezî dinleyiciye taşındı.
   ========================================================================== */

import { esc, $ } from '../ui.js';
import { SUBJECTS, SUBJECT_BY_ID, subjectName, topicById, topicsOf, questionsOfTopic, questionsOfTopics, questionsOf } from '../data.js';
import { GENERATORS } from './pratik.js';

let tasksCache = null;
let tasksLoading = false;
let tasksErr = null;

/* --------------------------------------------------------------------------
   ŞEMA ÇÖZÜMLEME
   -------------------------------------------------------------------------- */

/** Koç belgelerinde geçen ama data.js'te karşılığı başka olan id'ler. */
const SUBJECT_ALIAS = {
  icra_hukuku: 'icra_iflas',
  icra_iflas_hukuku: 'icra_iflas',
  medeni_usul: 'hmk',
  medeni_usul_hukuku: 'hmk',
  ceza_muhakemesi: 'cmk',
  idari_yargi: 'iyuk',
  is_sosyal_guvenlik: 'is_hukuku',
  milletlerarasi_ozel: 'mohuk'
};

/** Başlıktan ders tahmini için ek anahtarlar (yalnızca yedek yol). */
const SUBJECT_NEEDLES = {
  hmk: ['hmk', 'medeni usul'],
  cmk: ['cmk', 'ceza muhakemesi'],
  icra_iflas: ['icra', 'iflas', 'iik'],
  iyuk: ['iyuk', 'idari yargılama'],
  mohuk: ['mohuk', 'milletlerarası özel'],
  is_hukuku: ['iş hukuku', 'sosyal güvenlik'],
  vergi_usul: ['vergi usul', 'vuk']
};

const TYPE_META = {
  quiz:     { etiket: '🎯 Soru Bankası',                        cls: 'chip accent', renk: 'var(--accent)' },
  practice: { etiket: '🧩 Pratik / Simülatör',                  cls: 'chip green',  renk: 'var(--ok)' },
  review:   { etiket: '📖 Fiziki Kitap — Hata & Kavram Hasadı', cls: 'chip amber',  renk: 'var(--warn)' }
};

function resolveSubjectId(t) {
  const raw = String(t.subjectId || '').trim();
  if (raw) {
    const id = SUBJECT_ALIAS[raw] || raw;
    if (SUBJECT_BY_ID.has(id)) return id;
    console.warn('[odevler] tanınmayan subjectId:', raw, '— başlıktan tahmin edilecek.');
  }
  return guessSubjectId(t);
}

/** GERİYE DÖNÜK YEDEK: subjectId yoksa metinden ders tahmini. */
function guessSubjectId(t) {
  const full = `${t.title || ''} ${t.subject || ''} ${t.notes || t.details || ''}`.toLowerCase();
  for (const s of SUBJECTS) {
    const ad = String(s.name || '').toLowerCase();
    if (ad && full.includes(ad)) return s.id;
    const ekler = SUBJECT_NEEDLES[s.id] || [];
    if (ekler.some(k => full.includes(k))) return s.id;
  }
  return null;
}

function resolveTopicInfo(t, subjectId) {
  let topicId = t.topicId || null;
  let topicIds = Array.isArray(t.topicIds) ? t.topicIds : (topicId ? [topicId] : []);
  let topicName = t.topicName || null;

  if (topicId) {
    if (!topicName && topicById.has(topicId)) {
      topicName = topicById.get(topicId)?.title;
    }
    return { topicId, topicIds, topicName };
  }

  // GERİYE DÖNÜK YEDEK: Görev nesnesinde topicId yoksa başlıktan ve notlardan çıkar
  if (subjectId) {
    const full = `${t.title || ''} ${t.notes || ''}`.toLowerCase();
    const sTopics = topicsOf(subjectId);
    for (const top of sTopics) {
      const titleLower = top.title.toLowerCase();
      const words = titleLower.replace(/[^a-z0-9ğüşıöç\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4);
      const matchCount = words.filter(w => full.includes(w)).length;
      if (matchCount >= 2 || (words.length === 1 && matchCount === 1)) {
        return {
          topicId: top.id,
          topicIds: [top.id],
          topicName: top.title
        };
      }
    }
  }

  return { topicId: null, topicIds: [], topicName: null };
}

function resolveType(t) {
  const raw = String(t.type || '').trim().toLowerCase();
  if (TYPE_META[raw]) return raw;
  if (raw) console.warn('[odevler] tanınmayan type:', raw, '— metinden çıkarılacak.');
  // GERİYE DÖNÜK YEDEK: eski görevlerde type alanı yok.
  const full = `${t.title || ''} ${t.notes || t.details || ''}`.toLowerCase();
  if (full.includes('yanlış') || full.includes('hasat') || full.includes('kavram avı')) return 'review';
  return 'quiz';
}

function resolveGeneratorId(t) {
  const raw = String(t.generatorId || '').trim();
  if (!raw) return null;
  if (raw === 'notes') return 'notes';              // pratik ekranı: Notlarından Tekrar
  if (GENERATORS.some(g => g.id === raw)) return raw;
  console.warn('[odevler] Stüdyo\'da kayıtlı olmayan generatorId:', raw);
  return null;
}

/* --------------------------------------------------------------------------
   VERİ
   -------------------------------------------------------------------------- */

export async function fetchTasks(force) {
  if (tasksLoading) return;
  if (tasksCache && !force) return;
  tasksLoading = true;
  tasksErr = null;

  const endpoints = [
    '/api/claude-tasks',
    'HMGS_Takip_App/claude_tasks.json',
    './HMGS_Takip_App/claude_tasks.json',
    'http://localhost:8766/api/claude-tasks',
    'http://127.0.0.1:8766/api/claude-tasks'
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
        if (data && Array.isArray(data.tasks)) {
          tasksCache = data.tasks;
          loaded = true;
          break;
        }
      }
    } catch (e) {
      lastErr = e.name === 'AbortError' ? 'Zaman aşımı (4sn)' : (e.message || String(e));
    }
  }

  if (!loaded) {
    tasksErr = lastErr || 'Ödev dosyasına ulaşılamadı';
    console.warn('[odevler] claude-tasks yüklenemedi:', tasksErr);
  }

  tasksLoading = false;
  render();
}

/* --------------------------------------------------------------------------
   RENDER
   -------------------------------------------------------------------------- */

export function render() {
  const host = $('#view-odevler');
  if (!host) return;

  if (tasksLoading && !tasksCache) {
    host.innerHTML = `<div class="wrap"><div class="card"><p style="color:var(--ink-2)">Ödevler yükleniyor…</p></div></div>`;
    return;
  }

  if (tasksErr && !tasksCache) {
    host.innerHTML = `<div class="wrap"><div class="card" style="border-left:4px solid var(--no)">
      <h3 style="color:var(--no)">Ödevler alınamadı</h3>
      <p style="font-size:0.9rem;color:var(--ink-2);margin-top:0.4rem">${esc(tasksErr)}</p>
      <p style="font-size:0.85rem;color:var(--ink-2);margin-top:0.4rem">Stüdyo sunucusunun (port 8766) açık olduğundan emin olun veya <code>baslat.bat</code> ile uygulamayı başlatın.</p>
      <button class="btn btn-2" style="margin-top:0.8rem" data-act="odev-yenile">Tekrar dene</button>
    </div></div>`;
    return;
  }

  const tasks = tasksCache || [];
  if (!tasks.length) {
    host.innerHTML = `<div class="wrap"><div class="card">
      <h3>Atanmış ödev bulunmuyor 🎉</h3>
      <p style="font-size:0.9rem;color:var(--ink-2);margin-top:0.4rem">Koç henüz yeni ödev atamadı veya tüm ödevler tamamlandı.</p>
      <button class="btn btn-2" style="margin-top:0.8rem" data-act="odev-yenile">Yenile</button>
    </div></div>`;
    return;
  }

  host.innerHTML = `<div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem;flex-wrap:wrap">
      <div>
        <h2 style="font-size:1.2rem;font-weight:800;color:var(--ink)">📋 Koç Görevleri &amp; Ödevlerin</h2>
        <p style="font-size:0.85rem;color:var(--ink-2)">Fiziksel kitapta çalıştığın konuyu Stüdyo'da tam olarak o üniteden pekiştir.</p>
      </div>
      <button class="btn btn-2" data-act="odev-yenile" style="font-size:0.8rem">Yenile</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:1rem">
      ${tasks.map(kartHTML).join('')}
    </div>
  </div>`;
}

function kartHTML(t) {
  const type = resolveType(t);
  const subjectId = resolveSubjectId(t);
  const genId = resolveGeneratorId(t);
  const topInfo = resolveTopicInfo(t, subjectId);
  const meta = TYPE_META[type];

  const title = esc(t.title || 'İsimsiz ödev');
  const notes = String(t.notes || t.details || '');
  const due = t.due ? esc(String(t.due)) : '';
  const dersAdi = subjectId ? subjectName(subjectId) : String(t.subject || '');

  return `<div class="card" style="border-left:4px solid ${meta.renk};padding:1.1rem">
    <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-bottom:0.35rem">
      <span class="${meta.cls}">${meta.etiket}</span>
      ${dersAdi ? `<span class="chip">${esc(dersAdi)}</span>` : ''}
      ${topInfo.topicName ? `<span class="chip" style="background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;font-weight:600">🎯 ${esc(topInfo.topicName)}</span>` : ''}
      ${due ? `<span style="font-size:0.75rem;color:var(--ink-2)">Vade: <b>${due}</b></span>` : ''}
    </div>

    <h3 style="font-size:1rem;font-weight:700;color:var(--ink);line-height:1.35">${title}</h3>

    ${notes ? `<p style="font-size:0.85rem;color:var(--ink-2);margin-top:0.6rem;background:var(--bg-sunk);padding:0.6rem;border-radius:var(--r-s);line-height:1.5;white-space:pre-line">${esc(notes)}</p>` : ''}

    <div style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:0.9rem;padding-top:0.8rem;border-top:1px solid var(--line)">
      ${butonlarHTML(type, subjectId, genId, topInfo)}
    </div>
  </div>`;
}

function butonlarHTML(type, subjectId, genId, topInfo) {
  const topicId = topInfo?.topicId || '';
  const topicIds = topInfo?.topicIds || [];
  const topicParam = topicIds.length > 1 ? `data-topics="${esc(topicIds.join(','))}"` : (topicId ? `data-topic="${esc(topicId)}"` : '');
  
  // Konu havuzundaki soru sayısını hesapla
  let poolCount = 0;
  if (topicIds.length > 1) {
    poolCount = questionsOfTopics(topicIds).length;
  } else if (topicId) {
    poolCount = questionsOfTopic(topicId).length;
  } else if (subjectId) {
    poolCount = questionsOf(subjectId).length;
  }

  const topicTestBtn = (cls, etiket) =>
    `<button class="btn ${cls}" data-act="odev-quiz" data-subj="${esc(subjectId || '')}" ${topicParam} data-count="15" style="font-size:0.8rem;padding:0.4rem 0.8rem">${etiket}</button>`;

  const generalTestBtn = (cls, etiket) =>
    `<button class="btn ${cls}" data-act="odev-quiz" data-subj="${esc(subjectId || '')}" data-count="15" style="font-size:0.8rem;padding:0.4rem 0.8rem">${etiket}</button>`;

  if (type === 'practice') {
    const gen = genId && genId !== 'notes' ? GENERATORS.find(g => g.id === genId) : null;
    const etiket = gen ? `🧩 ${esc(gen.title)}`
      : (genId === 'notes' ? '🧩 Notlarından Tekrar' : '🧩 Pratik Alanını Aç');
    return `
      <button class="btn" data-act="odev-pratik" data-gen="${esc(genId || '')}" style="font-size:0.8rem;padding:0.4rem 0.8rem">${etiket}</button>
      ${(topicId || topicIds.length) ? topicTestBtn('btn-2', `🎯 Bu Konudan Test Çöz (${poolCount ? `${poolCount} soru` : 'Test'})`) : generalTestBtn('btn-2', subjectId ? '🎯 Bu dersten test çöz' : '🎯 Karma test çöz')}`;
  }

  if (type === 'review') {
    return `
      <span style="font-size:0.8rem;color:var(--ink-2);align-self:center">Bu görev fiziki kitapta yapılır — hataları ve yeni kavramları Takip'e işle.</span>
      ${(topicId || topicIds.length) ? topicTestBtn('btn-2', `🎯 Pekiştirme Testi (${esc(topInfo.topicName || 'Bu Konu')})`) : generalTestBtn('btn-2', subjectId ? '🎯 Yine de bu dersten test çöz' : '🎯 Karma test çöz')}`;
  }

  // quiz (varsayılan)
  if (topicId || topicIds.length) {
    return `
      ${topicTestBtn('', `🎯 Bu Konudan Test Çöz (${poolCount ? `${poolCount} soru` : '15 soru'})`)}
      ${generalTestBtn('btn-2', '🎯 Tüm Dersten Çöz (Genel Tekrar)')}
      <button class="btn btn-2" data-act="odev-pratik" data-gen="" style="font-size:0.8rem;padding:0.4rem 0.8rem">🧩 Pratik Alanı</button>`;
  }

  return `
    ${generalTestBtn('', subjectId ? '🎯 Stüdyo\'da Test Çöz (15 soru)' : '🎯 Karma Test Çöz (15 soru)')}
    <button class="btn btn-2" data-act="odev-pratik" data-gen="" style="font-size:0.8rem;padding:0.4rem 0.8rem">🧩 Pratik Alanı</button>`;
}
