/* ================================
   CollegeVault - Memory Management
   app.js — full application logic
   ================================ */

// ─── EMOJI OPTIONS ────────────────────────────────────────────────────────────
const SUBJECT_EMOJIS = [
  '📚', '📖', '📝', '📐', '📏', '🔬', '⚗️', '🧪', '🔭', '🧬', '💡', '🖥️', '💻', '🖱️', '⌨️',
  '📡', '📻', '📺', '🔌', '⚙️', '🔧', '🔩', '⚡', '🔋', '💾', '📀', '💿', '🧮', '🗂️', '📂',
  '📄', '📑', '📋', '📊', '📈', '📉', '🗒️', '✏️', '🖊️', '🖋️', '🗃️', '📌', '📍', '🔖', '🏷️',
  '🎯', '🏆', '🎓', '📜', '🎨', '🖌️', '✂️', '🧰', '🛠️', '⚒️', '🌐', '🗺️', '🌍', '🌏', '🌎',
  '🧠', '💭', '🤔', '🔤', '🔡', '🔢', '➕', '➖', '➗', '✖️', '🔄', '📌', '🧲', '🔑', '🗝️',
  '🌱', '🌿', '🌲', '🍃', '🎋', '🌊', '💧', '🔥', '❄️', '🌟', '⭐', '💫', '🎆', '🌈', '☀️',
];

// ─── PREDEFINED SEMESTERS DATA ────────────────────────────────────────────────
const SEMESTERS = [
  { id: 1, label: 'Semester 1', icon: '📘', color: 'sem-1' },
  { id: 2, label: 'Semester 2', icon: '📗', color: 'sem-2' },
  {
    id: 3, label: 'Semester 3', icon: '📙', color: 'sem-3',
    builtinSubjects: [
      { id: 'cs', name: 'Control System', icon: '⚙️', desc: 'Control Systems & Theory' },
      { id: 'cg', name: 'Computer Graphics', icon: '🖥️', desc: 'Graphics & Visualization' },
      { id: 'm3', name: 'Math III', icon: '📐', desc: 'Mathematics – III' },
      { id: 'mp', name: 'Microprocessor', icon: '🔬', desc: 'Microprocessor & Assembly' },
      { id: 'en', name: 'English', icon: '📝', desc: 'Communication & Language' },
      { id: 'ae', name: 'Advanced Electronics', icon: '⚡', desc: 'Advanced Electronics Lab' },
    ]
  },
  { id: 4, label: 'Semester 4', icon: '📒', color: 'sem-4' },
  { id: 5, label: 'Semester 5', icon: '📓', color: 'sem-5' },
  { id: 6, label: 'Semester 6', icon: '📔', color: 'sem-6' },
  { id: 7, label: 'Semester 7', icon: '📕', color: 'sem-7' },
  { id: 8, label: 'Semester 8', icon: '🎓', color: 'sem-8' },
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let files = loadFiles();
let customSubs = loadCustomSubjects();
let currentPage = 'home';
let currentSemester = null;
let currentSubject = null;
let currentFileForModal = null;
let viewMode = 'grid';
let uploadContext = null; // { semId, subjectId }
let addSubjectForSemId = null;
let selectedEmoji = '📚';
let sidebarOpen = true; // desktop default

// ─── PERSISTENCE ──────────────────────────────────────────────────────────────
function loadFiles() {
  try { return JSON.parse(localStorage.getItem('cv_files') || '[]'); } catch { return []; }
}
function saveFiles() {
  try { localStorage.setItem('cv_files', JSON.stringify(files)); }
  catch { showToast('Storage limit reached!', 'error'); }
}
function loadCustomSubjects() {
  try { return JSON.parse(localStorage.getItem('cv_custom_subjects') || '{}'); } catch { return {}; }
}
function saveCustomSubjects() {
  localStorage.setItem('cv_custom_subjects', JSON.stringify(customSubs));
}

// ─── GET ALL SUBJECTS FOR A SEMESTER ─────────────────────────────────────────
function getSemSubjects(semId) {
  const sem = SEMESTERS.find(s => s.id === semId);
  const builtin = (sem && sem.builtinSubjects) ? sem.builtinSubjects : [];
  const custom = (customSubs[semId] || []);
  return [...builtin, ...custom];
}

// ─── INIT ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildSidebarSemesterNav();
  renderSemesterGrid();
  updateStats();
  updateStorageBar();
  setupGlobalDropZone();
  buildEmojiGrid();
});

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function buildSidebarSemesterNav() {
  const nav = document.getElementById('semester-nav');
  nav.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'nav-item';
    a.id = `sidebar-sem-${sem.id}`;
    a.innerHTML = `<span class="nav-icon">${sem.icon}</span><span class="nav-text">Sem ${sem.id}</span>`;
    a.onclick = (e) => { e.preventDefault(); openSemester(sem.id); };
    nav.appendChild(a);
  });
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const isSmall = window.innerWidth <= 900;

  if (isSmall) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle('collapsed', !sidebarOpen);
    main.classList.toggle('sidebar-collapsed', !sidebarOpen);
  }
}

