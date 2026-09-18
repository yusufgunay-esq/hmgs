/* ==========================================================================
   ui.js — RENDER YARDIMCILARI
   Inline onclick YOK. Tüm etkileşim data-act + event delegation ile.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** HTML enjeksiyonuna karşı kaçış — tüm veri metinleri bundan geçer. */
export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Metindeki emojileri ve gereksiz boşlukları temizler (Anti-Emoji standardı). */
export function stripEmoji(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Kaynak metinlerdeki `backtick` ve **kalın** işaretlerini güvenle işaretlemeye çevirir. */
export function rich(s) {
  const out = esc(s);
  return out
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<mark>$1</mark>');
}

/**
 * Blok seviyesi metin — konu anlatımı ve soru gerekçeleri için akıllı yapılandırıcı.
 *   - Şık tahlilleri (A, B, C, D, E) → bağımsız `.rb-opt-block` blokları (harf korunur)
 *   - Roma rakamlı öncüller (I., II., III...) → `.rb-roman-block`
 *   - Madde işaretleri (- • *) → `ul.rb-list`
 *   - Numaralı adımlar (1., 2...) → `ol.rb-list`
 *   - Karşılaştırma ("Şu → Bu") → `.rb-row`
 *   - Altın kural ("> ...") → `.rb-box`
 *   - Uzun boğuk paragrafları nefes alan parçalara ayırır.
 */
export function richBlock(s) {
  let raw = String(s ?? '').trim();
  if (!raw) return '';

  // 1. Heceleme / Tire birleştirme (OCR ve satır sonu bozulmalarını düzeltir)
  raw = raw.replace(/([a-zçğıöşüA-ZÇĞİÖŞÜ]+)-\s+([a-zçğıöşüA-ZÇĞİÖŞÜ]+)/g, '$1$2');

  // 2. Satır içi veya bitişik A), B), C), D), E) şık tahlillerini bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])(?:\()?([A-Ea-e])\)\s+/g, '\n$1) ');

  // 3. 'A seçeneği:' veya 'A şıkkı:' / 'A şıkkında:' ifadelerini bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])([A-E]\s+(?:seçeneği|seçeneğinde|şıkkı|şıkkında)[:\s]?)/gi, '\n$1 ');

  // 4. Roma rakamlı öncülleri (I., II., III...) bağımsız satırlara taşı
  raw = raw.replace(/(?:^|[\s;.,•–—])((?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)\s+/g, '\n$1 ');

  // 5. Madde imlerini (•, Ø, ○, *) bağımsız satırlara dönüştür
  raw = raw.replace(/(?:\s*[•Ø○]\s*|\s+\*\s+)/g, '\n- ');

  // 6. Satır bazında inceleme ve uzun boğuk cümleleri ayırma
  const rawLines = raw.split(/\n/);
  const lines = [];
  for (let l of rawLines) {
    l = l.trim();
    if (!l) continue;
    // Eğer satır aşırı uzunsa (> 420 karakter) ve bir şık/madde başlangıcı değilse, dengeli cümle bloklarına ayır
    if (l.length > 420 && !l.match(/^(?:[A-Ea-e]\)|\d+[.)]|[-•*]|(?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)/)) {
      const sentences = l.split(/(?<=[.!?])\s+(?=[A-ZÇĞİÖŞÜ])/);
      let cur = '';
      for (const s of sentences) {
        const pt = s.trim();
        if (!pt) continue;
        if (cur && (cur.length + pt.length > 320)) {
          lines.push(cur);
          cur = pt;
        } else {
          cur = cur ? cur + ' ' + pt : pt;
        }
      }
      if (cur) lines.push(cur);
    } else {
      lines.push(l);
    }
  }

  const out = [];
  let list = null, listTag = null;
  const flush = () => {
    if (list) {
      out.push(`<${listTag} class="rb-list">${list.join('')}</${listTag}>`);
      list = null;
      listTag = null;
    }
  };

  for (const ln of lines) {
    if (!ln) { flush(); continue; }

    // Şık Tahlili: "A) ..." veya "a) ..." (Harf asla silinmez veya sayıya dönüştürülmez!)
    const mOpt = ln.match(/^([A-Ea-e])\)\s*(.*)$/);
    if (mOpt) {
      flush();
      const letter = mOpt[1].toUpperCase();
      out.push(`<div class="rb-opt-block"><span class="rb-opt-letter">${letter}</span><div class="rb-opt-text">${rich(mOpt[2])}</div></div>`);
      continue;
    }

    // Şık Tahlili: "A seçeneği: ...", "B şıkkı ...", "C şıkkında ..."
    const mOptNamed = ln.match(/^([A-E])\s+(seçeneği|seçeneğinde|şıkkı|şıkkında)[:\s]?\s*(.*)$/i);
    if (mOptNamed) {
      flush();
      const letter = mOptNamed[1].toUpperCase();
      out.push(`<div class="rb-opt-block"><span class="rb-opt-letter">${letter}</span><div class="rb-opt-text"><strong>${letter} ${mOptNamed[2]}:</strong> ${rich(mOptNamed[3])}</div></div>`);
      continue;
    }

    // Roma Rakamlı Öncül: "I. ...", "II. ...", "III. ..."
    const mRoman = ln.match(/^((?:I{1,3}|IV|V|VI{0,3}|IX|X)\.)\s*(.*)$/);
    if (mRoman) {
      flush();
      out.push(`<div class="rb-roman-block"><span class="rb-roman-num">${mRoman[1]}</span><div class="rb-roman-text">${rich(mRoman[2])}</div></div>`);
      continue;
    }

    // Madde İşaretli Liste: "- ...", "• ..."
    const mUl = ln.match(/^[-•Ø○*]\s+(.*)$/);
    if (mUl) {
      if (listTag && listTag !== 'ul') flush();
      listTag = 'ul';
      list = list || [];
      list.push(`<li>${rich(mUl[1])}</li>`);
      continue;
    }

    // Numaralı Liste: "1. ...", "2) ..." (Sadece saf rakamlar)
    const mOl = ln.match(/^(\d+)[.)]\s+(.*)$/);
    if (mOl) {
      if (listTag && listTag !== 'ol') flush();
      listTag = 'ol';
      list = list || [];
      list.push(`<li>${rich(mOl[2])}</li>`);
      continue;
    }

    flush();

    // Altın Kural / Vurgu Kutusu: "> ..."
    const mBox = ln.match(/^>\s*(.*)$/);
    if (mBox) {
      out.push(`<div class="rb-box">${rich(mBox[1])}</div>`);
      continue;
    }

    // Karşılaştırma Satırı: "Sol → Sağ"
    const mCmp = ln.match(/^(.{1,60}?)\s+→\s+(.*)$/);
    if (mCmp) {
      out.push(`<div class="rb-row"><span class="rb-k">${rich(mCmp[1])}</span><span class="rb-v">${rich(mCmp[2])}</span></div>`);
      continue;
    }

    // Standart Paragraf
    out.push(`<p>${rich(ln)}</p>`);
  }
  flush();
  return out.join('');
}

