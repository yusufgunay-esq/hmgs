/* ==========================================================================
   pregel.js — 11 GÜNLÜK SINAV PLANI (Studio'ya gömülü, veriden türetilen)
   ----------------------------------------------------------------------
   NEDEN VAR: Kullanıcının tıkanıklığı araç eksikliği değil, "bugün ne
   yapacağım" sorusunun cevapsız kalması. Sıra listesi (Takip) 141 maddelik
   fiziksel kitap kuyruğu; ama Studio'da da net bir günlük hedef olmalı.

   DONMUŞ TABLO DEĞİLDİR. Plan her çağrıda ÖLÇÜLEN veriden türetilir:
     · Ders önceliği  → engine.karmaWeights()  (sınav ağırlığı × kapsam açığı
                        × isabet açığı — 31/31 test yeşil, kanıtlanmış motor)
     · Konu önceliği  → engine.bleedingTopics() (senin gerçek hataların)
   Yani "hangi ders, hangi konu, kaç soru" senin cevap günlüğüne göre değişir.
   Bugün cevap günlüğü boş olduğu için çıktı sınav ağırlık sırasına düşer —
   soğuk başlangıç için doğru davranış budur, uydurma değil.

   Kaynak: SINAV_ALGORITMASI.md (238 gerçek ÖSYM sorusundan ölçüldü).
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

import { SUBJECTS, subjectName, questionsOf } from './data.js';
import { karmaWeights, bleedingTopics, allSubjectMastery } from './engine.js';
import { daysLeft, todayKey, state } from './store.js';

/** Günlük soru hedefi — SINAV_ALGORITMASI §7 ölçümü: 451 soru ÷ kalan gün. */
export const TOPLAM_HEDEF_SORU = 451;

/** Bu çalışma kodunun yayına girdiği gün — gün numarası buradan sayılır. */
const BASLANGIC = '2026-09-16';

/** Bir set kaç soru olur (karma motoruyla aynı ölçek). */
const SET_SORU = 20;

