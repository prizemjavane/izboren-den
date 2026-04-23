import { ECharts } from 'echarts';

export function legendAllUnSelect(chartInstance: ECharts) {
  chartInstance.dispatchAction({
    type: 'legendAllSelect',
  });

  chartInstance.dispatchAction({
    type: 'legendInverseSelect',
  });
}

export function saveAsImage(chartInstance: ECharts, prefix = ''): void {
  const dataURL = chartInstance.getDataURL({
    pixelRatio: 1,
    backgroundColor: '#fff',
  });

  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `${prefix || 'chart'}.png`;
  link.click();
}

export function showHideLabels(chartInstance: any, show: boolean): void {
  const options: any = chartInstance.getOption();
  const updates = options.series.map((s: any) => {
    if (s.type !== 'line') return {};
    if (s.yAxisIndex === 3) {
      return {
        symbol: show ? 'circle' : 'none',
        symbolSize: show ? 4 : 0,
        showSymbol: show,
        label: {
          show,
          position: 'bottom',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 12,
          textShadowBlur: 2,
          textShadowColor: 'rgba(0,0,0,0.5)',
          formatter: (params: any) => {
            const v = params.data?.value?.[1];
            return v != null && v > 0 ? String(v) : '';
          },
        },
      };
    }
    return { label: { show } };
  });
  chartInstance.setOption({ series: updates });
}