export function fmtSec(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${s} sn`;
}

export function fmtClock(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function pct(n) { return `%${Math.round(n)}`; }

const ITEM_LINE_RE = /^(?:(I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X|\d{1,2})\.|\([a-z0-9]\)|[a-z]\))\s+/i;

/* ÇIPLAK MADDE SATIRI: satırın TAMAMI "I." veya "II." — rakam kendi satırında,
   metni ALTINDAKİ satırda. Kaynak aktarımında çok sık (ölçüm: 61 soru).
   Bu satır ne madde (metni yok) ne de metin sayılabildiği için öncül ekranda
   HİÇ doğmuyordu: "I." ölü bir paragraf, altındaki metin de öncülsüz düz yazı
   oluyordu. Öncül eleme bu yüzden tıklanacak yer bulamıyordu. */
const LONE_ITEM_RE = /^(?:I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X|\d{1,2})\.$/;

/* Soru cümlesi kalıbı — ask satırını KONUMDAN BAĞIMSIZ bulmak için. */
/* Soru cümlesi kalıbı — ask satırını KONUMDAN BAĞIMSIZ bulmak için.
   "hangi" tek başına da sayılır: "... hangi düşünüre aittir?" gibi kapanışlar
   "hangisi/hangileri" içermez; eksik kalınca pasaj ask sanılıyordu. */
const ASK_LINE_RE = /(hangi|hangisi|hangileri|hangisidir|hangisine|hangisinde|hangilerinin|doğrudur|yanlıştır|söylenemez|olamaz|kaçtır|değildir)/i;

/* Roma rakamı dizisi: I, II, ... X. Uzun olan önce denenir (III, II, I). */
const ROMAN_SEQ = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const ROMAN_ALT = 'I{1,3}|IV|V|VI{0,3}|VII|VIII|IX|X';

/**
 * Kaynak PDF/OCR aktarımında satır sonları sayfa genişliğine göre düşmüş
 * oluyor — bazen tam kelime/cümle sınırında, bazen ortasında (ör. "...C
 * lehine bir\nipotek tesis etmiştir." — "bir" ile "ipotek" aynı cümlenin
 * parçası ama kaynakta ayrı satırda). premiseHTML her satırı ayrı bir
 * paragraf olarak bastığından bu kazara bölünme ekranda öncülü ikiye
 * bölünmüş gösteriyordu.
 *
 * ÜÇ KURAL (sırayla):
 *  1. ÇIPLAK MADDE SATIRI birleştirilir: "II." + altındaki metin → "II. metin".
 *     Böylece öncül ekranda tıklanabilir bir madde olarak doğar.
 *  2. MADDE/ÖNCÜL SATIRININ SONUNA metin YAPIŞTIRILMAZ: "II. metin" tamamdır,
 *     altındaki satır ayrı kalır (sağlam öncül bölünmesin).
 *  3. Önceki satır cümle/öncül sonu işareti (. ! ? : ;) ile bitmiyorsa VE
 *     sıradaki satır yeni bir madde başlatmıyorsa, iki satır aynı cümlenin
 *     devamı sayılıp boşlukla birleştirilir.
 * İçerik değişmiyor, yalnızca yanlış yerdeki satır sonu kaldırılıyor/taşınıyor.
 */
function normalizeWrappedLines(raw) {
  const lines = raw.split('\n');
  const out = [];
  for (const line of lines) {
    const curTrim = line.trim();
    if (out.length && curTrim) {
      const prevTrim = out[out.length - 1].trim();
      const prevIsLone = LONE_ITEM_RE.test(prevTrim);
      const prevIsItem = ITEM_LINE_RE.test(prevTrim);
      /* Cümle sonu: kapanış tırnağı/parantezi de sayılır. Alıntı ile biten
         satırlar ("… yok olur.”") eski ölçütte "bitmemiş" sayılıp bir sonraki
         satırla BİRLEŞTİRİLİYORDU; pasaj + soru tek satıra düşünce öncül/soru
         ayrımı kayboluyordu (ölçüm: felsefe_081/099, iyuk_123, is_040). */
      const prevEndsTerminal = /[.!?:;]["'’”»)\]]*$/.test(prevTrim) || prevIsItem || prevTrim === '';
      const curIsItem = ITEM_LINE_RE.test(curTrim) || LONE_ITEM_RE.test(curTrim);

      // (1) çıplak madde satırı: rakam öncülün başına taşınır
      if (prevIsLone && !curIsItem) {
        out[out.length - 1] = prevTrim + ' ' + curTrim;
        continue;
      }
      // (2)+(3) sağlam madde satırına yapıştırma yok; cümle devamı birleştirilir
      if (!prevIsLone && !prevEndsTerminal && !curIsItem) {
        out[out.length - 1] = prevTrim + ' ' + curTrim;
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

/** Metinde I.'dan başlayıp ARDIŞIK giden öncül çapalarını bulur.
 *  Dizi zorunluluğu ("I", sonra "II", sonra "III"…) cümle içi yanlış
 *  yakalamayı eler: "I. Dünya Savaşı" tek başına dizi kurmaz. */
function capaBul(metin) {
  const re = new RegExp(`(^|[\\s(])(${ROMAN_ALT})\\.\\s+`, 'g');
  const aday = [];
  let m;
  while ((m = re.exec(metin))) {
    aday.push({ n: m[2], idx: m.index + (m[1] ? m[1].length : 0), son: re.lastIndex });
  }
  const sec = [];
  let bek = 0;
  for (const a of aday) {
    const s = ROMAN_SEQ.indexOf(a.n);
    if (s === bek) { sec.push(a); bek++; }
  }
  return sec;
}

/**
 * Öncüller tek PARAGRAF içinde gömülü geldiyse ("... I. ... II. ... III. ...")
 * premiseHTML hepsini tek madde sayıyordu; yalnız bir öncül tıklanabiliyordu.
 * Bu yedek, gömülü diziyi satırlara böler.
 *
 * KAPSAMI DAR TUTULDU (bilinçli): yalnız premise'te 2'den az tıklanabilir
 * öncül varken çalışır — yani yalnız ZATEN BOZUK olan yeri onarır, sağlam
 * sorulara dokunmaz. Metin eklenmez/çıkarılmaz; rakamlar I.'dan başlayıp
 * ARDIŞIK gitmek zorundadır, dizi kurulamazsa olduğu gibi bırakılır.
 */
function splitEmbeddedItems(premise) {
  if (!premise) return premise;
  const tikl = premise.split('\n').filter(l => ITEM_LINE_RE.test(l.trim())).length;
  if (tikl >= 2) return premise;
  const metin = premise.replace(/\s+/g, ' ').trim();
  const sec = capaBul(metin);
  if (sec.length < 2) return premise;
  /* BAŞ ve SON artığı KORUNUR: diziden önceki metin (lead) ve son öncülden
     sonraki metin atılırsa sorudan parça kaybolur (ölçüm: 45 soru). Lead ve
     kuyruk kendi satırı olarak bırakılır; premiseHTML onları öncül olmayan
     paragraf diye basar. Metin eklenmez, hiçbir şey silinmez. */
  const out = [];
  const lead = metin.slice(0, sec[0].idx).trim();
  if (lead) out.push(lead);
  for (let k = 0; k < sec.length; k++) {
    const bas = sec[k].son;
    const bit = k + 1 < sec.length ? sec[k + 1].idx : metin.length;
    out.push(`${ROMAN_SEQ[k]}. ${metin.slice(bas, bit).trim()}`);
  }
  return out.join('\n');
}

/* Soru kalıbı — global: ask cümlesinin BAŞINI bulmak için SON eşleşme kullanılır. */
const ASK_KW_RE = /(hangi|hangisi|hangileri|hangisidir|hangisine|hangisinde|hangilerinin|doğrudur|yanlıştır|söylenemez|olamaz|kaçtır|değildir)/gi;

/**
 * Soru cümlesini (ask) öncülden AYIRIR — konumdan bağımsız.
 * @returns {{oncul: string, ask: string}|null}
 *
 * ask'in başlangıcı iki adaydan seçilir:
 *  (a) en yakın CÜMLE SINIRI — ama sınırın öncesi çıplak madde numarasıysa
 *      ("I.") sınır sayılmaz: o bir öncül başlangıcıdır, cümle sonu değil;
 *  (b) ÇERÇEVE SÖZCÜĞÜ — soru kalıbından hemen önceki sözcük "-den/-dan" ile
 *      bitiyorsa ask oradan başlar ("… belgelerinden hangilerinin …?").
 *
 * NEDEN (b) ŞART: kaynak metinde öncül ile soru çoğu zaman AYNI cümledir —
 * arada nokta yoktur ("…dair tutanaklar belgelerinden hangilerinin müdafi
 * tarafından incelenmesi kısıtlanabilir?"). Yalnız cümle sınırına bakılırsa
 * öncül listesi ask'ın içinde kalır ve öncüller ekranda hiç doğmaz, öncül
 * ELEME yapılamaz (ölçülen arıza).
 * (a) bulunup da araya öncül rakamı giriyorsa (a) geçersiz sayılır — yoksa
 * öncülü ask'a yutmuş oluruz.
 */
function askParcala(metin) {
  const son = metin.lastIndexOf('?');
  if (son < 0) return null;
  if (!ASK_LINE_RE.test(metin.slice(0, son + 1))) return null;

  let basA = -1;
  for (let i = son; i > 0; i--) {
    if (!'[.!?]'.includes(metin[i - 1])) continue;
    const once = metin.slice(0, i - 1);
    /* SAYI KISALTMASI cümle sonu DEĞİLDİR: "2." "2/4." "1.sınıf ve 2." "15.000".
       Ölçülen hata: bu kontrol olmadan ask, "… 2." / "… 2/4." noktasından
       başlıyor ve soru ortadan ikiye bölünüyordu (14 soru). */
    if (/[0-9]$/.test(once)) continue;
    /* ÇIPLAK MADDE NUMARASI da cümle sonu değildir: "… metin I." → o "I." bir
       ÖNCÜL başıdır; oraya sınır koymak öncülü ask'a yutardı. */
    const oncekiKelime = (once.match(/[A-Za-zÇĞİÖŞÜçğıöşü]+$/) || [''])[0];
    if (ROMAN_SEQ.includes(oncekiKelime.toUpperCase())) continue;
    let j = i;
    while (j < son && /\s/.test(metin[j])) j++;
    if (j >= son) continue;
    basA = j;
    break;
  }
  if (basA > 0) {
    const araya = metin.slice(basA, son);
    if (new RegExp(`(^|[\\s(])(${ROMAN_ALT})\\.\\s`).test(araya)) basA = -1;
  }

  let kwPos = -1;
  ASK_KW_RE.lastIndex = 0;
  let k;
  while ((k = ASK_KW_RE.exec(metin))) { if (k.index >= son) break; kwPos = k.index; }

  /* ÇERÇEVE SÖZCÜĞÜ KURALI — yalnız ÖLÇÜ SÖZCÜĞÜ koşulu sağlanırsa. Ölçü
     sözcüğü: soru kalıbından hemen önceki sözcük "-den/-dan" ile biter
     ("aşağıdakilerDEN hangisi", "belgelerinDEN hangilerinin", "ifadelerinDEN
     hangileri", "istisnalarınDAN hangisi"). Bu kalıp madde/öncül listesinin
     hemen ardından gelen SORU başlangıcıdır. Koşul sağlanmazsa başlangıç
     iddiasında bulunulmaz — gövdeyi ortadan keyfî kesmek anlamsız olurdu. */
  let basB = 0;
  if (kwPos > 0) {
    const onceki = metin.slice(0, kwPos).match(/([A-Za-zÇĞİÖŞÜçğıöşü0-9'’]+)\s*$/);
    if (onceki && /(den|dan|ten|tan)$/i.test(onceki[1])) basB = kwPos - onceki[0].length;
  }

  const bas = basA > 0 ? basA : basB;
  let ask = metin.slice(bas, son + 1).trim();
  let onculHam = metin.slice(0, bas);
  const kuyruk = metin.slice(son + 1).trim();
  // Sorudan hemen sonraki PARANTEZ NOTU sorunun parçasıdır
  // ("… tanınmıştır? (Hazine ve Maliye Bakanlığı … ihmal edilecektir.)")
  if (/^[([]/.test(kuyruk)) ask = (ask + ' ' + kuyruk).trim();
  else if (kuyruk) onculHam += ' ' + kuyruk;
  const oncul = onculHam.replace(/\s+/g, ' ').trim();
  return { oncul, ask };
}

/** Soru kökünü öncül ve asıl soru olarak ikiye ayırır. */
export function splitStem(stem) {
  let raw = (stem || '').trim().replace(/\/[ \t]*\n[ \t]*/g, '/');
  raw = normalizeWrappedLines(raw);
  const lines = raw.split(/\n+/).map(x => x.trim()).filter(Boolean);

  if (lines.length > 1) {
    /* ASK'i KONUMDAN BAĞIMSIZ bul. Soru cümlesi bazı kitapçıklarda öncüllerden
       ÖNCE geliyor (ölçüm: 32 soru). Eski kod körlemesine SON satırı ask
       sayıyordu → ask önce geldiğinde son ÖNCÜL ask yerine geçiyor, öncül
       listesi bir eksik ve kaymış çıkıyordu.
       İki geçiş: önce öncül OLMAYAN satırlar (normal durum), bulunamazsa öncül
       satırları (soru cümlesi son öncülle AYNI satırı paylaşıyor olabilir). */
    /* ÜÇ KADEME (en güvenilirden en gevşeğe). Gevşek ölçüt tek başına
       kullanılırsa yanlış sonuç veriyor: bir paragrafın ORTASINDA soru cümlesi
       geçiyorsa ("… ilişkisi nedir? … başka bir şey değildir.") o PARAGRAF ask
       sanılıyor ve premise ile ask ters düşüyordu (ölçüm: felsefe_055). */
    const askBul = (itemAta, mod) => {
      for (let i = 0; i < lines.length; i++) {
        const itemMi = LONE_ITEM_RE.test(lines[i]) || ITEM_LINE_RE.test(lines[i]);
        if (itemAta && itemMi) continue;
        const soruBasi = /\?\s*$/.test(lines[i]);   // satır soru işaretiyle bitiyor
        const soruIc = /\?/.test(lines[i]);         // içinde soru işareti geçiyor
        const kw = ASK_LINE_RE.test(lines[i]);
        if (mod === 'soru+kw' && soruBasi && kw) return i;
        if (mod === 'soru' && soruBasi) return i;
        if (mod === 'kw' && soruIc && kw) return i;
      }
      return -1;
    };
    let askIdx = askBul(true, 'soru+kw');
    if (askIdx < 0) askIdx = askBul(true, 'soru');
    if (askIdx < 0) askIdx = askBul(true, 'kw');
    if (askIdx < 0) askIdx = askBul(false, 'soru+kw');

    if (askIdx >= 0) {
      let ask = lines[askIdx];
      const onculSatirlari = lines.filter((_, i) => i !== askIdx);

      /* Ask satırı öncülle aynı satırı paylaşıyorsa ("V. … tümü 6331 sayılı
         Kanun'a göre … yer almamıştır?") soru cümlesi ayrılır, öncül kısmı
         listeye geri konur — yoksa son öncül kaybolur. */
      if (ITEM_LINE_RE.test(ask) || LONE_ITEM_RE.test(ask)) {
        const p = askParcala(ask);
        if (p) {
          ask = p.ask;
          if (p.oncul) onculSatirlari.push(p.oncul);
        }
      }

      const premise = onculSatirlari.join('\n');
      if (premise) return { premise: splitEmbeddedItems(premise), ask };
      return { premise: '', ask };
    }
    return { premise: splitEmbeddedItems(lines.slice(0, -1).join('\n')), ask: lines[lines.length - 1] };
  }

  /* TEK PARAGRAF (öncüller cümle içinde gömülü: "… I. … II. … III. … soru?").
     Önce soru cümlesini bul, kalan metni öncül gövdesi say, gömülü rakamları
     satırlara böl. Eski kod cümle sınırı regex'ine güveniyordu; sınırı yanlış
     seçince öncüllerin bir kısmı ask'ın içinde kalıyordu (ölçüm: 4 soru hiç
     tıklanamıyordu). */
  const p = askParcala(raw);
  if (p && p.oncul.length > 25) return { premise: splitEmbeddedItems(p.oncul), ask: p.ask };

  // Soru işareti yok: cümle sınırına göre ayır (eski davranış korunur)
  const m = raw.match(/^([\s\S]*?(?:[!;:]|(?<!\d)\.(?!\d)(?!["'’”]?\s*[a-zçğıöşü])))\s*([^.!?]*(?:hangisi|hangileri|hangisidir|doğrudur|yanlıştır|söylenemez|olamaz|kaçtır|değildir)[^?]*\?)\s*$/);
  if (m && m[1].trim().length > 25 && !/\d\.$/.test(m[1].trim())) {
    return { premise: splitEmbeddedItems(m[1].trim()), ask: m[2].trim() };
  }
  return { premise: '', ask: raw };
}

/* ==========================================================================
   METİN NORMALİZASYONU
   Kaynak veri makine üretimi olduğu için gürültülü: kanun adı her maddede
   tekrar ediyor, başlıklar madde referansını içeriyor, etiketler çok uzun.
   Bu yardımcılar okuma ekranını sakinleştirir. Veriye dokunmazlar.
   ========================================================================== */

/**
 * "TMK m. 8,TMK m. 9,TMK m. 13,TBK m. 49" → "TMK m. 8, 9, 13 · TBK m. 49"
 * Kanun adını bir kez yazar, maddeleri toplar, sırayı korur.
 */
export function groupLegalRefs(raw, max = 92) {
  if (!raw) return '';
  // Veri bazı konularda dizi, bazılarında virgüllü metin — ikisini de karşıla.
  const items = (Array.isArray(raw) ? raw : String(raw).split(/[,;]/))
    .flatMap(s => String(s).split(/[,;]/))
    .map(s => s.trim()).filter(Boolean);

  const order = [];
  const byLaw = new Map();
  const prose = [];   // madde künyesi olmayan açıklama kalemleri

  items.forEach(item => {
    // "TMK m. 8" · "4857 sk m. 2/4" · "1982 AY m. 13-15"
    const m = item.match(/^([^—–]{0,40}?)\s*\bm\.\s*(\d[\w\/.\-]*)$/i);
    if (m) {
      const law = m[1].trim() || '—';
      const art = m[2].trim();
      if (!byLaw.has(law)) { byLaw.set(law, []); order.push(law); }
      const list = byLaw.get(law);
      if (!list.includes(art)) list.push(art);
    } else {
      prose.push(item);
    }
  });

  const groups = order.map(law => `${law} m. ${byLaw.get(law).join(', ')}`);

  // Maddesiz ama kısa mevzuat adları künye sayılır ("7533 sayılı Kanun", "1982 AY").
  const STATUTEISH = /(sayılı|Kanun|Anayasa|\bAY\b|Sözleşme|\bsk\b|Tüzük|Yönetmelik|KHK)/i;
  const shortCites = prose.filter(p => p.length <= 45 && STATUTEISH.test(p));
  const descriptive = prose.filter(p => !shortCites.includes(p));

  const cited = [...groups, ...shortCites].join(' · ');

  // Künye varsa yalnızca künyeyi göster: uzun betimleyici kalemler (Hukuk Tarihi,
  // Genel Kamu gibi derslerde 600 karaktere varıyor) şerit değil, içerik malzemesidir.
  if (cited) return ellipsis(cited, max);
  return ellipsis(descriptive.join(' · '), max);
}

/** Başlıktan baştaki sıra numarasını ve sondaki madde parantezini atar. */
export function topicHeading(title) {
  return String(title || '')
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/\s*\([^()]*(?:m\.|sk|sayılı|md\.)[^()]*\)\s*$/i, '')
    .trim();
}

function tidy(s) {
  return s.replace(/\s{2,}/g, ' ').replace(/\s*[,;:&]\s*$/, '').trim();
}

function ellipsis(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return tidy(sp > max * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

/**
 * Kenar menü için kısa ad. Sırayla dener:
 *   1. iki nokta öncesi ("Temel Kavramlar: İşçi..." → "Temel Kavramlar")
 *   2. satır içi madde parantezlerini ve backtick'leri at
 *   3. kırp
 */
export function topicShort(title, max = 46) {
  let h = topicHeading(title);

  const colon = h.indexOf(':');
  if (colon > 8 && colon <= max) return tidy(h.slice(0, colon));

  // Satır içi madde/mevzuat parantezleri menüde bilgi taşımıyor — at
  h = tidy(h
    .replace(/`[^`]*`/g, '')
    .replace(/\([^()]*(?:m\.\s*\d|sk\b|sayılı|md\.)[^()]*\)/gi, ''));

  return ellipsis(h, max);
}

/**
 * Bölüm etiketi: yalnızca mevzuat künyesi kalsın.
 *   "TMK m. 8 & m. 28 — Hak Ehliyeti ve Cenin"  → "TMK m. 8 & m. 28"
 *   "AİHS ve AİHM Rejimi (`m. 34/35 ...`)"      → "m. 34/35"
 *   künye yoksa kırpılır.
 */
export function shortRef(legalRef, max = 40) {
  if (!legalRef) return '';
  // Uzun tire ile ayrılmış açıklama kuyruğunu at (tek tire madde aralığını bozmasın)
  let s = tidy(String(legalRef).split(/\s+[—–]\s+/)[0]);
  if (s.length <= max) return s.replace(/`/g, '');

  // Künyeyi ayıkla: "TMK m. 8 & m. 28", "1982 AY m. 87", "m. 14/3"
  const cite = s.match(/((?:[A-ZÇĞİÖŞÜ][^\s(`]*\s+)?(?:sk\s+|sayılı\s+Kanun\s+|AY\s+)?m\.\s*\d[\d\/.,\s&]*(?:m\.\s*\d[\d\/.,\s&]*)*)/);
  if (cite) {
    const c = tidy(cite[1].replace(/`/g, ''));
    if (c.length <= max) return c;
  }
  return ellipsis(s.replace(/`/g, ''), max);
}