// Close sidebar on overlay click (mobile)
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 900) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('mobile-open') &&
      !sidebar.contains(e.target) &&
      e.target.id !== 'topbarMenuBtn') {
      sidebar.classList.remove('mobile-open');
    }
  }
});

function setActiveNav(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ─── PAGE NAVIGATION ─────────────────────────────────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${pageId}`).classList.remove('hidden');
  currentPage = pageId;
  window.scrollTo(0, 0);
}

function showHome() {
  showPage('home');
  renderSemesterGrid();
  updateStats();
  setBreadcrumb([{ label: 'Dashboard' }]);
  setActiveNav('nav-home');
}

function showSearch() {
  showPage('search');
  setBreadcrumb([{ label: 'Search Files' }]);
  setActiveNav('nav-search');
  setTimeout(() => document.getElementById('fullSearch').focus(), 100);
}

function showRecent() {
  showPage('recent');
  renderRecentFiles();
  setBreadcrumb([{ label: 'Recent Files' }]);
  setActiveNav('nav-recent');
}

function openSemester(semId) {
  currentSemester = SEMESTERS.find(s => s.id === semId);
  currentSubject = null;
  uploadContext = { semId, subjectId: null };
  renderSemesterPage(currentSemester);
  setBreadcrumb([
    { label: 'Dashboard', fn: 'showHome' },
    { label: currentSemester.label }
  ]);
  setActiveNav(`sidebar-sem-${semId}`);
  showPage('semester');
}

function openSubject(semId, subjectId) {
  currentSemester = SEMESTERS.find(s => s.id === semId);
  currentSubject = getSemSubjects(semId).find(s => s.id === subjectId);
  uploadContext = { semId, subjectId };
  renderSubjectPage(currentSemester, currentSubject);
  setBreadcrumb([
    { label: 'Dashboard', fn: 'showHome' },
    { label: currentSemester.label, fn: `openSemester_${semId}` },
    { label: currentSubject.name }
  ]);
  showPage('subject');
}

function goBack() { showHome(); }
function goBackToSemester() {
  if (currentSemester) openSemester(currentSemester.id);
  else showHome();
}

// ─── BREADCRUMB ───────────────────────────────────────────────────────────────
function setBreadcrumb(items) {
  const el = document.getElementById('breadcrumb');
  el.innerHTML = items.map((item, i) => {
    const isLast = i === items.length - 1;
    const sep = i > 0 ? '<span class="breadcrumb-sep"> / </span>' : '';
    if (!isLast && item.fn) {
      let clickHandler = '';
      if (item.fn === 'showHome') clickHandler = 'showHome()';
      else if (item.fn.startsWith('openSemester_')) {
        const id = item.fn.split('_')[1];
        clickHandler = `openSemester(${id})`;
      }
      return `${sep}<span class="breadcrumb-item" onclick="${clickHandler}" style="cursor:pointer">${item.label}</span>`;
    }
    return `${sep}<span class="breadcrumb-item ${isLast ? 'active' : ''}">${item.label}</span>`;
  }).join('');
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats() {
  const totalFiles = files.length;
  const totalSize = files.reduce((a, f) => a + (f.size || 0), 0);
  const semesters = [...new Set(files.map(f => f.semId))].length;
  const subjects = [...new Set(files.map(f => f.subjectId).filter(Boolean))].length;

  const stats = [
    { icon: '📄', value: totalFiles, label: 'Total Files' },
    { icon: '💾', value: formatSize(totalSize), label: 'Storage Used' },
    { icon: '📚', value: semesters, label: 'Active Semesters' },
    { icon: '📋', value: subjects, label: 'Subjects Used' },
  ];

  document.getElementById('stats-row').innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <span class="stat-value">${s.value}</span>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join('');
}

function updateStorageBar() {
  const total = files.reduce((a, f) => a + (f.size || 0), 0);
  const maxStorage = 50 * 1024 * 1024;
  const pct = Math.min((total / maxStorage) * 100, 100);
  document.getElementById('storage-bar-fill').style.width = pct + '%';
  document.getElementById('storage-used-text').textContent = formatSize(total);
}

// ─── SEMESTER GRID ────────────────────────────────────────────────────────────
function renderSemesterGrid() {
  const grid = document.getElementById('semester-grid');
  grid.innerHTML = SEMESTERS.map(sem => {
    const semFiles = files.filter(f => f.semId === sem.id);
    const subjects = getSemSubjects(sem.id);
    const subInfo = subjects.length > 0 ? `${subjects.length} Subject${subjects.length !== 1 ? 's' : ''}` : 'General Storage';
    return `
      <div class="semester-card ${sem.color}" onclick="openSemester(${sem.id})" id="sem-card-${sem.id}">
        <span class="sem-card-badge">Semester ${sem.id}</span>
        <span class="sem-card-icon">${sem.icon}</span>
        <div class="sem-card-info">
          <div class="sem-card-title">${sem.label}</div>
          <div class="sem-card-sub">${subInfo} • ${semFiles.length} file${semFiles.length !== 1 ? 's' : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

function setView(mode) {
  viewMode = mode;
  const grid = document.getElementById('semester-grid');
  document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
  grid.classList.toggle('list-view', mode === 'list');
}

// ─── SEMESTER PAGE ────────────────────────────────────────────────────────────
function renderSemesterPage(sem) {
  document.getElementById('sem-badge').textContent = `Semester ${sem.id}`;
  document.getElementById('sem-title').textContent = sem.label;

  const allSubjects = getSemSubjects(sem.id);
  const content = document.getElementById('semester-content');
  let html = '';

  // Always show subject grid if any subjects exist or can be created
  if (allSubjects.length > 0) {
    document.getElementById('sem-subtitle').textContent = '📂 Subject Folders';
    html += `<div class="subject-grid">`;
    html += allSubjects.map(sub => {
      const count = files.filter(f => f.semId === sem.id && f.subjectId === sub.id).length;
      const isCustom = !!(customSubs[sem.id] && customSubs[sem.id].find(s => s.id === sub.id));
      const deleteBtn = isCustom
        ? `<button class="subject-delete-btn" onclick="event.stopPropagation(); deleteSubject(${sem.id}, '${sub.id}')" title="Remove subject">✕</button>`
        : '';
      return `
        <div class="subject-card" onclick="openSubject(${sem.id}, '${sub.id}')">
          ${deleteBtn}
          <span class="subject-icon">${sub.icon}</span>
          <div class="subject-name">${escHtml(sub.name)}</div>
          <div class="subject-count">${count} file${count !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
    // "Add Subject" inline card
    html += `
      <div class="subject-card-add" onclick="openAddSubjectModal()">
        <span class="subject-card-add-icon">＋</span>
        <span class="subject-card-add-text">Add Subject</span>
      </div>
    `;
    html += `</div>`;
  } else {
    document.getElementById('sem-subtitle').textContent = '📂 No Subjects Yet';
  }

  // General (non-subject) files
  const generalFiles = files.filter(f => f.semId === sem.id && !f.subjectId);
  if (generalFiles.length > 0) {
    html += `<div class="file-section-title">📄 General Files</div>`;
    html += `<div class="file-list">` + generalFiles.map(f => renderFileItem(f)).join('') + `</div>`;
  }

  // Drop zone
  html += renderDropZone();
  content.innerHTML = html;
  setupDropZone();
}

// ─── SUBJECT PAGE ─────────────────────────────────────────────────────────────
function renderSubjectPage(sem, sub) {
  document.getElementById('subject-badge').textContent = `Sem ${sem.id} • ${sub.name}`;
  document.getElementById('subject-title').textContent = `${sub.icon}  ${sub.name}`;
  document.getElementById('subject-subtitle').textContent = sub.desc || sub.name;

  const subFiles = files.filter(f => f.semId === sem.id && f.subjectId === sub.id);
  const content = document.getElementById('subject-content');
  let html = '';
  if (subFiles.length > 0) {
    html = `<div class="file-list">` + subFiles.map(f => renderFileItem(f)).join('') + `</div>`;
  } else {
    html = renderEmptyState(`No files in ${sub.name}`, 'Upload notes, assignments, or any document for this subject.');
  }
  html += renderDropZone();
  content.innerHTML = html;
  setupDropZone();
}

// ─── ADD / DELETE SUBJECTS ────────────────────────────────────────────────────
function openAddSubjectModal() {
  addSubjectForSemId = currentSemester ? currentSemester.id : null;
  if (!addSubjectForSemId) return;

  selectedEmoji = '📚';
  document.getElementById('new-subject-name').value = '';
  document.getElementById('selected-emoji-display').textContent = selectedEmoji;
  document.getElementById('add-subject-semester-label').textContent =
    `Adding to: ${SEMESTERS.find(s => s.id === addSubjectForSemId)?.label}`;

  // Reset emoji grid selection
  document.querySelectorAll('.emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === selectedEmoji);
  });

  document.getElementById('addSubjectModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('new-subject-name').focus(), 100);
}

function closeAddSubjectModal(e) {
  if (e && e.target.id !== 'addSubjectModal') return;
  document.getElementById('addSubjectModal').classList.add('hidden');
}

function saveNewSubject() {
  const name = document.getElementById('new-subject-name').value.trim();
  if (!name) { showToast('Please enter a subject name.', 'error'); return; }
  if (!addSubjectForSemId) return;

  // Check duplicate
  const existing = getSemSubjects(addSubjectForSemId).find(
    s => s.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) { showToast('A subject with this name already exists!', 'error'); return; }

  const newSub = {
    id: 'custom_' + Date.now(),
    name,
    icon: selectedEmoji,
    desc: name,
  };

  if (!customSubs[addSubjectForSemId]) customSubs[addSubjectForSemId] = [];
  customSubs[addSubjectForSemId].push(newSub);
  saveCustomSubjects();

  document.getElementById('addSubjectModal').classList.add('hidden');
  showToast(`✅ Subject "${name}" added!`, 'success');

  // Refresh current view
  if (currentSemester && currentSemester.id === addSubjectForSemId) {
    renderSemesterPage(currentSemester);
  }
  renderSemesterGrid();
}

function deleteSubject(semId, subjectId) {
  const sub = getSemSubjects(semId).find(s => s.id === subjectId);
  if (!sub) return;
  if (!confirm(`Delete subject "${sub.name}"? All files inside it will also be deleted.`)) return;

  // Remove subject files
  files = files.filter(f => !(f.semId === semId && f.subjectId === subjectId));
  saveFiles();

  // Remove custom subject
  if (customSubs[semId]) {
    customSubs[semId] = customSubs[semId].filter(s => s.id !== subjectId);
    saveCustomSubjects();
  }

  updateStats();
  updateStorageBar();
  showToast(`🗑 Subject "${sub.name}" deleted.`);
  if (currentSemester) renderSemesterPage(currentSemester);
  renderSemesterGrid();
}

// ─── EMOJI GRID ───────────────────────────────────────────────────────────────
function buildEmojiGrid() {
  const grid = document.getElementById('emoji-grid');
  if (!grid) return;
  grid.innerHTML = SUBJECT_EMOJIS.map(e => `
    <button class="emoji-btn${e === selectedEmoji ? ' selected' : ''}" data-emoji="${e}" onclick="selectEmoji('${e}')">${e}</button>
  `).join('');
}

function selectEmoji(emoji) {
  selectedEmoji = emoji;
  document.getElementById('selected-emoji-display').textContent = emoji;
  document.querySelectorAll('.emoji-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.emoji === emoji);
  });
}

// ─── FILE ITEM RENDER ─────────────────────────────────────────────────────────
function renderFileItem(f, showPath = false) {
  const thumb = getFileThumb(f);
  const pathTag = showPath ? `<span class="file-path-tag">${getFilePath(f)}</span>` : '';
  return `
    <div class="file-item" onclick="previewFile('${f.id}')">
      <div class="file-thumb ${thumb.cls}">${thumb.icon}</div>
      <div class="file-info">
        <div class="file-name" title="${escHtml(f.name)}">${escHtml(f.name)}</div>
        <div class="file-meta">${formatSize(f.size)} • ${formatDate(f.uploadedAt)}</div>
      </div>
      ${pathTag}
      <div class="file-actions" onclick="event.stopPropagation()">
        <button class="file-action-btn" onclick="previewFile('${f.id}')" title="Preview">👁</button>
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
    return sub ? `Sem ${f.semId} / ${sub.name}` : `Sem ${f.semId}`;
  }
  return `Sem ${f.semId}`;
}

function getFileThumb(f) {
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: { cls: 'ft-pdf', icon: 'PDF' },
    doc: { cls: 'ft-doc', icon: 'DOC' }, docx: { cls: 'ft-doc', icon: 'DOC' },
    jpg: { cls: 'ft-img', icon: '🖼' }, jpeg: { cls: 'ft-img', icon: '🖼' },
    png: { cls: 'ft-img', icon: '🖼' }, gif: { cls: 'ft-img', icon: '🖼' },
    svg: { cls: 'ft-img', icon: '🖼' }, webp: { cls: 'ft-img', icon: '🖼' },
    ppt: { cls: 'ft-ppt', icon: 'PPT' }, pptx: { cls: 'ft-ppt', icon: 'PPT' },
    xls: { cls: 'ft-xls', icon: 'XLS' }, xlsx: { cls: 'ft-xls', icon: 'XLS' },
    csv: { cls: 'ft-xls', icon: 'CSV' },
    txt: { cls: 'ft-txt', icon: 'TXT' }, md: { cls: 'ft-txt', icon: 'MD' },
    zip: { cls: 'ft-zip', icon: 'ZIP' }, rar: { cls: 'ft-zip', icon: 'RAR' },
  };
  return map[ext] || { cls: 'ft-other', icon: (ext.toUpperCase().slice(0, 3) || '?') };
}

// ─── DROP ZONE & UPLOAD ───────────────────────────────────────────────────────
function renderDropZone() {
  return `
    <div class="drop-zone" id="dropZone" onclick="triggerUpload()">
      <span class="drop-zone-icon">☁️</span>
      <div class="drop-zone-text"><strong>Drop files here</strong> or click to browse</div>
      <div style="font-size:0.75rem; margin-top:0.3rem; color:var(--text3);">Supports all file types</div>
    </div>
  `;
}

function setupDropZone() {
  setTimeout(() => {
    const dz = document.getElementById('dropZone');
    if (!dz) return;
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz.addEventListener('drop', e => {
      e.preventDefault();
      dz.classList.remove('dragover');
      handleFiles(Array.from(e.dataTransfer.files));
    });
  }, 50);
}

function setupGlobalDropZone() {
  document.body.addEventListener('dragover', e => e.preventDefault());
}

function triggerUpload() {
  document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
  handleFiles(Array.from(event.target.files));
  event.target.value = '';
}

function handleFiles(fileList) {
  if (!uploadContext) uploadContext = { semId: null, subjectId: null };

  if (!uploadContext.semId) {
    const semId = parseInt(prompt('Which semester? Enter a number (1-8):', currentSemester ? currentSemester.id : '1'));
    if (!semId || semId < 1 || semId > 8) { showToast('Upload cancelled.', 'error'); return; }
    uploadContext = { semId, subjectId: null };
  }

  fileList.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const fileData = {
        id: 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2),
        name: file.name,
        size: file.size,
        type: file.type,
        semId: uploadContext.semId,
        subjectId: uploadContext.subjectId || null,
        uploadedAt: new Date().toISOString(),
        dataUrl: e.target.result,
      };
      files.push(fileData);
      saveFiles();
      updateStats();
      updateStorageBar();
      refreshCurrentPage();
      showToast(`✅ "${file.name}" uploaded!`, 'success');
    };
    reader.readAsDataURL(file);
  });
}

