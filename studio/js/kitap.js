/* ==========================================================================
   kitap.js — KENDİ KİTABINDAN ÇALIŞ
   ----------------------------------------------------------------------
   NEDEN VAR (ölçüm, 15 Eyl 2026 — kullanıcının itirazı haklı çıktı):

   Kullanıcı: "Stüdyo içindeki konu anlatımlarını düşük modelli yapay zekalar
   yaptı, güvenmiyorum. Benim konu anlatım kitaplarımın sayfalarca anlattığı
   konuyu bir sayfada anlatıyordu. Yapacağına gidip kendim kitabı okurum,
   elimde fiziki olarak var, üstüne yazabiliyorum."

   Ölçüm bunu doğruluyor:
     · Konu metni uzunluğu sınav ağırlığının TERSİ:
       Medeni Hukuk 15 soru → 2220 karakter (20 dersin EN DÜŞÜĞÜ)
       MÖHUK 1 soru → 6965, Vergi Usul 1 soru → 7435
     · `tell` (sahne içine gömülü anlatım) 77 v3 konunun YALNIZ 1'inde var.
       Yani "metin interaktife gömüldü" iddiası veride gerçekleşmemiş;
       interaktif kalıp metnin YERİNE geçmiş, metne EKLENMEMİŞ.

   Bu yüzden Studio metni BÜYÜTMEZ ve kitabı TAKLİT ETMEZ. Yaptığı şey:
   özet metni dürüstçe etiketlemek ve kullanıcının KENDİ kitabının hangi
   bölümünün hangi sayfada olduğunu göstermek.

   KİTAP LİSTESİ NEREDEN: `kitaplar.js` (üretilmiş), o da build_sira3.py INV
   envanterinden, o da `refs/Benim fiziksel soru bankalarımın içindekiler
   kısımları.md` dosyasından. TEK KAYNAK — elle ikinci liste yok.

   DURUM TUTMAZ: "okudum" işareti YOK. Kitap okuma kaydının tek yeri Takip
   uygulamasıdır (kullanıcının kendi kuralı, .agents/MEMORY.md). Studio'nun
   burada ikinci bir doğruluk kaynağı açması yanlış olur.
   ========================================================================== */

import { esc } from './ui.js';
import { kitaplarOf } from './kitaplar.js';

/** Dersin kitap envanteri var mı? */
export function kitapVar(subjectId) {
  return kitaplarOf(subjectId).length > 0;
}

/**
 * Katlanmış "Kendi kitabından çalış" bloğu.
 * `data-act="reveal"` mevcut router kablosunu kullanır (main.js: case 'reveal'),
 * yeni handler gerekmez.
 */
export function kitapPaneliHTML(subjectId) {
  const kaynaklar = kitaplarOf(subjectId);
  if (!kaynaklar.length) return '';

  const banka = kaynaklar.filter(k => k.tur === 'banka');
  const teori = kaynaklar.filter(k => k.tur === 'teori');

  const blok = (k) => `
    <div class="kitap-kaynak">
      <div class="kitap-ad">
        ${esc(k.kitap)}${k.tahmin ? ' <span class="kitap-tahmin">sayfa sayısı tahmin</span>' : ''}
      </div>
      <ol class="kitap-bolumler">
        ${k.bolumler.map(b => `<li>
          <span class="kitap-bolum">${esc(b.ad)}</span>
          <span class="kitap-sayfa">s.${b.a}–${b.b}</span>
        </li>`).join('')}
      </ol>
    </div>`;

  return `
    <div class="kitap-kap">
      <button class="kitap-ac" data-act="reveal">
        <span>Kendi kitabından çalış</span>
        <span class="hint">${banka.length ? banka[0].bolumler.length : kaynaklar[0].bolumler.length} bölüm · sayfa numaralarıyla</span>
      </button>
      <div style="display:none">
        ${banka.length ? banka.map(blok).join('') : ''}
        ${teori.length ? teori.map(blok).join('') : ''}
        <p class="kitap-not">
          Bu bölüm adları ve sayfa numaraları <b>senin kendi kitaplarından</b> —
          içindekiler dökümünden alındı, uydurulmadı. Sıra listesi de bu numaralarla üretiliyor.
        </p>
      </div>
    </div>`;
}

/**
 * Konu metninin üstüne konacak dürüst etiket.
 * "Bu bir özet" demek, kullanıcının metne gereğinden fazla güvenmesini engeller.
 */
export function ozetEtiketiHTML(subjectId) {
  if (!kitapVar(subjectId)) return '';
  return `<div class="ozet-lbl">
    <span>Özet metin</span>
    <span class="ozet-why">kaynak değil — derinlik için aşağıdaki kitap bölümlerine bak</span>
  </div>`;
}
