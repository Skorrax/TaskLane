const STORAGE_KEY = 'taskboard_data';

// Notify background script that side panel is open (disconnect signals close)
chrome.runtime.connect({ name: 'sidepanel' });

// ---- i18n ----

const translations = {
  de: {
    showDone: 'Erledigte anzeigen',
    editTask: 'Aufgabe bearbeiten',
    labelTitle: 'Titel *',
    placeholderTitle: 'Titel eingeben',
    labelDesc: 'Beschreibung',
    placeholderDesc: 'Beschreibung (optional)',
    labelDue: 'Fälligkeitsdatum',
    labelColumn: 'Spalte',
    done: 'Erledigt',
    notDone: 'Nicht erledigt',
    cancel: 'Abbrechen',
    save: 'Speichern',
    create: 'Erstellen',
    defaultCol1: 'Zu erledigen',
    defaultCol2: 'In Bearbeitung',
    defaultCol3: 'Erledigt',
    newColumn: 'Neue Spalte',
    addColumn: 'Neue Spalte',
    addTask: 'Aufgabe hinzufügen',
    deleteColumn: 'Spalte löschen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    placeholderDue: 'Datum & Uhrzeit wählen',
    confirmDeleteCol: 'Spalte "{title}" wirklich löschen?',
    confirmDeleteColTasks: 'Spalte "{title}" mit {count} Aufgabe(n) wirklich löschen?',
    confirmDeleteTask: 'Aufgabe "{title}" wirklich löschen?',
  },
  en: {
    showDone: 'Show completed',
    editTask: 'Edit task',
    labelTitle: 'Title *',
    placeholderTitle: 'Enter title',
    labelDesc: 'Description',
    placeholderDesc: 'Description (optional)',
    labelDue: 'Due date',
    labelColumn: 'Column',
    done: 'Done',
    notDone: 'Not done',
    cancel: 'Cancel',
    save: 'Save',
    create: 'Create',
    defaultCol1: 'To Do',
    defaultCol2: 'In Progress',
    defaultCol3: 'Done',
    newColumn: 'New Column',
    addColumn: 'New Column',
    addTask: 'Add task',
    deleteColumn: 'Delete column',
    edit: 'Edit',
    delete: 'Delete',
    placeholderDue: 'Select date & time',
    confirmDeleteCol: 'Really delete column "{title}"?',
    confirmDeleteColTasks: 'Really delete column "{title}" with {count} task(s)?',
    confirmDeleteTask: 'Really delete task "{title}"?',
  },
};

const lang = chrome.i18n.getUILanguage().startsWith('de') ? 'de' : 'en';
const flatpickrLocale = lang === 'de' ? 'de' : 'default';