function refreshCurrentPage() {
  if (currentPage === 'home') { renderSemesterGrid(); updateStats(); }
  else if (currentPage === 'semester' && currentSemester) renderSemesterPage(currentSemester);
  else if (currentPage === 'subject' && currentSemester && currentSubject) renderSubjectPage(currentSemester, currentSubject);
  else if (currentPage === 'recent') renderRecentFiles();
}

// ─── FILE ACTIONS ─────────────────────────────────────────────────────────────
function previewFile(fileId) {
  const f = files.find(x => x.id === fileId);
  if (!f) return;
  currentFileForModal = f;

  document.getElementById('modal-title').textContent = f.name;
  document.getElementById('modal-meta').textContent =
    `${formatSize(f.size)} • ${formatDate(f.uploadedAt)} • ${getFilePath(f)}`;

  const body = document.getElementById('modal-body');
  const ext = (f.name.split('.').pop() || '').toLowerCase();
  const imgTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const textTypes = ['txt', 'md', 'js', 'html', 'css', 'json', 'csv'];

  if (imgTypes.includes(ext)) {
    body.innerHTML = `<img src="${f.dataUrl}" alt="${escHtml(f.name)}" />`;
  } else if (textTypes.includes(ext)) {
    try {
      const raw = atob(f.dataUrl.split(',')[1]);
      body.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-word;font-family:monospace;font-size:0.82rem;">${escHtml(raw)}</pre>`;
    } catch { body.innerHTML = previewUnsupported(f); }
  } else if (ext === 'pdf') {
    body.innerHTML = `<iframe class="preview-frame" src="${f.dataUrl}" title="${escHtml(f.name)}"></iframe>`;
  } else {
    body.innerHTML = previewUnsupported(f);
  }

  document.getElementById('previewModal').classList.remove('hidden');
}

