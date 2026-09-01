/* ==========================================================================
   gen/miras.js — MİRAS PAYI ÜRETECİ (kural motoru)

   Neden var (28 Tem 2026, kullanıcı fikri): "Interaktif bir pratik alanı
   olabilir... buradan soru çözer gibi çalışabiliriz."

   Elle yazılmış tek bir vaka tek atımlıktır — bir kez çözersin, cevabı
   bilirsin, biter. Bu modül vakayı ÜRETİR ve cevabı TMK'dan HESAPLAR.
   Hiçbir pay elle yazılmaz; hepsi m. 495-506'dan türetilir. Bu yüzden
   sonsuz pratik üretmek uydurma riski taşımaz — uydurulan bir şey yok.

   SINIR (bilinçli): bu yöntem yalnızca kuralın DETERMİNİSTİK olduğu
   konularda kullanılır. Muhakeme konularında (muvazaa, kusur, temel hatası)
   "doğru cevap" bir hesap değil bir değerlendirmedir; orada vaka üretmek
   hukuk uydurmak olur. Bkz. KONU_YAZIM_TALIMATI.md.

   Uygulanan kurallar:
     m. 495  1. zümre = altsoy. Çocuklar eşit baş. Önce ölenin payı kendi
             altsoyuna KÖK BAŞINA geçer (halefiyet).
     m. 496  2. zümre = ana-baba, eşit. Önce ölenin payı kendi altsoyuna
             (mirasbırakanın kardeşlerine) geçer.
     m. 497  3. zümre = büyük ana-baba.
     m. 499  Sağ kalan eş: 1. zümreyle 1/4 · 2. zümreyle 1/2 ·
             3. zümreyle 3/4 · hiçbiri yoksa tamamı.
     m. 506  Saklı pay: altsoy → yasal payın 1/2 · ana-baba → 1/4 ·
             sağ kalan eş → 1. veya 2. zümreyle birlikteyse yasal payının
             TAMAMI, diğer hâllerde 3/4'ü.
             Kardeşlerin saklı payı YOKTUR (2019'da m. 506'dan çıkarıldı).
   ========================================================================== */

/* ---------- kesir aritmetiği (kayan nokta kullanılmaz) ---------- */

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }

