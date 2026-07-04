/* ============================================================
   Project Ons Thuis – applicatielogica
   ============================================================ */

/* ---------------- Opslag ---------------- */

let state = loadState();
let currentTab = 'dashboard';

// Filters voor het planning-tabblad
const planFilter = { fase: '', ruimte: '', status: '', prioriteit: '', wie: '', zoek: '', alleenUitvoerbaar: false };
let materiaalFilter = '';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === DATA_VERSION && Array.isArray(data.tasks)) return data;
    }
  } catch (e) { /* beschadigde opslag → opnieuw beginnen met seed */ }
  return seedData();
}

/* ---- Synchronisatie ----
   Drie manieren van opslaan, in deze volgorde geprobeerd:
   1. 'server': de eigen mini-server (server.js) met data/ons-thuis-data.json
   2. 'github': een bestand in je GitHub-repository (werkt ook via
      GitHub Pages en buitenshuis; instellen via de 🔄 Sync-knop)
   3. 'local': alleen localStorage op dit apparaat (file:// zonder config)
   Overal geldt: hoogste versieteller (rev) wint. */

const API = 'api/data';
const GH_KEY = 'onsThuisGitHub';
const GH_PATH = 'planner-data.json';
let backend = 'local';
let ghConfig = loadGhConfig();
let ghSha = null; // laatst bekende versie-hash van het bestand op GitHub
let pushTimer = null;
let syncTimer = null;

function loadGhConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(GH_KEY));
    if (c && c.token && c.owner && c.repo) return c;
  } catch (e) { /* ongeldige config negeren */ }
  return null;
}

function save() {
  state.rev = (state.rev || 0) + 1;
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (backend !== 'local') {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToBackend, 400); // wijzigingen bundelen
  }
}

function pushToBackend() {
  if (backend === 'server') return pushToServer();
  if (backend === 'github') return pushToGitHub();
}

function adoptRemote(remote) {
  state = remote;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

// Bezig met typen of staat een popup open? Dan even geen verse data van
// buiten toepassen, anders verlies je je invoer door de her-render.
function isEditing() {
  const ae = document.activeElement;
  return (ae && content.contains(ae) && ['INPUT', 'SELECT', 'TEXTAREA'].includes(ae.tagName))
    || !document.getElementById('modal-overlay').hidden;
}

async function pushToServer() {
  try {
    const res = await fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    setSyncStatus(res.ok);
  } catch (e) {
    setSyncStatus(false);
  }
}

/* -- GitHub als database (Contents API) -- */

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

function ghApi() {
  return 'https://api.github.com/repos/' + ghConfig.owner + '/' + ghConfig.repo;
}

function ghBranch() {
  return ghConfig.branch || 'planner-data';
}

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + ghConfig.token,
    'Accept': 'application/vnd.github+json',
  };
}

// De databranch staat los van main, zodat de gegevens niet op de
// (openbare) Pages-site terechtkomen. Bestaat hij nog niet, maak hem
// dan aan vanaf de standaardbranch.
async function ghEnsureBranch() {
  const check = await fetch(ghApi() + '/git/ref/heads/' + encodeURIComponent(ghBranch()), { headers: ghHeaders(), cache: 'no-store' });
  if (check.ok) return;
  const repoRes = await fetch(ghApi(), { headers: ghHeaders() });
  if (!repoRes.ok) throw new Error('Repository niet gevonden of token ongeldig (' + repoRes.status + ')');
  const repo = await repoRes.json();
  const base = await fetch(ghApi() + '/git/ref/heads/' + encodeURIComponent(repo.default_branch), { headers: ghHeaders() });
  if (!base.ok) throw new Error('Standaardbranch niet gevonden (' + base.status + ')');
  const sha = (await base.json()).object.sha;
  const created = await fetch(ghApi() + '/git/refs', {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({ ref: 'refs/heads/' + ghBranch(), sha }),
  });
  if (!created.ok && created.status !== 422) { // 422 = bestond al (race)
    throw new Error('Kon de databranch niet aanmaken (' + created.status + ')');
  }
}

async function ghLoad() {
  const res = await fetch(
    ghApi() + '/contents/' + GH_PATH + '?ref=' + encodeURIComponent(ghBranch()) + '&_=' + Date.now(),
    { headers: ghHeaders(), cache: 'no-store' }
  );
  if (res.status === 404) { ghSha = null; return null; } // nog geen data
  if (!res.ok) throw new Error('GitHub antwoordde met ' + res.status);
  const j = await res.json();
  ghSha = j.sha;
  return JSON.parse(b64decode(j.content));
}

