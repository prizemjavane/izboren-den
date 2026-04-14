export function activityLineChart(elections: any[], simulatedActivity: number | null = null) {
  const data = elections
    .filter((e: any) => e.activity != null)
    .map((e: any) => ({
      date: e.date,
      value: e.activity,
      diff: e.activityDiff,
      description: e.description,
      assembly: e.assembly,
    }));

  const months = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];

  const formatDate = (d: string) => {
    const dt = new Date(d);
    return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  const upcoming = elections.filter((e: any) => e.activity == null && e.assembly);

  const allMarkDates = [
    ...data.map((d) => ({ date: d.date, assembly: d.assembly })),
    ...upcoming.map((e: any) => ({ date: e.date, assembly: e.assembly })),
  ];

  let upcomingTooltipHtml = '';
  if (upcoming.length > 0) {
    const target = new Date(upcoming[0].date + 'T08:00:00+03:00');
    const diffMs = target.getTime() - Date.now();
    const assembly = upcoming[0].assembly;
    const countdownHtml = diffMs <= 0
      ? '<span style="font-size:14px;font-weight:700;color:#16a34a;">Изборният ден е започнал</span>'
      : (() => {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          return `<span style="font-size:14px;font-weight:600;color:#64748b;">след</span> <span style="font-size:22px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;">${days}</span> <span style="font-size:13px;color:#64748b;">дни</span> <span style="font-size:22px;font-weight:800;color:#dc2626;letter-spacing:-0.5px;">${hours}</span> <span style="font-size:13px;color:#64748b;">часа</span>`;
        })();

    const simPct = simulatedActivity != null && simulatedActivity > 0 ? simulatedActivity : null;
    const simHtml = simPct != null ? `
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:10px 14px;margin-top:10px;">
        <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px;">Симулирана активност</div>
        <div style="display:flex;align-items:baseline;gap:4px;">
          <span style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">${simPct.toFixed(2)}%</span>
        </div>
        <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:6px;">
          <div style="height:100%;width:${simPct}%;background:#dc2626;border-radius:3px;"></div>
        </div>
      </div>` : '';

    upcomingTooltipHtml = `<div style="font-family:'Sofia Sans',sans-serif;min-width:220px;max-width:320px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="background:#4a6a9b;color:#fff;font-size:11px;font-weight:800;padding:3px 10px;border-radius:4px;">${assembly} НС</span>
        <span style="font-size:16px;font-weight:700;color:#1e293b;">Предстоящи избори</span>
      </div>
      <div style="font-size:14px;color:#64748b;">19 април 2026, 08:00 ч.</div>
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:10px 14px;margin-top:8px;">
        ${countdownHtml}
      </div>
      ${simHtml}
    </div>`;
  }

  const pastMarkLines: any[] = [];
  const upcomingMarkLines: any[] = [];

  allMarkDates.forEach((d) => {
    const isUpcoming = upcoming.some((u: any) => u.date === d.date);
    if (isUpcoming) {
      upcomingMarkLines.push({
        xAxis: d.date,
        lineStyle: { color: '#4a6a9b', type: 'solid' as const, width: 2 },
        label: { show: false },
      });
    } else {
      pastMarkLines.push({
        xAxis: d.date,
        lineStyle: { color: '#d1d5db', type: 'solid' as const, width: 1 },
        label: { show: false },
      });
    }
  });

  const now = new Date();
  const maxDate = new Date(now.setFullYear(now.getFullYear() + 1)).toISOString().slice(0, 10);

  const lineData = data.map((d) => ({ value: [d.date, d.value], content: d }));

  const projectionData: any[] = [];
  if (upcoming.length > 0 && simulatedActivity != null && simulatedActivity > 0 && data.length > 0) {
    const last = data[data.length - 1];
    projectionData.push({ value: [last.date, last.value], content: last });
    projectionData.push({
      value: [upcoming[0].date, simulatedActivity],
      content: { date: upcoming[0].date, value: simulatedActivity, diff: +(simulatedActivity - last.value).toFixed(2), description: upcoming[0].description ?? 'Симулация' },
    });
  }

  const series: any[] = [
    {
      name: 'Избирателна активност',
      type: 'line',
      data: lineData,
      symbolSize: 8,
      color: '#dc2626',
      lineStyle: { width: 3 },
      itemStyle: { borderWidth: 2, borderColor: '#dc2626' },
      emphasis: {
        itemStyle: { borderWidth: 3, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.25)' },
        scale: true,
      },
      z: 5,
      markPoint: {
        z: 10,
        animation: false,
        data: data.map((d) => ({
          coord: [d.date, d.value],
          value: d.value,
          content: d,
        })),
        label: {
          formatter: (p: any) => `${Math.round(p.value)}`,
          fontSize: 14,
          fontWeight: 700,
        },
        symbolSize: 46,
        itemStyle: { color: '#dc2626' },
        tooltip: {
          formatter: (params: any) => {
            const d = params.data?.content;
            if (!d) return '';
            const diffVal = d.diff != null && d.diff !== d.value ? d.diff : 0;
            const sign = diffVal > 0 ? '+' : '';
            const dc = diffVal > 0 ? '#16a34a' : '#dc2626';
            const dh = diffVal ? `<span style="font-size:15px;font-weight:600;color:${dc};margin-left:8px;">${sign}${diffVal.toFixed(2)}%</span>` : '';
            return `<div style="font-family:'Sofia Sans',sans-serif;min-width:220px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                <span style="width:11px;height:11px;border-radius:3px;background:#dc2626;flex-shrink:0;"></span>
                <span style="font-weight:700;font-size:16px;color:#1e293b;">${d.description}</span>
              </div>
              <div style="font-size:14px;color:#64748b;">${formatDate(d.date)}</div>
              <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:10px 12px;margin:8px 0 4px;">
                <div style="display:flex;align-items:baseline;gap:4px;">
                  <span style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">${d.value.toFixed(2)}%</span>
                  ${dh}
                </div>
                <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:6px;">
                  <div style="height:100%;width:${d.value}%;background:#dc2626;border-radius:3px;"></div>
                </div>
              </div>
            </div>`;
          },
        },
      },
      markLine: {
        z: 1,
        silent: true,
        symbol: 'none',
        animation: false,
        data: [...pastMarkLines, ...upcomingMarkLines],
      },
    },
  ];

  // "Now" vertical line
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const bgMonths = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
  const todayDate = new Date(todayMs);
  const todayLabel = `днес, ${todayDate.getDate()} ${bgMonths[todayDate.getMonth()]} ${todayDate.getFullYear()}`;
  series.push({
    type: 'line',
    z: 0,
    data: [],
    markLine: {
      data: [{
        xAxis: todayMs,
        lineStyle: { color: '#00e633', type: 'solid' as const, width: 3 },
        label: { show: false },
      }],
      tooltip: { formatter: todayLabel },
      silent: false,
      animation: false,
      symbol: 'none',
    },
  });

  if (projectionData.length > 0) {
    const simContent = projectionData[projectionData.length - 1].content;
    series.push({
      name: 'Симулация',
      type: 'line',
      z: 5,
      data: projectionData,
      symbolSize: (value: any, params: any) => params.dataIndex === 0 ? 0 : 12,
      color: '#dc2626',
      lineStyle: { width: 3, type: 'dashed' },
      itemStyle: { borderWidth: 2, borderColor: '#dc2626' },
      emphasis: {
        itemStyle: { borderWidth: 3, shadowBlur: 8, shadowColor: 'rgba(0,0,0,.25)' },
        scale: true,
      },
      markPoint: {
        z: 10,
        animation: false,
        data: [{
          coord: [simContent.date, simContent.value],
          value: simContent.value,
          content: simContent,
        }],
        label: {
          formatter: (p: any) => `${Math.round(p.value)}`,
          fontSize: 14,
          fontWeight: 700,
        },
        symbolSize: 46,
        itemStyle: { color: '#4a6a9b' },
        tooltip: {
          formatter: () => upcomingTooltipHtml,
        },
      },
      tooltip: {
        formatter: (params: any) => {
          const d = params.data?.content;
          if (!d) return '';
          const isUpcomingPoint = upcoming.some((u: any) => u.date === d.date);
          if (isUpcomingPoint && upcomingTooltipHtml) return upcomingTooltipHtml;
          const diffVal = d.diff != null && d.diff !== d.value ? d.diff : 0;
          const signStr = diffVal > 0 ? '+' : '';
          const dc = diffVal > 0 ? '#16a34a' : '#dc2626';
          const dh = diffVal ? `<span style="font-size:15px;font-weight:600;color:${dc};margin-left:8px;">${signStr}${diffVal.toFixed(2)}%</span>` : '';
          return `<div style="font-family:'Sofia Sans',sans-serif;min-width:220px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
              <span style="width:11px;height:11px;border-radius:3px;background:#dc2626;flex-shrink:0;"></span>
              <span style="font-weight:700;font-size:16px;color:#1e293b;">${d.description}</span>
            </div>
            <div style="font-size:14px;color:#64748b;">${formatDate(d.date)}</div>
            <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:10px 12px;margin:8px 0 4px;">
              <div style="display:flex;align-items:baseline;gap:4px;">
                <span style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">${d.value.toFixed(2)}%</span>
                ${dh}
              </div>
              <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:6px;">
                <div style="height:100%;width:${d.value}%;background:#dc2626;border-radius:3px;"></div>
              </div>
            </div>
          </div>`;
        },
      },
    });
  }

  return {
    textStyle: { fontFamily: 'Sofia Sans' },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data?.content;
        if (!d) return '';
        const diffVal = d.diff != null && d.diff !== d.value ? d.diff : 0;
        const sign = diffVal > 0 ? '+' : '';
        const diffColor = diffVal > 0 ? '#16a34a' : '#dc2626';
        const diffHtml = diffVal ? `<span style="font-size:15px;font-weight:600;color:${diffColor};margin-left:8px;">${sign}${diffVal.toFixed(2)}%</span>` : '';
        const pct = d.value;
        const barColor = params.color || '#dc2626';

        return `<div style="font-family:'Sofia Sans',sans-serif;min-width:220px;max-width:360px;white-space:normal;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
            <span style="width:11px;height:11px;border-radius:3px;background:${barColor};flex-shrink:0;"></span>
            <span style="font-weight:700;font-size:16px;color:#1e293b;">${d.description}</span>
          </div>
          <div style="font-size:14px;color:#64748b;">${formatDate(d.date)}</div>
          <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:10px 12px;margin:8px 0 4px;">
            <div style="display:flex;align-items:baseline;gap:4px;">
              <span style="font-size:28px;font-weight:800;color:#1e293b;letter-spacing:-0.5px;">${pct.toFixed(2)}%</span>
              ${diffHtml}
            </div>
            <div style="height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:6px;">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;"></div>
            </div>
          </div>
        </div>`;
      },
    },
    dataZoom: [{
      type: 'inside',
      xAxisIndex: 0,
      filterMode: 'none',
    }],
    grid: { left: 45, right: 30, top: 24, bottom: 28 },
    xAxis: {
      type: 'time',
      max: maxDate,
      axisLabel: { fontSize: 11, color: '#6b7280', formatter: (value: number) => formatDate(new Date(value).toISOString()) },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: (value: any) => Math.floor(value.min - 3),
      max: (value: any) => Math.ceil(value.max + 3),
      axisLabel: { fontSize: 12, color: '#6b7280', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#f0f0f0' } },
    },
    series,
  };
}

