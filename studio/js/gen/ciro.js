/* ==========================================================================
   gen/ciro.js — KAMBİYO SENEDİ / CİRO ZİNCİRİ ÜRETECİ

   Kullanıcı fikri (28 Tem 2026): "Mesela ciro etmede de böyle bir şey
   ekleyebilirsin diye aklıma geldi."

   Neden üreteç konusu: ciro zinciri deterministik bir makinedir. Zincirin
   kırık olup olmadığı, hamilin yetkili olup olmadığı, borçlunun şahsi def'i
   ileri sürüp süremeyeceği ve senedin kambiyo vasfını koruyup korumadığı —
   hepsi kurallardan HESAPLANIR. Hiçbiri elle yazılmaz.

   Kaynak: work/ticaret_research.md (Kıymetli Evrak bölümü) + TTK.

   Uygulanan kurallar:
     m. 681/2  "Ciro edilemez" (menfi ciro) kaydı → devir yalnız alacağın
               temliki hükmünde; borçlu tüm şahsi def'ilerini ileri sürer.
     m. 683    Tam ciro (lehtar adı yazılı) / beyaz ciro (yalnız imza).
     m. 684/2  Beyaz cirolu senedi elinde bulunduran, ciro etmeden SADECE
               ZİLYETLİK DEVRİYLE aktarabilir — zincir KIRILMAZ. (En sık tuzak.)
     m. 686/1  Yetkili hamil = birbirine bağlı (müteselsil) ciro silsilesi.
     m. 687/1  Şahsi def'iler ciro ile devralan hamile karşı ileri SÜRÜLEMEZ.
               İstisna: hamil "bile bile borçlunun zararına" hareket etmişse.
     m. 688    Tahsil cirosu → hamil yalnızca vekildir; borçlu, cirantaya
               karşı ileri sürebileceği def'ileri ona karşı da ileri sürer.
     m. 689    Rehin cirosu → borçlu şahsi def'ilerini ileri süremez
               (hamil bile bile zararına hareket etmedikçe).
     m. 690    Vadeden/protestodan sonraki ciro (gecikmiş ciro) → alacağın
               temliki hükmünde.
     m. 790    Çekte ibraz süresi geçtikten sonraki ciro → alacağın temliki.
     m. 796    Çek ibraz süresi: aynı yer 10 gün · aynı ülke farklı yer 1 ay.
     m. 808    İbraz süresi geçerse müracaat hakları düşer.

   MUTLAK def'iler (şekil eksikliği, imza sahteliği, ehliyetsizlik) bu
   üretecin konusu değil — onlar herkese karşı ileri sürülür ve ayrı bir
   üreteç/sahne konusudur.
   ========================================================================== */

import { rng } from './miras.js';

const AD = [
  'Kemal Arslan', 'Metin Polat', 'Duygu Akçay', 'Hakan Sezer', 'Zeynep Taner',
  'Cemil Vardar', 'Nurten Aydın', 'Serkan Doğan', 'Elif Korkmaz', 'Barış Yalçın'
];

const CIRO_TUR = {
  tam: { ad: 'Tam ciro', kayit: '"Ödeyiniz — <ad>"', law: 'TTK m. 683' },
  beyaz: { ad: 'Beyaz ciro', kayit: '(yalnızca imza)', law: 'TTK m. 683' },
  tahsil: { ad: 'Tahsil cirosu', kayit: '"Bedeli tahsil içindir"', law: 'TTK m. 688' },
  rehin: { ad: 'Rehin cirosu', kayit: '"Bedeli teminattır"', law: 'TTK m. 689' }
};

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/* ---------- 1) VAKA ÜRETİMİ ---------- */

/**
 * @param {number} seed
 * @param {string} [zorla] 'temiz' | 'beyaz' | 'kirik' | 'tahsil' | 'rehin'
 *                         | 'gecikmis' | 'menfi' | 'kotuniyet'
 */
