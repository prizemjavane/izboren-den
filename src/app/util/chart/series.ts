import * as echarts from 'echarts/core';
import moment from 'moment/moment';
import Decimal from 'decimal.js';
import { humanDate, humanDateDiff } from '@util/bg-format';

const textWidthCache = new Map<string, number>();

const TT_FONT = "'Sofia Sans', sans-serif";
const TT_TEXT = '#1e293b';
const TT_MUTED = '#64748b';
const TT_BORDER = '#e2e8f0';

function colorDot(color: string): string {
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;flex-shrink:0;vertical-align:middle;"></span>`;
}

export interface LineChartData {
  date: string;
  value: number;
  change: number;
  changePercent: number;
  sources?: any;
  mandates?: number;
  mandatesDiff?: number;
  percent?: number;
  description?: string;
}

export interface LineChart {
  id: string;
  name: string;
  knowledgeId?: string;
  unit?: string;
  magnitude?: string;
  meta?: {
    style?: any;
  };
  data: LineChartData[];
}

interface TooltipCardOptions {
  name: string;
  date: string;
  color: string;
  description?: string;
  comment?: string;
  value?: string;
  valueSuffix?: string;
  diff?: string;
  diffColor?: string;
  percent?: string;
  progressBar?: { value: number; color: string };
  mandates?: { value: number; diff?: number; color: string };
  footer?: string;
}

export function buildTooltipCard(opts: TooltipCardOptions): string {
  const descHtml = opts.description ? `<div style="font-size:15px;font-weight:600;color:${TT_TEXT};margin-top:6px;">${opts.description}</div>` : '';
  const commentHtml = opts.comment ? `<div style="font-size:14px;font-style:italic;color:${TT_MUTED};margin-top:4px;">${opts.comment}</div>` : '';
  const diffHtml = opts.diff ? `<span style="font-size:15px;font-weight:600;color:${opts.diffColor ?? TT_MUTED};margin-left:8px;">${opts.diff}</span>` : '';
  const suffixHtml = opts.valueSuffix ? `<span style="font-size:17px;color:${TT_MUTED};">${opts.valueSuffix}</span>` : '';
  const percentHtml = opts.percent ? `<div style="margin-top:6px;"><span style="font-size:16px;font-weight:600;color:${TT_TEXT};">${opts.percent}</span></div>` : '';

  let mandatesHtml = '';
  if (opts.mandates && opts.mandates.value > 0) {
    const m = opts.mandates.value;
    const pct = ((m / 240) * 100).toFixed(1);
    let mDiffHtml = '';
    if (opts.mandates.diff !== undefined && opts.mandates.diff !== 0 && opts.mandates.diff !== m) {
      const sign = opts.mandates.diff > 0 ? '+' : '';
      const dc = opts.mandates.diff > 0 ? '#16a34a' : '#dc2626';
      mDiffHtml = `<span style="font-size:15px;font-weight:600;color:${dc};margin-left:8px;">${sign}${opts.mandates.diff}</span>`;
    }
    mandatesHtml = `
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:12px 14px;margin:8px 0 10px;">
        <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:8px;">
          <span style="font-size:34px;font-weight:800;color:${TT_TEXT};letter-spacing:-0.5px;">${m}</span>
          <span style="font-size:17px;color:${TT_MUTED};">мандата</span>
          ${mDiffHtml}
          <span style="font-size:13px;color:#94a3b8;margin-left:auto;">от 240</span>
        </div>
        <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${opts.mandates.color};border-radius:3px;"></div>
        </div>
      </div>`;
  }

  let progressHtml = '';
  if (opts.progressBar) {
    progressHtml = `
      <div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden;margin-top:8px;">
        <div style="height:100%;width:${opts.progressBar.value}%;background:${opts.progressBar.color};border-radius:3px;"></div>
      </div>`;
  }

  let valueCardHtml = '';
  if (opts.value) {
    valueCardHtml = `
    <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:12px 14px;margin:8px 0 6px;">
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span style="font-size:30px;font-weight:800;color:${TT_TEXT};letter-spacing:-0.5px;">${opts.value}</span>
        ${suffixHtml}
        ${diffHtml}
      </div>
      ${percentHtml}
      ${progressHtml}
    </div>`;
  }

  const footerHtml = opts.footer ? `
    <div style="border-top:1px solid ${TT_BORDER};margin-top:10px;padding-top:7px;">
      <div style="font-size:13px;color:#94a3b8;">${opts.footer}</div>
    </div>` : '';

  return `<div style="font-family:${TT_FONT};min-width:240px;max-width:400px;white-space:normal;word-wrap:break-word;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
      <span style="width:11px;height:11px;border-radius:3px;background:${opts.color};flex-shrink:0;"></span>
      <span style="font-weight:700;font-size:17px;color:${TT_TEXT};">${opts.name}</span>
    </div>
    <div style="font-size:15px;color:${TT_MUTED};">${opts.date}</div>
    ${descHtml}
    ${commentHtml}
    ${mandatesHtml}
    ${valueCardHtml}
    ${footerHtml}
  </div>`;
}

