/* ==========================================================================
   book-map.js — KONU → FİZİKSEL KİTAP SAYFASI EŞLEMESİ
   Kaynak: "Benim fiziksel soru bankalarımın içindekiler kısımları.md"
   (kullanıcının elindeki spiralli kitapların içindekiler dökümü, 1 Ağu 2026).

   Amaç: deneme sonucunda zayıf çıkan konu → "kitapta hangi sayfaya bak" cevabı.
   Bu dosya İÇERİK ÜRETMEZ, sadece iki var olan kaynağı (topics.js'teki 124
   konu başlığı ile içindekiler dökümündeki bölüm/sayfa aralığı) birbirine
   işaretler. Eşleme konu başlığındaki madde numarasına göre yapıldı; kesin
   sayfa değil, kitaptaki bölüm aralığıdır — kullanıcı o aralığı taramalı.

   Kural (KONU_YAZIM_TALIMATI.md §3): kaynakta karşılık yoksa uydurma, açığı
   bildir. Bu yüzden içindekiler dosyasında "Henüz eklenmedi" diye işaretli
   derslerin (Vergi, Avukatlık, Hukuk Felsefesi, Hukuk Tarihi, Genel Kamu,
   Anayasa Yargısı) hiçbir konusu için sayfa uydurulmadı — NO_BOOK_SUBJECTS'te
   listeleniyor, arayüz bunlar için "kitap verisi henüz eklenmedi" gösterir.
   ========================================================================== */

/** İçindekiler dökümü hiç gelmemiş dersler — sayfa göstermeye çalışma. */
export const NO_BOOK_SUBJECTS = new Set([
  'anayasa_yargisi', 'vergi_hukuku', 'vergi_usul',
  'avukatlik', 'hukuk_felsefesi', 'hukuk_tarihi', 'genel_kamu'
]);

/**
 * topicId → "kitapta nereye bak" metni.
 * CMK ayrı: fiziksel kitapta CMK s.64-380 arası ama iç başlık fotoğrafı hiç
 * gelmedi (bkz. içindekiler dosyası "Henüz eklenmedi" listesi) — o yüzden
 * CMK konuları için sadece geniş aralık var, alt başlık uydurulmadı.
 */
