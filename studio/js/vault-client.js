/* ==========================================================================
   vault-client.js — HMGS STÜDYO SIFIR-VERİ İSTEMCİ & GİZLİ KASA MOTORU
   - GitHub'da 0 telifli soru ve 0 konu barındırır.
   - Soru ve konu kütüphanesi kullanıcının şahsi Google Drive'ından (hmgs_vault.json)
     güvenle çekilir ve telefonun IndexedDB yerel veritabanına kalıcı yazılır.
   - İlk indirmeden sonra %100 çevrimdışı (offline / PWA) çalışır.
   ========================================================================== */
/* © 2026 Yusuf GÜNAY — Tüm Hakları Saklıdır / All Rights Reserved.
   Bu dosya HMGS projesinin tescilli kaynak kodudur. İzinsiz kopyalama, türetme
   veya yeniden yayınlama yasaktır. Lisans: depo kökündeki LICENSE dosyası. */

const DB_NAME = 'HMGS_VAULT_DB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_store';
const VAULT_KEY = 'hmgs_vault_master';

const CLIENT_ID = '235274565512-c8oalrvo4idikpbkh2j3g8sgdjsq3v83.apps.googleusercontent.com';

// ORTAK YETKİ SETİ (17 Eylül 2026) — Takip uygulamasıyla (HMGS_Takip_App/index.html)
// BİREBİR AYNI olmak ZORUNDA. Tarayıcı farklı istek listelerini farklı onay ekranı
// sayar; iki uygulama ayrı set istediği sürece kullanıcı iki kez bağlanmak zorunda
// kalıyordu. Tek set = tek onay ekranı, tek giriş, paylaşılan jeton.
//
//   • drive.appdata  : ESKİ veri yeri. Yalnızca Takip'in tek seferlik taşıması
//                      için duruyor; Stüdyo kullanmaz. (Jeton ortak olduğu için
//                      bu kapsam burada da istenmek zorunda.)
//   • drive.readonly : hmgs_vault.json (7,4 MB soru+konu kasası) okuması.
//   • drive.file     : Stüdyo'nun KENDİ oluşturduğu dosyaları yazması
//                      (HMGS/hmgs_studio_progress.json, HMGS/hmgs_studio_queue.json).
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata '
             + 'https://www.googleapis.com/auth/drive.readonly '
             + 'https://www.googleapis.com/auth/drive.file';

// Drive'da verinin durduğu tek görünür klasör — Takip uygulamasıyla aynı sabit.
const HMGS_FOLDER_NAME = 'HMGS';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

// ------------------------------------------------------------- Jeton paylaşımı

// Takip uygulaması jetonu `hmgs_gtoken` altında saklar ({t, exp}). Stüdyo da AYNI
// anahtarı okur/yazar; aynı origin'de (GitHub Pages) iki uygulama tek oturum
// paylaşır, kullanıcı Stüdyo'ya geçince yeniden giriş yapmaz.
//
// NOT: yerel geliştirmede Stüdyo 8766, Takip 8000 portunda çalışır — farklı
// origin sayıldıkları için localStorage PAYLAŞILMAZ. O durumda her biri kendi
// girişini ister; prod'da (tek origin) paylaşım geçerlidir.
const SHARED_TOKEN_KEY = 'hmgs_gtoken';
const SHARED_FOLDER_KEY = 'hmgs_drive_folder_id';

let activeAccessToken = null;

function readSharedToken() {
  try {
    const raw = localStorage.getItem(SHARED_TOKEN_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.t) return null;
    // Süresi dolmuşsa temizle — Takip ile aynı 2 dakikalık emniyet payı.
    if (o.exp && o.exp - Date.now() < 120000) {
      localStorage.removeItem(SHARED_TOKEN_KEY);
      return null;
    }
    return o.t;
  } catch (e) {
    return null;
  }
}

