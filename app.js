/* ===============================================================
   CollegeVault v2 — app.js
   File System Access API + IndexedDB + Web Share Target
   =============================================================== */

// ─── CONSTANTS ────────────────────────────────────────────────
const SUBJECT_EMOJIS = [
  '📚', '📖', '📝', '📐', '📏', '🔬', '⚗️', '🧪', '🔭', '🧬', '💡', '🖥️', '💻', '⚙️', '🔧',
  '📡', '⚡', '🔋', '💾', '📀', '🧮', '🗂️', '📂', '📄', '📊', '📈', '✏️', '🖊️', '📌', '🔖',
  '🎯', '🏆', '🎓', '📜', '🎨', '🌐', '🗺️', '🧠', '💭', '🔤', '🔢', '➕', '🔄', '🔑', '🧲',
  '🌱', '🌿', '💧', '🔥', '❄️', '🌟', '⭐', '💫', '🌈', '☀️', '🎆', '🎯', '🏅', '🎖️', '🧩',
];

const SEMESTERS = [
  { id: 1, label: 'Semester 1', icon: '📘', color: 'sem-1' },
  { id: 2, label: 'Semester 2', icon: '📗', color: 'sem-2' },
  {
    id: 3, label: 'Semester 3', icon: '📙', color: 'sem-3',
    builtinSubjects: [
      { id: 'cs', name: 'Control System', icon: '⚙️' },
      { id: 'cg', name: 'Computer Graphics', icon: '🖥️' },
      { id: 'm3', name: 'Math III', icon: '📐' },
      { id: 'mp', name: 'Microprocessor', icon: '🔬' },
      { id: 'en', name: 'English', icon: '📝' },
      { id: 'ae', name: 'Advanced Electronics', icon: '⚡' },
    ]
  },
  { id: 4, label: 'Semester 4', icon: '📒', color: 'sem-4' },
  { id: 5, label: 'Semester 5', icon: '📓', color: 'sem-5' },
  { id: 6, label: 'Semester 6', icon: '📔', color: 'sem-6' },
  { id: 7, label: 'Semester 7', icon: '📕', color: 'sem-7' },
  { id: 8, label: 'Semester 8', icon: '🎓', color: 'sem-8' },
];

// ─── STATE ─────────────────────────────────────────────────────
let currentPage = 'setup';
let currentSemester = null;
let currentSubject = null;
let currentFileForModal = null;
let uploadContext = null;
let addSubjectForSemId = null;
let selectedEmoji = '📚';
let viewMode = 'grid';
let pendingFile = null;   // File waiting for sort
let rootDirHandle = null;   // FileSystemDirectoryHandle
let customSubs = {};
let allFiles = [];     // loaded from IndexedDB

// ─── IndexedDB ─────────────────────────────────────────────────
const DB_NAME = 'collegevault_db';
const DB_VERSION = 2;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

async function dbPut(store, value, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    key !== undefined ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
    tx.oncomplete = res; tx.onerror = rej;
  });
}
async function dbGet(store, key) {
  const db = await openDB();
  return new Promise(res => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => res(null);
  });
}
async function dbGetAll(store) {
  const db = await openDB();
  return new Promise(res => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  });
}
async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = res; tx.onerror = rej;
  });
}

// ─── CUSTOM SUBJECTS ───────────────────────────────────────────
function loadCustomSubjects() {
  try { return JSON.parse(localStorage.getItem('cv_custom_subjects') || '{}'); } catch { return {}; }
}
function saveCustomSubjects() { localStorage.setItem('cv_custom_subjects', JSON.stringify(customSubs)); }
function getSemSubjects(semId) {
  const sem = SEMESTERS.find(s => s.id === semId);
  const builtin = (sem && sem.builtinSubjects) ? sem.builtinSubjects : [];
  const custom = (customSubs[semId] || []);
  return [...builtin, ...custom];
}

// ─── FILE SYSTEM ACCESS API ────────────────────────────────────
const FS_SUPPORTED = ('showDirectoryPicker' in window);