export function uretVaka(seed, zorla) {
  const r = rng(seed ^ 0x5c1a0);
  const kalip = zorla || pick(r, ['temiz', 'beyaz', 'beyaz', 'kirik', 'tahsil', 'rehin', 'gecikmis', 'menfi', 'kotuniyet']);
  // Gecikmiş ciroda ikisi de çıkabilmeli: bonoda m. 690, çekte m. 790 uygulanır.
  const senetTuru = pick(r, ['bono', 'bono', 'cek']);

  // İsimleri çakışmadan dağıt
  const havuz = [...AD];
  const al = () => havuz.splice(Math.floor(r() * havuz.length), 1)[0];

  const duzenleyen = al();       // bono: düzenleyen · çek: keşideci
  const lehtar = al();
  const h1 = al();
  const h2 = al();

  const bedel = int(r, 3, 20) * 50000;
  const temelIliski = (kalip === 'kotuniyet' || r() < 0.45) ? 'bedelsiz' : 'gecerli';

  /* Ciro zinciri. Her halka: kim ciro etti → kimin lehine, hangi türde.
     `zilyetlik` halkası: beyaz cirodan sonra ciro edilmeden elden teslim. */
  const zincir = [];
  const push = (ciranta, lehine, tur, not) => zincir.push({ ciranta, lehine, tur, not: not || null });

  let menfiCiro = false, gecikmis = false, kotuNiyet = false, kirik = false;

  if (kalip === 'beyaz') {
    // Lehtar yalnızca imza atıp senedi h1'e teslim eder; h1 ciro etmeden h2'ye
    // salt zilyetlik devriyle aktarır (m. 684/2) — zincir KIRILMAZ.
    zincir.push({ ciranta: lehtar, lehine: null, tur: 'beyaz', not: null, teslim: h1 });
    zincir.push({ ciranta: h1, lehine: h2, tur: 'zilyetlik', not: null });
  } else if (kalip === 'kirik') {
    push(lehtar, h1, 'tam');
    // zincir kırık: h1 değil, hiç ciro almamış bir kişi ciro ediyor
    const yabanci = al() || 'Üçüncü Kişi';
    push(yabanci, h2, 'tam', 'kopuk');
    kirik = true;
  } else if (kalip === 'tahsil') {
    push(lehtar, h1, 'tam');
    push(h1, h2, 'tahsil');
  } else if (kalip === 'rehin') {
    push(lehtar, h1, 'tam');
    push(h1, h2, 'rehin');
  } else if (kalip === 'gecikmis') {
    push(lehtar, h1, 'tam');
    push(h1, h2, 'tam', 'gecikmis');
    gecikmis = true;
  } else if (kalip === 'menfi') {
    menfiCiro = true;
    push(lehtar, h1, 'tam');
    push(h1, h2, 'tam');
  } else if (kalip === 'kotuniyet') {
    push(lehtar, h1, 'tam', 'kotuniyet');
    kotuNiyet = true;
  } else {   // temiz
    push(lehtar, h1, 'tam');
    push(h1, h2, 'tam');
  }

  const hamil = zincir[zincir.length - 1].lehine || zincir[zincir.length - 1].ciranta;

  // Çekte ibraz süresi (m. 796) — gecikmiş senaryoda kullanılır
  const ayniYer = r() < 0.5;
  const ibrazGun = ayniYer ? 10 : 30;
  const ciroGun = gecikmis ? ibrazGun + int(r, 3, 25) : int(r, 1, Math.max(2, ibrazGun - 3));

  return {
    seed, kalip, senetTuru, duzenleyen, lehtar, hamil, bedel, zincir,
    temelIliski, menfiCiro, gecikmis, kotuNiyet, kirik,
    ayniYer, ibrazGun, ciroGun
  };
}

/* ---------- 2) HESAP — tek doğruluk kaynağı ---------- */