const COURTS = /^(Yargıtay|Danıştay|Anayasa Mahkemesi|AYM|YHGK|YCGK|İBK|Uyuşmazlık Mahkemesi|AİHM)\b/;

/** Bir metin yargı kararı alıntısı mı? */
export function isCitation(text) {
  return COURTS.test(String(text || '').trim());
}

/** Alıntıyı etiket ve gövde olarak ayırır: "Yargıtay Emsali: ..." → {label, body} */
export function citationParts(text) {
  const t = String(text || '').trim();
  const i = t.indexOf(':');
  if (i > 0 && i < 60) return { label: t.slice(0, i).trim(), body: t.slice(i + 1).trim() };
  return { label: 'Yargı kararı', body: t };
}

export function emptyState({ icon = '·', title, body, cta }) {
  return `<div class="empty">
    <div class="big">${esc(icon)}</div>
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
    ${cta ? `<button class="btn" data-act="${esc(cta.act)}">${esc(cta.label)}</button>` : ''}
  </div>`;
}

/** Kısa süreli bildirim. */
let toastTimer = null;
export function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    // Not: arkaplan/yazı rengi --ink / --bg çiftiyle kurulur (sabit #fff DEĞİL) —
    // karanlık temada --ink neredeyse beyaz olduğu için sabit beyaz yazı beyaz
    // zemine biniyor ve toast görünmez oluyordu (18 Eylül 2026, kullanıcı raporu).
    el.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);' +
      'background:var(--ink);color:var(--bg);padding:0.65rem 1.15rem;border-radius:10px;' +
      'font-size:0.87rem;font-weight:500;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.18);' +
      'opacity:0;transition:opacity .2s ease;pointer-events:none;max-width:90vw;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}