async function loadRootHandle() {
  if (!FS_SUPPORTED) return null;
  try {
    const handle = await dbGet('handles', 'rootDir');
    if (!handle) return null;
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') { rootDirHandle = handle; return handle; }
    const req = await handle.requestPermission({ mode: 'readwrite' });
    if (req === 'granted') { rootDirHandle = handle; return handle; }
  } catch { /* not available */ }
  return null;
}

async function selectStorageFolder() {
  if (!FS_SUPPORTED) {
    showToast('File System API not supported on this browser', 'error');
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
    rootDirHandle = handle;
    await dbPut('handles', handle, 'rootDir');
    await dbPut('meta', handle.name, 'rootDirName');

    // Create semester folders
    for (const sem of SEMESTERS) {
      const semDir = await handle.getDirectoryHandle(`Semester ${sem.id}`, { create: true });
      if (sem.builtinSubjects) {
        for (const sub of sem.builtinSubjects) {
          await semDir.getDirectoryHandle(sub.name, { create: true });
        }
      }
    }

    document.getElementById('storageFolderPath').textContent = `📂 ${handle.name}`;
    showToast(`✅ Folder "${handle.name}" selected!`, 'success');
    document.getElementById('selectFolderBtn').textContent = '✓ Selected';

    if (currentPage === 'setup') { skipSetup(); }
  } catch (e) {
    if (e.name !== 'AbortError') showToast('Could not access folder', 'error');
  }
}

async function writeFileToStorage(file, semId, subjectId) {
  if (!rootDirHandle) return false;
  try {
    let targetDir = await rootDirHandle.getDirectoryHandle(`Semester ${semId}`, { create: true });
    if (subjectId) {
      const allSubs = getSemSubjects(semId);
      const sub = allSubs.find(s => s.id === subjectId);
      if (sub) targetDir = await targetDir.getDirectoryHandle(sub.name, { create: true });
    }
    const fh = await targetDir.getFileHandle(file.name, { create: true });
    const writable = await fh.createWritable();
    await writable.write(file);
    await writable.close();
    return true;
  } catch (e) { console.error('Write failed', e); return false; }
}

// ─── INIT ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  customSubs = loadCustomSubjects();
  allFiles = await dbGetAll('files');

  // Load root handle
  const handle = await loadRootHandle();
  if (handle) {
    const savedName = await dbGet('meta', 'rootDirName');
    document.getElementById('storageFolderPath').textContent = `📂 ${savedName || handle.name}`;
  }

  buildEmojiGrid();

  // Check for incoming shared file (Web Share Target)
  const params = new URLSearchParams(window.location.search);
  if (params.get('share') === '1') {
    window.history.replaceState({}, '', window.location.pathname);
    await checkPendingShare();
    return;
  }

  // First run?
  const hasSetup = localStorage.getItem('cv_setup_done');
  if (!hasSetup) {
    showPage('setup');
    setHeaderState('home');
  } else {
    showHome();
  }
});

function skipSetup() {
  localStorage.setItem('cv_setup_done', '1');
  showHome();
}

// ─── WEB SHARE TARGET ──────────────────────────────────────────
async function checkPendingShare() {
  try {
    const cache = await caches.open('cv-share-queue');
    const response = await cache.match('incoming-file');
    if (!response) { showHome(); return; }
    const blob = await response.blob();
    const filename = response.headers.get('x-filename') || 'shared-file';
    pendingFile = new File([blob], filename, { type: blob.type });
    await cache.delete('incoming-file');
    localStorage.setItem('cv_setup_done', '1');
    showHome();
    setTimeout(() => showSortSheet(pendingFile), 500);
  } catch { showHome(); }
}

// ─── NAVIGATION ─────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${pageId}`).classList.remove('hidden');
  currentPage = pageId;
  window.scrollTo(0, 0);
}