export function peopleInTheElectionDay(available: number, voted: number) {
  const numElements = 7;
  const targetSum = available - voted;

  // Всеки елемент получава поне 5% от общата сума на негласувалите
  const minShare = Math.floor(targetSum * 0.03);
  const remainder = targetSum - minShare * numElements;

  // Генерираме произволни тегла с голяма вариация (степенуване усилва разликите)
  const weights = Array.from({ length: numElements }, () => Math.random() ** 3);
  const weightSum = weights.reduce((s, w) => s + w, 0);

  const array = weights.map((w) => minShare + Math.floor((w / weightSum) * remainder));

  // Коригираме разликата от закръгляването
  let diff = targetSum - array.reduce((s, v) => s + v, 0);
  while (diff !== 0) {
    const idx = Math.floor(Math.random() * numElements);
    array[idx] += diff > 0 ? 1 : -1;
    diff += diff > 0 ? -1 : 1;
  }

  const data = [
    { value: array[0], name: 'Ще ходя за гъби' },
    { value: array[1], name: 'Ще ходя за риба' },
    { value: array[2], name: 'Имам работа' },
    { value: array[3], name: 'Изборите нищо не променят' },
    { value: array[4], name: 'Всички са маскари' },
    { value: array[5], name: 'Няма за кого да гласувам' },
    { value: array[6], name: 'Гласува ми се, но нямам желание' },
    { value: voted, name: 'Гласували' },
  ];

  return {
    textStyle: {
      fontFamily: 'Sofia Sans',
    },
    tooltip: {
      trigger: 'item',
    },
    grid: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
    series: [
      {
        type: 'pie',
        radius: '55%',
        data: data,
        avoidLabelOverlap: true,
        label: {
          overflow: 'break',
          width: 250,
          minMargin: 5,
          fontSize: 13,
        },
        labelLine: {
          length: 20,
          length2: 10,
          maxSurfaceAngle: 80,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

export function controlledVoteChart(voted: number, overallControlledVote: number) {
  return {
    textStyle: {
      fontFamily: 'Sofia Sans',
    },
    tooltip: {
      trigger: 'item',
    },
    legend: {
      show: false,
    },
    grid: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
    series: [
      {
        type: 'pie',
        radius: '65%',
        data: [
          { value: voted - overallControlledVote, name: 'Свободен вот', itemStyle: { color: '#1da164' } },
          { value: overallControlledVote, name: 'Купен и контролиран вот', itemStyle: { color: '#e10000' } },
        ],
        avoidLabelOverlap: true,
        label: {
          overflow: 'break',
          width: 250,
          minMargin: 5,
          fontSize: 13,
        },
        labelLine: {
          length: 20,
          length2: 10,
          maxSurfaceAngle: 80,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
}

export function mandatesChart(result: any) {
  const colors = ['#3b5998', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#e84393'];

  const parties = result
    .filter((row: any) => (row['mandates'] || 0) > 0)
    .map((row: any, i: number) => ({
      name: row['party'] || `Партия ${i + 1}`,
      mandates: row['mandates'] || 0,
    }))
    .sort((a: any, b: any) => b.mandates - a.mandates);

  const series = parties.map((p: any, i: number) => ({
    name: p.name || `Партия ${i + 1}`,
    type: 'bar',
    stack: 'mandates',
    data: [p.mandates],
    itemStyle: { color: colors[i % colors.length] },
    label: {
      show: p.mandates >= 10,
      position: 'inside',
      formatter: '{c}',
      fontSize: 15,
      fontWeight: 'bold',
      color: '#fff',
    },
    emphasis: {
      itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.3)' },
    },
  }));

  return {
    textStyle: {
      fontFamily: 'Sofia Sans',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => `${params.seriesName}: ${params.value} мандати`,
    },
    legend: {
      bottom: 0,
      type: 'plain',
      textStyle: { fontSize: 13 },
    },
    grid: {
      left: 10,
      right: 10,
      top: 10,
      bottom: 60,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      max: 240,
      show: false,
    },
    yAxis: {
      type: 'category',
      data: [''],
      show: false,
    },
    series: series.length > 0 ? series : [{
      name: 'мандати',
      type: 'bar',
      stack: 'mandates',
      data: [0],
      itemStyle: { color: '#e5e7eb' },
    }],
  };
}