/** Takip'in beklediği biçimde yazar: {t, exp}. İki uygulama aynı jetonu kullanır. */
function saveSharedToken(token, expiresIn) {
  try {
    const ttl = parseInt(expiresIn || 3600, 10);
    localStorage.setItem(SHARED_TOKEN_KEY, JSON.stringify({
      t: token,
      exp: Date.now() + (ttl * 1000)
    }));
  } catch (e) { /* private mode vb. — oturum yine de çalışır */ }
}

/** Sadece sessionStorage (sayfa oturumu) — kalıcı saklama `hmgs_gtoken` üzerinden. */
export function getActiveToken() {
  if (!activeAccessToken) {
    activeAccessToken = readSharedToken()
      || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hmgs_access_token') : null);
  }
  return activeAccessToken;
}

export function setActiveToken(token) {
  activeAccessToken = token;
  if (typeof sessionStorage !== 'undefined') {
    if (token) sessionStorage.setItem('hmgs_access_token', token);
    else sessionStorage.removeItem('hmgs_access_token');
  }
}

/** Drive kökündeki HMGS klasörünü bulur, yoksa oluşturur. */
let hmgsFolderId = null;
try { hmgsFolderId = localStorage.getItem(SHARED_FOLDER_KEY) || null; } catch (e) {}

async function driveFetch(url, token, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) }
  });
}

async function ensureHmgsFolder(token) {
  if (hmgsFolderId) return hmgsFolderId;

  const q = encodeURIComponent(`name='${HMGS_FOLDER_NAME}' and trashed=false`);
  const listRes = await driveFetch(`${DRIVE_API}?q=${q}&fields=files(id,mimeType)&orderBy=modifiedTime desc`, token);
  if (listRes.ok) {
    const { files } = await listRes.json();
    const folder = (files || []).find(f => f.mimeType === 'application/vnd.google-apps.folder');
    if (folder) {
      hmgsFolderId = folder.id;
      try { localStorage.setItem(SHARED_FOLDER_KEY, hmgsFolderId); } catch (e) {}
      return hmgsFolderId;
    }
  }

  const createRes = await driveFetch(DRIVE_API, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      name: HMGS_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['root']
    })
  });
  if (!createRes.ok) {
    console.warn('[vault] HMGS klasörü oluşturulamadı:', createRes.status, await createRes.text());
    return null;
  }
  const created = await createRes.json();
  hmgsFolderId = created.id || null;
  try { if (hmgsFolderId) localStorage.setItem(SHARED_FOLDER_KEY, hmgsFolderId); } catch (e) {}
  return hmgsFolderId;
}

/**
 * Dosyayı ÖNCE HMGS/ klasöründe, bulamazsa Drive kökünde arar.
 * @returns {Promise<object|null>} {id, inFolder}
 */
async function findSharedFile(name, token) {
  const q = encodeURIComponent(`name='${name}' and trashed=false`);
  const folder = await ensureHmgsFolder(token);
  if (folder) {
    const res = await driveFetch(
      `${DRIVE_API}?q=${q}+and+'${folder}'+in+parents&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`,
      token
    );
    if (res.ok) {
      const { files } = await res.json();
      if (files && files.length) return { id: files[0].id, inFolder: true };
    }
  }
  // Geriye dönük: eski sürümler dosyaları doğrudan köke yazıyordu.
  const legacy = await driveFetch(`${DRIVE_API}?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime desc`, token);
  if (legacy.ok) {
    const { files } = await legacy.json();
    if (files && files.length) return { id: files[0].id, inFolder: false };
  }
  return null;
}