function setHeaderState(mode, title) {
  const backBtn = document.getElementById('backBtn');
  const hdrCenter = document.getElementById('hdrCenter');
  const uploadBtn = document.getElementById('hdrUploadBtn');

  if (mode === 'home') {
    backBtn.classList.remove('visible');
    hdrCenter.innerHTML = '<span class="hdr-logo">🎓 CollegeVault</span>';
    uploadBtn.style.visibility = 'visible';
  } else {
    backBtn.classList.add('visible');
    hdrCenter.innerHTML = `<span style="font-weight:700;font-size:0.95rem;">${escHtml(title)}</span>`;
    uploadBtn.style.visibility = 'visible';
  }
}

function setActiveNav(id) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function handleBack() {
  if (currentPage === 'subject') { goBackToSemester(); return; }
  if (currentPage === 'semester') { showHome(); return; }
  showHome();
}

function showHome() {
  showPage('home');
  renderSemGrid();
  updateStats();
  setHeaderState('home');
  setActiveNav('nav-home');
}
function showSearch() {
  showPage('search');
  setHeaderState('sub', 'Search');
  setActiveNav('nav-search');
  setTimeout(() => document.getElementById('searchInput').focus(), 200);
}
function showRecent() {
  showPage('recent');
  renderRecentFiles();
  setHeaderState('sub', 'Recent Files');
  setActiveNav('nav-recent');
}
function showSettings() {
  showPage('settings');
  setHeaderState('sub', 'Settings');
  setActiveNav('nav-settings');
}

function openSemester(semId) {
  currentSemester = SEMESTERS.find(s => s.id === semId);
  currentSubject = null;
  uploadContext = { semId, subjectId: null };
  renderSemesterPage(currentSemester);
  setHeaderState('sub', currentSemester.label);
  showPage('semester');
}

function openSubject(semId, subjectId) {
  currentSemester = SEMESTERS.find(s => s.id === semId);
  currentSubject = getSemSubjects(semId).find(s => s.id === subjectId);
  uploadContext = { semId, subjectId };
  renderSubjectPage(currentSemester, currentSubject);
  setHeaderState('sub', `${currentSubject.icon} ${currentSubject.name}`);
  showPage('subject');
}

function goBackToSemester() { if (currentSemester) openSemester(currentSemester.id); else showHome(); }

// ─── STATS ──────────────────────────────────────────────────────
function updateStats() {
  const totalSize = allFiles.reduce((a, f) => a + (f.size || 0), 0);
  const semesters = [...new Set(allFiles.map(f => f.semId))].length;
  const subjectsN = [...new Set(allFiles.map(f => f.subjectId).filter(Boolean))].length;

  document.getElementById('statsStrip').innerHTML = [
    { val: allFiles.length, lbl: 'Files' },
    { val: formatSize(totalSize), lbl: 'Stored' },
    { val: semesters, lbl: 'Sems' },
    { val: subjectsN, lbl: 'Subjects' },
  ].map(s => `
    <div class="stat-cell">
      <span class="stat-val">${s.val}</span>
      <span class="stat-lbl">${s.lbl}</span>
    </div>
  `).join('');
}