async function pushToGitHub(tweedePoging) {
  try {
    const body = {
      message: 'Ons Thuis: planning bijgewerkt (rev ' + (state.rev || 0) + ')',
      content: b64encode(JSON.stringify(state)),
      branch: ghBranch(),
    };
    if (ghSha) body.sha = ghSha;
    const res = await fetch(ghApi() + '/contents/' + GH_PATH, {
      method: 'PUT',
      headers: ghHeaders(),
      body: JSON.stringify(body),
    });
    if (res.ok) {
      ghSha = (await res.json()).content.sha;
      setSyncStatus(true);
      return;
    }
    if ([404, 409, 422].includes(res.status) && !tweedePoging) {
      // Branch ontbreekt nog, of een ander apparaat was ons net voor:
      // branch garanderen, verse versie ophalen en opnieuw beslissen.
      await ghEnsureBranch();
      const remote = await ghLoad();
      if (remote && Array.isArray(remote.tasks) && (remote.rev || 0) > (state.rev || 0)) {
        if (!isEditing()) adoptRemote(remote);
        setSyncStatus(true);
        return;
      }
      return pushToGitHub(true);
    }
    throw new Error('GitHub antwoordde met ' + res.status);
  } catch (e) {
    setSyncStatus(false);
  }
}

/* -- Gezamenlijke sync-cyclus -- */