// ---------------------------------------------------------------- IndexedDB

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return reject(new Error('Tarayıcınız IndexedDB desteklemiyor.'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveVaultToIndexedDB(vaultData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(vaultData, VAULT_KEY);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function loadVaultFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(VAULT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[vault] IndexedDB okuma hatası:', e);
    return null;
  }
}

export async function clearVaultIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(VAULT_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.error('[vault] IndexedDB temizleme hatası:', e);
  }
}

// ---------------------------------------------- Google Drive Sync (HMGS/ klasörü)

export async function fetchVaultFromDrive(token) {
  setActiveToken(token);

  const found = await findSharedFile('hmgs_vault.json', token);
  if (!found) {
    throw new Error('Google Drive\'da "hmgs_vault.json" bulunamadı (HMGS klasörü ve kök tarandı). '
      + 'Lütfen önce bilgisayarda kasayı Drive\'a gönderin.');
  }

  const dlRes = await driveFetch(`${DRIVE_API}/${found.id}?alt=media`, token);
  if (!dlRes.ok) {
    const err = await dlRes.text();
    throw new Error(`Drive dosya indirme hatası (${dlRes.status}): ${err}`);
  }

  const vaultData = await dlRes.json();
  if (!vaultData || !vaultData.questions || !vaultData.topics) {
    throw new Error('İndirilen dosya geçerli bir HMGS Vault formatında değil.');
  }

  // Kalıcı IndexedDB'ye kaydetmeden önce bellekteki AI sorularını içine kat
  if (typeof window !== 'undefined' && Array.isArray(window.QUESTIONS_AI_DATA) && window.QUESTIONS_AI_DATA.length > 0) {
    const seen = new Set((vaultData.questions || []).map(q => q.id));
    const extra = window.QUESTIONS_AI_DATA.filter(q => q && q.id && !seen.has(q.id));
    vaultData.questions = (vaultData.questions || []).concat(extra);
  }

  // Kalıcı IndexedDB'ye kaydet
  await saveVaultToIndexedDB(vaultData);
  localStorage.setItem('hmgs_vault_last_synced', new Date().toISOString());

  // Kullanıcı ilerlemesini de hemen eşitle
  syncStudioProgress(false).catch(e => console.warn('[progress sync] ilk açılış uyarısı:', e));

  return vaultData;
}

// ---------------------------------------------------------------- Çift Yönlü İlerleme Eşitleme (Progress Cloud Sync)

const PROGRESS_FILE_NAME = 'hmgs_studio_progress.json';

export async function fetchProgressFromDrive(token) {
  try {
    const found = await findSharedFile(PROGRESS_FILE_NAME, token);
    if (!found) return null;
    const dlRes = await driveFetch(`${DRIVE_API}/${found.id}?alt=media`, token);
    if (!dlRes.ok) return null;
    return await dlRes.json();
  } catch (err) {
    console.warn('[progress sync] Drive okuma hatası:', err);
    return null;
  }
}

export async function uploadProgressToDrive(token, stateData) {
  try {
    const found = await findSharedFile(PROGRESS_FILE_NAME, token);
    const jsonContent = JSON.stringify(stateData, null, 2);

    if (found) {
      // Mevcut dosyayı güncelle (PATCH)
      const patchRes = await driveFetch(`${DRIVE_UPLOAD}/${found.id}?uploadType=media`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: jsonContent
      });
      return patchRes.ok;
    }

    // Yeni dosya: HMGS/ klasörünün İÇİNDE oluştur.
    // (Kök yerine klasör: kullanıcı verisi Drive arayüzünde görünür ve yedeklenebilir
    // olsun. drive.file kapsamı yalnızca uygulamanın yarattığı dosyayı yazabildiği
    // için yaratıcı burada tarayıcı olur — sonraki PATCH'ler bu yüzden çalışır.)
    const folderId = await ensureHmgsFolder(token);
    const boundary = '-------HMGS_STUDIO_SYNC_BOUNDARY';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;

    const metadata = {
      name: PROGRESS_FILE_NAME,
      mimeType: 'application/json',
      parents: folderId ? [folderId] : ['root']
    };

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      jsonContent +
      closeDelim;

    const postRes = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    return postRes.ok;
  } catch (err) {
    console.warn('[progress sync] Drive yazma hatası:', err);
    return false;
  }
}

// ------------------------------------------------- Stüdyo → Takip aktarım kuyruğu

const QUEUE_FILE_NAME = 'hmgs_studio_queue.json';

