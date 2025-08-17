export function toggleCommentColumn(headerRow, tableBody, colGroup, idx, btn, eyeIcon, eyeSlashIcon) {
  const colIdx = 2 + idx * 2;
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