// ─── SEMESTER GRID ───────────────────────────────────────────────
function renderSemGrid() {
  const grid = document.getElementById('semGrid');
  grid.className = 'sem-grid' + (viewMode === 'list' ? ' list-view' : '');
  grid.innerHTML = SEMESTERS.map((sem, i) => {
    const semFiles = allFiles.filter(f => f.semId === sem.id);
    const subs = getSemSubjects(sem.id);
    const subInfo = subs.length > 0 ? `${subs.length} Subject${subs.length !== 1 ? 's' : ''}` : 'General';
    return `
      <div class="sem-card ${sem.color}" onclick="openSemester(${sem.id})">
        <span class="sem-card-badge">Sem ${sem.id}</span>
        ${viewMode !== 'list' ? '<br>' : ''}
        <span class="sem-card-icon">${sem.icon}</span>
        <div class="sem-card-info">
          <div class="sem-card-title">${sem.label}</div>
          <div class="sem-card-sub">${subInfo} · ${semFiles.length} file${semFiles.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function setView(mode) {
  viewMode = mode;
  document.getElementById('gridBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('listBtn').classList.toggle('active', mode === 'list');
  renderSemGrid();
}

// ─── SEMESTER PAGE ───────────────────────────────────────────────
function renderSemesterPage(sem) {
  const allSubs = getSemSubjects(sem.id);
  let html = '';

  if (allSubs.length > 0) {
    html += `<div class="subj-grid">`;
    html += allSubs.map((sub, i) => {
      const count = allFiles.filter(f => f.semId === sem.id && f.subjectId === sub.id).length;
      const isCustom = !!(customSubs[sem.id] && customSubs[sem.id].find(s => s.id === sub.id));
      const delBtn = isCustom
        ? `<button class="subj-card-del" onclick="event.stopPropagation();deleteSubject(${sem.id},'${sub.id}')" aria-label="Delete">✕</button>`
        : '';
      return `
        <div class="subj-card" onclick="openSubject(${sem.id},'${sub.id}')">
          ${delBtn}
          <span class="subj-card-icon">${sub.icon}</span>
          <div class="subj-card-name">${escHtml(sub.name)}</div>
          <div class="subj-card-count">${count} file${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
    html += `
      <div class="subj-card-add" onclick="openAddSubjectModal()">
        <span style="font-size:1.5rem">＋</span>
        <span style="font-size:0.78rem;font-weight:600">Add Subject</span>
      </div>
    `;
    html += `</div>`;
  }

  const generalFiles = allFiles.filter(f => f.semId === sem.id && !f.subjectId);
  if (generalFiles.length > 0) {
    html += `<div class="page-sec-title">📄 General Files</div>`;
    html += `<div class="file-list">` + generalFiles.map(f => renderFileItem(f)).join('') + `</div>`;
  }

  if (allSubs.length === 0 && generalFiles.length === 0) {
    html += renderEmptyState('Nothing here yet', 'Upload files or add a subject folder below.');
  }

  html += renderDropZone();
  document.getElementById('semBody').innerHTML = html;
  setupDropZone('semBody');
}

// ─── SUBJECT PAGE ────────────────────────────────────────────────
function renderSubjectPage(sem, sub) {
  const subFiles = allFiles.filter(f => f.semId === sem.id && f.subjectId === sub.id);
  let html = '';
  if (subFiles.length > 0) {
    html = `<div class="file-list">` + subFiles.map(f => renderFileItem(f)).join('') + `</div>`;
  } else {
    html = renderEmptyState(`No files in ${sub.name}`, 'Upload notes, assignments, or PDFs for this subject.');
  }
  html += renderDropZone();
  document.getElementById('subBody').innerHTML = html;
  setupDropZone('subBody');
}

// ─── FILE ITEM ───────────────────────────────────────────────────
function renderFileItem(f, showPath = false) {
  const thumb = getFileThumb(f);
  const pathTag = showPath ? `<span class="file-path-tag">${getFilePath(f)}</span>` : '';
  return `
    <div class="file-item" onclick="previewFile('${f.id}')">
      <div class="file-thumb ${thumb.cls}">${thumb.icon}</div>
      <div class="file-info">
        <div class="file-name" title="${escHtml(f.name)}">${escHtml(f.name)}</div>
        <div class="file-meta">${formatSize(f.size)} · ${formatDate(f.uploadedAt)}</div>
      </div>
      ${pathTag}
      <div class="file-actions" onclick="event.stopPropagation()">
        <button class="file-action-btn" onclick="downloadFileById('${f.id}')" title="Download">⬇</button>
        <button class="file-action-btn del" onclick="deleteFileById('${f.id}')" title="Delete">🗑</button>
      </div>
    </div>
  `;
}

function getFilePath(f) {
  const sem = SEMESTERS.find(s => s.id === f.semId);
  if (!sem) return '';
  if (f.subjectId) {
    const sub = getSemSubjects(f.semId).find(s => s.id === f.subjectId);
    return sub ? `Sem ${f.semId}/${sub.name}` : `Sem ${f.semId}`;
  }
  return `Sem ${f.semId}`;
}

function getFileThumb(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'ft-pdf', doc: 'ft-doc', docx: 'ft-doc',
    jpg: 'ft-img', jpeg: 'ft-img', png: 'ft-img', gif: 'ft-img', svg: 'ft-img', webp: 'ft-img',
    ppt: 'ft-ppt', pptx: 'ft-ppt', xls: 'ft-xls', xlsx: 'ft-xls', csv: 'ft-xls',
    txt: 'ft-txt', md: 'ft-txt', zip: 'ft-zip', rar: 'ft-zip',
  };
  const labels = {
    pdf: 'PDF', doc: 'DOC', docx: 'DOC', ppt: 'PPT', pptx: 'PPT',
    xls: 'XLS', xlsx: 'XLS', csv: 'CSV', txt: 'TXT', md: 'MD', zip: 'ZIP', rar: 'RAR',
    jpg: '🖼', jpeg: '🖼', png: '🖼', gif: '🖼', svg: '🖼', webp: '🖼',
  };
  return { cls: map[ext] || 'ft-other', icon: labels[ext] || (ext.toUpperCase().slice(0, 3) || '?') };
}

// ─── DROP ZONE ───────────────────────────────────────────────────
function renderDropZone() {
  return `
    <div class="drop-zone" id="dropZone" onclick="triggerUpload()">
      <span class="drop-zone-icon">☁️</span>
      <div class="drop-zone-text"><strong>Tap to upload</strong> or drag a file here</div>
      <div class="drop-zone-sub">Supports all file types</div>
    </div>
  `;
}
function setupDropZone(containerId) {
  setTimeout(() => {
    const dz = document.getElementById('dropZone');
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });
  }, 80);
}