function previewUnsupported(f) {
  return `
    <div class="preview-no-support">
      <span class="preview-emoji">📄</span>
      <div style="font-weight:600;margin-bottom:0.5rem;">${escHtml(f.name)}</div>
      <div>Preview not available for this file type. Download to open it.</div>
    </div>
  `;
}

function downloadFile() { if (currentFileForModal) downloadFileById(currentFileForModal.id); }

function downloadFileById(fileId) {
  const f = files.find(x => x.id === fileId);
  if (!f) return;
  const a = document.createElement('a');
  a.href = f.dataUrl;
  a.download = f.name;
  a.click();
  showToast(`⬇ Downloading "${f.name}"…`);
}

function deleteCurrentFile() {
  if (currentFileForModal) { deleteFileById(currentFileForModal.id); closeModal(); }
}

function deleteFileById(fileId) {
  const f = files.find(x => x.id === fileId);
  if (!f) return;
  if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
  files = files.filter(x => x.id !== fileId);
  saveFiles();
  updateStats();
  updateStorageBar();
  refreshCurrentPage();
  showToast(`🗑 "${f.name}" deleted.`);
}

function closeModal() {
  document.getElementById('previewModal').classList.add('hidden');
  currentFileForModal = null;
}

function closePreviewModal(e) {
  if (e.target.id === 'previewModal') closeModal();
}

