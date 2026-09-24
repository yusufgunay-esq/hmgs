/* ==========================================================================
   labels.js — dinamik kaynak etiket motoru
   Açık kaynak repoda YALNIZCA nötr kod adları barınır.
   Gerçek sınav ve yayın etiketleri KESİNLİKLE açık kodda tutulmaz;
   kullanıcı Google Drive kasasını bağladığında doğrudan şahsi Drive
   kasasından (IndexedDB / vaultData) dinamik olarak yüklenir.
   ========================================================================== */

/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama,
   türetme veya yeniden yayınlama yasaktır. */

// ---- KOD ADLARI (açık repo / misafir modu fallbacks) --------------------

const DENEME_ALIAS = {
  deneme_1: 'Deneme Seti 1',
  deneme_2: 'Deneme Seti 2',
  deneme_3: 'Deneme Seti 3',
  deneme_4: 'Deneme Seti 4',
  deneme_5: 'Deneme Seti 5',
};

const ARSIV_ALIAS = {
  hmgs_2024_09:    'Arşiv Sınavı 1',
  hmgs_2024_eylul: 'Arşiv Sınavı 1',
  hmgs_2025_05:    'Arşiv Sınavı 2',
  hmgs_2025_mayis: 'Arşiv Sınavı 2',
  hmgs_2025_eylul: 'Arşiv Sınavı 3',
  hmgs_2026_nisan: 'Arşiv Sınavı 4',
};

// ---- DİNAMİK KASA METADATASI (Google Drive kasasından gelir) ------------

let vaultMeta = null;

/**
 * Kasa yüklendiğinde data.js tarafından çağrılır.
 * Gerçek isimler ve başlıklar doğrudan kullanıcının şahsi kasasından beslenir.
 */
export function setVaultLabels(meta) {
  vaultMeta = meta || null;
}

// ---- BÖLÜM BAŞLIKLARI ---------------------------------------------------

export const SECTION = {
  arsiv: () => (vaultMeta && vaultMeta.sections && vaultMeta.sections.arsivTitle) || 'Arşiv Sınavları',
  arsivDesc: () => (vaultMeta && vaultMeta.sections && vaultMeta.sections.arsivDesc) || 'Orijinal soru sırasıyla sınav kağıtları.',
  denemeleri: () => (vaultMeta && vaultMeta.sections && vaultMeta.sections.denemeTitle) || 'Deneme Setleri',
  denemeDesc: () => (vaultMeta && vaultMeta.sections && vaultMeta.sections.denemeDesc) || '120 soru, 155 dakika tam sınav formatı.',
};

// ---- ETİKET FONKSİYONLARI -----------------------------------------------

/**
 * Deneme seti etiketi.
 * Drive kasası bağlıysa kasadaki gerçek isim; değilse nötr kod adı döner.
 */
export function denemeLabel(sourceId) {
  if (vaultMeta && vaultMeta.examLabels && vaultMeta.examLabels[sourceId]) {
    return vaultMeta.examLabels[sourceId];
  }
  const m = String(sourceId || '').match(/_d(\d+)$/i);
  if (m) return `Deneme Seti ${m[1]}`;
  return DENEME_ALIAS[sourceId] ?? 'Deneme Seti';
}

/**
 * Arşiv / çıkmış sınav etiketi.
 * Drive kasası bağlıysa kasadaki gerçek isim; değilse nötr kod adı döner.
 */
export function arsivLabel(sourceId) {
  if (vaultMeta && vaultMeta.examLabels && vaultMeta.examLabels[sourceId]) {
    return vaultMeta.examLabels[sourceId];
  }
  return ARSIV_ALIAS[sourceId] ?? 'Arşiv Sınavı';
}

export function denemeStartLabel(sourceId) {
  if (!sourceId) return (vaultMeta && vaultMeta.sections && vaultMeta.sections.denemeTitle) || 'Tüm Deneme Seti';
  return denemeLabel(sourceId);
}

export const yektiStartLabel = denemeStartLabel;

export function arsivStartLabel(sourceId) {
  if (!sourceId) return (vaultMeta && vaultMeta.sections && vaultMeta.sections.arsivTitle) || 'Arşiv Sınavları (Tümü)';
  return arsivLabel(sourceId);
}
