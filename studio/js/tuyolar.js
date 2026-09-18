/* ==========================================================================
   tuyolar.js — Soru tipine özel ÖSYM tüyoları
   Kaynak: HMGS_BENZERI_KALITE_DENETIMI.md v2 (18 Eylül 2026) — 4 gerçek HMGS
   sınavının (460 soru) ölçülmüş biçimi ve tools/hmgs_benzeri_bicim_olcer.mjs
   içindeki aynı dedektörler (burada tarayıcıda çalışacak şekilde taşındı).

   Amaç: practice.js'deki tek tip "hızlı işaretledin, acele kaynaklı olabilir"
   mesajını, sorunun GERÇEK biçimine (öncüllü / kısa şıklı / olay / ifade
   kalıbı / olumsuz kök) göre değişen, o tipte ÖSYM'nin nasıl tuzak kurduğunu
   anlatan bir tüyoya çevirmek. Yanlış/boş cevapta da (hızdan bağımsız) aynı
   dedektörle bir "bu tipte dikkat et" notu göstermek.

   © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır. */

const ROM = /^(Yalnız\s+)?(I{1,3}|IV)(\s*,\s*(I{1,3}|IV))*(\s+ve\s+(I{1,3}|IV))?$/i;

const STOP = new Set((
  'Türkiye Büyük Millet Meclisi Anayasa Mahkemesi Anayasası Kanunu Kanun Danıştay Yargıtay Sayıştay ' +
  'Cumhurbaşkanı Cumhurbaşkanlığı Bakanlık Bakanlığı Bakan Devlet Devleti Adalet İçişleri Maliye Hazine Türk Medeni Borçlar ' +
  'Ticaret Ceza Muhakemesi Muhakemeleri İcra İflas İdari Yargılama Usulü Vergi Usul İş Sendikalar Toplu Sözleşmesi Avukatlık ' +
  'Barosu Baro Birliği Kurumu Kurulu Kurul Bölge Adliye İstinaf Uyuşmazlık Avrupa İnsan Hakları Osmanlı Mecelle Divanı Yüce ' +
  'Divan Hâkimler Savcılar Yüksek Seçim Ankara İstanbul İzmir Bursa Adana Samsun Kilis Osmaniye Kozan Hacettepe Rekabet ' +
  'Ulusal Sosyal Güvenlik'
).split(/\s+/));

