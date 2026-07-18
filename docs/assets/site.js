/* playgentic — shared site behaviors: copy buttons, mobile hamburger,
   and the mobile docs-sidebar toggle. Vanilla JS, no dependencies. */

/* ---------- Copy buttons ---------- */
document.querySelectorAll('.copy-btn').forEach((btn) => {
  const label = btn.querySelector('.copy-label');
  const original = label ? label.textContent : '';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
    } catch {
      // Fallback for non-secure contexts (e.g. plain http)
      const ta = document.createElement('textarea');
      ta.value = btn.dataset.copy;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.classList.add('copied');
    if (label) label.textContent = 'Copied';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (label) label.textContent = original;
    }, 1600);
  });
});

/* ---------- Mobile hamburger ---------- */
const navToggle = document.querySelector('.nav-toggle');
const menu = document.getElementById('menu');
if (navToggle && menu) {
  navToggle.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  menu.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => {
      menu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }),
  );
}

/* ---------- Mobile docs-sidebar toggle ---------- */
const sidebarToggle = document.querySelector('.doc-sidebar-toggle');
const sidebar = document.querySelector('.doc-sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
