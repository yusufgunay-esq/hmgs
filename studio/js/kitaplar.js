/* ==========================================================================
   kitaplar.js — Kaynak ve bölüm haritası yardımcıları
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

/** Kasadan gelen envanter. Yalnızca setKitaplar() yazar. */
let ENVANTER = null;

/**
 * Kasadan gelen envanteri kaydeder.
 * Boş/eksik veri mevcut kaydı SİLMEZ: `kitaplar` anahtarı taşımayan eski bir
 * önbellek, çalışan bir envanteri boşaltmamalıdır.
 */
export function setKitaplar(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return;
  if (!Object.keys(data).length) return;
  ENVANTER = data;
}

/**
 * Yereldeki klasik script global'i (varsa). data.js readGlobal ile AYNI teknik:
 * klasik script'teki `const X = {...}` global lexical scope'a gider ama window'a
 * otomatik bağlanmaz, bu yüzden iki yol da denenir.
 */
function yerelGlobal() {
  if (typeof window !== 'undefined' && window.KITAPLAR_DATA
      && typeof window.KITAPLAR_DATA === 'object') {
    return window.KITAPLAR_DATA;
  }
  try {
    const v = new Function('return typeof KITAPLAR_DATA !== "undefined" ? KITAPLAR_DATA : undefined;')();
    if (v && typeof v === 'object') return v;
  } catch (e) { /* yok */ }
  return null;
}

function kaynak() {
  return ENVANTER || yerelGlobal();
}

/** Bir dersin kitap kayıtları (yoksa boş dizi). */
export function kitaplarOf(subjectId) {
  const src = kaynak();
  const k = src ? src[subjectId] : null;
  return k && Array.isArray(k.kaynaklar) ? k.kaynaklar : [];
}

/** Dersin banka (soru bankası) kaydı — yoksa null. */
export function bankaOf(subjectId) {
  return kitaplarOf(subjectId).find(k => k.tur === 'banka') || null;
}