function gunFarki(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

/** Planın kaçıncı günündeyiz (1 tabanlı). Aralık dışıysa null. */
export function planGunu(today = todayKey()) {
  const n = gunFarki(BASLANGIC, today) + 1;
  return n >= 1 ? n : null;
}

/** Kalan gün (sınav 27 Eyl). */
export function kalanGun(today = todayKey()) {
  return Math.max(0, gunFarki(today, '2026-09-27'));
}

/** Günlük soru hedefi: kalan iş ÷ kalan gün, 30–90 arası kelepçeli. */
export function gunlukHedef(today = todayKey()) {
  const d = kalanGun(today);
  if (d <= 0) return 0;
  const kalanSoru = Math.max(0, TOPLAM_HEDEF_SORU - cozulenToplam());
  return Math.max(30, Math.min(90, Math.round(kalanSoru / d)));
}

/** Stüdyo'da bugüne kadar çözülen toplam soru (ham günlükten). */
export function cozulenToplam() {
  return (state().answers || []).length;
}

/** Bugün Stüdyo'da çözülen. */
export function bugunCozulen(today = todayKey()) {
  return (state().answers || []).filter(a => String(a.at || '').slice(0, 10) === today).length;
}

/**
 * Bugünün çalışma bloğu. Döner:
 * { gun, kalan, hedef, cozulen, denemeGunu, bloklar: [{subjectId,name,examQ,weight,mastery,neden,soru,konular}] }
 *
 * denemeGunu: Pazar günleri tam deneme (SINAV_ALGORITMASI §7).
 */
export function bugun(today = todayKey()) {
  const gun = planGunu(today);
  const kalan = kalanGun(today);
  const hedef = gunlukHedef(today);
  const cozulen = bugunCozulen(today);

  // Pazar = tam deneme günü (27 Eyl Pazar; denemeler de Pazar günü yapılıyor)
  const pazar = new Date(today + 'T00:00:00').getDay() === 0;

  if (kalan <= 0) return { gun, kalan, hedef, cozulen, bitti: true, bloklar: [] };

  // Son 2 gün: yeni konu yok — yalnız SRS tekrarları ve yanlışlar
  if (kalan <= 2) {
    return {
      gun, kalan, hedef, cozulen, kapanis: true, denemeGunu: false,
      bloklar: tekrarBloklari()
    };
  }

  if (pazar) return { gun, kalan, hedef, cozulen, denemeGunu: true, bloklar: [] };

  return { gun, kalan, hedef, cozulen, denemeGunu: false, bloklar: gunlukBlok(hedef) };
}

/**
 * Ders blokları: karma ağırlığı yüksek olan derslerden, set boyu soru dağıt.
 * Ağırlık zaten "sınav ağırlığı × kapsam açığı × isabet açığı"; burada yalnız
 * sıraya dizilir ve set sayısına çevrilir. Yeni matematik YOK.
 */
function gunlukBlok(hedef) {
  const w = karmaWeights().filter(r => r.weight > 0 && r.pool > 0);
  if (!w.length) return [];

  const konular = bleedingTopics(40);
  const setSayisi = Math.max(1, Math.round(hedef / SET_SORU));
  // Havuzu sınav payının 2 katından az olan ders tek setlik yer alır (kıt havuz yakmasın)
  const bloklar = w.slice(0, Math.min(setSayisi + 2, 6)).map((r, i) => {
    const soru = i < setSayisi ? SET_SORU : Math.round(SET_SORU / 2);
    const zayif = konular.filter(k => k.topic && k.topic.subjectId === r.id).slice(0, 3);
    return {
      subjectId: r.id,
      name: r.name,
      examQ: r.examQ,
      weight: r.weight,
      thin: r.thin,
      soru: Math.min(soru, r.pool),
      konular: zayif.map(k => ({ topicId: k.topicId, title: k.topic.title, rate: k.rate, n: k.n })),
      neden: zayif.length
        ? 'Kanayan konuların var: ' + zayif.map(k => '%' + Math.round(k.rate * 100)).join(', ')
        : (r.fresh ? 'Bu derste henüz hiç çözmedin' : null)
    };
  });

  // Toplam soruyu hedefe kırp (fazla blok açtıysak)
  let acc = 0;
  const kirp = [];
  for (const b of bloklar) {
    if (acc >= hedef) break;
    const kalanYer = hedef - acc;
    if (b.soru <= kalanYer) { kirp.push(b); acc += b.soru; }
    else if (kalanYer >= 8) { kirp.push({ ...b, soru: kalanYer }); acc += kalanYer; }
  }
  return kirp;
}

/** Son 2 gün: yalnız vadesi gelmiş tekrar + kanayan konu. */
function tekrarBloklari() {
  const konular = bleedingTopics(8);
  const bySubj = new Map();
  konular.forEach(k => {
    if (!k.topic) return;
    const s = k.topic.subjectId;
    if (!bySubj.has(s)) bySubj.set(s, { subjectId: s, name: subjectName(s), examQ: 0, konular: [] });
    bySubj.get(s).konular.push({ topicId: k.topicId, title: k.topic.title, rate: k.rate, n: k.n });
  });
  return [...bySubj.values()].map(b => ({
    ...b,
    soru: b.konular.length * 5,
    thin: false, weight: 0,
    neden: 'Yanlışlarından gelen konular'
  }));
}

/** Planda bugüne kadar ne yapıldı — kaba ama dürüst ilerleme. */
export function planDurumu(today = todayKey()) {
  const gun = planGunu(today);
  const cozulen = cozulenToplam();
  return {
    gun,
    toplamHedef: TOPLAM_HEDEF_SORU,
    cozulen,
    yuzde: Math.min(100, Math.round((cozulen / TOPLAM_HEDEF_SORU) * 100))
  };
}