/**
 * Stüdyo'nun pratik seanslarını + ham cevaplarını Drive'daki
 * `HMGS/hmgs_studio_queue.json` dosyasına yazar.
 *
 * NEDEN: eskiden seanslar ancak masaüstü `hmgs-sync.mjs sessions-push`
 * çalıştığında Takip'e ulaşabiliyordu. O script ayrı bir OAuth istemcisi
 * kullandığı için Takip'in appDataFolder'ını göremiyor, refresh token'ı da
 * sürekli düşüyordu → zincir hiçbir zaman kapanmıyordu. Artık Stüdyo kuyruğu
 * doğrudan ortak HMGS/ klasörüne yazıyor, Takip açılışta okuyor.
 *
 * TEK YAZAR: bu dosyanın tek yazarı Stüdyo'dur. Takip sadece okur.
 * Takip tarafı `studioSessionId` üzerinden idempotent çevirdiği için aynı
 * seans iki kez çalışma kaydına dönmez.
 */
export async function pushStudioQueueToDrive(token, sessions, answers = []) {
  setActiveToken(token);
  try {
    const payload = JSON.stringify({
      generatedAt: new Date().toISOString(),
      sessions: Array.isArray(sessions) ? sessions : [],
      answers: Array.isArray(answers) ? answers : []
    }, null, 2);

    const found = await findSharedFile(QUEUE_FILE_NAME, token);
    if (found) {
      const res = await driveFetch(`${DRIVE_UPLOAD}/${found.id}?uploadType=media`, token, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: payload
      });
      return res.ok;
    }

    const folderId = await ensureHmgsFolder(token);
    const boundary = '-------HMGS_STUDIO_QUEUE_BOUNDARY';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelim = `\r\n--${boundary}--`;
    const metadata = {
      name: QUEUE_FILE_NAME,
      mimeType: 'application/json',
      parents: folderId ? [folderId] : ['root']
    };
    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      payload +
      closeDelim;

    const postRes = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });
    return postRes.ok;
  } catch (err) {
    console.warn('[studio queue] Drive yazma hatası:', err);
    return false;
  }
}

export function mergeStudioStates(local, remote) {
  if (!remote || typeof remote !== 'object') return local;
  if (!local || typeof local !== 'object') return remote;

  // 1. Answers (qId + ts + opt bazında tam birleşim)
  const answersMap = new Map();
  (local.answers || []).forEach(a => {
    const k = `${a.ts || 0}_${a.qId || ''}_${a.opt || ''}`;
    answersMap.set(k, a);
  });
  (remote.answers || []).forEach(a => {
    const k = `${a.ts || 0}_${a.qId || ''}_${a.opt || ''}`;
    answersMap.set(k, a);
  });
  const mergedAnswers = Array.from(answersMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));

  // 2. SRS (En güncel lastAt'e sahip olanı seç)
  const mergedSRS = { ...(local.srs || {}) };
  for (const [qId, remSrs] of Object.entries(remote.srs || {})) {
    const locSrs = mergedSRS[qId];
    if (!locSrs) {
      mergedSRS[qId] = remSrs;
    } else {
      const locTime = locSrs.lastAt ? new Date(locSrs.lastAt).getTime() : 0;
      const remTime = remSrs.lastAt ? new Date(remSrs.lastAt).getTime() : 0;
      if (remTime >= locTime) {
        mergedSRS[qId] = remSrs;
      }
    }
  }

  // 3. Exams
  const examsMap = new Map();
  (local.exams || []).forEach(e => examsMap.set(e.id || e.startedAt, e));
  (remote.exams || []).forEach(e => examsMap.set(e.id || e.startedAt, e));
  const mergedExams = Array.from(examsMap.values()).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // 4. Practice Sessions
  const sessionsMap = new Map();
  (local.sessions || []).forEach(s => sessionsMap.set(s.id || s.startedAt, s));
  (remote.sessions || []).forEach(s => sessionsMap.set(s.id || s.startedAt, s));
  const mergedSessions = Array.from(sessionsMap.values()).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // 5. Topics
  const mergedTopics = { ...(local.topics || {}) };
  for (const [tId, remTop] of Object.entries(remote.topics || {})) {
    const locTop = mergedTopics[tId];
    if (!locTop) {
      mergedTopics[tId] = remTop;
    } else {
      mergedTopics[tId] = {
        firstAt: locTop.firstAt && remTop.firstAt ? (locTop.firstAt < remTop.firstAt ? locTop.firstAt : remTop.firstAt) : (locTop.firstAt || remTop.firstAt),
        lastAt: locTop.lastAt && remTop.lastAt ? (locTop.lastAt > remTop.lastAt ? locTop.lastAt : remTop.lastAt) : (locTop.lastAt || remTop.lastAt),
        count: Math.max(locTop.count || 0, remTop.count || 0)
      };
    }
  }

  // 6. Drills
  const drillsMap = new Map();
  (local.drills || []).forEach(d => drillsMap.set(d.ts || d.startedAt, d));
  (remote.drills || []).forEach(d => drillsMap.set(d.ts || d.startedAt, d));
  const mergedDrills = Array.from(drillsMap.values());

  return {
    ...local,
    answers: mergedAnswers,
    srs: mergedSRS,
    exams: mergedExams,
    sessions: mergedSessions,
    topics: mergedTopics,
    drills: mergedDrills,
    settings: { ...(local.settings || {}), ...(remote.settings || {}) },
    lastMergedAt: new Date().toISOString()
  };
}