function formatDiff(change: number, formatter: (v: number) => string): { text: string; color: string } | null {
  if (!change) return null;
  const sign = change > 0 ? '+' : '';
  const color = change > 0 ? '#16a34a' : '#dc2626';
  return { text: `${sign}${formatter(change)}`, color };
}

export function formatDataPointTooltip(
  params: any,
  chartName: string,
  _font: string,
  _text: string,
  _muted: string,
  _border: string
): string {
  const date = humanDate(params.data.value[0]);
  const diffToNow = humanDateDiff(params.data.value[0], new Date().getTime());
  const color = params.color ?? '#3b82f6';
  const content = params.data.content;
  const votes = params.value[1].toLocaleString('en-US');
  const displayName = chartName || params.seriesName;
  const hasPartyData = content.mandates !== undefined;

  const diff = formatDiff(
    content.change && content.change !== content.value ? content.change : 0,
    (v) => v.toLocaleString('en-US')
  );

  return buildTooltipCard({
    name: displayName,
    date,
    color,
    description: content.description,
    value: votes,
    valueSuffix: hasPartyData ? 'гласа' : undefined,
    diff: diff?.text,
    diffColor: diff?.color,
    percent: content.percent !== undefined ? `${content.percent}%` : undefined,
    mandates: hasPartyData ? { value: content.mandates, diff: content.mandatesDiff, color } : undefined,
    footer: `${diffToNow} до днес`,
  });
}

export function buildMediaChart(media: any) {
  const result: any = {
    name: 'media',
    type: 'line',
    data: [],
    xAxisIndex: 2,
    yAxisIndex: 3,
    lineStyle: {
      width: 0,
    },
    itemStyle: {
      borderColor: '#000',
      borderWidth: 1,
      borderType: 'solid',
    },
    symbol: 'circle',
    symbolSize: 10,
  };

  const values: any = {};

  media.forEach((item: any) => {
    if (!values[item.date]) {
      values[item.date] = getInc(item.topic);
    }

    result.data.push({
      content: {
        color: getColor(item.topic),
        topic: item.topic,
      },
      value: [item.date, values[item.date]],
      itemStyle: {
        color: getColor(item.topic),
        opacity: 1,
      },
    });
  });

  return result;
}

function getColor(topic: string): string {
  if (topic === 'demography') {
    return '#9370DB';
  }

  if (topic === 'building') {
    return '#CCC';
  }

  if (topic === 'balloon') {
    return '#000';
  }

  return 'black';
}

function getInc(topic: string): number {
  if (topic === 'demography') {
    return 1;
  }

  if (topic === 'building') {
    return 1.5;
  }

  if (topic === 'balloon') {
    return 2;
  }

  return 0.5;
}