export const TOPIC_LOCATION = {
  // --- Medeni Hukuk (~308 s.) ---
  tpc_medeni_001: 'Kişiler Hukuku – Gerçek Kişiler (s.47-98)',
  tpc_medeni_002: 'Kişiler Hukuku – Gerçek Kişiler (s.47-98)',
  tpc_medeni_003: 'Kişiler Hukuku – Gerçek Kişiler (s.47-98)',
  tpc_medeni_004: 'Kişiler Hukuku – Gerçek Kişiler (s.47-98)',
  tpc_medeni_005: 'Kişiler Hukuku – Gerçek Kişiler (s.47-98)',
  tpc_medeni_006: 'Aile Hukuku – Nişanlanma, Evlenme ve Aile Konutu (s.114-135)',
  tpc_medeni_007: 'Aile Hukuku – Nişanlanma, Evlenme ve Aile Konutu (s.114-135)',
  tpc_medeni_008: 'Aile Hukuku – Boşanma ve Edinilmiş Mallara Katılma Rejimi (s.135-155)',
  tpc_medeni_009: 'Aile Hukuku – Boşanma ve Edinilmiş Mallara Katılma Rejimi (s.135-155)',
  tpc_medeni_010: 'Aile Hukuku – Boşanma ve Edinilmiş Mallara Katılma Rejimi (s.135-155)',
  tpc_medeni_011: 'Aile Hukuku – Soy Bağı, Evlat Edinme, Velayet ve Vesayet (s.155-174)',
  tpc_medeni_012: 'Miras Hukuku – Zümre Sistemi, Saklı Pay ve Tenkis Davası (s.174-194)',
  tpc_medeni_013: 'Miras Hukuku – Zümre Sistemi, Saklı Pay ve Tenkis Davası (s.174-194)',
  tpc_medeni_014: 'Eşya Hukuku – Eşya Kavramı ve Zilyetlik (s.228-246)',
  tpc_medeni_015: 'Eşya Hukuku – Tapu Sicili, Yolsuz Tescil ve Sınırlı Ayni Haklar (s.246-308)',

  // --- Borçlar Hukuku (~319 s.) ---
  tpc_borclar_001: 'Hukuki İşlemler ve Öneri-Kabul (s.30-55)',
  tpc_borclar_002: 'İrade ve Beyan Uygunsuzluğu, Aşırı Yararlanma (s.55-85)',
  tpc_borclar_003: 'Temsil İlişkisi (s.85-97)',
  tpc_borclar_004: 'Haksız Fiil Sorumluluğu / Kusursuz Sorumluluk Hâlleri (s.97-147)',
  tpc_borclar_005: 'Sebepsiz Zenginleşme (s.147-154)',
  tpc_borclar_006: 'İfa ve Borç İlişkilerinin 3. Kişilere Etkisi / Temerrüt (s.154-193)',
  tpc_borclar_007: 'Borç İlişkilerinde Özel Durumlar (s.193-225)',
  tpc_borclar_008: 'Borç İlişkisi ve Özellikleri (s.7-30)',
  tpc_borclar_009: 'Özel Hükümler – Kira Sözleşmesi (s.253-319)',
  tpc_borclar_010: 'Özel Hükümler – Satış Sözleşmesi (s.253-319)',
  tpc_borclar_011: 'Özel Hükümler – Eser ve Vekalet Sözleşmesi (s.253-319)',
  tpc_borclar_012: 'Özel Hükümler – Kefalet Sözleşmesi (s.253-319)',
  tpc_borclar_013: 'Borcu Sona Erdiren Hâller ve Zamanaşımı (s.225-251)',
  tpc_borclar_014: 'Özel Hükümler – Saklama (Vedia) Sözleşmesi (s.253-319)',
  tpc_borclar_015: 'Özel Hükümler – Simsarlık Sözleşmesi (s.253-319)',
  tpc_borclar_016: 'Özel Hükümler – Adi Ortaklık (s.253-319)',

  // --- Ticaret Hukuku (~423 s., 3 alt bölüm) ---
  tpc_ticaret_001: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_002: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_003: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_004: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_005: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_006: 'Ticari İşletme Hukuku (s.7-147)',
  tpc_ticaret_007: 'Şirketler Hukuku – Kollektif ve Komandit Şirketler (s.153-229)',
  tpc_ticaret_008: 'Şirketler Hukuku – Anonim Şirket ve Kooperatifler (s.229-292)',
  tpc_ticaret_009: 'Şirketler Hukuku – Anonim Şirket ve Kooperatifler (s.229-292)',
  tpc_ticaret_010: 'Şirketler Hukuku – Limited Şirket (s.153-292)',
  tpc_ticaret_011: 'Kıymetli Evrak Hukuku (s.301-423)',
  tpc_ticaret_012: 'Kıymetli Evrak Hukuku (s.301-423)',

  // --- HMK (~250 s.) ---
  tpc_hmk_001: 'Görev, Yetki ve Genel Hükümler (s.7-43)',
  tpc_hmk_002: 'Görev, Yetki ve Genel Hükümler (s.7-43)',
  tpc_hmk_003: 'Dava Şartları ve İlk İtirazlar (s.90-108)',
  tpc_hmk_004: 'Hakimin Reddi, Taraflar, Süreler, Adli Tatil (s.43-90)',
  tpc_hmk_005: 'Dava Çeşitleri (s.90-108)',
  tpc_hmk_006: 'Yazılı Yargılama Usulü (s.108-152)',
  tpc_hmk_007: 'İspat ve Deliller (s.152-189)',
  tpc_hmk_008: 'İspat ve Deliller (s.152-189)',
  tpc_hmk_009: 'Hüküm ve Davaya Son Veren Taraf İşlemleri (s.189-203)',
  tpc_hmk_010: 'Kanun Yolları (s.203-218)',
  tpc_hmk_011: 'Kanun Yolları (s.203-218)',
  tpc_hmk_012: 'Çekişmesiz Yargı, Geçici Hukuki Tedbirler, Tahkim-Arabuluculuk (s.229-250)',

  // --- Ceza Hukuku Genel Hükümler (~223 s.) ---
  tpc_ceza_001: 'Ceza Hukukuna Hakim İlkeler ve Suç Kavramı (s.7-38)',
  tpc_ceza_002: 'Suç Teorisi, Unsurlar, Kusur, Teşebbüs, İştirak, İçtima (s.38-147)',
  tpc_ceza_003: 'Suç Teorisi, Unsurlar, Kusur, Teşebbüs, İştirak, İçtima (s.38-147)',
  tpc_ceza_004: 'Suç Teorisi, Unsurlar, Kusur, Teşebbüs, İştirak, İçtima (s.38-147)',
  tpc_ceza_005: 'Suç Teorisi, Unsurlar, Kusur, Teşebbüs, İştirak, İçtima (s.38-147)',
  tpc_ceza_006: 'Suç Teorisi, Unsurlar, Kusur, Teşebbüs, İştirak, İçtima (s.38-147)',
  tpc_ceza_007: 'Cezalar, Yaptırım Hukuku, Zamanaşımı (s.147-223)',
  // Özel Hükümler ayrı ciltte (Ceza Özel Hükümler + CMK kitabı, s.1-63)
  tpc_ceza_008: 'Ceza Özel Hükümler cildi – Kişilere Karşı Suçlar (ayrı kitap, s.1-63)',
  tpc_ceza_009: 'Ceza Özel Hükümler cildi – Malvarlığı/Kamu İdaresi Suçları (ayrı kitap, s.1-63)',

  // --- Anayasa Hukuku (~476 s.) ---
  tpc_anayasa_001: 'Genel Esaslar ve Anayasa Tarihi (s.6-47)',
  tpc_anayasa_002: 'Temel Hak ve Ödevler (s.47-109)',
  tpc_anayasa_003: 'Siyasi Partiler ve Seçimler / Yasama (s.109-145)',
  tpc_anayasa_004: 'Yasama (s.145-294)',
  tpc_anayasa_005: 'Yürütme (s.294-350)',
  tpc_anayasa_006: 'Yargı (s.350-440)',

  // --- İdare Hukuku (~364 s.) ---
  tpc_idare_001: 'İdare Hukukunun Genel İlkeleri (s.7-40)',
  tpc_idare_002: 'İdari Teşkilat (Merkezi ve Mahalli İdareler) (s.40-187)',
  tpc_idare_003: 'İdarenin İşlemleri (s.187-242)',
  tpc_idare_004: 'İdarenin İşlemleri (s.187-242)',
  tpc_idare_005: 'Kamulaştırma, Kamu Malları, Kolluk, Kamu Hizmeti (s.242-281)',
  tpc_idare_006: 'İdarenin Mali Sorumluluğu ve Kamu Görevlileri (s.281-331)',

  // --- İcra ve İflas Hukuku (~334 s.) ---
  tpc_icra_001: 'Genel Hükümler ve Temel Kavramlar (s.7-37)',
  tpc_icra_002: 'Genel Haciz Yolu (s.37-141)',
  tpc_icra_003: 'İlamlı İcra (s.141-152) + Kambiyo Senetlerine Özgü Haciz Yolu (s.239-259)',
  tpc_icra_004: 'Genel Haciz Yolu – Haciz/Sıra Cetveli (s.88-141) + Davalar – İstihkak (s.174-189)',
  tpc_icra_005: 'Genel Haciz Yolu – Satış/İhale (s.88-141) + İhtiyati Haciz (s.165-174)',
  tpc_icra_006: 'İflas Hukuku, Konkordato, Tasarrufun İptali (s.195-334)',

  // --- CMK (ayrı cilt: "Ceza Özel Hükümler + CMK", CMK s.64-380 —
  //     iç başlık fotoğrafı henüz gelmedi, alt bölüm veremiyoruz) ---
  tpc_cmk_001: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',
  tpc_cmk_002: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',
  tpc_cmk_003: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',
  tpc_cmk_004: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',
  tpc_cmk_005: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',
  tpc_cmk_006: 'CMK cildi (Ceza Özel Hükümler + CMK kitabı) s.64-380 — iç başlık dökümü eklenmedi',

  // --- İş Hukuku (~191 s.) ---
  tpc_is_001: 'Bireysel İş Hukuku (s.7-155)',
  tpc_is_002: 'Bireysel İş Hukuku (s.7-155)',
  tpc_is_003: 'Bireysel İş Hukuku (s.7-155)',
  tpc_is_004: 'Bireysel İş Hukuku (s.7-155)',
  tpc_is_005: 'Bireysel İş Hukuku (s.7-155)',
  tpc_is_006: 'Bireysel İş Hukuku (s.7-155)',

  // --- İYUK (~232 s.) ---
  tpc_iyuk_001: 'Genel İlkeler ve Mahkemeler (s.7-71)',
  tpc_iyuk_002: 'Dava Türleri ve Süreler (s.71-119)',
  tpc_iyuk_003: 'Dava Süreci ve Muhtelif Konular (s.119-207)',

  // --- Milletlerarası Kamu Hukuku (aynı cilt, MÖHUK ile birlikte) ---
  tpc_milletlerarasi_001: 'Milletlerarası Kamu Hukuku – Uluslararası Hukukun Kaynakları (s.18-55)',
  tpc_milletlerarasi_002: 'Milletlerarası Kamu Hukuku – Kişilik/Teşkilatlar (s.55-74) + Devletin Yetkisi-Sorumluluğu (s.90-96)',
  tpc_milletlerarasi_003: 'Milletlerarası Kamu Hukuku – Uyuşmazlıkların Çözüm Yolları (s.74-85)',

  // --- MÖHUK (aynı cilt) ---
  tpc_mohuk_001: 'MÖHUK – Genel Hükümler, Kanunlar İhtilafı ve Usul Hukuku (s.132-156)',
  tpc_mohuk_002: 'MÖHUK – Genel Hükümler, Kanunlar İhtilafı ve Usul Hukuku (s.132-156)',
  tpc_mohuk_003: 'Türk Vatandaşlık Hukuku (s.156-190)'
};

/** topicId verilmemiş/tanınmayan bir soru için ders bazlı geri düşüş metni. */
export function bookLocationFor(topicId, subjectId) {
  if (topicId && TOPIC_LOCATION[topicId]) return TOPIC_LOCATION[topicId];
  if (NO_BOOK_SUBJECTS.has(subjectId)) return null; // kaynakta yok, uydurma
  return null; // topicId yoksa (etiketsiz soru) konum bilinmiyor
}
