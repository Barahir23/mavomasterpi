import { toggleCommentColumn, computeStatsFormatted, eyeIcon, eyeSlashIcon } from './table_utils.js';

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

  const columnMenu = document.getElementById('column-context-menu');
  if (columnMenu) {
    document.body.appendChild(columnMenu);
    columnMenu.style.display = 'none';
  }
  const statsBody = columnMenu ? columnMenu.querySelector('tbody') : null;

  document.addEventListener('click', () => {
    if (columnMenu) columnMenu.style.display = 'none';
  });

  function updateStatsMenu() {
    if (!statsBody) return;
    const rows = Array.from(headerRow.querySelectorAll('.measurement-column'));
    const html = rows
      .map((th, i) => {
        const name = th.childNodes[0].textContent.trim();
        const colIdx = 1 + i * 2;
        const stats = computeStatsFormatted(tableBody, colIdx, nf2);
        return `<tr><td>${name}</td><td>${stats.avg}</td><td>${stats.min}</td><td>${stats.max}</td><td>${stats.u0}</td></tr>`;
      })
      .join('');
    statsBody.innerHTML = html;
  }

  if (headerRow && columnMenu) {
    headerRow.addEventListener('contextmenu', e => {
      const th = e.target.closest('th');
      if (!th || !th.classList.contains('measurement-column')) return;
      e.preventDefault();
      updateStatsMenu();
      columnMenu.style.left = `${e.pageX}px`;
      columnMenu.style.top = `${e.pageY}px`;
      columnMenu.style.display = 'block';
    });
  }
});
