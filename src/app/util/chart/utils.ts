import { ECharts } from 'echarts';
import moment from 'moment';

import { buildGanttChart, buildLineChart, buildMarkArea, buildMarkLine, buildCurrentDateLine, buildMediaChart } from './series';
import { sortArrayByReference } from '@util/utils';

export function switchLegends(legends: string[], show: boolean, chartInstance: ECharts) {
  legends.forEach((legend) => {
    chartInstance.dispatchAction({
      type: show ? 'legendSelect' : 'legendUnSelect',
      name: legend,
    });
  });
}

export function legendAllUnSelect(chartInstance: ECharts) {
  chartInstance.dispatchAction({
    type: 'legendAllSelect',
  });

  chartInstance.dispatchAction({
    type: 'legendInverseSelect',
  });
}

export function buildSeries(area: any, gantt: any, charts: any, verticalLine: any, media: any) {
  const series: any = [];

  series.push(buildCurrentDateLine());
  series.push(buildCurrentDateLine(1));

  area.forEach((item: any) => {
    series.push(buildMarkArea(item, false, 0, item.meta?.style));
    series.push(buildMarkArea(item, true, 1, item.meta?.style));
  });

  verticalLine.forEach((item: any) => {
    series.push(buildMarkLine(item.items, false, 0, 0, item.id, item.meta?.style, item.name));
    series.push(buildMarkLine(item.items, false, 1, 1, item.id, item.meta?.style, item.name));
  });

  series.push(buildMediaChart(media));

  charts.forEach((chart: any) => {
    if (chart.unit === 'percent') {
      series.push(buildLineChart(chart, null, 1, 1));
    } else {
      series.push(buildLineChart(chart, null, 1, 2));
    }
  });

  series.push(buildGanttChart(gantt, 0));

  return series;
}

export function saveAsImage(chartInstance: ECharts, prefix = ''): void {
  const dataURL = chartInstance.getDataURL({
    pixelRatio: 1,
    backgroundColor: '#fff',
  });

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `${prefix}-${moment().format('YYYY-MM-DD')}.png`;
  link.click();
}

export function toggleLegends(series: any, chartInstance: any, legends: any, state: boolean): void {
  const options: any = chartInstance.getOption();

  if (state) {
    // Add to legend.
    chartInstance.setOption({
      legend: {
        data: sortArrayByReference(legends, [...options.legend[0].data, ...series]),
        selected: {
          ...Object.fromEntries(series.map((key: any) => [key, false])),
          ...options.legend[0].selected,
        },
      },
    });
  } else {
    // Remove from legend.
    chartInstance.setOption({
      legend: {
        data: sortArrayByReference(
          legends,
          options.legend[0].data.filter((item: any) => !series.includes(item))
        ),
        selected: {
          ...options.legend[0].selected,
          ...Object.fromEntries(series.map((key: any) => [key, false])),
        },
      },
    });
  }
}

export function addLegend(series: string[], chartInstance: any, legends: any): void {
  const options: any = chartInstance.getOption();

  chartInstance.setOption({
    legend: {
      data: sortArrayByReference(legends, [...options.legend[0].data, ...series]),
      selected: {
        ...Object.fromEntries(series.map((key: any) => [key, false])),
        ...options.legend[0].selected,
      },
    },
  });
}

export function removeLegend(series: string[], chartInstance: any, legends: any): void {
  const options: any = chartInstance.getOption();

  chartInstance.setOption({
    legend: {
      data: sortArrayByReference(
        legends,
        options.legend[0].data.filter((item: any) => !series.includes(item))
      ),
      selected: {
        ...options.legend[0].selected,
        ...Object.fromEntries(series.map((key: any) => [key, false])),
      },
    },
  });
}

export function filterSeries(series: any, placeholders: string[]): string[] {
  let result: any = [];

  placeholders.forEach((placeholder) => {
    const regex = new RegExp(`\\b${placeholder}\\b`, 'i');
    const filteredItems = series.filter((item: any) => regex.test(item.name));

    result = [...filteredItems, ...result];
  });

  return result.map((item: any) => item.name);
}

export function showHideLabels(chartInstance: any, show: boolean): void {
  const options: any = chartInstance.getOption();
  const charts = options.series.filter((item: any) => item.type === 'line');

  charts.forEach((item: any) => {
    item.label.show = show;
  });

  chartInstance.setOption(options);
}