const AD_EK = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})(['’](?:ın|in|un|ün|nın|nin|nun|nün|a|e|ya|ye|ı|i|u|ü|nı|ni|la|le|yla|yle|dan|den|tan|ten|ndan|nden|na|ne))/g;
const AD_VIR = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})\s*,\s+[a-zçğıöşü]/g;
const SORU_CUM = /((\d{3,4}\s*sayılı|1982\s*Anayasası|Anayasa['’]ya|Türk\s+\w+\s+Kanunu)[^.?]{0,140}?göre)|(\bBuna göre\b)|(\bYukarıda\w*\b)/i;
const HARF_TARAF = /\(([A-E])\)|\b(?:memur|işçi|işveren|kişi|şirket|davacı|davalı|sanık|müvekkil|tacir|banka|ülke|Devleti?)\s+\(?([A-Z])\)?\b|\b([A-Z])\s+Devleti\b/;

function kisiVar(s) {
  for (const re of [AD_EK, AD_VIR]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) if (!STOP.has(m[1])) return true;
  }
  return false;
}
function anlatiUz(s) {
  const m = SORU_CUM.exec(s);
  return m ? m.index : (s.length > 260 ? s.length : 0);
}

function optTexts(q) {
  if (!q.options) return [];
  if (Array.isArray(q.options)) return q.options.map(o => (typeof o === 'string' ? o : (o.text || o.t || '')));
  return Object.values(q.options).map(o => (typeof o === 'string' ? o : (o.text || o.t || '')));
}

/** Sorunun gerçek sınav dedektörleriyle tipini çıkarır. Birden fazla tip aynı anda true olabilir. */
export function soruTipleri(q) {
  const stem = q.stem || '';
  const opts = optTexts(q);
  const onculu = /hangileri/i.test(stem) || opts.filter(o => ROM.test(String(o).trim())).length >= 4;
  const kalip = /ifadelerden hangisi\s+(doğru|yanlış)/i.test(stem);
  const olumsuz = /(değildir|yanlıştır|olamaz|söylenemez|sayılamaz|yer almaz|yapılamaz|edilemez|verilemez|aranmaz|gidilemez|bağlamaz)\s*\??\s*$/i.test(stem.trim());
  const az = anlatiUz(stem);
  const olay = (az >= 60 && kisiVar(stem.slice(0, Math.max(60, az) + 120))) || (az >= 40 && HARF_TARAF.test(stem));
  const kisaSik = opts.length > 0 && opts.every(o => String(o).trim().length < 40);
  return { onculu, kalip, olumsuz, olay, kisaSik };
}

/* ---------- ÖSYM tüyo bankası ----------
   Her tip için: normal-yanlış (bilgi eksiği görünse de) ve hızlı-yanlış
   (acele + bu tipin kendine özgü tuzağı) ayrı metin — kaynak gerçek sınav
   ölçümü (bkz. dosya başlığı). */
const TUYO = {
  onculu: {
    baslik: 'Öncüllü soru tüyosu',
    normal: 'Öncüllü (I, II, III) sorularda ÖSYM genelde bir öncülü tamamen doğru, bir öncülü tek bir kelimeyle (süre, merci, "kural olarak") bozuk yazar. Yanlış çıktıysa üç öncülü tek tek, birbirinden bağımsız doğrula; "II doğruysa III de doğrudur" gibi bir çıkarım yapma.',
    hizli: 'Öncüllü sorularda hız asıl tuzak: üç öncülü art arda okuyup "hepsi mantıklı geldi" diyerek en kapsayıcı şıkkı (I, II ve III) işaretlemek en sık yapılan hata. Her öncülü ayrı ayrı, tek başına doğrula.',
  },
  kalip: {
    baslik: '"İfadelerden hangisi..." tüyosu',
    normal: 'Bu kalıpta beş şık da doğru bilgi gibi görünür; çeldirici genelde doğru kuralın tek bir unsurunu değiştirir (süre, merci, "kaybeder" yerine "sorumludur", "kural olarak" ibaresinin düşürülmesi). Şıkları tek tek değil, ikişer ikişer karşılaştırarak farkı ara.',
    hizli: 'Bu kalıpta hızlı okuma en tehlikelisi: şıklar birbirine o kadar yakın yazılır ki hızlı geçince fark gözden kaçar. Kökte "doğru" mu "yanlış" mı sorulduğunu tekrar kontrol et, sık karışır.',
  },
  olumsuz: {
    baslik: 'Olumsuz kök tüyosu',
    normal: 'Kök "...değildir / ...yanlıştır / ...söylenemez" ile bitiyor; yani ÖSYM burada dört doğru bilgi arasından tek yanlışı istiyor. Şıkları "hangisi doğru" refleksiyle okuyup ilk doğru gördüğünde işaretlemek klasik hata.',
    hizli: 'Olumsuz kökte hız kaybı genelde kökü yanlış okumaktan gelir: "değildir" ibaresini kaçırıp normal soru gibi çözmek. İşaretlemeden önce kökün olumsuz mu olumlu mu olduğunu bir kez daha oku.',
  },
  olay: {
    baslik: 'Olay (vaka) sorusu tüyosu',
    normal: 'Olay sorularında hata genelde hukuki bilgiden değil, olay örgüsündeki bir ayrıntıyı (tarih, süre, kimin kime karşı hangi sıfatla işlem yaptığı) atlamaktan gelir. Kuralı biliyorsan olayı tekrar oku, tarafları ve zamanlamayı çıkar.',
    hizli: 'Olay sorusunu hızlı okumak, kimin davacı/davalı olduğunu veya süre başlangıcını karıştırmaya yol açar — bu sorularda kural bilgisi genelde yeterli, hata olayı hızlı taramaktan çıkıyor.',
  },
  kisaSik: {
    baslik: 'Kısa şıklı (süre/sayı/merci) tüyosu',
    normal: 'Kısa şıklarda (süre, sayı, merci, kavram) çeldiriciler birbirine çok yakın değerlerdir (3 ay / 6 ay, 14 / 15 gün). Kökte hangi işlemin süresi sorulduğunu net ayır; benzer süreli başka bir kurumla karıştırmış olabilirsin.',
    hizli: 'Kısa şıklı sorularda hızlı işaretlemek genelde "en tanıdık gelen sayıyı" seçmek anlamına gelir — kökü tam okumadan yakın bir sayıyı otomatik işaretleme refleksini kontrol et.',
  },
};

/** Bir soru + doğru/yanlış + hız bilgisine göre gösterilecek en uygun tüyoyu döndürür (yoksa null). */
export function tuyoSec(q, { ok, hizli }) {
  if (ok) return null;
  const t = soruTipleri(q);
  // Öncelik: kalıp > öncüllü > olumsuz > olay > kısaŞık — birden fazlası true olabilir,
  // sınavda en sık görülen/en öğretici olanı öne al.
  const oncelik = ['kalip', 'onculu', 'olumsuz', 'olay', 'kisaSik'];
  for (const k of oncelik) {
    if (t[k]) {
      const T = TUYO[k];
      return { baslik: T.baslik, metin: hizli ? T.hizli : T.normal, tip: k };
    }
  }
  return null;
}