async function syncTick() {
  if (backend === 'local') return;
  try {
    let remote;
    if (backend === 'server') {
      const res = await fetch(API, { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      remote = await res.json();
    } else {
      remote = await ghLoad();
    }
    setSyncStatus(true);

    const remoteRev = remote && Array.isArray(remote.tasks) ? (remote.rev || 0) : -1;
    const localRev = state.rev || 0;

    if (remoteRev > localRev) {
      // Ander apparaat heeft nieuwere gegevens → overnemen
      if (!isEditing()) adoptRemote(remote);
    } else if (localRev > remoteRev) {
      // Wij lopen voor (eerste start, of wijzigingen tijdens een
      // verbroken verbinding) → versturen
      pushToBackend();
    }
  } catch (e) {
    setSyncStatus(false);
  }
}

function startSyncLoop() {
  clearInterval(syncTimer);
  if (backend === 'local') { setSyncStatus(false); return; }
  syncTick();
  syncTimer = setInterval(syncTick, backend === 'server' ? 5000 : 15000);
}

async function initSync() {
  if (location.protocol !== 'file:') {
    try {
      const res = await fetch(API, { cache: 'no-store' });
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        backend = 'server';
      }
    } catch (e) { /* geen eigen server, prima */ }
  }
  if (backend === 'local' && ghConfig) backend = 'github';
  startSyncLoop();
}

function setSyncStatus(online) {
  const el = document.getElementById('sync-status');
  if (backend === 'local') { el.hidden = true; return; }
  const via = backend === 'github' ? 'GitHub' : 'thuisserver';
  el.hidden = false;
  el.className = 'sync-badge ' + (online ? 'online' : 'offline');
  el.textContent = online ? '● gesynchroniseerd via ' + via : '● offline – lokaal opgeslagen';
  el.title = online
    ? 'Verbonden via ' + via + '. Wijzigingen zijn op alle apparaten zichtbaar.'
    : 'Geen verbinding. Wijzigingen worden lokaal bewaard en gesynchroniseerd zodra er weer verbinding is.';
}

function uid(prefix) {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------------- Hulpfuncties ---------------- */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function taskById(id) {
  return state.tasks.find(t => t.id === id);
}

function taskLabel(t) {
  return t.ruimte + ' · ' + t.taak;
}

// Een taak is geblokkeerd zolang niet al haar afhankelijkheden gereed zijn
function blockingDeps(t) {
  return (t.deps || [])
    .map(taskById)
    .filter(d => d && d.status !== 'Gereed');
}

function isBlocked(t) {
  return blockingDeps(t).length > 0;
}

// Uitvoerbaar = nog niet gereed én niets blokkeert
function isActionable(t) {
  return t.status !== 'Gereed' && !isBlocked(t);
}

function taskPct(t) {
  if (t.status === 'Gereed') return 100;
  return Math.max(0, Math.min(100, Number(t.pct) || 0));
}

function avgPct(tasks) {
  if (!tasks.length) return 0;
  return Math.round(tasks.reduce((s, t) => s + taskPct(t), 0) / tasks.length);
}

const PRIO_ORDER = { 'Hoog': 0, 'Normaal': 1, 'Laag': 2 };

function statusClass(status) {
  switch (status) {
    case 'Bezig': return 's-bezig';
    case 'Gereed': return 's-gereed';
    case 'Wacht op andere taak': return 's-wacht';
    default: return 's-nietgestart';
  }
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

function euro(n) {
  return '€ ' + (Number(n) || 0).toLocaleString('nl-NL');
}

/* ---------------- Renderen ---------------- */

const content = document.getElementById('content');

function render() {
  switch (currentTab) {
    case 'dashboard': renderDashboard(); break;
    case 'planning': renderPlanning(); break;
    case 'mijlpalen': renderMijlpalen(); break;
    case 'beslissingen': renderBeslissingen(); break;
    case 'materialen': renderMaterialen(); break;
    case 'budget': renderBudget(); break;
    case 'nietvergeten': renderChecklists(); break;
  }
}

/* ---------------- 1. Dashboard ---------------- */

function renderDashboard() {
  const all = state.tasks;
  const totaal = avgPct(all);
  const bg = avgPct(all.filter(t => BEGANE_GROND.includes(t.ruimte)));
  const ev = avgPct(all.filter(t => EERSTE_VERDIEPING.includes(t.ruimte)));
  const open = all.filter(t => t.status !== 'Gereed');

  // Volgende werkzaamheden: uitvoerbare taken in bouwvolgorde, op prioriteit
  const volgende = open
    .filter(isActionable)
    .sort((a, b) => a.fase.localeCompare(b.fase) || PRIO_ORDER[a.prioriteit] - PRIO_ORDER[b.prioriteit])
    .slice(0, 8);

  // Taken voor deze week: bezig, of start/einddatum valt in deze week
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // maandag = 0
  const weekStart = new Date(now); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(now.getDate() - day);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
  const inWeek = iso => {
    if (!iso) return false;
    const d = new Date(iso + 'T00:00:00');
    return d >= weekStart && d < weekEnd;
  };
  const dezeWeek = open.filter(t => t.status === 'Bezig' || inWeek(t.start) || inWeek(t.eind));

  const volgendeMijlpaal = state.milestones.find(m => !m.gereed);
  const openBeslissingen = state.decisions.filter(d => d.status !== 'Beslist');

  content.innerHTML = `
    <div class="grid grid-stats" style="margin-bottom:16px">
      <div class="card">
        <h2>Totale voortgang</h2>
        <div class="big">${totaal}%</div>
        <div class="progressbar accent"><div style="width:${totaal}%"></div></div>
      </div>
      <div class="card">
        <h2>Begane grond</h2>
        <div class="big">${bg}%</div>
        <div class="progressbar"><div style="width:${bg}%"></div></div>
      </div>
      <div class="card">
        <h2>Eerste verdieping</h2>
        <div class="big">${ev}%</div>
        <div class="progressbar"><div style="width:${ev}%"></div></div>
      </div>
      <div class="card">
        <h2>Open taken</h2>
        <div class="big">${open.length}</div>
        <div style="color:var(--text-muted);font-size:13px">${openBeslissingen.length} open beslissing${openBeslissingen.length === 1 ? '' : 'en'}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h2>Volgende mijlpaal</h2>
      ${volgendeMijlpaal
        ? `<div class="milestone-next">🚩 ${esc(volgendeMijlpaal.naam)}</div>`
        : `<div class="milestone-next" style="color:var(--green)">🎉 Alle mijlpalen behaald – Project Ons Thuis is afgerond!</div>`}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Nu oppakken <span style="text-transform:none;font-weight:400">(alles waar niets meer op wacht)</span></h2>
        ${volgende.length ? `<ul class="mini-list">${volgende.map(t => `
          <li>
            <span class="where">${esc(t.ruimte)}</span>
            <span>${esc(t.taak)}</span>
            <span class="spacer"></span>
            <span class="badge p-${t.prioriteit.toLowerCase()}">${t.prioriteit}</span>
            <span class="badge ${statusClass(t.status)}">${esc(t.status)}</span>
          </li>`).join('')}</ul>`
        : `<div class="empty-note">Geen uitvoerbare taken – alles is gereed of wacht op een andere taak.</div>`}
      </div>
      <div class="card">
        <h2>Taken voor deze week</h2>
        ${dezeWeek.length ? `<ul class="mini-list">${dezeWeek.map(t => `
          <li>
            <span class="where">${esc(t.ruimte)}</span>
            <span>${esc(t.taak)}</span>
            <span class="spacer"></span>
            ${t.eind ? `<span style="color:var(--text-muted);font-size:13px">t/m ${fmtDate(t.eind)}</span>` : ''}
            <span class="badge ${statusClass(t.status)}">${esc(t.status)}</span>
          </li>`).join('')}</ul>`
        : `<div class="empty-note">Geen taken gepland voor deze week. Plan taken in via het tabblad Planning (start-/einddatum) of zet een taak op “Bezig”.</div>`}
      </div>
    </div>`;
}

/* ---------------- 2. Planning ---------------- */

function renderPlanning() {
  const wies = [...new Set(state.tasks.map(t => t.wie).filter(Boolean))].sort();

  let tasks = state.tasks.filter(t =>
    (!planFilter.fase || t.fase === planFilter.fase) &&
    (!planFilter.ruimte || t.ruimte === planFilter.ruimte) &&
    (!planFilter.status || t.status === planFilter.status) &&
    (!planFilter.prioriteit || t.prioriteit === planFilter.prioriteit) &&
    (!planFilter.wie || t.wie === planFilter.wie) &&
    (!planFilter.alleenUitvoerbaar || isActionable(t)) &&
    (!planFilter.zoek || (t.taak + ' ' + t.ruimte + ' ' + t.opmerking + ' ' + t.materiaal).toLowerCase().includes(planFilter.zoek.toLowerCase()))
  );

  // Groepeer per fase, in bouwvolgorde
  const rows = [];
  let lastFase = null;
  for (const t of tasks) {
    if (t.fase !== lastFase) {
      rows.push(`<tr class="fase-header"><td colspan="13">
        <div class="fase-header-flex">
          <span>${esc(FASEN[t.fase] || 'Fase ' + t.fase)}</span>
          <button class="btn-fase-add" data-fase="${t.fase}" title="Taak toevoegen aan deze fase">＋ taak</button>
        </div></td></tr>`);
      lastFase = t.fase;
    }
    rows.push(taskRow(t));
  }

  content.innerHTML = `
    <div class="filterbar">
      <select data-filter="fase">
        <option value="">Alle fasen</option>
        ${Object.entries(FASEN).map(([k, v]) => `<option value="${k}" ${planFilter.fase === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <select data-filter="ruimte">
        <option value="">Alle ruimtes</option>
        ${RUIMTES.map(r => `<option ${planFilter.ruimte === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <select data-filter="status">
        <option value="">Alle statussen</option>
        ${STATUSSEN.map(s => `<option ${planFilter.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <select data-filter="prioriteit">
        <option value="">Alle prioriteiten</option>
        ${PRIORITEITEN.map(p => `<option ${planFilter.prioriteit === p ? 'selected' : ''}>${p}</option>`).join('')}
      </select>
      <select data-filter="wie">
        <option value="">Iedereen</option>
        ${wies.map(w => `<option ${planFilter.wie === w ? 'selected' : ''}>${esc(w)}</option>`).join('')}
      </select>
      <label class="toggle"><input type="checkbox" id="filter-uitvoerbaar" ${planFilter.alleenUitvoerbaar ? 'checked' : ''}> alleen uitvoerbaar</label>
      <span class="spacer"></span>
      <input type="search" id="filter-zoek" placeholder="Zoeken…" value="${esc(planFilter.zoek)}">
    </div>

    <div class="table-wrap">
      <table>
        <thead><tr>
          <th></th><th>Prio</th><th>Ruimte</th><th>Taak</th><th>Wie</th>
          <th>Start</th><th>Eind</th><th>Afhankelijk van</th><th>Status</th>
          <th>% gereed</th><th>Materiaal</th><th>Opmerking</th><th></th>
        </tr></thead>
        <tbody>${rows.join('') || '<tr><td colspan="13" class="empty-note" style="padding:16px">Geen taken gevonden met deze filters.</td></tr>'}</tbody>
      </table>
    </div>
    <div class="table-footer">
      <button class="btn btn-primary" id="btn-add-task">＋ Taak toevoegen</button>
    </div>`;

  bindPlanning();
}

function taskRow(t) {
  const blocked = isBlocked(t);
  const deps = (t.deps || []).map(taskById).filter(Boolean);
  const depText = deps.length
    ? deps.map(d => `${d.status === 'Gereed' ? '✅' : '⏳'} ${esc(d.taak)}`).join('<br>')
    : '<span class="none">— klik om te kiezen</span>';

  return `
    <tr data-id="${t.id}" class="${t.status === 'Gereed' ? 'done' : ''} ${blocked && t.status !== 'Gereed' ? 'blocked-row' : ''}">
      <td>${t.status === 'Gereed' ? '' : blocked
        ? `<span class="badge blocked" title="Wacht op: ${esc(blockingDeps(t).map(d => d.taak).join(', '))}">⛔</span>`
        : `<span class="badge ready" title="Alle voorgaande taken zijn gereed – kan opgepakt worden">▶</span>`}</td>
      <td>
        <select data-field="prioriteit">
          ${PRIORITEITEN.map(p => `<option ${t.prioriteit === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </td>
      <td>
        <select data-field="ruimte">
          ${RUIMTES.map(r => `<option ${t.ruimte === r ? 'selected' : ''}>${r}</option>`).join('')}
        </select>
      </td>
      <td style="min-width:190px"><input data-field="taak" value="${esc(t.taak)}"></td>
      <td style="min-width:90px"><input data-field="wie" value="${esc(t.wie)}"></td>
      <td><input type="date" data-field="start" value="${esc(t.start)}"></td>
      <td><input type="date" data-field="eind" value="${esc(t.eind)}"></td>
      <td class="deps-cell" data-action="deps">${depText}</td>
      <td>
        <select data-field="status">
          ${STATUSSEN.map(s => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td class="num"><input type="number" data-field="pct" min="0" max="100" step="5" value="${taskPct(t)}"></td>
      <td style="min-width:110px"><input data-field="materiaal" value="${esc(t.materiaal)}"></td>
      <td style="min-width:170px"><input data-field="opmerking" value="${esc(t.opmerking)}"></td>
      <td><button class="btn-icon" data-action="delete" title="Taak verwijderen">🗑</button></td>
    </tr>`;
}

// Nieuwe taak onderaan de gekozen fase invoegen (blijft zo netjes gegroepeerd)
function addTaskToFase(fase) {
  const nieuw = T(uid('t'), fase, planFilter.ruimte || 'Algemeen', 'Nieuwe taak', 'Normaal', []);
  const laatste = state.tasks.map(t => t.fase).lastIndexOf(fase);
  if (laatste === -1) state.tasks.push(nieuw);
  else state.tasks.splice(laatste + 1, 0, nieuw);
  save();
  renderPlanning();
  const veld = content.querySelector(`tr[data-id="${nieuw.id}"] input[data-field="taak"]`);
  if (veld) { veld.focus(); veld.select(); }
}

function bindPlanning() {
  // Filters
  content.querySelectorAll('[data-filter]').forEach(el => {
    el.addEventListener('change', () => {
      planFilter[el.dataset.filter] = el.value;
      renderPlanning();
    });
  });
  document.getElementById('filter-uitvoerbaar').addEventListener('change', e => {
    planFilter.alleenUitvoerbaar = e.target.checked;
    renderPlanning();
  });
  const zoek = document.getElementById('filter-zoek');
  zoek.addEventListener('input', () => {
    planFilter.zoek = zoek.value;
    // her-render met behoud van focus in het zoekveld
    const pos = zoek.selectionStart;
    renderPlanning();
    const z2 = document.getElementById('filter-zoek');
    z2.focus();
    z2.setSelectionRange(pos, pos);
  });

  document.getElementById('btn-add-task').addEventListener('click', () => {
    addTaskToFase(planFilter.fase || '0');
  });

  // Per fase een taak toevoegen via de knop in de fasekop
  content.querySelectorAll('.btn-fase-add').forEach(btn => {
    btn.addEventListener('click', () => addTaskToFase(btn.dataset.fase));
  });

  // Celwijzigingen
  content.querySelectorAll('tbody tr[data-id]').forEach(tr => {
    const t = taskById(tr.dataset.id);
    if (!t) return;

    tr.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('change', () => {
        const f = el.dataset.field;
        if (f === 'pct') {
          t.pct = Math.max(0, Math.min(100, Number(el.value) || 0));
          if (t.pct === 100) t.status = 'Gereed';
          else if (t.status === 'Gereed') t.status = t.pct > 0 ? 'Bezig' : 'Niet gestart';
        } else {
          t[f] = el.value;
          if (f === 'status') {
            if (t.status === 'Gereed') t.pct = 100;
            else if (t.pct === 100) t.pct = 0;
          }
        }
        save();
        // structuurvelden beïnvloeden badges/blokkades elders in de tabel
        if (['status', 'pct', 'fase', 'ruimte', 'prioriteit'].includes(f)) renderPlanning();
      });
    });

    tr.querySelector('[data-action="deps"]').addEventListener('click', () => openDepsModal(t));
    tr.querySelector('[data-action="delete"]').addEventListener('click', () => {
      if (!confirm(`Taak "${t.taak}" verwijderen?`)) return;
      state.tasks = state.tasks.filter(x => x.id !== t.id);
      state.tasks.forEach(x => { x.deps = (x.deps || []).filter(d => d !== t.id); });
      save();
      renderPlanning();
    });
  });
}

/* ---- Popup: afhankelijkheden kiezen ---- */

const overlay = document.getElementById('modal-overlay');
let depsTarget = null;

function openDepsModal(task) {
  depsTarget = task;
  document.getElementById('modal-title').textContent = `"${task.taak}" is afhankelijk van:`;
  const body = document.getElementById('modal-body');

  let html = '';
  let lastFase = null;
  for (const t of state.tasks) {
    if (t.id === task.id) continue;
    if (t.fase !== lastFase) {
      html += `<div class="dep-fase">${esc(FASEN[t.fase] || 'Fase ' + t.fase)}</div>`;
      lastFase = t.fase;
    }
    const checked = (task.deps || []).includes(t.id) ? 'checked' : '';
    html += `<label><input type="checkbox" value="${t.id}" ${checked}> ${t.status === 'Gereed' ? '✅' : ''} ${esc(taskLabel(t))}</label>`;
  }
  body.innerHTML = html;
  overlay.hidden = false;
}

document.getElementById('modal-cancel').addEventListener('click', () => { overlay.hidden = true; });
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.hidden = true; });
document.getElementById('modal-save').addEventListener('click', () => {
  if (depsTarget) {
    depsTarget.deps = [...document.querySelectorAll('#modal-body input:checked')].map(el => el.value);
    save();
  }
  overlay.hidden = true;
  renderPlanning();
});

/* ---------------- 3. Mijlpalen ---------------- */

function renderMijlpalen() {
  const done = state.milestones.filter(m => m.gereed).length;
  const pct = state.milestones.length ? Math.round(done / state.milestones.length * 100) : 0;

  content.innerHTML = `
    <div class="card" style="max-width:760px;margin:0 auto">
      <h2>Mijlpalen · ${done} van ${state.milestones.length} behaald</h2>
      <div class="progressbar accent" style="margin-bottom:14px"><div style="width:${pct}%"></div></div>
      <ol class="milestone-list">
        ${state.milestones.map(m => `
          <li class="${m.gereed ? 'done' : ''}" data-id="${m.id}">
            <span class="ms-name">${esc(m.naam)}</span>
            <input type="date" data-field="datum" value="${esc(m.datum)}" title="Behaald op / gepland op">
            <input type="checkbox" data-field="gereed" ${m.gereed ? 'checked' : ''} title="Behaald">
          </li>`).join('')}
      </ol>
    </div>`;

  content.querySelectorAll('.milestone-list li').forEach(li => {
    const m = state.milestones.find(x => x.id === li.dataset.id);
    li.querySelector('[data-field="gereed"]').addEventListener('change', e => {
      m.gereed = e.target.checked;
      if (m.gereed && !m.datum) m.datum = new Date().toISOString().slice(0, 10);
      save();
      renderMijlpalen();
    });
    li.querySelector('[data-field="datum"]').addEventListener('change', e => {
      m.datum = e.target.value;
      save();
    });
  });
}

/* ---------------- 4. Beslissingen ---------------- */

function renderBeslissingen() {
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...state.decisions].sort((a, b) => {
    if ((a.status === 'Beslist') !== (b.status === 'Beslist')) return a.status === 'Beslist' ? 1 : -1;
    return (a.deadline || '9999') < (b.deadline || '9999') ? -1 : 1;
  });

  content.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Onderdeel</th><th>Beslissing</th><th>Uiterlijk beslissen</th><th>Status</th><th>Opmerking</th><th></th>
        </tr></thead>
        <tbody>
          ${sorted.map(d => {
            const teLaat = d.status !== 'Beslist' && d.deadline && d.deadline < today;
            return `
            <tr data-id="${d.id}" class="${d.status === 'Beslist' ? 'done' : ''}">
              <td style="min-width:110px"><input data-field="onderdeel" value="${esc(d.onderdeel)}"></td>
              <td style="min-width:200px"><input data-field="beslissing" value="${esc(d.beslissing)}"></td>
              <td>
                <input type="date" data-field="deadline" value="${esc(d.deadline)}">
                ${teLaat ? '<span class="badge blocked" title="Deadline verstreken!">⚠ te laat</span>' : ''}
              </td>
              <td>
                <select data-field="status">
                  <option ${d.status === 'Open' ? 'selected' : ''}>Open</option>
                  <option ${d.status === 'Beslist' ? 'selected' : ''}>Beslist</option>
                </select>
              </td>
              <td style="min-width:200px"><input data-field="opmerking" value="${esc(d.opmerking)}"></td>
              <td><button class="btn-icon" data-action="delete" title="Verwijderen">🗑</button></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <button class="btn btn-primary" id="btn-add-decision">＋ Beslissing toevoegen</button>
    </div>`;

  bindSimpleTable(state.decisions, 'decisions', renderBeslissingen, ['status', 'deadline']);
  document.getElementById('btn-add-decision').addEventListener('click', () => {
    state.decisions.push({ id: uid('b'), onderdeel: '', beslissing: 'Nieuwe beslissing', deadline: '', status: 'Open', opmerking: '' });
    save();
    renderBeslissingen();
  });
}

/* ---------------- 5. Materialen ---------------- */

function renderMaterialen() {
  const ruimtes = [...new Set(state.materials.map(m => m.ruimte))];
  const list = state.materials.filter(m => !materiaalFilter || m.ruimte === materiaalFilter);

  content.innerHTML = `
    <div class="filterbar">
      <select id="mat-filter">
        <option value="">Alle ruimtes</option>
        ${RUIMTES.map(r => `<option ${materiaalFilter === r ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <span style="color:var(--text-muted);font-size:13px">${list.filter(m => m.verwerkt).length} van ${list.length} verwerkt</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Ruimte</th><th>Materiaal</th><th>Aantal</th>
          <th>Besteld</th><th>Binnen</th><th>Verwerkt</th><th>Opmerking</th><th></th>
        </tr></thead>
        <tbody>
          ${list.map(m => `
            <tr data-id="${m.id}" class="${m.verwerkt ? 'done' : ''}">
              <td>
                <select data-field="ruimte">
                  ${RUIMTES.map(r => `<option ${m.ruimte === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </td>
              <td style="min-width:190px"><input data-field="materiaal" value="${esc(m.materiaal)}"></td>
              <td><input data-field="aantal" value="${esc(m.aantal)}" style="max-width:90px"></td>
              <td><input type="checkbox" data-field="besteld" ${m.besteld ? 'checked' : ''}></td>
              <td><input type="checkbox" data-field="binnen" ${m.binnen ? 'checked' : ''}></td>
              <td><input type="checkbox" data-field="verwerkt" ${m.verwerkt ? 'checked' : ''}></td>
              <td style="min-width:190px"><input data-field="opmerking" value="${esc(m.opmerking)}"></td>
              <td><button class="btn-icon" data-action="delete" title="Verwijderen">🗑</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="table-footer">
      <button class="btn btn-primary" id="btn-add-material">＋ Materiaal toevoegen</button>
    </div>`;

  document.getElementById('mat-filter').addEventListener('change', e => {
    materiaalFilter = e.target.value;
    renderMaterialen();
  });
  bindSimpleTable(state.materials, 'materials', renderMaterialen, ['besteld', 'binnen', 'verwerkt']);
  document.getElementById('btn-add-material').addEventListener('click', () => {
    state.materials.push({ id: uid('mt'), ruimte: materiaalFilter || 'Algemeen', materiaal: 'Nieuw materiaal', aantal: '', besteld: false, binnen: false, verwerkt: false, opmerking: '' });
    save();
    renderMaterialen();
  });
}

/* ---------------- 6. Budget ---------------- */

function renderBudget() {
  const totB = state.budget.reduce((s, b) => s + (Number(b.begroot) || 0), 0);
  const totW = state.budget.reduce((s, b) => s + (Number(b.werkelijk) || 0), 0);
  const totV = totB - totW;

  content.innerHTML = `
    <div class="table-wrap" style="max-width:760px;margin:0 auto">
      <table>
        <thead><tr>
          <th>Onderdeel</th><th class="num">Begroot</th><th class="num">Werkelijk</th><th class="num">Verschil</th><th></th>
        </tr></thead>
        <tbody>
          ${state.budget.map(b => {
            const v = (Number(b.begroot) || 0) - (Number(b.werkelijk) || 0);
            return `
            <tr data-id="${b.id}">
              <td style="min-width:170px"><input data-field="onderdeel" value="${esc(b.onderdeel)}"></td>
              <td class="num"><input type="number" data-field="begroot" min="0" step="50" value="${Number(b.begroot) || 0}"></td>
              <td class="num"><input type="number" data-field="werkelijk" min="0" step="50" value="${Number(b.werkelijk) || 0}"></td>
              <td class="num ${v < 0 ? 'neg' : 'pos'}">${euro(v)}</td>
              <td><button class="btn-icon" data-action="delete" title="Verwijderen">🗑</button></td>
            </tr>`;
          }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Totaal</td>
            <td class="num">${euro(totB)}</td>
            <td class="num">${euro(totW)}</td>
            <td class="num ${totV < 0 ? 'neg' : 'pos'}">${euro(totV)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="table-footer" style="max-width:760px;margin:12px auto 0">
      <button class="btn btn-primary" id="btn-add-budget">＋ Onderdeel toevoegen</button>
    </div>`;

  bindSimpleTable(state.budget, 'budget', renderBudget, ['begroot', 'werkelijk']);
  document.getElementById('btn-add-budget').addEventListener('click', () => {
    state.budget.push({ id: uid('bu'), onderdeel: 'Nieuw onderdeel', begroot: 0, werkelijk: 0 });
    save();
    renderBudget();
  });
}

/* ---------------- 7. Niet vergeten ---------------- */

function renderChecklists() {
  content.innerHTML = `
    <div class="grid grid-2">
      ${state.checklists.map(c => {
        const done = c.items.filter(i => i.af).length;
        const allDone = done === c.items.length && c.items.length > 0;
        return `
        <div class="card checklist-card" data-id="${c.id}">
          <h2>${esc(c.titel)}
            <span class="checklist-count ${allDone ? 'all-done' : ''}">${allDone ? '✓ compleet' : done + ' / ' + c.items.length}</span>
          </h2>
          <ul>
            ${c.items.map(i => `
              <li class="${i.af ? 'done' : ''}" data-item="${i.id}">
                <input type="checkbox" ${i.af ? 'checked' : ''}>
                <span>${esc(i.tekst)}</span>
                <button class="btn-icon" data-action="del-item" title="Verwijderen">🗑</button>
              </li>`).join('')}
          </ul>
          <div style="margin-top:10px">
            <button class="btn btn-ghost" data-action="add-item">＋ Punt toevoegen</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  content.querySelectorAll('.checklist-card').forEach(card => {
    const c = state.checklists.find(x => x.id === card.dataset.id);
    card.querySelectorAll('li').forEach(li => {
      const item = c.items.find(x => x.id === li.dataset.item);
      li.querySelector('input').addEventListener('change', e => {
        item.af = e.target.checked;
        save();
        renderChecklists();
      });
      li.querySelector('[data-action="del-item"]').addEventListener('click', () => {
        c.items = c.items.filter(x => x.id !== item.id);
        save();
        renderChecklists();
      });
    });
    card.querySelector('[data-action="add-item"]').addEventListener('click', () => {
      const tekst = prompt('Nieuw controlepunt:');
      if (!tekst) return;
      c.items.push({ id: uid('c'), tekst, af: false });
      save();
      renderChecklists();
    });
  });
}

/* ---------------- Gedeelde tabel-logica ---------------- */

// Koppelt input/select/checkbox-wijzigingen en verwijderknoppen in eenvoudige
// tabellen (beslissingen, materialen, budget). rerenderFields: velden waarbij
// de hele tabel opnieuw getekend wordt (voor afgeleide waarden/sortering).
function bindSimpleTable(collection, key, rerender, rerenderFields) {
  content.querySelectorAll('tbody tr[data-id]').forEach(tr => {
    const row = collection.find(x => x.id === tr.dataset.id);
    if (!row) return;

    tr.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('change', () => {
        const f = el.dataset.field;
        row[f] = el.type === 'checkbox' ? el.checked
               : el.type === 'number' ? (Number(el.value) || 0)
               : el.value;
        save();
        if (rerenderFields.includes(f) || el.type === 'checkbox') rerender();
      });
    });

    const del = tr.querySelector('[data-action="delete"]');
    if (del) del.addEventListener('click', () => {
      if (!confirm('Regel verwijderen?')) return;
      state[key] = state[key].filter(x => x.id !== row.id);
      save();
      rerender();
    });
  });
}

/* ---------------- Tabs, export/import/reset ---------------- */

document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  currentTab = btn.dataset.tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === btn));
  render();
});

document.getElementById('btn-export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ons-thuis-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.tasks)) throw new Error('geen geldige backup');
      if (!confirm('Backup terugzetten? De huidige gegevens worden overschreven.')) return;
      // Versieteller doorzetten, anders draait de synchronisatie de import terug
      data.rev = Math.max(data.rev || 0, state.rev || 0);
      state = data;
      save();
      render();
    } catch (err) {
      alert('Dit bestand is geen geldige Ons Thuis-backup.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ---- GitHub-sync instellingen ---- */

const ghModal = document.getElementById('gh-modal');
const ghResult = document.getElementById('gh-test-result');

document.getElementById('btn-sync-settings').addEventListener('click', () => {
  // Velden vooraf invullen: bestaande config, of raden vanaf het Pages-adres
  const gissing = location.hostname.match(/^([^.]+)\.github\.io$/);
  document.getElementById('gh-token').value = ghConfig ? ghConfig.token : '';
  document.getElementById('gh-owner').value = ghConfig ? ghConfig.owner : (gissing ? gissing[1] : '');
  document.getElementById('gh-repo').value = ghConfig ? ghConfig.repo : (gissing ? (location.pathname.split('/')[1] || '') : '');
  document.getElementById('gh-branch').value = ghConfig ? ghBranch() : 'planner-data';
  ghResult.textContent = '';
  ghResult.className = '';
  ghModal.hidden = false;
});

document.getElementById('gh-cancel').addEventListener('click', () => { ghModal.hidden = true; });
ghModal.addEventListener('click', e => { if (e.target === ghModal) ghModal.hidden = true; });

document.getElementById('gh-disconnect').addEventListener('click', () => {
  localStorage.removeItem(GH_KEY);
  ghConfig = null;
  if (backend === 'github') {
    backend = 'local';
    startSyncLoop();
  }
  ghModal.hidden = true;
});

document.getElementById('gh-save').addEventListener('click', async () => {
  const cfg = {
    token: document.getElementById('gh-token').value.trim(),
    owner: document.getElementById('gh-owner').value.trim(),
    repo: document.getElementById('gh-repo').value.trim(),
    branch: document.getElementById('gh-branch').value.trim() || 'planner-data',
  };
  if (!cfg.token || !cfg.owner || !cfg.repo) {
    ghResult.textContent = 'Vul token, eigenaar en repository in.';
    ghResult.className = 'err';
    return;
  }
  ghResult.textContent = 'Verbinding testen…';
  ghResult.className = '';
  const vorige = ghConfig;
  ghConfig = cfg;
  try {
    await ghEnsureBranch();
    await ghLoad(); // test + haalt meteen de sha op
    localStorage.setItem(GH_KEY, JSON.stringify(cfg));
    if (backend !== 'server') backend = 'github';
    startSyncLoop();
    ghModal.hidden = true;
  } catch (e) {
    ghConfig = vorige;
    ghResult.textContent = 'Verbinden mislukt: ' + e.message + '. Controleer het token (Contents: Read & write) en de repositorynaam.';
    ghResult.className = 'err';
  }
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (!confirm('Alles terugzetten naar de standaardplanning? Al je wijzigingen gaan verloren.\n\nTip: maak eerst een export als backup.')) return;
  const rev = state.rev || 0; // teller doorzetten, anders draait de sync de reset terug
  state = seedData();
  state.rev = rev;
  save();
  render();
});

/* ---------------- Start ---------------- */
render();
initSync();