function t(key, params) {
  let str = translations[lang][key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

function applyStaticTranslations() {
  document.getElementById('showDoneLabel').textContent = t('showDone');
  document.getElementById('editModalTitle').textContent = t('editTask');
  document.getElementById('editTitleLabel').textContent = t('labelTitle');
  document.getElementById('editTitle').placeholder = t('placeholderTitle');
  document.getElementById('editDescLabel').textContent = t('labelDesc');
  document.getElementById('editDesc').placeholder = t('placeholderDesc');
  document.getElementById('editDueLabel').textContent = t('labelDue');
  document.getElementById('editColumnLabel').textContent = t('labelColumn');
  document.getElementById('editDoneLabel').textContent = t('done');
  document.getElementById('btnCancelEdit').textContent = t('cancel');
  document.getElementById('btnSaveEdit').textContent = t('save');
  document.documentElement.lang = lang;
}

// ---- State ----

let state = null;
let showDone = false;

function defaultState() {
  return {
    columns: [
      { id: genId(), title: t('defaultCol1'), tasks: [], collapsed: false },
      { id: genId(), title: t('defaultCol2'), tasks: [], collapsed: false },
      { id: genId(), title: t('defaultCol3'), tasks: [], collapsed: false },
    ]
  };
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || defaultState();
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function now() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function isOverdue(task) {
  return task.due && !task.done && task.due <= now();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [datePart, timePart] = dateStr.split(' ');
  const [y, m, d] = datePart.split('-');
  if (timePart) return `${d}.${m}.${y} ${timePart}`;
  return `${d}.${m}.${y}`;
}

function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Rendering ----

async function render() {
  const board = document.getElementById('board');
  board.innerHTML = '';

  state.columns.forEach(col => {
    board.appendChild(renderColumn(col));
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-add-column';
  addBtn.innerHTML = `<span>+</span> ${t('addColumn')}`;
  addBtn.addEventListener('click', () => addColumn());
  board.appendChild(addBtn);

  await saveState();
}

function renderColumn(col) {
  const el = document.createElement('div');
  el.className = 'column';
  if (col.collapsed) el.classList.add('collapsed');
  el.dataset.colId = col.id;

  const activeTasks = col.tasks.filter(t => !t.done).length;

  // Header
  const header = document.createElement('div');
  header.className = 'column-header';

  const toggle = document.createElement('span');
  toggle.className = 'col-toggle';
  toggle.innerHTML = '&#x25BC;';

  const titleInput = document.createElement('input');
  titleInput.className = 'col-title';
  titleInput.value = col.title;
  titleInput.addEventListener('change', () => renameColumn(col.id, titleInput.value));
  titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') titleInput.blur(); });
  titleInput.addEventListener('click', e => e.stopPropagation());
  titleInput.addEventListener('focus', e => e.stopPropagation());

  const count = document.createElement('span');
  count.className = 'task-count';
  count.textContent = activeTasks;

  const actions = document.createElement('div');
  actions.className = 'col-actions';
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-icon danger';
  delBtn.title = t('deleteColumn');
  delBtn.innerHTML = '&#x2715;';
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteColumn(col.id); });
  actions.appendChild(delBtn);

  header.appendChild(toggle);
  header.appendChild(titleInput);
  header.appendChild(count);
  header.appendChild(actions);
  el.appendChild(header);

  // Toggle collapse on header click
  header.addEventListener('click', () => toggleCollapse(col.id));

  // Body
  const body = document.createElement('div');
  body.className = 'column-body';
  body.dataset.colId = col.id;

  body.addEventListener('dragover', e => {
    e.preventDefault();
    body.classList.add('drag-over');
  });
  body.addEventListener('dragleave', () => body.classList.remove('drag-over'));
  body.addEventListener('drop', e => {
    e.preventDefault();
    body.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    moveTask(taskId, col.id);
  });

  const visibleTasks = showDone ? col.tasks : col.tasks.filter(t => !t.done);
  visibleTasks.forEach(task => body.appendChild(renderTask(task, col.id)));
  el.appendChild(body);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'column-footer';
  const addTaskBtn = document.createElement('button');
  addTaskBtn.className = 'btn btn-add-task';
  addTaskBtn.innerHTML = `<span>+</span> ${t('addTask')}`;
  addTaskBtn.addEventListener('click', () => showInlineForm(col.id, addTaskBtn));
  footer.appendChild(addTaskBtn);
  el.appendChild(footer);

  return el;
}

function renderTask(task, colId) {
  const card = document.createElement('div');
  card.className = 'task-card';
  if (task.done) card.classList.add('done');
  if (isOverdue(task)) card.classList.add('overdue');
  card.draggable = true;
  card.dataset.taskId = task.id;

  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', task.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));

  let html = `<div class="task-title">${escHtml(task.title)}</div>`;
  if (task.desc) html += `<div class="task-desc">${escHtml(task.desc)}</div>`;

  html += `<div class="task-meta">`;
  html += task.due ? `<span class="task-due">&#128197; ${formatDate(task.due)}</span>` : '<span></span>';
  html += `<div class="task-actions">
    <button class="btn btn-icon btn-toggle" data-id="${task.id}" title="${task.done ? t('notDone') : t('done')}">
      ${task.done ? '&#x21A9;' : '&#x2713;'}
    </button>
    <button class="btn btn-icon btn-edit" data-id="${task.id}" title="${t('edit')}">&#x270E;</button>
    <button class="btn btn-icon danger btn-delete" data-id="${task.id}" title="${t('delete')}">&#x2715;</button>
  </div></div>`;

  card.innerHTML = html;

  card.querySelector('.btn-toggle').addEventListener('click', () => toggleDone(task.id));
  card.querySelector('.btn-edit').addEventListener('click', () => openEditModal(task.id));
  card.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

  return card;
}

// ---- Inline form ----

function showInlineForm(colId, btn) {
  const footer = btn.parentElement;
  footer.innerHTML = '';

  const form = document.createElement('div');
  form.className = 'inline-form';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.placeholder = t('labelTitle');
  titleInput.id = `newTitle_${colId}`;

  const descInput = document.createElement('textarea');
  descInput.placeholder = t('placeholderDesc');
  descInput.id = `newDesc_${colId}`;

  const row = document.createElement('div');
  row.className = 'form-row';

  const dueInput = document.createElement('input');
  dueInput.type = 'text';
  dueInput.id = `newDue_${colId}`;
  dueInput.style.flex = '1';
  dueInput.placeholder = t('placeholderDue');

  const createBtn = document.createElement('button');
  createBtn.className = 'btn btn-primary';
  createBtn.textContent = t('create');
  createBtn.addEventListener('click', () => submitInlineForm(colId));

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = t('cancel');
  cancelBtn.addEventListener('click', () => render());

  row.appendChild(dueInput);
  row.appendChild(createBtn);
  row.appendChild(cancelBtn);

  form.appendChild(titleInput);
  form.appendChild(descInput);
  form.appendChild(row);
  footer.appendChild(form);

  titleInput.focus();
  titleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); submitInlineForm(colId); }
    if (e.key === 'Escape') render();
  });
  descInput.addEventListener('keydown', e => { if (e.key === 'Escape') render(); });

  flatpickr(dueInput, {
    locale: flatpickrLocale,
    enableTime: true,
    time_24hr: true,
    dateFormat: 'Y-m-d H:i',
    altInput: true,
    altFormat: 'd.m.Y H:i',
    allowInput: true,
    position: 'above',
  });
}

