import { humanDate, humanDateDiff } from '@util/bg-format';

export function parliamentaryElections(chart: any, style: any = null, showLabels: boolean, xAxisIndex: number, yAxisIndex: number) {
  const id = 'parliament-elections';
  const seriesColor = style?.[id]?.lineStyle.color;
  const data: any = [];

  chart.forEach((item: any) => {
    data.push({
      name: item.name,
      xAxis: item.date,
      lineStyle: {
        color: '#777777',
        type: 'solid',
      },
      label: {
        show: showLabels,
        position: 'start',
        formatter: (item.subtitle ?? '') + '\n' + item.assembly,
      },
      content: {
        name: item.name ?? id,
        sources: item.sources,
        description: item.description,
        date: item.date,
      },
    });
  });

  return {
    type: 'line',
    name: id,
    z: 0,
    data: [],
    markLine: {
      data: data,
      tooltip: {
        formatter: function (params: any) {
          let date = humanDate(params.data.value);
          const color = seriesColor ? seriesColor : params.data?.lineStyle?.color ? params.data?.lineStyle?.color : '#000';
          let result = '';
          let diffText = '';

          if (params.data.name) {
            result += `Парламентарни избори за ${params.data.name} Народно събрание`;
          } else {
            result += id;
          }

          if (new Date(params.data.value) < new Date()) {
            diffText = `<br>${humanDateDiff(params.data.value, new Date().getTime())} до днес`;
          } else {
            date = 'около ' + date;
            diffText = `<br>след около ${humanDateDiff(new Date().getTime(), params.data.value)}`;
          }

          result += `<br><span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};"></span><b>${date}</b>${diffText}`;

          return result;
        },
      },
      silent: true,
      animation: false,
      symbol: 'none',
      emphasis: {
        lineStyle: {
          width: 3,
          color: '#333',
        },
      },
    },
    xAxisIndex: xAxisIndex,
    yAxisIndex: yAxisIndex,
    color: seriesColor,
  };
}