export function buildLineChart(chart: LineChart, style: any = null, xAxisIndex: number, yAxisIndex: number) {
  const result: any = {
    ...{
      name: chart.id,
      type: 'line',
      z: 3,
      tooltip: {
        formatter: (params: any) => {
          return formatDataPointTooltip(params, chart.name, TT_FONT, TT_TEXT, TT_MUTED, TT_BORDER);
        },
      },
      symbolSize: 5,
      itemStyle: {
        borderWidth: 2,
      },
      emphasis: {
        focus: 'series',
        label: {
          show: true,
        },
        itemStyle: {
          borderWidth: 3,
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
        scale: true,
        scaleSize: 6,
      },
      data: [],
      xAxisIndex: xAxisIndex,
      yAxisIndex: yAxisIndex,
      label: {
        show: false,
        position: 'top',
        formatter: (params: any) => {
          return new Decimal(params.data.value[1]).toDecimalPlaces(1).toNumber().toLocaleString('en-US');
        },
      },
    },
    ...style,
    ...chart?.meta?.style,
  };

  chart.data.forEach((item) => {
    result.data.push({
      content: {
        knowledgeId: chart.knowledgeId,
        unit: chart.unit,
        magnitude: chart.magnitude ?? 1,
        change: item?.change,
        changePercent: item?.changePercent,
        date: item.date,
        value: item.value,
        sources: item.sources,
        mandates: item.mandates,
        mandatesDiff: item.mandatesDiff,
        percent: item.percent,
        description: item.description,
      },
      value: [item.date, item.value],
    });
  });

  return result;
}

export function buildGanttChart(groups: any, index = 0) {
  const data: any[] = [];

  let i = 0;
  groups.forEach((group: any) => {
    group.items.forEach((item: any, _idx: number) => {
      const from = +new Date(item.value[0]);
      const to = item.value[1] === null ? +new Date() : +new Date(item.value[1]);
      const isOngoing = item.value[1] === null;

      data.push({
        content: {
          type: 'gantt',
          knowledgeId: group.knowledgeId,
          group: group.name,
          name: `${item.name} (${group.name})`,
          description: item?.description,
          comment: item?.comment,
          sources: item.sources,
          file: 'institutions.json',
          period: [item.value[0], to],
          from: item.value[0],
          to: to,
        },
        name: item.name,
        value: [i, from, to, item.name, isOngoing ? 1 : 0, 0, item?.comment === 'служебно' ? 1 : 0],
        itemStyle: {
          color: generateGanttColor(item.name),
        },
      });
    });

    i = i + 1;
  });

  return {
    id: 'gantt',
    type: 'custom',
    tooltip: {
      formatter: timeRangeLabel,
    },
    renderItem: function (params: any, api: any) {
      const categoryIndex = api.value(0);
      const start = api.coord([api.value(1), categoryIndex]);
      const end = api.coord([api.value(2), categoryIndex]);
      const ongoing = api.value(4) === 1;

      const laneHeight = api.size([0, 1])[1] * 0.9;
      const laneY = start[1] - laneHeight / 2;

      const coordSys = {
        x: params.coordSys.x,
        y: params.coordSys.y,
        width: params.coordSys.width,
        height: params.coordSys.height,
      };

      // Narrow dark overlay on the left edge — marks where each item starts
      const accentW = Math.min(4, end[0] - start[0]);
      const visibleStartX = Math.max(start[0], coordSys.x);

      const label = api.value(3);
      let labelWidth = textWidthCache.get(label);
      if (labelWidth === undefined) {
        labelWidth = echarts.format.getTextRect(label).width;
        textWidthCache.set(label, labelWidth);
      }
      const fontSize = 14;
      const text = end[0] - visibleStartX > labelWidth + accentW + 16 && end[0] >= 180 ? label : '';

      // Split bar at current date: past = normal, future = low opacity
      const nowX = api.coord([Date.now(), categoryIndex])[0];
      const splitX = Math.min(Math.max(nowX, start[0]), end[0]);
      const hasPast = splitX > start[0];
      const hasFuture = splitX < end[0];

      // 0 = normal, 1 = selected, 2 = dimmed
      const selState = api.value(5);
      const isCaretaker = api.value(6) === 1;

      const mainColor = api.visual('color');

      const pastShape = hasPast
        ? echarts.graphic.clipRectByRect({ x: start[0], y: laneY, width: splitX - start[0], height: laneHeight }, coordSys)
        : null;

      const futureShape = hasFuture
        ? echarts.graphic.clipRectByRect({ x: splitX, y: laneY, width: end[0] - splitX, height: laneHeight }, coordSys)
        : null;

      const accentShape = echarts.graphic.clipRectByRect({ x: start[0], y: laneY, width: accentW, height: laneHeight }, coordSys);

      const textX = visibleStartX + accentW + 6;
      const textY = laneY + laneHeight / 2;

      const pastR: any = hasFuture ? [3, 0, 0, 3] : ongoing ? [3, 0, 0, 3] : [3, 3, 3, 3];
      const futureR: any = hasPast ? [0, 3, 3, 0] : [3, 3, 3, 3];

      const caretakerFade = isCaretaker ? 0.75 : 1;
      const pastOpacity = (selState === 1 ? 0.92 : selState === 2 ? 0.18 : 0.8) * caretakerFade;
      const futureOpacity = (selState === 1 ? 0.5 : selState === 2 ? 0.06 : 0.22) * caretakerFade;
      const pastStroke = selState === 1 ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.22)';
      const futureStroke = selState === 1 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';
      const darkText = needsDarkText(mainColor, pastOpacity);
      const hoverPastOpacity = Math.min(pastOpacity + 0.15, 1);
      const hoverFutureOpacity = Math.min(futureOpacity + 0.15, 1);
      const hoverDarkText = needsDarkText(mainColor, hoverPastOpacity);

      return (
        (pastShape || futureShape) && {
          type: 'group',
          children: [
            pastShape && {
              type: 'rect',
              shape: { ...pastShape, r: pastR },
              style: {
                fill: mainColor,
                stroke: pastStroke,
                lineWidth: 1,
                opacity: pastOpacity,
              },
              emphasis: {
                style: {
                  opacity: hoverPastOpacity,
                  stroke: 'rgba(0,0,0,0.5)',
                  lineWidth: 1,
                },
              },
            },
            futureShape && {
              type: 'rect',
              shape: { ...futureShape, r: futureR },
              style: {
                fill: mainColor,
                stroke: futureStroke,
                lineWidth: 1,
                opacity: futureOpacity,
              },
              emphasis: {
                style: {
                  opacity: hoverFutureOpacity,
                  stroke: 'rgba(0,0,0,0.3)',
                  lineWidth: 1,
                },
              },
            },
            accentShape && {
              type: 'rect',
              shape: { ...accentShape, r: [3, 0, 0, 3] },
              style: {
                fill: selState === 2 ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.25)',
              },
              emphasis: {
                style: {
                  fill: 'rgba(0,0,0,0.4)',
                },
              },
            },
            text
              ? {
                  type: 'text',
                  style: {
                    text: text,
                    x: textX,
                    y: textY,
                    fill: selState === 2 ? (darkText ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.4)') : darkText ? '#1e293b' : '#FFF',
                    fontFamily: 'Sofia Sans',
                    fontSize: fontSize,
                    textAlign: 'left',
                    textVerticalAlign: 'middle',
                    width: Math.max(0, end[0] - textX - 6),
                    overflow: 'truncate',
                  },
                  emphasis: {
                    style: {
                      fill: hoverDarkText ? '#1e293b' : '#FFF',
                    },
                  },
                }
              : null,
          ].filter(Boolean),
        }
      );
    },
    itemStyle: {
      opacity: 0.85,
    },
    encode: {
      x: [1, 2],
      y: 0,
    },
    data: data,
    xAxisIndex: index,
    yAxisIndex: index,
  };
}

