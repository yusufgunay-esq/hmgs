/* ==========================================================================
   gen/ehliyet.js — HUKUKİ İŞLEM SAKATLIKLARI SİMÜLATÖRÜ
   ========================================================================== */

import { rng } from './miras.js';

export const id = 'ehliyet';
export const subjectId = 'medeni_hukuk';
export const title = 'Hukuki İşlem Sakatlıkları Simülatörü';
export const desc = 'Ehliyet, yaş, kısıtlılık ve işlem türüne göre geçersizlik motoru.';
export const basis = 'TMK m. 9-16 / TBK m. 27-39';

const EH = ['Evet', 'Hayır'];
/* 12 Ağu 2026 düzeltmesi: havuzda hem "Askıda Hükümsüzlük" hem "Tek Taraflı
   Bağlamazlık" ayrı şık olarak vardı; oysa bunlar aynı yaptırımın iki adıdır
   (gerekçe metni de zaten öyle yazıyordu). Doğru kavramı seçen kullanıcı
   yanlış sayılabiliyordu. Tek şıkta birleştirildi, yerine gerçek bir
   çeldirici (Yokluk) kondu. */
const BAGLAMAZLIK = 'Askıda Hükümsüzlük (Tek Taraflı Bağlamazlık)';
const YAPTIRIMLAR = ['Geçerli', 'Kesin Butlan', 'İptal Edilebilirlik', BAGLAMAZLIK, 'Yokluk'];