export function hesapla(v) {
  /* a) Ciro silsilesi bağlı mı? (m. 686/1)
        Beyaz ciro sonrası salt zilyetlik devri zinciri KIRMAZ (m. 684/2). */
  let bagli = true, kirilmaNedeni = null, onceki = v.lehtar, sonBeyaz = false;
  for (const h of v.zincir) {
    if (h.tur === 'zilyetlik') {
      if (!sonBeyaz) { bagli = false; kirilmaNedeni = 'ciro olmadan devir'; break; }
      sonBeyaz = true;               // beyaz senet elden ele geçmeye devam edebilir
      onceki = h.lehine;
      continue;
    }
    if (h.ciranta !== onceki && !sonBeyaz) {
      bagli = false;
      kirilmaNedeni = `${h.ciranta} kendisine ciro edilmemiş bir senedi ciro etmiş`;
      break;
    }
    sonBeyaz = (h.tur === 'beyaz');
    onceki = h.lehine || onceki;
  }

  /* b) Devir kambiyo cirosu mu, alacağın temliki mi? */
  const temlikHukmunde = v.menfiCiro || v.gecikmis;
  const temlikSebep = v.menfiCiro
    ? { law: 'TTK m. 681/2', txt: 'senede "ciro edilemez" (menfi ciro) kaydı konmuş' }
    : v.gecikmis
      ? (v.senetTuru === 'cek'
        ? { law: 'TTK m. 790', txt: `çek ${v.ibrazGun} günlük ibraz süresi geçtikten sonra (${v.ciroGun}. gün) ciro edilmiş` }
        : { law: 'TTK m. 690', txt: 'ciro vadeden/protestodan sonra yapılmış (gecikmiş ciro)' })
      : null;

  /* c) Hamil yetkili hamil mi? */
  const sonHalka = v.zincir[v.zincir.length - 1];
  const vekilHamil = sonHalka.tur === 'tahsil';
  const yetkiliHamil = bagli && !vekilHamil;

  /* d) Borçlu şahsi def'i (bedelsizlik) ileri sürebilir mi? */
  let defi, defiLaw, defiNeden;
  if (v.temelIliski !== 'bedelsiz') {
    defi = false; defiLaw = '—';
    defiNeden = 'Temel ilişki geçerli — ileri sürülecek bir bedelsizlik def\'i zaten yok.';
  } else if (!bagli) {
    defi = true; defiLaw = 'TTK m. 686/1';
    defiNeden = `Ciro silsilesi kopuk (${kirilmaNedeni}); hamil yetkili hamil sayılmaz, m. 687 korumasından yararlanamaz.`;
  } else if (temlikHukmunde) {
    defi = true; defiLaw = temlikSebep.law;
    defiNeden = `Devir kambiyo cirosu değil <b>alacağın temliki</b> hükmünde (${temlikSebep.txt}); TBK m. 188 uyarınca borçlu, temlik edene karşı sahip olduğu bütün def'ileri devralana karşı da ileri sürer.`;
  } else if (sonHalka.tur === 'tahsil') {
    defi = true; defiLaw = 'TTK m. 688';
    defiNeden = 'Tahsil cirosunda hamil senedin maliki değil <b>vekilidir</b>; borçlu, cirantaya karşı ileri sürebileceği def\'ileri bu hamile karşı da ileri sürer.';
  } else if (v.kotuNiyet) {
    defi = true; defiLaw = 'TTK m. 687/1 (istisna)';
    defiNeden = 'Hamil senedi devralırken bononun bedelsiz olduğunu <b>bilerek, bile bile borçlunun zararına</b> hareket etmiştir; m. 687/1\'in açık istisnası devreye girer.';
  } else if (sonHalka.tur === 'rehin') {
    defi = false; defiLaw = 'TTK m. 689';
    defiNeden = 'Rehin cirosunda borçlu şahsi def\'ilerini rehin alacaklısına karşı ileri <b>süremez</b> — hamil bile bile zararına hareket etmedikçe. Tahsil cirosuyla karıştırma: sonuçları zıttır.';
  } else {
    defi = false; defiLaw = 'TTK m. 687/1';
    defiNeden = 'Kambiyo senetlerinin <b>soyutluğu</b> gereği, düzenleyen ile lehtar arasındaki bedelsizlik şahsi def\'idir ve senedi ciro ile devralan iyiniyetli hamile karşı ileri sürülemez.';
  }

  /* e) Kambiyo senetlerine özgü icra takibi yapılabilir mi? */
  const kambiyoTakip = !temlikHukmunde && bagli;
  const takipLaw = temlikHukmunde
    ? temlikSebep.law
    : (!bagli ? 'TTK m. 686/1' : 'İİK m. 167');
  const takipNeden = temlikHukmunde
    ? `Senet kambiyo vasfını yitirdiği için (${temlikSebep.txt}) hamil kambiyo senetlerine özgü haciz yoluyla takip <b>yapamaz</b>; genel hükümlere göre alacak davası açar veya ilamsız takip yapar.`
    : (!bagli
      ? 'Ciro silsilesi kopuk olduğu için hamil yetkili hamil sayılmaz; kambiyo takibi yapamaz.'
      : 'Senet kambiyo vasfını koruyor ve hamil yetkili hamil; kambiyo senetlerine özgü haciz yoluyla takip yapabilir.');

  return {
    bagli, kirilmaNedeni, yetkiliHamil, vekilHamil,
    temlikHukmunde, temlikSebep,
    defi, defiLaw, defiNeden,
    kambiyoTakip, takipLaw, takipNeden
  };
}

