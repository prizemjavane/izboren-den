import { humanDate, humanDateDiff } from '@util/bg-format';
import { buildTooltipCard, formatDataPointTooltip, toNow } from '@util/chart/series';

export function historyTimeline(series: any, yAxisGantt: any, legend: { data: string[]; map: any; selected: object }, options?: { mandatesGrid?: boolean }) {
  const axisLabels = getAllYearsFromDates(getUniqueDates(series));
  const maxDate = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().slice(0, 10);
  const showMandates = options?.mandatesGrid ?? false;

  return {
    tooltip: {
      axisPointer: {
        type: 'cross',
      },
      textStyle: {
        fontSize: 16,
      },
      formatter: function (params: any) {
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

        return formatDataPointTooltip(params, params.seriesName, '', '', '', '');
      },
    },
    grid: showMandates
      ? [
          { containLabel: false, right: 443, left: '14%', top: '47%', bottom: '3%' },
          { top: '1%', bottom: '79%', right: 443, left: '14%' },
          { top: '24%', bottom: '56%', right: 443, left: '14%' },
        ]
      : [
          { containLabel: false, right: 443, left: '14%', top: '31%', bottom: '3%' },
          { top: '1%', bottom: '71%', right: 443, left: '14%' },
        ],
    legend: {
      inactiveColor: '#999',
      type: 'scroll',
      orient: 'vertical',
      right: 5,
      top: 20,
      bottom: 20,
      width: 400,
      data: legend.data,
      formatter: function (name: any) {
        const text = legend.map[name] || name;
        if (text.length > 50) {
          return text.slice(0, 50) + '...';
        }
        return text;
      },
      selected: legend.selected,
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: showMandates ? [0, 1, 2] : [0, 1],
        filterMode: 'none',
      },
    ],
    xAxis: [
      {
        show: true,
        type: 'time',
        splitLine: {
          show: true,
        },
        min: `${axisLabels[0]}-01-01`,
        max: maxDate,
        axisTick: {
          alignWithLabel: false,
          customValues: axisLabels,
        },
        axisLabel: {
          fontSize: 14,
          customValues: axisLabels,
          formatter: '{yyyy}',
          hideOverlap: true,
        },
      },
      {
        show: true,
        type: 'time',
        splitLine: {
          show: true,
        },
        min: `${axisLabels[0]}-01-01`,
        max: maxDate,
        axisTick: {
          show: false,
          alignWithLabel: false,
          customValues: axisLabels,
        },
        axisLabel: {
          show: false,
        },
        axisPointer: { show: false },
        gridIndex: 1,
      },
      ...(showMandates
        ? [
            {
              show: true,
              type: 'time',
              splitLine: { show: true },
              min: `${axisLabels[0]}-01-01`,
              max: maxDate,
              axisTick: { show: false },
              axisLabel: { show: false },
              axisPointer: { show: false },
              gridIndex: 2,
            },
          ]
        : []),
    ],
    yAxis: [
      {
        type: 'value',
      },
      {
        gridIndex: 1,
        data: yAxisGantt,
        inverse: true,
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: true },
        axisLabel: {
          fontSize: 13,
        },
        axisPointer: { show: false },
      },
      {
        type: 'value',
        position: 'left',
        offset: 80,
        min: 0,
        max: 100,
        splitNumber: 5,
        axisLabel: {
          fontSize: 12,
          formatter: '{value}%',
        },
        axisLine: { show: true },
        axisTick: { show: true },
        splitLine: { show: false },
      },
      ...(showMandates
        ? [
            {
              gridIndex: 2,
              type: 'value',
              max: 240,
              splitNumber: 4,
              name: 'Мандати',
              nameLocation: 'middle',
              nameRotate: 0,
              nameGap: 45,
              nameTextStyle: { fontSize: 13, color: '#64748b' },
              axisLabel: { fontSize: 12 },
              splitLine: { show: true },
            },
          ]
        : []),
    ],
    animation: false,
    series: series,
    textStyle: {
      fontFamily: 'Sofia Sans',
      fontSize: 14,
    },
  };
}

function getUniqueDates(dataArray: any): string[] {
  const dateSet = new Set<string>();

  // Iterate through the array of objects
  dataArray.forEach((item: any) => {
    if (item.data && Array.isArray(item.data)) {
      item.data.forEach((innerItem: any) => {
        if (innerItem.value) {
          const date = innerItem.value[0];
          if (typeof date === 'string' && !isNaN(Date.parse(date))) {
            dateSet.add(date);
          }
        }
      });
    }
  });

  return Array.from(dateSet);
}

function getAllYearsFromDates(dates: string[]): string[] {
  const yearSet = new Set<number>(); // Use a Set to store unique years

  // Iterate through the array of date strings
  dates.forEach((date) => {
    if (!isNaN(Date.parse(date))) {
      const year = new Date(date).getFullYear(); // Extract the year
      yearSet.add(year); // Add the year to the Set
    }
  });

  // Convert the Set to an array and sort it
  const uniqueYears = Array.from(yearSet).sort((a, b) => a - b);

  // Get the lowest year and the current year
  const startYear = uniqueYears[0];
  const currentYear = new Date().getFullYear() + 10;

  // Create an array of all years from the lowest year to the current year
  const allYears: number[] = [];
  for (let year = startYear; year <= currentYear; year++) {
    allYears.push(year);
  }

  return allYears.map((num) => num.toString());
}