async function submitInlineForm(colId) {
  const titleEl = document.getElementById(`newTitle_${colId}`);
  const title = titleEl.value.trim();
  if (!title) { titleEl.focus(); return; }
  const desc = document.getElementById(`newDesc_${colId}`).value.trim();
  const due = document.getElementById(`newDue_${colId}`).value;

  const col = state.columns.find(c => c.id === colId);
  if (!col) return;

  col.tasks.push({ id: genId(), title, desc: desc || '', due: due || '', done: false });
  await render();
}

// ---- Column actions ----

async function toggleCollapse(colId) {
  const col = state.columns.find(c => c.id === colId);
  if (col) col.collapsed = !col.collapsed;
  await render();
}

async function addColumn() {
  state.columns.push({ id: genId(), title: t('newColumn'), tasks: [], collapsed: false });
  await render();
  const inputs = document.querySelectorAll('.col-title');
  const last = inputs[inputs.length - 1];
  if (last) { last.focus(); last.select(); }
}

async function renameColumn(colId, newTitle) {
  const col = state.columns.find(c => c.id === colId);
  if (col) col.title = newTitle.trim() || col.title;
  await saveState();
}

async function deleteColumn(colId) {
  const col = state.columns.find(c => c.id === colId);
  if (!col) return;
  const msg = col.tasks.length
    ? t('confirmDeleteColTasks', { title: col.title, count: col.tasks.length })
    : t('confirmDeleteCol', { title: col.title });
  if (!confirm(msg)) return;
  state.columns = state.columns.filter(c => c.id !== colId);
  await render();
}

