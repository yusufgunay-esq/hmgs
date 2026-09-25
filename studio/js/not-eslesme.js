/* ==========================================================================
   not-eslesme.js : Çözülen soruya en ilgili Notlar öğesini bulur
   Notlar (notlar-data.js) dört sınavın sorularından süzüldü; bu modül
   soru kökü + şıklar + açıklamadaki kelime köklerini notlardaki tuzak ve
   ezber öğeleriyle karşılaştırır (nadir kelime ağırlıklı). Eşik bilerek
   yüksek: yanlış not göstermek, hiç göstermemekten kötü. Eşleşme yoksa
   çağıran taraf dersin "sınavda" notuna düşer.
   Ölçüm (25 Eylül 2026): 460 arşiv sorusunun 222'sinde eşleşme; rastgele
   24 soruluk elle kontrolde ilk öğe 22'sinde soruyla doğrudan ilgili.
   © 2026 Yusuf GÜNAY, Tüm Hakları Saklıdır.
   ========================================================================== */

import { DERSLER } from './notlar-data.js';

export const DERS_ESLE = {
  anayasa_hukuku: 'anayasa', anayasa_yargisi: 'aymyargi', idare_hukuku: 'idare', iyuk: 'iyuk',
  medeni_hukuk: 'medeni', borclar_hukuku: 'borclar', ticaret_hukuku: 'ticaret', hmk: 'hmk',
  icra_iflas: 'icra', ceza_hukuku: 'ceza', cmk: 'cmk', is_hukuku: 'is', vergi_hukuku: 'vergi',
  vergi_usul: 'vergi', avukatlik: 'avukatlik', hukuk_felsefesi: 'felsefe', hukuk_tarihi: 'tarih',
  milletlerarasi_hukuk: 'milletlerarasi', mohuk: 'mohuk', genel_kamu: 'genelkamu'
};

const DUR = new Set(('aşağıdakilerden hangisi hangileri kanunu kanun göre olarak olan olup ancak ilgili ' +
  'ifadelerden ifade yanlış doğru değildir durumda halinde hâlinde tarafından arasında sayılı madde bakımından ' +
  'ilişkin yalnız birlikte kural kuralı sonra önce daha yapılır yapılan edilir edilen içinde itibaren gibi ' +
  'kadar hakkında olması olmadığı aynı cevap cevabı ifades kesin fazla başlar ceza cezası icra dava davası ' +
  'davayı mahkeme mahkemesi süre süresi süreyi başvuru hüküm hükmü karar kararı sınav sınavda soru soruda ' +
  'şıkta şıkkı olur olmaz şirket şirketi ticari işletme kamu hizmet hizmeti devlet devleti hukuku hukuk ' +
  'gösterilen sözleşme görev görevi kavram kavramı genel özel hakkı üzerinde kişiler kişileri yeni ' +
  'yapılabilir yapılamaz edilebilir edilemez bulunan bulunur ayrıca hiçbir herhangi sadece ettiği etmek ' +
  'yapmak olmak veya ile için karşı üzere nedeniyle dolayı').split(' '));
const kok = w => w.slice(0, 6);
const DURK = new Set([...DUR].map(kok));

function jeton(s) {
  const t = String(s || '').replace(/\*\*/g, '').toLocaleLowerCase('tr');
  const out = new Set();
  for (const m of t.matchAll(/\d+(?:[.,/]\d+)?|[a-zçğıöşüâîû]{4,}/g)) {
    const w = m[0];
    if (/^\d/.test(w)) { if (w.length >= 2 || w.includes('/')) out.add('#' + w); continue; }
    if (DUR.has(w) || DURK.has(kok(w))) continue;
    out.add(kok(w));
  }
  return out;
}

let OGELER = null, DF = null;
function hazirla() {
  OGELER = [];
  for (const d of DERSLER) {
    for (const t of d.tuzak) OGELER.push({ ders: d.id, tur: 'tuzak', veri: t, j: jeton(typeof t === 'string' ? t : t.y + ' ' + t.d) });
    for (const e of d.ezber) OGELER.push({ ders: d.id, tur: 'ezber', veri: e, j: jeton(e[0] + ' ' + e[1]) });
  }
  DF = new Map();
  for (const o of OGELER) for (const k of o.j) DF.set(k, (DF.get(k) || 0) + 1);
}

const metin = o => (typeof o === 'string' ? o : (o?.text || o?.t || ''));

/** Sorunun ait olduğu Notlar dersi (etiket, 120 soruluk resmî sınavda blok numarası da). */
export function notDersleri(q) {
  const ids = new Set();
  if (DERS_ESLE[q.subjectId]) ids.add(DERS_ESLE[q.subjectId]);
  const n = q.qNumber;
  if (n && /^hmgs_20(25|26)/.test(String(q.source || ''))) {
    const b = DERSLER.find(d => n >= d.aralik[0] && n <= d.aralik[1]);
    if (b) ids.add(b.id);
  }
  return DERSLER.filter(d => ids.has(d.id));
}

/** En fazla 2 ilgili Notlar öğesi: { ders, tur: 'tuzak'|'ezber', veri }. */
export function ilgiliNotlar(q, { en = 2, esik = 16 } = {}) {
  if (!q) return [];
  if (!OGELER) hazirla();
  const dersler = new Set(notDersleri(q).map(d => d.id));
  if (!dersler.size) return [];
  const opts = Array.isArray(q.options) ? q.options : Object.values(q.options || {});
  const qj = jeton([q.stem, opts.map(metin).join(' '), q.explanation].join(' '));
  const dogru = opts.find(o => o && o.key === q.correct);
  const dj = jeton(metin(dogru));
  const N = OGELER.length;
  const puanli = [];
  for (const o of OGELER) {
    if (!dersler.has(o.ders)) continue;
    let p = 0, ortak = 0, nadir = 0;
    for (const k of o.j) {
      if (!qj.has(k)) continue;
      const df = DF.get(k) || 1;
      p += Math.log(N / df) * (k[0] === '#' ? 1.5 : 1) * (dj.has(k) ? 1.5 : 1);
      ortak++;
      if (df <= 3) nadir++;
    }
    if (ortak >= 3 && nadir >= 2 && p >= esik) puanli.push({ ders: o.ders, tur: o.tur, veri: o.veri, p });
  }
  puanli.sort((a, b) => b.p - a.p);
  return puanli.filter((x, i) => i === 0 || x.p >= puanli[0].p * 0.8).slice(0, en);
}