const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function uretPratik(seed, zorla) {
  const r = rng(seed ^ 0x992b);
  const kalip = zorla || pick(r, ['tam_ehliyetsiz', 'sinirli_ehliyetsiz_bagis', 'sinirli_ehliyetsiz_kefalet', 'sinirli_ehliyetsiz_onaysiz', 'korkutma_ikrah', 'muvazaa', 'gecerli_islem']);
  
  const isim = pick(r, ['Ali', 'Ayşe', 'Kerem', 'Zeynep']);
  
  let yas = 25;
  let ayirtEtme = true;
  let kisitli = false;
  let islem = '';
  let islemTuru = '';
  let veliOnayi = false;
  let hataHileIkrah = false;
  let muvazaa = false;

  let baslik = '';

  if (kalip === 'tam_ehliyetsiz') {
      baslik = 'Tam Ehliyetsizin İşlemi';
      yas = int(r, 4, 7);
      ayirtEtme = false;
      islem = 'Bakkaldan 5000 TL değerinde tablet satın almıştır.';
      islemTuru = 'satim';
  } else if (kalip === 'sinirli_ehliyetsiz_bagis') {
      baslik = 'Sınırlı Ehliyetsiz (Karşılıksız Kazanım)';
      yas = int(r, 14, 17);
      ayirtEtme = true;
      islem = 'Kendisine amcası tarafından hediye edilen aracı kabul etmiştir.';
      islemTuru = 'karsiliksiz_kazanim';
  } else if (kalip === 'sinirli_ehliyetsiz_kefalet') {
      baslik = 'Sınırlı Ehliyetsizin Yasak İşlemi';
      yas = int(r, 14, 17);
      ayirtEtme = true;
      islem = 'Arkadaşının banka kredisine kefil olmuştur (Velisinin onayıyla).';
      islemTuru = 'yasak_islem';
      veliOnayi = true;
  } else if (kalip === 'sinirli_ehliyetsiz_onaysiz') {
      baslik = 'Sınırlı Ehliyetsiz (Onaysız Borçlandırıcı İşlem)';
      yas = 16;
      ayirtEtme = true;
      islem = 'Velisinin izni olmadan 50.000 TL bedelle motosiklet satın almıştır.';
      islemTuru = 'borclandirici';
  } else if (kalip === 'korkutma_ikrah') {
      baslik = 'İrade Sakatlığı (Korkutma/İkrah)';
      islem = 'Silah zoruyla evini yarı fiyatına devretme sözleşmesini imzalamıştır.';
      hataHileIkrah = true;
  } else if (kalip === 'muvazaa') {
      baslik = 'Muvazaalı İşlem';
      islem = 'Alacaklılardan mal kaçırmak için evini arkadaşına satmış gibi göstermiştir.';
      muvazaa = true;
  } else {
      baslik = 'Geçerli İşlem';
      islem = 'Kendi birikimiyle bilgisayar satın almıştır.';
  }

  const v = { kalip, isim, yas, ayirtEtme, kisitli, islem, islemTuru, veliOnayi, hataHileIkrah, muvazaa };
  
  // Hukuki sonuçları hesaplama (Determinizm)
  let ehliyetGrubu = 'Tam Ehliyetli';
  if (!ayirtEtme) ehliyetGrubu = 'Tam Ehliyetsiz';
  else if (yas < 18 || kisitli) ehliyetGrubu = 'Sınırlı Ehliyetsiz';

  let sonucYaptirim = 'Geçerli';
  let gerekce = '';

  if (ehliyetGrubu === 'Tam Ehliyetsiz') {
      sonucYaptirim = 'Kesin Butlan';
      gerekce = 'TMK m. 15 uyarınca ayırt etme gücü bulunmayan kişinin (tam ehliyetsiz) işlemleri, yasal temsilcisinin onayı olsa bile kesin butlanla batıldır.';
  } else if (muvazaa) {
      sonucYaptirim = 'Kesin Butlan';
      gerekce = 'TBK m. 19 uyarınca tarafların gerçek iradesine uymayan görünüşteki muvazaalı işlem kesin butlanla batıldır.';
  } else if (ehliyetGrubu === 'Sınırlı Ehliyetsiz') {
      if (islemTuru === 'yasak_islem') {
          sonucYaptirim = 'Kesin Butlan';
          gerekce = 'Sınırlı ehliyetsizler kefil olamaz, vakıf kuramaz, önemli bağışlamalarda bulunamaz. Yasal temsilcinin onayı bile bu işlemi geçerli kılmaz (Kesin Hükümsüzlük).';
      } else if (islemTuru === 'karsiliksiz_kazanim') {
          sonucYaptirim = 'Geçerli';
          gerekce = 'Sınırlı ehliyetsizler, kendilerini borç altına sokmayan karşılıksız kazanımları yasal temsilcinin onayı olmadan da tek başlarına yapabilirler.';
      } else if (islemTuru === 'borclandirici' && !veliOnayi) {
          sonucYaptirim = BAGLAMAZLIK;
          gerekce = 'Sınırlı ehliyetsizin yasal temsilcisinin izni olmadan yaptığı borçlandırıcı işlem <b>askıda hükümsüzdür</b> (aynı yaptırımın diğer adı: tek taraflı bağlamazlık). Karşı taraf işlemle bağlıyken sınırlı ehliyetsiz bağlı değildir; yasal temsilci <b>icazet verirse işlem baştan itibaren geçerli</b> hâle gelir, icazetten kaçınırsa kesin hükümsüz olur. Bu yüzden yaptırım ne baştan butlan ne de iptal edilebilirliktir.';
      } else {
          sonucYaptirim = 'Geçerli';
          gerekce = 'İşlem kurallara uygundur.';
      }
  } else if (hataHileIkrah) {
      sonucYaptirim = 'İptal Edilebilirlik';
      gerekce = 'TBK m. 39 uyarınca iradesi korkutma (ikrah) ile sakatlanan taraf, 1 yıl içinde işlemi iptal edebilir (İptal edilebilirlik / Düzelebilir Hükümsüzlük).';
  } else {
      gerekce = 'Kişi tam ehliyetlidir ve işlemde bir irade sakatlığı veya şekil eksikliği yoktur.';
  }

  const h = { ehliyetGrubu, sonucYaptirim, gerekce };

  // Görsel UI
  const html = `
  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
      <div style="background:var(--bg-sunk); border:1px solid var(--line); border-radius:12px; padding:1.25rem;">
          <div style="font-size:0.85rem; text-transform:uppercase; font-weight:700; color:var(--accent); letter-spacing:0.5px; margin-bottom:0.5rem;">KİŞİ PROFİLİ</div>
          <div style="font-size:1.2rem; font-weight:700; margin-bottom:0.25rem;">${esc(isim)}</div>
          <div style="display:flex; flex-direction:column; gap:0.25rem; margin-top:0.75rem;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed var(--line); padding-bottom:0.25rem;"><span>Yaş:</span> <b>${yas}</b></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px dashed var(--line); padding-bottom:0.25rem;"><span>Ayırt Etme Gücü:</span> <b style="color:${ayirtEtme ? 'var(--ok)' : 'var(--no)'}">${ayirtEtme ? 'Var' : 'Yok'}</b></div>
              <div style="display:flex; justify-content:space-between;"><span>Kısıtlılık:</span> <b>${kisitli ? 'Evet' : 'Hayır'}</b></div>
          </div>
      </div>
      <div style="background:var(--bg-sunk); border:1px solid var(--line); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; justify-content:center;">
          <div style="font-size:0.85rem; text-transform:uppercase; font-weight:700; color:var(--accent); letter-spacing:0.5px; margin-bottom:0.5rem;">YAPILAN İŞLEM</div>
          <div style="font-size:1.05rem; line-height:1.5;">${esc(islem)}</div>
      </div>
  </div>`;

  const rows = [
    {
      label: 'Ehliyet Grubu', sub: 'TMK m. 9-16',
      slots: [{
        q: `Yukarıdaki profile göre <b>${esc(isim)}</b> hangi ehliyet grubundadır?`,
        answer: h.ehliyetGrubu,
        pool: ['Tam Ehliyetli', 'Sınırlı Ehliyetli', 'Sınırlı Ehliyetsiz', 'Tam Ehliyetsiz'],
        why: h.ehliyetGrubu === 'Tam Ehliyetsiz' ? 'Ayırt etme gücü olmayan herkes yaşa bakılmaksızın tam ehliyetsizdir.' 
           : h.ehliyetGrubu === 'Sınırlı Ehliyetsiz' ? 'Ayırt etme gücü olup ergin olmayanlar (18 yaş altı) sınırlı ehliyetsizdir.' 
           : 'Ayırt etme gücüne sahip ve 18 yaşını doldurmuş kişi tam ehliyetlidir.'
      }]
    },
    {
      label: 'İşlemin Yaptırımı', sub: 'Geçersizlik Türü',
      slots: [{
        q: `Yapılan bu hukuki işlemin <b>yaptırımı (geçersizlik türü)</b> nedir?`,
        answer: h.sonucYaptirim,
        pool: YAPTIRIMLAR,
        why: h.gerekce
      }]
    }
  ];

  return {
    vaka: v, hesap: h, baslik,
    panels: [{ kind: 'html', html }],
    fill: {
      title: `Vaka #${seed} — ${baslik}`,
      hint: 'Kişi profilini ve işlemi incele, ehliyet grubunu ve işlemin sonucunu tahmin et.',
      headers: ['Konu', 'Karar'],
      pool: [...YAPTIRIMLAR, 'Tam Ehliyetli', 'Sınırlı Ehliyetsiz', 'Tam Ehliyetsiz'],
      rows
    }
  };
}