// ─── UPLOAD ──────────────────────────────────────────────────────
function triggerUpload() { document.getElementById('fileInput').click(); }
function handleFileUpload(e) { handleFiles(Array.from(e.target.files)); e.target.value = ''; }
function handleFiles(fileList) {
  if (!fileList || fileList.length === 0) return;
  // If we have a sorted context, go straight to sort sheet
  // Otherwise ask which semester
  const first = fileList[0];
  pendingFile = fileList.length === 1 ? first : fileList;
  showSortSheet(first, fileList.length > 1 ? fileList : null);
}

// ─── SORT BOTTOM SHEET ───────────────────────────────────────────
let sortSelectedSemId = null;
let sortSelectedSubId = null;
let sortPendingFiles = null;

function showSortSheet(file, allFilesArr = null) {
  pendingFile = file;
  sortPendingFiles = allFilesArr;
  sortSelectedSemId = currentSemester ? currentSemester.id : null;
  sortSelectedSubId = currentSubject ? currentSubject.id : null;

  document.getElementById('sheetFilename').textContent = file.name || 'Unknown file';
  document.getElementById('sheetSaveBtn').disabled = false;

  buildSemChips();
  if (sortSelectedSemId) buildSubChips(sortSelectedSemId);
  updateSheetDest();

  document.getElementById('sheetBackdrop').classList.remove('hidden');
  document.getElementById('sortSheet').classList.remove('hidden');
}

function buildSemChips() {
  const row = document.getElementById('semChips');
  row.innerHTML = SEMESTERS.map(sem => `
    <button class="chip${sortSelectedSemId === sem.id ? ' active' : ''}"
            onclick="selectSemChip(${sem.id})">
      ${sem.icon} Sem ${sem.id}
    </button>
  `).join('');
}

function selectSemChip(semId) {
  sortSelectedSemId = semId;
  sortSelectedSubId = null;
  buildSemChips();
  buildSubChips(semId);
  updateSheetDest();
}