export function fr(n, d = 1) {
  if (d === 0) throw new Error('payda 0');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
export const frMul = (a, b) => fr(a.n * b.n, a.d * b.d);
export const frDiv = (a, k) => fr(a.n, a.d * k);
export const frAdd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
export const frEq = (a, b) => a.n * b.d === b.n * a.d;
export const frStr = a => (a.n === 0 ? '0' : a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

/* ---------- deterministik rastgelelik (tohumlu) ---------- */

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

const ERKEK = ['Ali', 'Mehmet', 'Kerem', 'Emre', 'Onur', 'Baran', 'Tolga', 'Yusuf'];
const KADIN = ['Ayşe', 'Zeynep', 'Elif', 'Deniz', 'Selin', 'Nur', 'Ece', 'Melis'];

/* ---------- 1) VAKA ÜRETİMİ ---------- */

/**
 * Rastgele bir miras vakası kurar.
 * @param {number} seed  aynı tohum aynı vakayı verir (test edilebilirlik)
 * @param {string} [zorla] 'altsoy' | 'halefiyet' | 'anababa' | 'kardes' | 'buyukanababa' | 'yalnizes'
 */
export function uretVaka(seed, zorla) {
  const r = rng(seed);
  const kalip = zorla || pick(r, ['altsoy', 'altsoy', 'halefiyet', 'anababa', 'kardes', 'buyukanababa', 'yalnizes']);
  const esVar = kalip === 'yalnizes' ? true : r() < 0.65;

  const kisiler = [];
  let ke = 0, kk = 0;
  const ad = g => (g === 'm' ? ERKEK[ke++ % ERKEK.length] : KADIN[kk++ % KADIN.length]);
  const ekle = o => { kisiler.push(o); return o; };

  ekle({ id: 'mb', label: 'Mirasbırakan', role: 'mirasbirakan', gen: 0 });
  if (esVar) ekle({ id: 'es', label: ad('f'), subLabel: 'sağ kalan eş', gender: 'f', gen: 0, rol: 'es' });

  const unions = [];
  if (esVar) unions.push({ partners: ['mb', 'es'], type: 'marriage', children: [] });

  if (kalip === 'altsoy' || kalip === 'halefiyet') {
    const n = int(r, 2, 3);
    const cocuklar = [];
    for (let i = 0; i < n; i++) {
      const g = r() < 0.5 ? 'm' : 'f';
      const c = ekle({ id: 'c' + i, label: ad(g), subLabel: g === 'm' ? 'oğul' : 'kız', gender: g, gen: 1, rol: 'altsoy' });
      cocuklar.push(c);
    }
    // halefiyet: bir çocuk önce ölmüş, torunları var
    if (kalip === 'halefiyet') {
      const olen = cocuklar[cocuklar.length - 1];
      olen.dead = true; olen.heir = false;
      olen.subLabel += ' · mirasbırakandan önce vefat';
      const t = int(r, 2, 2);
      const torunlar = [];
      for (let i = 0; i < t; i++) {
        const g = r() < 0.5 ? 'm' : 'f';
        const x = ekle({ id: 't' + i, label: ad(g), subLabel: 'torun', gender: g, gen: 2, rol: 'altsoy', kokId: olen.id });
        torunlar.push(x);
      }
      unions.push({ partners: [olen.id], children: torunlar.map(x => x.id) });
    }
    if (unions[0]) unions[0].children = cocuklar.map(c => c.id);
    else unions.push({ partners: ['mb'], children: cocuklar.map(c => c.id) });
  } else if (kalip === 'anababa' || kalip === 'kardes') {
    const baba = ekle({ id: 'baba', label: 'Baba', gender: 'm', gen: -1, rol: 'anababa' });
    const anne = ekle({ id: 'anne', label: 'Anne', gender: 'f', gen: -1, rol: 'anababa' });
    if (kalip === 'kardes') {
      anne.dead = true; anne.heir = false; anne.subLabel = 'mirasbırakandan önce vefat';
      const k = int(r, 1, 2);
      const kardesler = [];
      for (let i = 0; i < k; i++) {
        const g = r() < 0.5 ? 'm' : 'f';
        kardesler.push(ekle({
          id: 'k' + i, label: ad(g), subLabel: g === 'm' ? 'erkek kardeş' : 'kız kardeş',
          gender: g, gen: 0, rol: 'kardes', kokId: 'anne'
        }));
      }
      unions.push({ partners: ['baba', 'anne'], type: 'marriage', children: ['mb', ...kardesler.map(x => x.id)] });
    } else {
      unions.push({ partners: ['baba', 'anne'], type: 'marriage', children: ['mb'] });
    }
  } else if (kalip === 'buyukanababa') {
    ekle({ id: 'ba1', label: 'Büyükbaba', subLabel: 'baba tarafı', gender: 'm', gen: -2, rol: 'buyukanababa' });
    ekle({ id: 'ba2', label: 'Büyükanne', subLabel: 'baba tarafı', gender: 'f', gen: -2, rol: 'buyukanababa' });
    unions.push({ partners: ['ba1', 'ba2'], type: 'marriage', children: ['mb'] });
  }
  // 'yalnizes': eş dışında mirasçı yok

  return { seed, kalip, esVar, kisiler, unions };
}

/* ---------- 2) PAY HESABI — tek doğruluk kaynağı ---------- */

/** Vakadaki her mirasçının yasal payını ve saklı payını TMK'dan hesaplar. */
export function hesapla(vaka) {
  const K = vaka.kisiler;
  const altsoy = K.filter(k => k.rol === 'altsoy' && !k.dead);
  const olenCocuk = K.filter(k => k.rol === 'altsoy' && k.dead);
  const canliCocuk = K.filter(k => k.rol === 'altsoy' && !k.dead && k.gen === 1);
  const torun = K.filter(k => k.rol === 'altsoy' && k.gen === 2);
  const anababa = K.filter(k => k.rol === 'anababa' && !k.dead);
  const kardes = K.filter(k => k.rol === 'kardes');
  const buyuk = K.filter(k => k.rol === 'buyukanababa');
  const es = K.find(k => k.rol === 'es');

  // Hangi zümre mirasçı? Önceki zümrede tek kişi varsa sonrakine geçilmez (m. 495/2).
  const zumre1 = canliCocuk.length + torun.length > 0;
  const zumre2 = !zumre1 && (anababa.length + kardes.length > 0);
  const zumre3 = !zumre1 && !zumre2 && buyuk.length > 0;
  const zumre = zumre1 ? 1 : zumre2 ? 2 : zumre3 ? 3 : 0;

  // Eşin payı (m. 499)
  let esPay = fr(0);
  if (es) esPay = zumre === 1 ? fr(1, 4) : zumre === 2 ? fr(1, 2) : zumre === 3 ? fr(3, 4) : fr(1);
  const kalan = fr(1 * esPay.d - esPay.n, esPay.d); // 1 - esPay

  const pay = {};   // id -> kesir
  if (es) pay[es.id] = esPay;

  if (zumre === 1) {
    // KÖK başına: her canlı çocuk 1 kök, önce ölen her çocuk da 1 kök (payı altsoyuna iner)
    const kokSayisi = canliCocuk.length + olenCocuk.length;
    const kokPay = frDiv(kalan, kokSayisi);
    canliCocuk.forEach(c => { pay[c.id] = kokPay; });
    olenCocuk.forEach(o => {
      const cocuklari = torun.filter(t => t.kokId === o.id);
      const p = frDiv(kokPay, cocuklari.length || 1);
      cocuklari.forEach(t => { pay[t.id] = p; });
    });
  } else if (zumre === 2) {
    // Ana ve baba eşit; önce ölenin payı kendi altsoyuna (kardeşlere)
    const olenEbeveyn = K.filter(k => k.rol === 'anababa' && k.dead);
    const kokSayisi = anababa.length + olenEbeveyn.length;
    const kokPay = frDiv(kalan, kokSayisi);
    anababa.forEach(a => { pay[a.id] = kokPay; });
    olenEbeveyn.forEach(o => {
      const alt = kardes.filter(x => x.kokId === o.id);
      const p = frDiv(kokPay, alt.length || 1);
      alt.forEach(x => { pay[x.id] = p; });
    });
  } else if (zumre === 3) {
    const p = frDiv(kalan, buyuk.length);
    buyuk.forEach(b => { pay[b.id] = p; });
  }

  // Saklı pay (m. 506)
  const saklı = {};
  Object.keys(pay).forEach(id => {
    const k = K.find(x => x.id === id);
    if (k.rol === 'altsoy') saklı[id] = frDiv(pay[id], 2);
    else if (k.rol === 'anababa') saklı[id] = frDiv(pay[id], 4);
    else if (k.rol === 'es') saklı[id] = (zumre === 1 || zumre === 2) ? pay[id] : frMul(pay[id], fr(3, 4));
    else saklı[id] = null;   // kardeş ve büyük ana-baba: saklı pay YOK
  });

  return { zumre, pay, saklı };
}

/* ---------- 3) GEREKÇE — her hücre için, hesaptan türetilir ---------- */

function esGerekce(zumre, p) {
  const z = { 1: '1. zümre (altsoy)', 2: '2. zümre (ana-baba)', 3: '3. zümre (büyük ana-baba)' }[zumre];
  if (!zumre) return `Başka zümrede mirasçı kalmadığı için sağ kalan eş terekenin <b>tamamını</b> alır (TMK m. 499/son).`;
  return `Sağ kalan eş <b>${z}</b> ile birlikte mirasçı olduğunda terekenin <b>${frStr(p)}</b>'ini alır (TMK m. 499). Eşin payı hangi zümreyle birlikte olduğuna göre değişir: 1. zümreyle 1/4, 2. zümreyle 1/2, 3. zümreyle 3/4.`;
}

export function gerekceler(vaka, h) {
  const K = vaka.kisiler;
  const kalanStr = frStr(fr(h.pay[K.find(k => k.rol === 'es')?.id]?.d - (h.pay[K.find(k => k.rol === 'es')?.id]?.n || 0) || 1, h.pay[K.find(k => k.rol === 'es')?.id]?.d || 1));
  const out = {};
  Object.keys(h.pay).forEach(id => {
    const k = K.find(x => x.id === id);
    const p = h.pay[id], s = h.saklı[id];
    let payWhy, saklıWhy;

    if (k.rol === 'es') {
      payWhy = esGerekce(h.zumre, p);
      saklıWhy = (h.zumre === 1 || h.zumre === 2)
        ? `Eşin saklı payı, <b>1. veya 2. zümreyle</b> birlikteyken yasal payının <b>tamamıdır</b> (TMK m. 506) → ${frStr(p)}. Tuzak: eşin payı yarılanmaz; yarılanan altsoyun payıdır.`
        : `Eş <b>3. zümreyle</b> birlikte veya tek başına mirasçıysa saklı payı, yasal payının <b>3/4</b>'üdür (TMK m. 506) → ${frStr(p)} × 3/4 = ${frStr(s)}.`;
    } else if (k.rol === 'altsoy') {
      const kok = k.kokId ? K.find(x => x.id === k.kokId) : null;
      payWhy = kok
        ? `${kok.label} mirasbırakandan <b>önce öldüğü</b> için payı, TMK m. 495/2 <b>halefiyet</b> ilkesiyle kendi altsoyuna eşit bölünerek geçer. Bölüşüm zümre değil <b>kök başına</b> yapılır → ${frStr(p)}.`
        : `Eşe giden pay düşüldükten sonra kalan <b>${kalanStr}</b>, altsoy arasında <b>kök başına eşit</b> paylaşılır (TMK m. 495, m. 500) → ${frStr(p)}. Cinsiyet, yaş, evli olup olmama payı değiştirmez.`;
      saklıWhy = `Altsoyun saklı payı, yasal payının <b>yarısıdır</b> (TMK m. 506/1): ${frStr(p)} ÷ 2 = <b>${frStr(s)}</b>.`;
    } else if (k.rol === 'anababa') {
      payWhy = `Altsoy bulunmadığı için 2. zümreye geçilir: ana ve baba terekeyi <b>eşit</b> paylaşır (TMK m. 496) → ${frStr(p)}.`;
      saklıWhy = `Ana-babanın saklı payı, yasal payının <b>1/4</b>'üdür (TMK m. 506/2): ${frStr(p)} ÷ 4 = <b>${frStr(s)}</b>.`;
    } else if (k.rol === 'kardes') {
      payWhy = `Ana veya baba mirasbırakandan önce ölmüşse payı, <b>halefiyetle</b> kendi altsoyuna — yani mirasbırakanın kardeşlerine — geçer (TMK m. 496/2) → ${frStr(p)}.`;
      saklıWhy = `<b>Kardeşlerin saklı payı YOKTUR.</b> 2019 değişikliğiyle TMK m. 506'dan çıkarıldı — en sık sorulan tuzak budur. Kardeş yasal mirasçıdır ama saklı paylı mirasçı değildir; vasiyetle payı kesilse tenkis davası açamaz.`;
    } else {
      payWhy = `Altsoy ve ana-baba zümresi bulunmadığı için 3. zümreye (büyük ana-baba) geçilir (TMK m. 497) → ${frStr(p)}.`;
      saklıWhy = `Büyük ana-babanın <b>saklı payı yoktur</b> (TMK m. 506'da sayılmamıştır).`;
    }
    out[id] = { payWhy, saklıWhy };
  });
  return out;
}

/* ---------- 4) EKRAN VERİSİ — soy ağacı + doldurma tablosu ---------- */

/** Havuz: doğru cevapları içerir + yakın çeldiriciler. Sıralı ve tekrarsız. */
function havuz(h) {
  const set = new Set();
  Object.values(h.pay).forEach(p => set.add(frStr(p)));
  Object.values(h.saklı).forEach(s => { if (s) set.add(frStr(s)); });
  ['1/2', '1/4', '3/4', '1/3', '3/8', '1/8', '3/16', '1/6', '1/16'].forEach(x => set.add(x));
  set.add('yok');
  const arr = [...set].filter(x => x !== 'yok').sort((a, b) => {
    const [an, ad] = a.split('/').map(Number), [bn, bd] = b.split('/').map(Number);
    return (an / (ad || 1)) - (bn / (bd || 1));
  });
  return [...arr, 'yok'];
}

const BASLIK = {
  altsoy: 'Sağ kalan eş + altsoy',
  halefiyet: 'Halefiyet: önce ölen çocuğun payı torunlara',
  anababa: '2. zümre: ana-baba',
  kardes: 'Halefiyet: ölen ebeveynin payı kardeşe',
  buyukanababa: '3. zümre: büyük ana-baba',
  yalnizes: 'Tek başına sağ kalan eş'
};

/** Pratik ekranının doğrudan kullanacağı paket. */
export function uretPratik(seed, zorla) {
  const vaka = uretVaka(seed, zorla);
  const h = hesapla(vaka);
  const g = gerekceler(vaka, h);
  const K = vaka.kisiler;
  const pool = havuz(h);

  // soy ağacı: paylar GİZLİ (cevap peşinen verilmez)
  const genLabels = {};
  K.forEach(k => {
    if (k.gen === -2) genLabels['-2'] = 'Büyük ana-baba (3. zümre)';
    if (k.gen === -1) genLabels['-1'] = 'Üstsoy — ana-baba (2. zümre)';
    if (k.gen === 0) genLabels['0'] = 'Mirasbırakan kuşağı';
    if (k.gen === 1) genLabels['1'] = 'Altsoy — çocuklar (1. zümre)';
    if (k.gen === 2) genLabels['2'] = 'Altsoy — torunlar';
  });

  const tree = {
    hideTable: true,
    cases: [{
      law: `Vaka #${seed} · ${BASLIK[vaka.kalip]}. Ağaçtaki kim kimdir görünür; <b>paylar aşağıda senin dolduracağın tabloda</b>.`,
      genLabels,
      nodes: K.map(k => {
        const o = { id: k.id, label: k.label, gen: k.gen };
        if (k.subLabel) o.subLabel = k.subLabel;
        if (k.gender) o.gender = k.gender;
        if (k.role) o.role = k.role;
        if (k.dead) { o.dead = true; o.heir = false; }
        if (h.pay[k.id] === undefined && !k.role) o.heir = k.dead ? false : o.heir;
        return o;
      }),
      unions: vaka.unions
    }]
  };

  const mirascilar = Object.keys(h.pay);
  const fill = {
    title: `Vaka #${seed} — ${BASLIK[vaka.kalip]}`,
    hint: 'Yukarıdaki aileye bak, boş hücreye dokun ve doğru kesri seç. Yanlış seçmek serbest — gerekçesi açılır.',
    headers: ['Yasal mirasçı', 'Yasal miras payı', 'Saklı payı'],
    pool,
    rows: mirascilar.map(id => {
      const k = K.find(x => x.id === id);
      const s = h.saklı[id];
      return {
        label: k.label,
        sub: k.subLabel || k.rol,
        slots: [
          { q: `<b>${k.label}</b> (${k.subLabel || k.rol}) — <b>yasal miras payı</b> nedir?`, answer: frStr(h.pay[id]), why: g[id].payWhy },
          { q: `<b>${k.label}</b> — <b>saklı payı</b> nedir?`, answer: s ? frStr(s) : 'yok', why: g[id].saklıWhy }
        ]
      };
    }),
    caption: 'Saklı pay (TMK m. 506): altsoy → yasal payının <b>1/2</b>\'si · ana-baba → <b>1/4</b>\'ü · sağ kalan eş → 1. veya 2. zümreyle birlikteyse <b>tamamı</b>, diğer hâllerde <b>3/4</b>\'ü. <b>Kardeşlerin ve büyük ana-babanın saklı payı yoktur.</b>'
  };

  // `panels`: pratik ekranının çizeceği görsel panelleri. Her üreteç kendi
  // görselini getirir — v3 kalıbı ya da ham HTML (bkz. gen/ciro.js).
  return {
    vaka, hesap: h, tree, fill, baslik: BASLIK[vaka.kalip],
    panels: [{ kind: 'v3', visualType: 'family_tree', visualData: tree }]
  };
}

/** Bütünlük kontrolü: dağıtılan payların toplamı 1 etmeli. */
export function toplamPay(h) {
  return Object.values(h.pay).reduce((a, b) => frAdd(a, b), fr(0));
}
