/* ==========================================================================
   vault-client.js — HMGS STÜDYO SIFIR-VERİ İSTEMCİ & GİZLİ KASA MOTORU
   - GitHub'da 0 telifli soru ve 0 konu barındırır.
   - Soru ve konu kütüphanesi kullanıcının şahsi Google Drive'ından (hmgs_vault.json)
     güvenle çekilir ve telefonun IndexedDB yerel veritabanına kalıcı yazılır.
   - İlk indirmeden sonra %100 çevrimdışı (offline / PWA) çalışır.
   ========================================================================== */

const DB_NAME = 'HMGS_VAULT_DB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_store';
const VAULT_KEY = 'hmgs_vault_master';

const CLIENT_ID = '235274565512-c8oalrvo4idikpbkh2j3g8sgdjsq3v83.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file';

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

// ---------------------------------------------------------------- Google Drive Sync

let activeAccessToken = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('hmgs_access_token') : null;

export function getActiveToken() {
  if (!activeAccessToken && typeof sessionStorage !== 'undefined') {
    activeAccessToken = sessionStorage.getItem('hmgs_access_token');
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

export async function fetchVaultFromDrive(token) {
  setActiveToken(token);
  const q = encodeURIComponent("name='hmgs_vault.json' and trashed=false");
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!listRes.ok) {
    const err = await listRes.text();
    throw new Error(`Drive dosya arama hatası (${listRes.status}): ${err}`);
  }

  const listData = await listRes.json();
  if (!listData.files || listData.files.length === 0) {
    throw new Error('Google Drive hesabınızda "hmgs_vault.json" bulunamadı. Lütfen önce bilgisayarda senkronizasyonu çalıştırın.');
  }

  const fileId = listData.files[0].id;
  const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!dlRes.ok) {
    const err = await dlRes.text();
    throw new Error(`Drive dosya indirme hatası (${dlRes.status}): ${err}`);
  }

  const vaultData = await dlRes.json();
  if (!vaultData || !vaultData.questions || !vaultData.topics) {
    throw new Error('İndirilen dosya geçerli bir HMGS Vault formatında değil.');
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
    const q = encodeURIComponent(`name='${PROGRESS_FILE_NAME}' and trashed=false`);
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    if (!listData.files || listData.files.length === 0) return null;

    const fileId = listData.files[0].id;
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!dlRes.ok) return null;
    return await dlRes.json();
  } catch (err) {
    console.warn('[progress sync] Drive okuma hatası:', err);
    return null;
  }
}

export async function uploadProgressToDrive(token, stateData) {
  try {
    const q = encodeURIComponent(`name='${PROGRESS_FILE_NAME}' and trashed=false`);
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!listRes.ok) return false;
    const listData = await listRes.json();
    const fileId = listData.files && listData.files.length > 0 ? listData.files[0].id : null;
    const jsonContent = JSON.stringify(stateData, null, 2);

    if (fileId) {
      // Mevcut dosyayı güncelle (PATCH)
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        },
        body: jsonContent
      });
      return patchRes.ok;
    } else {
      // Yeni dosya oluştur (Multipart POST)
      const boundary = '-------HMGS_STUDIO_SYNC_BOUNDARY';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: PROGRESS_FILE_NAME,
        mimeType: 'application/json'
      };

      const multipartBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        jsonContent +
        closeDelim;

      const postRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      });
      return postRes.ok;
    }
  } catch (err) {
    console.warn('[progress sync] Drive yazma hatası:', err);
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
      return {
        source: 'globals',
        questions: window.QUESTIONS_DATA,
        topics: window.TOPICS_DATA,
        subjects: window.SUBJECTS_DATA || []
      };
    }
  }

  // 2. IndexedDB'den oku (Mobil PWA / Offline)
  const cached = await loadVaultFromIndexedDB();
  if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
    return {
      source: 'indexedDB',
      questions: cached.questions,
      topics: cached.topics || [],
      subjects: cached.subjects || [],
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