import { state as getStoreState, replaceState, onStateChange } from './store.js';

let isSyncing = false;

export async function syncStudioProgress(forceAuth = false) {
  if (isSyncing) return null;
  let token = getActiveToken();

  if (!token && forceAuth) {
    await requestDriveLoginAndDownload();
    token = getActiveToken();
  }
  if (!token) return null;

  isSyncing = true;
  try {
    const local = getStoreState();
    const remote = await fetchProgressFromDrive(token);
    const merged = mergeStudioStates(local, remote);

    // Yerel durumu güncelle
    replaceState(merged);
    localStorage.setItem('hmgs_progress_last_synced', new Date().toISOString());

    // Birleşmiş güncel durumu Drive'a geri yaz
    await uploadProgressToDrive(token, merged);

    return {
      synced: true,
      answers: merged.answers.length,
      srs: Object.keys(merged.srs).length,
      exams: merged.exams.length
    };
  } catch (err) {
    console.warn('[progress sync] senkronizasyon hatası:', err);
    return null;
  } finally {
    isSyncing = false;
  }
}

// Otomatik arka plan eşitlemesi (Soru çözüldükçe veya pratik bittikçe sessizce Drive'a yazar)
if (typeof window !== 'undefined') {
  onStateChange(async latestState => {
    const token = getActiveToken();
    if (token && !isSyncing) {
      await uploadProgressToDrive(token, latestState);
      localStorage.setItem('hmgs_progress_last_synced', new Date().toISOString());
    }
  });
}

export function requestDriveLoginAndDownload() {
  // Elde geçerli PAYLAŞILAN jeton varsa onay ekranı hiç açılmaz. Kullanıcı
  // Takip'te bir kez bağlanmışsa Stüdyo'ya geçerken yeniden giriş yapmaz
  // (aynı origin — prod).
  const paylasilan = readSharedToken();
  if (paylasilan) {
    setActiveToken(paylasilan);
    return fetchVaultFromDrive(paylasilan);
  }

  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return reject(new Error('Google kimlik kütüphanesi yüklenemedi. Lütfen internet bağlantınızı kontrol edin.'));
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async resp => {
        if (resp.error) {
          return reject(new Error(`Google Giriş İptal Edildi / Hata: ${resp.error}`));
        }
        try {
          setActiveToken(resp.access_token);
          saveSharedToken(resp.access_token, resp.expires_in);
          const vault = await fetchVaultFromDrive(resp.access_token);
          resolve(vault);
        } catch (fetchErr) {
          reject(fetchErr);
        }
      }
    });

    client.requestAccessToken({ prompt: '' });
  });
}