// ---- Task actions ----

async function toggleDone(taskId) {
  for (const col of state.columns) {
    const task = col.tasks.find(t => t.id === taskId);
    if (task) { task.done = !task.done; break; }
  }
  await render();
}

async function deleteTask(taskId) {
  let taskTitle = '';
  for (const col of state.columns) {
    const task = col.tasks.find(t => t.id === taskId);
    if (task) { taskTitle = task.title; break; }
  }
  if (!confirm(t('confirmDeleteTask', { title: taskTitle }))) return;
  for (const col of state.columns) {
    const idx = col.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) { col.tasks.splice(idx, 1); break; }
  }
  await render();
}

async function moveTask(taskId, targetColId) {
  let task = null;
  for (const col of state.columns) {
    const idx = col.tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) { task = col.tasks.splice(idx, 1)[0]; break; }
  }
  if (!task) return;
  const targetCol = state.columns.find(c => c.id === targetColId);
  if (targetCol) targetCol.tasks.push(task);
  await render();
}

// ---- Edit Modal ----

let editingTaskId = null;

function openEditModal(taskId) {
  editingTaskId = taskId;
  let task = null;
  for (const col of state.columns) {
    task = col.tasks.find(t => t.id === taskId);
    if (task) break;
  }
  if (!task) return;

  document.getElementById('editTitle').value = task.title;
  document.getElementById('editDesc').value = task.desc;
  document.getElementById('editDue').value = task.due;
  document.getElementById('editDone').checked = task.done;

  const sel = document.getElementById('editColumn');
  sel.innerHTML = '';
  for (const col of state.columns) {
    const opt = document.createElement('option');
    opt.value = col.id;
    opt.textContent = col.title;
    if (col.tasks.some(t => t.id === taskId)) opt.selected = true;
    sel.appendChild(opt);
  }

  document.getElementById('editModal').style.display = 'flex';
  document.getElementById('editTitle').focus();

  flatpickr('#editDue', {
    locale: flatpickrLocale,
    enableTime: true,
    time_24hr: true,
    dateFormat: 'Y-m-d H:i',
    altInput: true,
    altFormat: 'd.m.Y H:i',
    allowInput: true,
    appendTo: document.getElementById('editModal'),
  });
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  editingTaskId = null;
}

async function saveEdit() {
  const title = document.getElementById('editTitle').value.trim();
  if (!title) { document.getElementById('editTitle').focus(); return; }

  const desc = document.getElementById('editDesc').value.trim();
  const due = document.getElementById('editDue').value;
  const done = document.getElementById('editDone').checked;
  const targetColId = document.getElementById('editColumn').value;

  let task = null;
  let sourceCol = null;
  for (const col of state.columns) {
    const found = col.tasks.find(t => t.id === editingTaskId);
    if (found) { task = found; sourceCol = col; break; }
  }
  if (!task) return;

  task.title = title;
  task.desc = desc;
  task.due = due;
  task.done = done;

  if (sourceCol.id !== targetColId) {
    sourceCol.tasks = sourceCol.tasks.filter(t => t.id !== task.id);
    const targetCol = state.columns.find(c => c.id === targetColId);
    if (targetCol) targetCol.tasks.push(task);
  }

  closeEditModal();
  await render();
}

// Event listeners
document.getElementById('btnCancelEdit').addEventListener('click', closeEditModal);
document.getElementById('btnSaveEdit').addEventListener('click', saveEdit);
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEditModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('editModal').style.display === 'flex') closeEditModal();
});

// Show/hide done tasks
document.getElementById('showDone').addEventListener('change', (e) => {
  showDone = e.target.checked;
  render();
});

// Init
(async () => {
  applyStaticTranslations();
  state = await loadState();
  await render();
})();