// ─── RECENT FILES ─────────────────────────────────────────────────────────────
function renderRecentFiles() {
  const recent = [...files]
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(0, 30);
  const el = document.getElementById('recent-files');
  if (recent.length === 0) {
    el.innerHTML = renderEmptyState('No files yet', 'Upload files in any semester to see them here.');
    return;
  }
  el.innerHTML = recent.map(f => renderFileItem(f, true)).join('');
}

// ─── SEARCH ───────────────────────────────────────────────────────────────────
function quickSearchFiles(query) {
  if (!query.trim()) return;
  showSearch();
  document.getElementById('fullSearch').value = query;
  fullSearchFiles(query);
}

function fullSearchFiles(query) {
  const q = query.toLowerCase().trim();
  const el = document.getElementById('search-results');
  if (!q) { el.innerHTML = ''; return; }
  const results = files.filter(f =>
    f.name.toLowerCase().includes(q) ||
    getFilePath(f).toLowerCase().includes(q)
  );
  if (results.length === 0) {
    el.innerHTML = renderEmptyState('No results', `No files match "${escHtml(q)}".`);
    return;
  }
  el.innerHTML =
    `<div style="font-size:0.8rem;color:var(--text2);margin-bottom:0.75rem;">${results.length} result${results.length !== 1 ? 's' : ''} found</div>` +
    results.map(f => renderFileItem(f, true)).join('');
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const u = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1).replace('.0', '') + ' ' + u[i];
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderEmptyState(title, sub) {
  return `
    <div class="empty-state">
      <span class="empty-icon">📂</span>
      <div class="empty-title">${title}</div>
      <div class="empty-sub">${sub}</div>
    </div>
  `;
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast visible ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}