function buildSubChips(semId) {
  const subs = getSemSubjects(semId);
  const subLbl = document.getElementById('subLabel');
  const row = document.getElementById('subChips');
  if (subs.length === 0) { subLbl.style.display = 'none'; row.innerHTML = ''; return; }
  subLbl.style.display = 'block';
  row.innerHTML = [
    { id: null, name: 'General', icon: '📂' },
    ...subs
  ].map(sub => `
    <button class="chip${sortSelectedSubId === sub.id ? ' active' : ''}"
            onclick="selectSubChip(${sub.id ? `'${sub.id}'` : 'null'})">
      ${sub.icon || '📂'} ${sub.name}
    </button>
  `).join('');
}

function selectSubChip(subId) {
  sortSelectedSubId = subId;
  buildSubChips(sortSelectedSemId);
  updateSheetDest();
}

function updateSheetDest() {
  const dest = document.getElementById('sheetDest');
  if (!sortSelectedSemId) { dest.classList.remove('visible'); return; }
  const sem = SEMESTERS.find(s => s.id === sortSelectedSemId);
  const sub = sortSelectedSubId ? getSemSubjects(sortSelectedSemId).find(s => s.id === sortSelectedSubId) : null;
  const path = sub
    ? `Downloads/Memory management app/Semester ${sortSelectedSemId}/${sub.name}/`
    : `Downloads/Memory management app/Semester ${sortSelectedSemId}/`;
  dest.textContent = '📂 ' + path;
  dest.classList.add('visible');
}

function closeSortSheet() {
  document.getElementById('sheetBackdrop').classList.add('hidden');
  document.getElementById('sortSheet').classList.add('hidden');
  pendingFile = null; sortPendingFiles = null;
  sortSelectedSemId = null; sortSelectedSubId = null;
}

async function confirmSort() {
  if (!sortSelectedSemId) { showToast('Please select a semester', 'error'); return; }

  document.getElementById('sheetSaveBtn').disabled = true;
  document.getElementById('sheetSaveBtn').textContent = 'Saving…';

  const filesToSave = sortPendingFiles
    ? Array.from(sortPendingFiles)
    : [pendingFile];

  for (const file of filesToSave) {
    await saveFile(file, sortSelectedSemId, sortSelectedSubId);
  }

  closeSortSheet();
  refreshCurrentPage();
  updateStats();
  const n = filesToSave.length;
  showToast(`✅ ${n} file${n > 1 ? 's' : ''} saved!`, 'success');
}

async function saveFile(file, semId, subjectId) {
  // 1. Write to phone filesystem if available
  let savedToFS = false;
  if (rootDirHandle) {
    savedToFS = await writeFileToStorage(file, semId, subjectId);
  }

  // 2. Store blob in IndexedDB for in-app preview/access
  const record = {
    id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    name: file.name,
    size: file.size,
    type: file.type,
    semId, subjectId: subjectId || null,
    uploadedAt: new Date().toISOString(),
    blob: file,
    savedToFS,
  };
  await dbPut('files', record);
  allFiles.push(record);
}