export function buildMarkArea(areas: any, showLabels: boolean, axisIndex = 0, style: any) {
  const data: any = [];

  areas.items.forEach((item: any) => {
    const to = item.value[1] === null ? +new Date() : +new Date(item.value[1]);

    data.push([
      {
        ...{
          content: {
            type: 'gantt',
            name: item.name,
            comment: item?.comment,
            description: item?.description,
            sources: item.sources,
            file: 'events.json',
            period: [item.value[0], item.value[1]],
            from: item.value[0],
            to: to,
          },
          name: item.name,
          description: item.description,
          xAxis: item.value[0],
        },
        ...style,
      },
      {
        xAxis: to,
      },
    ]);
  });

  const result: any = {
    type: 'line',
    name: areas.id,
    z: 0,
    emphasis: {
      focus: 'series',
    },
    markArea: {
      label: {
        show: showLabels,
        position: 'inside',
        rotate: 90,
        color: '#333',
      },
      tooltip: {
        formatter: timeRangeLabel,
      },
      data: data,
      emphasis: {
        disabled: true,
      },
    },
    xAxisIndex: axisIndex,
    yAxisIndex: axisIndex,
  };

  return result;
}

export function buildPeriodHighlightSeries(xAxisIndex = 0, yAxisIndex = 0) {
  return {
    type: 'line',
    id: 'period-highlight',
    data: [],
    silent: true,
    markLine: { silent: true, symbol: 'none', data: [] },
    xAxisIndex,
    yAxisIndex,
  };
}

