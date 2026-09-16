/* ==========================================================================
   kitaplar.js — KİTAP ENVANTERİ KAYIT DEFTERİ (VERİSİZ KABUK)

   NEDEN VERİSİZ: envanter, kullanıcının KENDİ fiziksel kitaplarının bölüm
   adları ve sayfa aralıklarıdır. Depo public; böyle bir liste 14 Eylül 2026
   "sıfır-veri kabuğu" kuralı gereği yayına giremez. Soru bankası ve konu
   kütüphanesi nasıl davranıyorsa bu da öyle davranır: veri Google Drive
   kasasından (hmgs_vault.json → kitaplar) gelir ve YALNIZCA Google ile giriş
   yapıldıktan sonra görünür.

   İKİ VERİ YOLU (tek sözleşme):
     · Yerel geliştirme: `node tools/kitap_envanteri.cjs` → kök
       kitap_envanteri.js (window.KITAPLAR_DATA), studio.html klasik script
       ile yükler. Prod'da bu dosya yoktur ve 404 sessizce yutulur —
       questions.js / topics.js ile aynı, kabul edilmiş desen.
     · Kasa: data/kitap_envanteri.json → build_vault.cjs → vault.kitaplar
       → data.js populateData() → setKitaplar(). Globals, IndexedDB ve Drive
       yollarının ÜÇÜ de populateData'dan geçtiği için tek giriş noktası yeter.

   SÖZLEŞME (değişmedi, kitap.js ve views/flow.js buna göre yazılmıştır):
     kitaplarOf(subjectId) → [{ tur, kitap, tahmin, bolumler:[{ad,a,b}] }, …]
     bankaOf(subjectId)    → tur === 'banka' olan ilk kayıt, yoksa null
   Envanter yokken ikisi de boş döner ve panel hiç çizilmez (kitap.js:47, :87).
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
