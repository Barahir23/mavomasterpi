import { toggleCommentColumn, getColumnValues, computeStatsFormatted } from './table_utils.js';

// Table utilities for projects page

document.addEventListener('DOMContentLoaded', () => {
  const headerRow = document.querySelector('.measurement-table thead tr');
  const tableBody = document.getElementById('measurement-table-body');
  const colGroup = document.getElementById('measurement-colgroup');

  if (!headerRow || !tableBody || !colGroup) return;

  const nf2 = new Intl.NumberFormat('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eyeIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M2.03555 12.3224C1.96647 12.1151 1.9664 11.8907 2.03536 11.6834C3.42372 7.50972 7.36079 4.5 12.0008 4.5C16.6387 4.5 20.5742 7.50692 21.9643 11.6776C22.0334 11.8849 22.0335 12.1093 21.9645 12.3166C20.5761 16.4903 16.6391 19.5 11.9991 19.5C7.36119 19.5 3.42564 16.4931 2.03555 12.3224Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path class="svg-icon" stroke="var(--svg-icon)" d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
  const eyeSlashIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M3.97993 8.22257C3.05683 9.31382 2.35242 10.596 1.93436 12.0015C3.22565 16.338 7.24311 19.5 11.9991 19.5C12.9917 19.5 13.9521 19.3623 14.8623 19.1049M6.22763 6.22763C7.88389 5.13558 9.86771 4.5 12 4.5C16.756 4.5 20.7734 7.66205 22.0647 11.9985C21.3528 14.3919 19.8106 16.4277 17.772 17.772M6.22763 6.22763L3 3M6.22763 6.22763L9.87868 9.87868M17.772 17.772L21 21M17.772 17.772L14.1213 14.1213M14.1213 14.1213C14.6642 13.5784 15 12.8284 15 12C15 10.3431 13.6569 9 12 9C11.1716 9 10.4216 9.33579 9.87868 9.87868M14.1213 14.1213L9.87868 9.87868"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

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
      const colIdx = Array.from(headerRow.children).indexOf(th);
      if (getColumnValues(tableBody, colIdx).length === 0) return;
      e.preventDefault();
      updateStatsMenu();
      columnMenu.style.left = `${e.pageX}px`;
      columnMenu.style.top = `${e.pageY}px`;
      columnMenu.style.display = 'block';
    });
  }
});