// ---------------------------------------------------------------- Master Loader

export async function loadMasterVault() {
  // 1. Yerel script'lerden zaten bellekte var mı? (localhost / development)
  if (typeof window !== 'undefined') {
    const hasGlobalQ = Array.isArray(window.QUESTIONS_DATA) && window.QUESTIONS_DATA.length > 0;
    const hasGlobalT = Array.isArray(window.TOPICS_DATA) && window.TOPICS_DATA.length > 0;
    if (hasGlobalQ && hasGlobalT) {
      const base = window.QUESTIONS_DATA;
      const ai = Array.isArray(window.QUESTIONS_AI_DATA) ? window.QUESTIONS_AI_DATA : [];
      const seen = new Set(base.map(q => q.id));
      const extra = ai.filter(q => q && q.id && !seen.has(q.id));
      return {
        source: 'globals',
        questions: base.concat(extra),
        topics: window.TOPICS_DATA,
        subjects: window.SUBJECTS_DATA || [],
        kitaplar: window.KITAPLAR_DATA,
        roentgen: window.HMGS_ROENTGEN_DATA
      };
    }
  }

  // 2. IndexedDB'den oku (Mobil PWA / Offline)
  const cached = await loadVaultFromIndexedDB();
  if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
    const base = cached.questions;
    const ai = (typeof window !== 'undefined' && Array.isArray(window.QUESTIONS_AI_DATA)) ? window.QUESTIONS_AI_DATA : [];
    const seen = new Set(base.map(q => q.id));
    const extra = ai.filter(q => q && q.id && !seen.has(q.id));
    return {
      source: 'indexedDB',
      questions: base.concat(extra),
      topics: cached.topics || [],
      subjects: cached.subjects || [],
      kitaplar: cached.kitaplar,
      roentgen: cached.roentgen,
      syncedAt: cached.generatedAt
    };
  }

  // 3. Hiç veri yok -> Drive girişi gerekli
  return {
    source: 'none',
    questions: [],
    topics: [],
    needAuth: true
  };
}

// ------------------------------------------------ Çıkmış Röntgeni (cikmis.html)

/**
 * Çıkmış Röntgeni verisini PASİF getirir: önce yerel global (cikmis_roentgen_data.js),
 * sonra IndexedDB kasası. Oturum AÇMAZ — yoksa null döner, sayfa giriş istemi gösterir.
 */
export async function loadRoentgen() {
  if (typeof window !== 'undefined'
      && Array.isArray(window.HMGS_ROENTGEN_DATA) && window.HMGS_ROENTGEN_DATA.length > 0) {
    return window.HMGS_ROENTGEN_DATA;
  }
  const cached = await loadVaultFromIndexedDB();
  if (cached && Array.isArray(cached.roentgen) && cached.roentgen.length > 0) {
    return cached.roentgen;
  }
  return null;
}

/**
 * Çıkmış Röntgeni için Google girişi başlatır, kasayı indirir ve roentgen dizisini
 * döner. requestDriveLoginAndDownload ile AYNI istemci/scope/prompt — tek onay ekranı.
 */
export function requestRoentgenFromDrive() {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      return reject(new Error('Google kimlik kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edin.'));
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async resp => {
        if (resp.error) {
          return reject(new Error(`Google Giriş İptal Edildi / Hata: ${resp.error}`));
        }
        try {
          setActiveToken(resp.access_token);
          saveSharedToken(resp.access_token, resp.expires_in);
          const vault = await fetchVaultFromDrive(resp.access_token);
          if (!Array.isArray(vault.roentgen) || !vault.roentgen.length) {
            return reject(new Error('Kasada "roentgen" verisi bulunamadı.'));
          }
          resolve(vault.roentgen);
        } catch (e) {
          reject(e);
        }
      }
    });

    client.requestAccessToken({ prompt: '' });
  });
}

