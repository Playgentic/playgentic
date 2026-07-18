/* playgentic playground — the four deterministic test-target widgets.
   No backend, no randomness: every interaction is stable so automation
   against these data-testid selectors never flakes. */

/* ---------- Login widget ----------
   Demo-only credentials. In a real playgentic suite these are NOT hardcoded
   in the .feature file — the world fixture reads them from .env
   (STANDARD_USER / STANDARD_PASS). Here they're public on purpose: this is a
   throwaway target page, not a real account. */
(function () {
  const VALID_USER = 'sdet';
  const VALID_PASS = 'playgentic';
  const form = document.getElementById('login-form');
  if (!form) return;
  const ok = form.querySelector('[data-testid="login-success"]');
  const err = form.querySelector('[data-testid="login-error"]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = form.querySelector('[data-testid="login-username"]').value.trim();
    const p = form.querySelector('[data-testid="login-password"]').value;
    const valid = u === VALID_USER && p === VALID_PASS;
    ok.classList.toggle('show', valid);
    err.classList.toggle('show', !valid);
  });
})();

/* ---------- Task list widget ---------- */
(function () {
  const input = document.getElementById('task-input');
  if (!input) return;
  const addBtn = document.getElementById('task-add');
  const list = document.getElementById('task-list');
  const count = document.querySelector('[data-testid="task-count"]');
  const chips = [...document.querySelectorAll('[data-filter]')];
  let filter = 'all';
  const tasks = [];

  function render() {
    list.innerHTML = '';
    tasks
      .filter((t) => (filter === 'all' ? true : filter === 'done' ? t.done : !t.done))
      .forEach((t) => {
        const li = document.createElement('li');
        li.className = 'task-item' + (t.done ? ' done' : '');
        li.dataset.testid = 'task-item';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.done;
        cb.dataset.testid = 'task-toggle';
        cb.addEventListener('change', () => {
          t.done = cb.checked;
          render();
        });

        const span = document.createElement('span');
        span.className = 'label';
        span.textContent = t.text;

        const del = document.createElement('button');
        del.className = 'task-del';
        del.dataset.testid = 'task-delete';
        del.setAttribute('aria-label', 'Delete task');
        del.textContent = '✕';
        del.addEventListener('click', () => {
          tasks.splice(tasks.indexOf(t), 1);
          render();
        });

        li.append(cb, span, del);
        list.appendChild(li);
      });
    const active = tasks.filter((t) => !t.done).length;
    count.textContent = active + ' active';
  }

  function add() {
    const text = input.value.trim();
    if (!text) return;
    tasks.push({ text, done: false });
    input.value = '';
    render();
  }

  addBtn.addEventListener('click', add);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') add();
  });
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      filter = c.dataset.filter;
      chips.forEach((x) => x.classList.toggle('active', x === c));
      render();
    }),
  );
  render();
})();

/* ---------- Async run widget ---------- */
(function () {
  const btn = document.getElementById('run-button');
  if (!btn) return;
  const spinner = document.getElementById('run-spinner');
  const label = document.getElementById('run-label');
  const result = document.getElementById('run-result');
  btn.addEventListener('click', () => {
    result.classList.remove('show');
    spinner.style.display = 'inline-block';
    label.textContent = 'Running…';
    btn.disabled = true;
    setTimeout(() => {
      spinner.style.display = 'none';
      label.textContent = 'Run tests';
      btn.disabled = false;
      result.textContent = '3 passed · 0 failed · 1.2s';
      result.classList.add('show');
    }, 1200);
  });
})();

/* ---------- Results table widget ---------- */
(function () {
  const body = document.getElementById('results-body');
  if (!body) return;
  const rows = [
    { name: 'login: valid sign-in', status: 'pass', ms: 620 },
    { name: 'login: bad credentials', status: 'pass', ms: 540 },
    { name: 'tasks: add and complete', status: 'pass', ms: 910 },
    { name: 'tasks: filter active', status: 'fail', ms: 1180 },
    { name: 'results: sort by status', status: 'pass', ms: 430 },
  ];
  const filterInput = document.getElementById('results-filter');
  const heads = [...document.querySelectorAll('table.results th[data-key]')];
  let sortKey = null;
  let sortDir = 1;

  function render() {
    const term = filterInput.value.trim().toLowerCase();
    let view = rows.filter((r) => r.name.toLowerCase().includes(term));
    if (sortKey) {
      view = [...view].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
      });
    }
    body.innerHTML = '';
    view.forEach((r) => {
      const tr = document.createElement('tr');
      tr.dataset.testid = 'result-row';
      const cls = r.status === 'pass' ? 'pass' : 'fail';
      tr.innerHTML =
        '<td>' +
        r.name +
        '</td><td><span class="badge ' +
        cls +
        '">' +
        r.status +
        '</span></td><td>' +
        r.ms +
        ' ms</td>';
      body.appendChild(tr);
    });
  }

  heads.forEach((th) =>
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = 1;
      }
      render();
    }),
  );
  filterInput.addEventListener('input', render);
  render();
})();
