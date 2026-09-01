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

let activeAccessToken = null;

export async function fetchVaultFromDrive(token) {
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
  return vaultData;
}

export function requestDriveLoginAndDownload() {
  return new Promise((resolve, reject) => {
    // 1. Google Script yüklü mü?
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
          activeAccessToken = resp.access_token;
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
