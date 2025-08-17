export const eyeIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M2.03555 12.3224C1.96647 12.1151 1.9664 11.8907 2.03536 11.6834C3.42372 7.50972 7.36079 4.5 12.0008 4.5C16.6387 4.5 20.5742 7.50692 21.9643 11.6776C22.0334 11.8849 22.0335 12.1093 21.9645 12.3166C20.5761 16.4903 16.6391 19.5 11.9991 19.5C7.36119 19.5 3.42564 16.4931 2.03555 12.3224Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path class="svg-icon" stroke="var(--svg-icon)" d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';
export const eyeSlashIcon = '<span class="icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path class="svg-icon" stroke="var(--svg-icon)" d="M3.97993 8.22257C3.05683 9.31382 2.35242 10.596 1.93436 12.0015C3.22565 16.338 7.24311 19.5 11.9991 19.5C12.9917 19.5 13.9521 19.3623 14.8623 19.1049M6.22763 6.22763C7.88389 5.13558 9.86771 4.5 12 4.5C16.756 4.5 20.7734 7.66205 22.0647 11.9985C21.3528 14.3919 19.8106 16.4277 17.772 17.772M6.22763 6.22763L3 3M6.22763 6.22763L9.87868 9.87868M17.772 17.772L21 21M17.772 17.772L14.1213 14.1213M14.1213 14.1213C14.6642 13.5784 15 12.8284 15 12C15 10.3431 13.6569 9 12 9C11.1716 9 10.4216 9.33579 9.87868 9.87868M14.1213 14.1213L9.87868 9.87868"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>';

export function toggleCommentColumn(headerRow, tableBody, colGroup, idx, btn, eyeIcon, eyeSlashIcon) {
  const colIdx = 3 + idx * 2;
  const th = headerRow.children[colIdx];
  const col = colGroup.children[colIdx];
  const hidden = th.style.visibility === 'collapse';
  const vis = hidden ? 'visible' : 'collapse';
  th.style.visibility = vis;
  if (col) col.style.visibility = vis;
  Array.from(tableBody.rows).forEach(row => {
    if (row.children[colIdx]) row.children[colIdx].style.visibility = vis;
  });
  if (btn) btn.innerHTML = hidden ? eyeSlashIcon : eyeIcon;
}

export function computeArrayStats(values) {
  if (!values.length) {
    return { avg: null, min: null, max: null, u0: null };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const u0 = avg ? min / avg : null;
  return { avg, min, max, u0 };
}

export function getColumnValues(tableBody, idx) {
  return Array.from(tableBody.rows)
    .map(row => {
      const txt = row.children[idx]?.textContent;
      return txt === '' ? null : parseFloat(txt);
    })
    .filter(v => v !== null && !isNaN(v));
}

export function computeStatsFormatted(tableBody, idx, nf2) {
  const { avg, min, max, u0 } = computeArrayStats(getColumnValues(tableBody, idx));
  return {
    avg: avg !== null ? nf2.format(avg) : '-',
    min: min !== null ? nf2.format(min) : '-',
    max: max !== null ? nf2.format(max) : '-',
    u0: u0 !== null ? nf2.format(u0) : '-',
  };
}
