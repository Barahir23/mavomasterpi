import { toggleCommentColumn, computeStatsFormatted, eyeIcon, eyeSlashIcon } from './table_utils.js';

function numberIcon(num) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle class="svg-icon" stroke="var(--svg-icon)" stroke-width="1.5" cx="12" cy="12" r="9"/><text x="12" y="16" text-anchor="middle" font-size="12" fill="var(--svg-icon)" font-family="sans-serif">${num}</text></svg>`;
}

// Table utilities for projects page

document.addEventListener('DOMContentLoaded', () => {
  const headerRow = document.querySelector('.measurement-table thead tr');
  const tableBody = document.getElementById('measurement-table-body');
  const colGroup = document.getElementById('measurement-colgroup');

  if (!headerRow || !tableBody || !colGroup) return;

  const nf2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  headerRow.querySelectorAll('.comment-toggle').forEach(btn => {
    btn.innerHTML = eyeIcon;
    btn.addEventListener('click', () =>
      toggleCommentColumn(headerRow, tableBody, colGroup, parseInt(btn.dataset.index, 10), btn, eyeIcon, eyeSlashIcon)
    );
  });

  headerRow.querySelectorAll('.title-toggle').forEach((btn, idx) => {
    btn.innerHTML = numberIcon(idx + 1);
    btn.addEventListener('click', () => {
      const title = btn.parentElement.querySelector('.seq-title');
      if (title) title.classList.toggle('hidden');
    });
  });

  const columnMenu = document.getElementById('column-context-menu');
  if (columnMenu) {
    document.body.appendChild(columnMenu);
    columnMenu.style.display = 'none';
  }
  const menuStatsBody = columnMenu ? columnMenu.querySelector('tbody') : null;
  const sidebarStatsBody = document.querySelector('#sidebar-stats tbody');

  document.addEventListener('click', e => {
    if (e.button !== 2 && columnMenu) columnMenu.style.display = 'none';
  });

  function renderStats() {
    const rows = Array.from(headerRow.querySelectorAll('.measurement-column'));
    const fmt = v => (v !== null && v !== undefined ? nf2.format(v) : '-');
    const seqRows = rows
      .map((th, i) => {
        const name = th.querySelector('.seq-title') ? th.querySelector('.seq-title').textContent.trim() : th.textContent.trim();
        const colIdx = 2 + i * 2;
        const stats = computeStatsFormatted(tableBody, colIdx, nf2);
        return `<tr><td>${name}</td><td>${stats.avg}</td><td>${stats.min}</td><td>${stats.max}</td><td>${stats.u0}</td></tr>`;
      })
      .join('');
    const baseRow = window.anforderungStats
      ? `<tr><td>Vorgabe</td><td>${fmt(window.anforderungStats.avg)}</td><td>${fmt(window.anforderungStats.emin)}</td><td>${fmt(window.anforderungStats.emax)}</td><td>${fmt(window.anforderungStats.u0)}</td></tr>`
      : '';
    const html = baseRow + seqRows;
    if (menuStatsBody) menuStatsBody.innerHTML = html;
    if (sidebarStatsBody) sidebarStatsBody.innerHTML = html;
  }

  if (headerRow) {
    if (columnMenu) {
      headerRow.addEventListener('contextmenu', e => {
        const th = e.target.closest('th');
        if (!th || !th.classList.contains('measurement-column')) return;
        e.preventDefault();
        renderStats();
        columnMenu.style.left = `${e.pageX}px`;
        columnMenu.style.top = `${e.pageY}px`;
        columnMenu.style.display = 'block';
      });
    }
    if (sidebarStatsBody) {
      renderStats();
      setInterval(renderStats, 500);
    }
  }
});