/* ---------- 3) EKRAN VERİSİ ---------- */

const BASLIK = {
  temiz: 'Temiz zincir — soyutluk koruması',
  beyaz: 'Beyaz ciro + salt zilyetlik devri',
  kirik: 'Kopuk ciro silsilesi',
  tahsil: 'Tahsil cirosu — hamil vekildir',
  rehin: 'Rehin cirosu',
  gecikmis: 'Gecikmiş ciro — alacağın temliki',
  menfi: '"Ciro edilemez" kaydı',
  kotuniyet: 'Bile bile borçlunun zararına hareket'
};

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/** Senedin ön yüzü + arkasındaki ciro zinciri (ham HTML panel). */
function senetHTML(v) {
  const tur = v.senetTuru === 'cek' ? 'ÇEK' : 'BONO';
  const halka = (h, i) => {
    if (h.tur === 'zilyetlik') {
      return `<div class="cr-halka cr-zilyet">
        <div class="cr-no">${i + 1}</div>
        <div class="cr-govde">
          <div class="cr-kim">${esc(h.ciranta)} → ${esc(h.lehine)}</div>
          <div class="cr-kayit">ciro yok — senet <b>elden teslimle</b> devredildi</div>
        </div>
        <div class="cr-tur">zilyetlik devri</div>
      </div>`;
    }
    const t = CIRO_TUR[h.tur];
    const kayit = h.tur === 'beyaz' ? t.kayit : t.kayit.replace('<ad>', esc(h.lehine || '—'));
    return `<div class="cr-halka${h.not === 'kopuk' ? ' cr-kopuk' : ''}${h.not === 'gecikmis' ? ' cr-gec' : ''}">
      <div class="cr-no">${i + 1}</div>
      <div class="cr-govde">
        <div class="cr-kim">${esc(h.ciranta)}${h.lehine ? ' → ' + esc(h.lehine) : ' → <i>lehtar adı YAZILMADI</i>'}</div>
        <div class="cr-kayit">${kayit} · <span class="cr-imza">imza</span>${h.teslim ? ` · senet <b>${esc(h.teslim)}</b>'e elden teslim edildi` : ''}</div>
      </div>
      <div class="cr-tur">${t.ad}</div>
    </div>`;
  };

  return `
    <div class="cr-wrap">
      <div class="cr-senet">
        <div class="cr-on">
          <div class="cr-baslik">${tur}${v.menfiCiro ? ' <span class="cr-kayit-rozet">CİRO EDİLEMEZ</span>' : ''}</div>
          <div class="cr-bedel">${v.bedel.toLocaleString('tr-TR')} ₺</div>
          <div class="cr-satir"><span>${v.senetTuru === 'cek' ? 'Keşideci' : 'Düzenleyen'}</span><b>${esc(v.duzenleyen)}</b></div>
          <div class="cr-satir"><span>Lehtar</span><b>${esc(v.lehtar)}</b></div>
          ${v.senetTuru === 'cek'
            ? `<div class="cr-satir"><span>İbraz süresi</span><b>${v.ibrazGun} gün ${v.ayniYer ? '(aynı yer)' : '(farklı yer)'}</b></div>
               <div class="cr-satir"><span>Son ciro</span><b class="${v.gecikmis ? 'cr-uyari' : ''}">${v.ciroGun}. gün</b></div>`
            : (v.gecikmis ? `<div class="cr-satir"><span>Son ciro</span><b class="cr-uyari">vadeden sonra</b></div>` : '')}
          <div class="cr-temel ${v.temelIliski === 'bedelsiz' ? 'cr-uyari' : ''}">
            Temel ilişki: ${v.temelIliski === 'bedelsiz'
              ? 'mal <b>hiç teslim edilmedi</b> — senet bedelsiz kaldı'
              : 'edim ifa edildi, senet karşılıklı'}
          </div>
          ${v.kotuNiyet ? `<div class="cr-temel cr-uyari">Son hamil, senedin bedelsiz olduğunu <b>bilerek</b> ve borçlunun ödemekten kaçınmasını engellemek amacıyla devraldı.</div>` : ''}
        </div>
        <div class="cr-arka">
          <div class="cr-arka-h">Senedin arkası — ciro silsilesi</div>
          ${v.zincir.map(halka).join('')}
          <div class="cr-hamil">Senedi elinde bulunduran: <b>${esc(v.hamil)}</b></div>
        </div>
      </div>
    </div>`;
}

const EH = ['Evet', 'Hayır'];

export function uretPratik(seed, zorla) {
  const v = uretVaka(seed, zorla);
  const h = hesapla(v);
  const sonHalka = v.zincir[v.zincir.length - 1];

  const rows = [
    {
      label: 'Ciro silsilesi', sub: 'TTK m. 686/1',
      slots: [{
        q: `Senedin arkasındaki ciro silsilesi <b>birbirine bağlı (müteselsil)</b> mı?`,
        answer: h.bagli ? 'Evet' : 'Hayır',
        pool: EH,
        why: h.bagli
          ? (v.kalip === 'beyaz'
            ? '<b>Evet — ve buradaki tuzak tam da bu.</b> Beyaz ciro ile senedi devralan hamil, arkayı ciro etmeden ve boşluğu doldurmadan <b>salt zilyetlik devriyle</b> senedi aktarabilir (TTK m. 684/2). Zincir kırılmaz; devralan yetkili hamildir. Devreden ciro zincirinde görünmediği için <b>müracaat borçlusu da olmaz</b>.'
            : 'Evet — her ciranta, kendisine ciro edilmiş kişidir; silsile lehtardan son hamile kesintisiz uzanır (TTK m. 686/1).')
          : `Hayır — ${h.kirilmaNedeni}. Silsile koptuğu an senedi elinde bulunduran kişi <b>yetkili hamil</b> sayılmaz ve m. 687'nin sağladığı soyutluk korumasından yararlanamaz.`
      }]
    },
    {
      label: 'Hamilin sıfatı', sub: `Son halka: ${CIRO_TUR[sonHalka.tur]?.ad || 'zilyetlik devri'}`,
      slots: [{
        q: `<b>${esc(v.hamil)}</b> senedin <b>maliki</b> midir?`,
        answer: h.vekilHamil ? 'Hayır' : (h.bagli ? 'Evet' : 'Hayır'),
        pool: EH,
        why: h.vekilHamil
          ? 'Hayır — <b>tahsil cirosu</b> senedin mülkiyetini devretmez, yalnızca bedeli tahsil yetkisi verir (TTK m. 688). Hamil vekil sıfatıyla hareket eder.'
          : (h.bagli
            ? (sonHalka.tur === 'rehin'
              ? 'Bu vakada son halka <b>rehin cirosu</b>: mülkiyet geçmez, senet üzerinde <b>alacak rehni</b> kurulur (TTK m. 689). Yine de rehin alacaklısı def\'ilere karşı korunur — tahsil cirosuyla ayrılan nokta budur.'
              : 'Evet — bağlı bir silsilenin sonundaki hamil, senedin maliki ve yetkili hamilidir (TTK m. 686/1).')
            : 'Hayır — silsile kopuk olduğu için senedi elinde bulunduran kişi yetkili hamil sayılmaz.')
      }]
    },
    {
      label: 'Devrin niteliği', sub: 'kambiyo cirosu mu, temlik mi',
      slots: [{
        q: 'Son devir <b>kambiyo cirosu</b> hükümlerine mi, <b>alacağın temliki</b> hükümlerine mi tabidir?',
        answer: h.temlikHukmunde ? 'Alacağın temliki' : 'Kambiyo cirosu',
        pool: ['Kambiyo cirosu', 'Alacağın temliki'],
        why: h.temlikHukmunde
          ? `<b>Alacağın temliki</b> — ${h.temlikSebep.txt} (${h.temlikSebep.law}). Senet soyutluk korumasını yitirir; artık normal bir alacak devri gibi işlem görür.`
          : 'Kambiyo cirosu — senette "ciro edilemez" kaydı yok ve ciro süresinde yapılmış; emre yazılı senet ciro ve zilyetlik devriyle geçerli şekilde devredilmiş (TTK m. 681/1, m. 683). Senet kambiyo vasfını koruyor, devralan soyutluk korumasından yararlanıyor.'
      }]
    },
    {
      label: 'Bedelsizlik def\'i', sub: h.defiLaw,
      slots: [{
        q: `Borçlu <b>${esc(v.duzenleyen)}</b>, ${v.temelIliski === 'bedelsiz' ? 'malın hiç teslim edilmediği (bedelsizlik)' : 'temel ilişkiye dayanan'} <b>şahsi def'ini</b> son hamile karşı ileri sürebilir mi?`,
        answer: h.defi ? 'Evet' : 'Hayır',
        pool: EH,
        why: h.defiNeden + ` <span style="opacity:.8">(${h.defiLaw})</span>`
      }]
    },
    {
      label: 'İcra yolu', sub: h.takipLaw,
      slots: [{
        q: 'Hamil, <b>kambiyo senetlerine özgü haciz yoluyla</b> icra takibi başlatabilir mi?',
        answer: h.kambiyoTakip ? 'Evet' : 'Hayır',
        pool: EH,
        why: h.takipNeden + ` <span style="opacity:.8">(${h.takipLaw})</span>`
      }]
    }
  ];

  return {
    vaka: v,
    hesap: h,
    baslik: BASLIK[v.kalip],
    panels: [{ kind: 'html', html: senetHTML(v) }],
    fill: {
      title: `Vaka #${seed} — ${BASLIK[v.kalip]}`,
      hint: 'Senedi ve arkasındaki ciro silsilesini incele, sonra her satırı cevapla. Yanlış seçmek serbest — gerekçesi açılır.',
      headers: ['Soru', 'Cevabın'],
      pool: EH,
      rows,
      caption: 'Ayrımı tut: <b>tahsil cirosu</b> hamili vekil yapar, borçlu def\'ilerini ona karşı ileri sürer (m. 688). <b>Rehin cirosu</b>nda ise borçlu def\'ilerini ileri süremez (m. 689). <b>Gecikmiş ciro</b> ve <b>"ciro edilemez" kaydı</b> senedi alacağın temliki hükmüne düşürür — soyutluk koruması biter. <b>Beyaz ciro</b> ise zinciri kırmaz (m. 684/2).'
    }
  };
}