// ─── ADD / DELETE SUBJECTS ───────────────────────────────────────
function openAddSubjectModal() {
  addSubjectForSemId = currentSemester ? currentSemester.id : null;
  if (!addSubjectForSemId) return;
  selectedEmoji = '📚';
  document.getElementById('newSubjectName').value = '';
  document.getElementById('selectedEmojiDisplay').textContent = selectedEmoji;
  document.getElementById('addSubSemLabel').textContent =
    `For: ${SEMESTERS.find(s => s.id === addSubjectForSemId)?.label}`;
  document.querySelectorAll('.emoji-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.emoji === selectedEmoji)
  );
  document.getElementById('addSubjectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('newSubjectName').focus(), 150);
}

function closeAddSubjectModal(e) {
  if (e && e.target.id !== 'addSubjectModal') return;
  document.getElementById('addSubjectModal').classList.add('hidden');
}

function saveNewSubject() {
  const name = document.getElementById('newSubjectName').value.trim();
  if (!name) { showToast('Enter a subject name', 'error'); return; }
  const existing = getSemSubjects(addSubjectForSemId).find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existing) { showToast('Subject already exists!', 'error'); return; }

  if (!customSubs[addSubjectForSemId]) customSubs[addSubjectForSemId] = [];
  customSubs[addSubjectForSemId].push({
    id: 'custom_' + Date.now(), name, icon: selectedEmoji, desc: name,
  });
  saveCustomSubjects();

  // Also create folder on device if handle exists
  if (rootDirHandle) {
    rootDirHandle.getDirectoryHandle(`Semester ${addSubjectForSemId}`, { create: true })
      .then(semDir => semDir.getDirectoryHandle(name, { create: true }))
      .catch(() => { });
  }

  document.getElementById('addSubjectModal').classList.add('hidden');
  showToast(`✅ "${name}" added!`, 'success');
  if (currentSemester && currentSemester.id === addSubjectForSemId) renderSemesterPage(currentSemester);
  renderSemGrid();
}

function deleteSubject(semId, subjectId) {
  const sub = getSemSubjects(semId).find(s => s.id === subjectId);
  if (!sub || !confirm(`Delete "${sub.name}" and all its files?`)) return;
  allFiles = allFiles.filter(f => !(f.semId === semId && f.subjectId === subjectId));
  allFiles.forEach(f => { /* IndexedDB delete handled below */ });
  openDB().then(db => {
    const tx = db.transaction('files', 'readwrite');
    allFiles.forEach(f => tx.objectStore('files').put(f));
  });
  if (customSubs[semId]) {
    customSubs[semId] = customSubs[semId].filter(s => s.id !== subjectId);
    saveCustomSubjects();
  }
  updateStats();
  showToast(`🗑 "${sub.name}" deleted.`);
  if (currentSemester) renderSemesterPage(currentSemester);
  renderSemGrid();
}

// ─── EMOJI PICKER ────────────────────────────────────────────────
function buildEmojiGrid() {
  const grid = document.getElementById('emojiGrid');
  if (!grid) return;
  grid.innerHTML = SUBJECT_EMOJIS.map(e =>
    `<button class="emoji-btn${e === selectedEmoji ? ' selected' : ''}" data-emoji="${e}" onclick="selectEmoji('${e}')">${e}</button>`
  ).join('');
}
function selectEmoji(emoji) {
  selectedEmoji = emoji;
  document.getElementById('selectedEmojiDisplay').textContent = emoji;
  document.querySelectorAll('.emoji-btn').forEach(b =>
    b.classList.toggle('selected', b.dataset.emoji === emoji)
  );
}

// ─── SEARCH ──────────────────────────────────────────────────────
function doSearch(query) {
  const q = query.toLowerCase().trim();
  const el = document.getElementById('searchResults');
  if (!q) { el.innerHTML = ''; return; }
  const results = allFiles.filter(f =>
    f.name.toLowerCase().includes(q) || getFilePath(f).toLowerCase().includes(q)
  );
  if (results.length === 0) {
    el.innerHTML = renderEmptyState('No results', `Nothing matches "${escHtml(q)}".`);
    return;
  }
  el.innerHTML =
    `<div style="font-size:0.75rem;color:var(--text2);padding:0 1rem 0.5rem">${results.length} result${results.length !== 1 ? 's' : ''}</div>` +
    `<div class="file-list" style="padding:0 1rem">` + results.map(f => renderFileItem(f, true)).join('') + `</div>`;
}

// ─── RECENT ──────────────────────────────────────────────────────
function renderRecentFiles() {
  const recent = [...allFiles].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)).slice(0, 30);
  const el = document.getElementById('recentFiles');
  if (recent.length === 0) { el.innerHTML = renderEmptyState('No files yet', 'Upload your first file!'); return; }
  el.innerHTML = `<div class="file-list" style="padding:0 1rem">` + recent.map(f => renderFileItem(f, true)).join('') + `</div>`;
}

