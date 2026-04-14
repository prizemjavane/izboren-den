/**
 * Pure functions that compute ECharts series updates for gantt highlight/dim.
 * value[5]: 0 = normal, 1 = selected, 2 = dimmed
 */

export function buildGanttHighlightUpdates(series: any[], targetDataIndex: number): any[] {
  const updates: any[] = [];
  for (const s of series) {
    if (s.id !== 'gantt') continue;
    const updatedData = s.data.map((item: any, idx: number) => {
      const v = item.value;
      const sel = idx === targetDataIndex ? 1 : 2;
      if (v[5] === sel) return item;
      return { ...item, value: [...v.slice(0, 5), sel] };
    });
    updates.push({ id: s.id, data: updatedData });
  }
  return updates;
}

export function buildGanttResetUpdates(series: any[]): any[] {
  const updates: any[] = [];
  for (const s of series) {
    if (s.id !== 'gantt') continue;
    const needsReset = s.data.some((item: any) => item.value[5] !== 0);
    if (!needsReset) continue;
    const updatedData = s.data.map((item: any) => {
      if (item.value[5] === 0) return item;
      return { ...item, value: [...item.value.slice(0, 5), 0] };
    });
    updates.push({ id: s.id, data: updatedData });
  }
  return updates;
}

/**
 * Take an rgba() color with low alpha (typical of markArea fills) and return
 * the same hue at a higher opacity so it reads as a brighter, solid line.
 */
function brightenColor(color: string): string {
  const m = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)/);
  if (m) {
    return `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.6)`;
  }
  return color;
}

/**
 * Show two solid vertical lines at the start/end dates of a selected period.
 * Targets the dedicated 'period-highlight' series.
 * `color` is the markArea / gantt fill — it gets brightened automatically.
 */
export function buildPeriodHighlightUpdates(series: any[], from: string | number, to: string | number, color?: string): any[] {
  const lineColor = color ? brightenColor(color) : '#475569';
  const updates: any[] = [];
  for (const s of series) {
    if (s.id !== 'period-highlight') continue;
    updates.push({
      id: s.id,
      markLine: {
        symbol: 'none',
        silent: true,
        animation: true,
        animationDuration: 300,
        data: [
          { xAxis: from, lineStyle: { color: lineColor, width: 2, type: 'solid' }, label: { show: false } },
          { xAxis: to, lineStyle: { color: lineColor, width: 2, type: 'solid' }, label: { show: false } },
        ],
      },
    });
  }
  return updates;
}

export function clearPeriodHighlightUpdates(series: any[]): any[] {
  const updates: any[] = [];
  for (const s of series) {
    if (s.id !== 'period-highlight') continue;
    if (!s.markLine?.data?.length) continue;
    updates.push({ id: s.id, markLine: { symbol: 'none', data: [] } });
  }
  return updates;
}