export function buildMarkLine(items: any, showLabels: boolean, xAxisIndex = 0, yAxisIndex = 0, seriesName: string, style: any, text = '') {
  const data: any = [];
  const seriesColor = style?.[seriesName]?.lineStyle.color;

  items.forEach((item: any) => {
    const axis: any = {};

    if (item.date) {
      axis.xAxis = item.date;
    }

    if (item.value) {
      axis.yAxis = item.value;
    }

    data.push({
      ...{
        name: item?.name,
        label: {
          show: showLabels,
          position: 'start',
          formatter: item?.name ?? '',
        },
        content: {
          name: item.name ?? seriesName,
          sources: item.sources,
          description: item.description,
          date: item.date,
        },
      },
      ...style,
      ...axis,
      ...item?.meta?.style,
    });
  });

  return {
    type: 'line',
    name: seriesName,
    z: 0,
    data: [],
    visible: false,
    markLine: {
      data: data,
      visible: false,
      tooltip: {
        formatter: function (params: any) {
          let result = '';

          if (params.data.xAxis) {
            let date = humanDate(params.data.value);
            const color = seriesColor ? seriesColor : params.data?.lineStyle?.color ? params.data?.lineStyle?.color : '#000';

            let diffText: string;

            if (params.data.name || text) {
              result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span>`;
              result += text.length > 0 ? text.replace('{name}', params.data.name) : params.data.name;
            } else {
              result += seriesName;
            }

            if (new Date(params.data.value) < new Date()) {
              diffText = `<br>${humanDateDiff(params.data.value, new Date().getTime())} до днес`;
            } else {
              date = 'около ' + date;
              diffText = `<br>след около ${humanDateDiff(new Date().getTime(), params.data.value)}`;
            }

            result += `<br><b>${date}</b>${diffText}`;
          } else {
            const color = seriesColor ? seriesColor : params.data?.lineStyle?.color ? params.data?.lineStyle?.color : '#000';
            const value = params.data.value;

            result += text.length > 0 ? text.replace('{name}', params.data.name) : params.data.name;
            result += `<br><span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span><b>${value}%</b>`;
          }

          return result;
        },
      },
      silent: false,
      animation: false,
      symbol: 'none',
      emphasis: {
        disabled: true,
      },
    },
    xAxisIndex: xAxisIndex,
    yAxisIndex: yAxisIndex,
    color: seriesColor,
  };
}

export function buildCurrentDateLine(axisIndex = 0, yAxisIndex?: number) {
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const m = moment();
  const BG_MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
  const today = `📅 днес, ${m.date()} ${BG_MONTHS[m.month()]} ${m.year()}`;

  const result: any = {
    type: 'line',
    z: 0,
    data: [[currentDate.getTime()]],
    markLine: {
      data: [
        {
          xAxis: currentDate.getTime(),
          lineStyle: {
            color: '#00e633',
            type: 'solid',
            width: 3,
          },
          label: {
            show: false,
          },
        },
      ],
      tooltip: {
        formatter: today,
      },
      silent: false,
      animation: false,
      symbol: 'none',
    },
    xAxisIndex: axisIndex,
    yAxisIndex: yAxisIndex ?? axisIndex,
  };

  return result;
}

function timeRangeLabel(params: any) {
  if (params.data.content?.type === 'gantt') {
    const c = params.data.content;
    const from = humanDate(c.from);
    const diff = humanDateDiff(c.from, c.to);
    const dateLabel = c.to ? `${from} — ${humanDate(c.to)}` : `${from} — до днес`;

    let fill = '#3b82f6';
    if (params.data.itemStyle?.color) fill = params.data.itemStyle.color;
    else if (params.color) fill = params.color;

    return buildTooltipCard({
      name: params.name,
      date: dateLabel,
      color: fill,
      description: c.description,
      comment: c.comment,

      footer: `${diff}${toNow(c.from, c.to)}`,
    });
  }

  if (params?.data?.description !== undefined) {
    const diffToNow = humanDateDiff(params.data.value?.[0], new Date().getTime());
    return buildTooltipCard({
      name: params.data.description,
      date: humanDate(params.data.value?.[0]),
      color: params.color ?? '#3b82f6',
      footer: `${diffToNow} до днес`,
    });
  }

  if (params.value === undefined) {
    return '';
  }

  const date = humanDate(params.data.value[0]);
  const value = params.value[1].toLocaleString('en-US');
  const diffToNow = humanDateDiff(params.data.value[0], new Date().getTime());
  const color = params.color ?? '#3b82f6';

  let seriesDisplay = `${colorDot(color)}<span style="font-weight:700;">${params.seriesName}</span>`;
  if (params.data.content.name && params.data.content.name !== params.seriesName) {
    seriesDisplay += ` <span style="color:${TT_MUTED};">(${params.data.content.name})</span>`;
  }

  let diffText = '';
  if (params.data.content?.diff && params.data.content.diff !== params.value[1]) {
    const sign = params.data.content.diff > 0 ? '+' : '';
    diffText = ` <span style="color:${TT_MUTED};font-size:14px;">(${sign}${params.data.content.diff.toLocaleString('en-US')})</span>`;
  }

  return `<div style="font-family:${TT_FONT};max-width:300px;">
    <div style="display:flex;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid ${TT_BORDER};">
      ${seriesDisplay}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;">
      <div style="font-weight:600;color:${TT_TEXT};">${date}</div>
      <div style="font-size:18px;font-weight:700;color:${TT_TEXT};">${value}${diffText}</div>
    </div>
    <div style="font-size:14px;color:${TT_MUTED};margin-top:6px;">${diffToNow} до днес</div>
  </div>`;
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Deterministic color from item label.
 * Same name always produces the same colour, so repeated entries (e.g. the same
 * prime minister across multiple terms) share a colour.
 * HSL(h, 65%, 28%) keeps every colour dark enough for white text at 0.85 opacity.
 */
function generateGanttColor(itemName: string): string {
  let hash = 0;
  for (let i = 0; i < itemName.length; i++) {
    hash = ((hash << 5) - hash + itemName.charCodeAt(i)) | 0;
  }
  const hue = (hash & 0x7fffffff) % 360;
  return hslToHex(hue, 65, 28);
}

/** Whether dark text is needed on a bar with the given colour at the given opacity on a white background. */
function needsDarkText(hex: string, opacity: number): boolean {
  if (!hex || hex[0] !== '#' || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const br = r * opacity + 255 * (1 - opacity);
  const bg = g * opacity + 255 * (1 - opacity);
  const bb = b * opacity + 255 * (1 - opacity);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin(br) + 0.7152 * lin(bg) + 0.0722 * lin(bb);
  return 1.05 / (L + 0.05) < 3.0;
}

export function toNow(from: string, to: string): string {
  const diffStartToNow = humanDateDiff(from, new Date().getTime());
  const diffEndToNow = humanDateDiff(to, new Date().getTime());

  if (diffEndToNow.length > 0) {
    return `<div style="color:${TT_MUTED};font-size:14px;margin-top:4px;">${diffStartToNow} от началото до днес</div>
    <div style="color:${TT_MUTED};font-size:14px;margin-top:2px;">${diffEndToNow} от края до днес</div>`;
  }

  return '';
}

export function buildMandatesStackedArea(elections: any[], style: any, xAxisIndex: number, yAxisIndex: number): any[] {
  const validElections = elections
    .filter((e: any) => e.metrics?.parties)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validElections.length === 0) return [];

  const electionDates = validElections.map((e: any) => e.date);
  const today = new Date().toISOString().slice(0, 10);
  const allDates = [...electionDates, today];

  const partyTotals = new Map<string, number>();
  const partyDateMap = new Map<string, Map<string, { mandates: number; percent: number }>>();

  validElections.forEach((election: any) => {
    election.metrics.parties.forEach((party: any) => {
      if (party.percent >= 4 && party.alias !== 'ДПС (АПС + ДПС-Ново начало)') {
        partyTotals.set(party.alias, (partyTotals.get(party.alias) ?? 0) + (party.mandates ?? 0));
        if (!partyDateMap.has(party.alias)) {
          partyDateMap.set(party.alias, new Map());
        }
        partyDateMap.get(party.alias)!.set(election.date, { mandates: party.mandates, percent: party.percent });
      }
    });
  });

  // Pre-compute full parliament composition per election for the tooltip
  const parliamentByDate = new Map<string, { parties: any[]; electionLabel: string }>();
  validElections.forEach((election: any) => {
    const parties = election.metrics.parties
      .filter((p: any) => p.percent >= 4 && p.alias !== 'ДПС (АПС + ДПС-Ново начало)')
      .sort((a: any, b: any) => b.mandates - a.mandates)
      .map((p: any) => ({
        alias: p.alias,
        mandates: p.mandates,
        percent: p.percent,
        color: style?.[p.alias]?.itemStyle?.color ?? style?.[p.alias]?.lineStyle?.color ?? generateGanttColor(p.alias),
      }));
    const label = election.assembly ? `${election.assembly} Народно събрание` : '';
    parliamentByDate.set(election.date, { parties, electionLabel: label });
  });

  // Current parliament from last election — used to extend areas to today
  const lastElection = validElections[validElections.length - 1];
  const currentParliament = new Map<string, { mandates: number; percent: number }>();
  lastElection.metrics.parties.forEach((party: any) => {
    if (party.percent >= 4 && party.alias !== 'ДПС (АПС + ДПС-Ново начало)') {
      currentParliament.set(party.alias, { mandates: party.mandates, percent: party.percent });
    }
  });
  parliamentByDate.set(today, parliamentByDate.get(lastElection.date)!);

  // Sort by total mandates descending so biggest parties sit at the bottom of the stack
  const sortedParties = [...partyTotals.entries()].sort(([, a], [, b]) => b - a).map(([alias]) => alias);

  return sortedParties.map((alias) => {
    const dateMap = partyDateMap.get(alias)!;
    const data = allDates.map((date) => {
      const parliament = parliamentByDate.get(date);
      if (date === today) {
        const current = currentParliament.get(alias);
        return {
          value: [date, current?.mandates ?? 0],
          content: { mandates: current?.mandates ?? 0, percent: current?.percent, alias, parties: parliament?.parties ?? [], electionLabel: parliament?.electionLabel ?? '' },
        };
      }
      const entry = dateMap.get(date);
      return {
        value: [date, entry?.mandates ?? 0],
        content: { mandates: entry?.mandates ?? 0, percent: entry?.percent, alias, parties: parliament?.parties ?? [], electionLabel: parliament?.electionLabel ?? '' },
      };
    });

    const partyStyle = style?.[alias];
    const color = partyStyle?.itemStyle?.color ?? partyStyle?.lineStyle?.color ?? generateGanttColor(alias);

    return {
      name: alias,
      type: 'line',
      stack: 'mandates',
      step: 'end',
      areaStyle: { opacity: 0.75 },
      emphasis: { focus: 'series' },
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: { width: 1, color },
      data,
      xAxisIndex,
      yAxisIndex,
      label: { show: false },
      itemStyle: { color },
      tooltip: { show: false },
    };
  });
}

export function buildMandatesTooltipOverlay(elections: any[], style: any, xAxisIndex: number, yAxisIndex: number): any {
  const validElections = elections
    .filter((e: any) => e.metrics?.parties)
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validElections.length === 0) return null;

  const data: any[] = [];

  validElections.forEach((election: any, i: number) => {
    const from = +new Date(election.date);
    const to = i < validElections.length - 1 ? +new Date(validElections[i + 1].date) : +new Date();

    const parties = election.metrics.parties
      .filter((p: any) => p.percent >= 4 && p.alias !== 'ДПС (АПС + ДПС-Ново начало)')
      .sort((a: any, b: any) => b.mandates - a.mandates)
      .map((p: any) => ({
        alias: p.alias,
        mandates: p.mandates,
        percent: p.percent,
        color: style?.[p.alias]?.itemStyle?.color ?? style?.[p.alias]?.lineStyle?.color ?? generateGanttColor(p.alias),
      }));

    const label = election.assembly ? `${election.assembly} Народно събрание` : '';

    data.push({
      value: [from, to],
      content: { parties, electionLabel: label, date: election.date },
    });
  });

  return {
    type: 'custom',
    z: 10,
    renderItem: function (params: any, api: any) {
      const topLeft = api.coord([api.value(0), 240]);
      const bottomRight = api.coord([api.value(1), 0]);

      const rect = { x: topLeft[0], y: topLeft[1], width: bottomRight[0] - topLeft[0], height: bottomRight[1] - topLeft[1] };
      const clipped = echarts.graphic.clipRectByRect(rect, { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height });

      return clipped ? { type: 'rect', shape: clipped, style: { fill: 'transparent' } } : null;
    },
    tooltip: {
      formatter: (params: any) => formatMandatesTooltip(params),
    },
    encode: { x: [0, 1] },
    data: data,
    xAxisIndex,
    yAxisIndex,
  };
}

function formatMandatesTooltip(params: any): string {
  const c = params.data.content;
  const date = humanDate(c.date ?? params.data.value?.[0]);
  const parties: any[] = c.parties ?? [];
  const hoveredAlias = c.alias;
  const maxMandates = parties.length > 0 ? parties[0].mandates : 1;

  const headerHtml = c.electionLabel
    ? `<div style="font-weight:800;font-size:16px;color:${TT_TEXT};letter-spacing:-0.3px;">${c.electionLabel}</div>
       <div style="font-size:13px;color:${TT_MUTED};margin-top:2px;">${date}</div>`
    : `<div style="font-weight:700;font-size:15px;color:${TT_TEXT};">${date}</div>`;

  let rows = '';
  parties.forEach((p: any) => {
    if (p.mandates === 0) return;
    const barW = Math.round((p.mandates / maxMandates) * 100);
    const isHovered = p.alias === hoveredAlias;
    const fill = p.color || '#94a3b8';
    const rowBg = isHovered ? `background:${fill}11;border-left:3px solid ${fill};` : 'border-left:3px solid transparent;';
    const nameWeight = isHovered ? 'font-weight:700;' : 'font-weight:500;';
    const nameColor = isHovered ? TT_TEXT : '#475569';
    const numWeight = isHovered ? 'font-weight:800;font-size:15px;' : 'font-weight:600;font-size:14px;';
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${fill};flex-shrink:0;"></span>`;

    rows += `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px 4px 5px;${rowBg}border-radius:0 4px 4px 0;margin:1px 0;">
      ${dot}
      <span style="${nameWeight}font-size:13px;color:${nameColor};flex:1;white-space:nowrap;">${p.alias}</span>
      <span style="${numWeight}color:${TT_TEXT};font-variant-numeric:tabular-nums;min-width:24px;text-align:right;">${p.mandates}</span>
      <div style="width:60px;height:4px;background:#e2e8f0;border-radius:2px;overflow:hidden;flex-shrink:0;">
        <div style="height:100%;width:${barW}%;background:${fill};border-radius:2px;"></div>
      </div>
    </div>`;
  });

  return `<div style="font-family:${TT_FONT};min-width:300px;">
    <div style="padding:0 4px 8px;">${headerHtml}</div>
    <div style="border-top:1px solid ${TT_BORDER};padding-top:6px;">${rows}</div>
  </div>`;
}