// ─── FILE PREVIEW ────────────────────────────────────────────────
async function previewFile(fileId) {
  const f = allFiles.find(x => x.id === fileId);
  if (!f) return;
  currentFileForModal = f;
  document.getElementById('modalTitle').textContent = f.name;
  document.getElementById('modalMeta').textContent = `${formatSize(f.size)} · ${formatDate(f.uploadedAt)} · ${getFilePath(f)}`;

  const body = document.getElementById('modalBody');
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const imgTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const textTypes = ['txt', 'md', 'js', 'html', 'css', 'json', 'csv'];

  let blob = f.blob;

  if (imgTypes.includes(ext) && blob) {
    const url = URL.createObjectURL(blob);
    body.innerHTML = `<img src="${url}" alt="${escHtml(f.name)}" style="max-width:100%;border-radius:8px"/>`;
  } else if (textTypes.includes(ext) && blob) {
    const text = await blob.text();
    body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;font-family:monospace;font-size:0.8rem">${escHtml(text)}</pre>`;
  } else if (ext === 'pdf' && blob) {
    const url = URL.createObjectURL(blob);
    body.innerHTML = `<iframe class="preview-frame" src="${url}" title="${escHtml(f.name)}"></iframe>`;
  } else {
    const thumb = getFileThumb(f);
    body.innerHTML = `
      <div class="preview-no-support">
        <span class="preview-emoji">📄</span>
        <div style="font-weight:700;margin-bottom:0.5rem">${escHtml(f.name)}</div>
        <div>Preview unavailable. Download to open.</div>
      </div>`;
  }
  document.getElementById('previewModal').classList.remove('hidden');
}

function closeModal() { document.getElementById('previewModal').classList.add('hidden'); currentFileForModal = null; }
function closePreviewModal(e) { if (e.target.id === 'previewModal') closeModal(); }

function downloadCurrentFile() { if (currentFileForModal) downloadFileById(currentFileForModal.id); }
function downloadFileById(fileId) {
  const f = allFiles.find(x => x.id === fileId);
  if (!f || !f.blob) return;
  const url = URL.createObjectURL(f.blob);
  const a = document.createElement('a'); a.href = url; a.download = f.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`⬇ Downloading "${f.name}"…`);
}

function deleteCurrentFile() { if (currentFileForModal) { deleteFileById(currentFileForModal.id); closeModal(); } }
async function deleteFileById(fileId) {
  const f = allFiles.find(x => x.id === fileId);
  if (!f || !confirm(`Delete "${f.name}"?`)) return;
  await dbDelete('files', fileId);
  allFiles = allFiles.filter(x => x.id !== fileId);
  updateStats();
  refreshCurrentPage();
  showToast(`🗑 "${f.name}" deleted.`);
}

// ─── CLEAR ALL ────────────────────────────────────────────────────
async function clearAllData() {
  if (!confirm('Delete ALL files and data? This cannot be undone.')) return;
  const db = await openDB();
  const tx = db.transaction(['files', 'handles', 'meta'], 'readwrite');
  tx.objectStore('files').clear();
  tx.objectStore('handles').clear();
  tx.objectStore('meta').clear();
  localStorage.clear();
  allFiles = []; rootDirHandle = null;
  updateStats();
  showToast('All data cleared.', 'success');
}

// ─── REFRESH ──────────────────────────────────────────────────────
function refreshCurrentPage() {
  if (currentPage === 'home') { renderSemGrid(); }
  else if (currentPage === 'semester' && currentSemester) renderSemesterPage(currentSemester);
  else if (currentPage === 'subject' && currentSemester && currentSubject) renderSubjectPage(currentSemester, currentSubject);
  else if (currentPage === 'recent') renderRecentFiles();
}

// ─── HELPERS ─────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024, u = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1).replace('.0', '') + ' ' + u[i];
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function renderEmptyState(title, sub) {
  return `<div class="empty-state"><span class="empty-icon">📂</span><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast visible ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}
