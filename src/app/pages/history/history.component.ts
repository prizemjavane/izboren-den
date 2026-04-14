import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { CustomChart, LineChart } from 'echarts/charts';
import { DataService } from '@core/data.service';
import { BrushComponent, DataZoomComponent, MarkAreaComponent, MarkLineComponent, ToolboxComponent } from 'echarts/components';
import { HeaderComponent } from '@shared/component/header/header.component';

import { humanDate } from '@util/bg-format';
import { transformData } from './history-chart-utils';
import { ECharts } from 'echarts';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { IconsModule } from '@shared/icons.module';
import moment from 'moment';
import { historyTimeline } from './history-timeline';
import { buildCurrentDateLine, buildGanttChart, buildLineChart, buildMarkArea, buildMandatesStackedArea, buildMandatesTooltipOverlay, buildPeriodHighlightSeries, buildTooltipCard } from '@util/chart/series';
import { showHideLabels, switchLegends } from '@util/chart/utils';
import { parliamentaryElections } from './history-series';
import { BigChartComponent } from '@shared/component/big-chart/big-chart.component';
echarts.use([LineChart, MarkLineComponent, BrushComponent, ToolboxComponent, DataZoomComponent, CustomChart, MarkAreaComponent]);

@Component({
  selector: 'app-history',
  imports: [HeaderComponent, FormsModule, LucideAngularModule, IconsModule, BigChartComponent],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
  providers: [provideEchartsCore({ echarts })],
})
export class HistoryComponent implements OnInit {
  @ViewChild(BigChartComponent) bigChart?: BigChartComponent;

  public chart!: any;
  public chartInstance!: ECharts;
  public maxDate = 0;
  public switches: Record<string, boolean> = {
    covid: false,
    protests: true,
    'parliament-elections': true,
  };
  public settings!: {
    style: any;
    cikCharts: any;
    legend: any;
    tooltip: any;
    defaults: any;
    remember: any;
  };

  public data = {
    parliamentaryElections: [],
    timeline: [],
    area: [],
  };

  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    forkJoin([
      this.dataService.getData('parliament_normalized.json'),
      this.dataService.getData('institutions.json'),
      this.dataService.getData('events.json'),
      this.dataService.getData('defaults.json'),
    ]).subscribe({
      next: ([parliamentary, timeline, area, settings]) => {
        parliamentary.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

        this.settings = settings;
        this.data.parliamentaryElections = parliamentary;
        this.data.timeline = timeline;
        this.data.area = area;

        this.loadChart(
          {
            parliamentaryElections: this.data.parliamentaryElections,
            area: this.data.area,
          },
          this.data.timeline,
          this.settings.style,
          this.settings.cikCharts
        );

        this.cdr.detectChanges();
      },
      error: () => { /* handled gracefully */ },
      complete: () => { /* subscription complete */ },
    });
  }

  loadChart(data: { parliamentaryElections: any; area: any }, gantt: any, style: any, charts: any) {
    const series: any = [];
    const map = charts.reduce((acc: [], item: any) => ({ ...acc, [item.code]: item.name }), {});

    const legend: any = { data: [], map: map, selected: {} };

    series.push(parliamentaryElections(data.parliamentaryElections, style, false, 0, 0));
    series.push(parliamentaryElections(data.parliamentaryElections, style, true, 1, 1));
    series.push(buildCurrentDateLine());
    series.push(buildCurrentDateLine(1));

    charts.forEach((e: any) => {
      const chartData: any = [];

      data.parliamentaryElections.forEach((item: any) => {
        const metric = item['metrics']?.[e.code];
        if (metric) {
          chartData.push({
            date: item.date,
            value: metric['value'],
            change: metric['diff'],
            description: item.description,
          });
        }
      });

      const s = { id: e.code, name: e.name, data: chartData };

      legend.data.push(s.id);
      legend.selected[s.id] = true;

      series.push(buildLineChart(s, null, 0, 0));
    });

    transformData(data.parliamentaryElections, 4).forEach((party: any) => {
      legend.data.push(party.id);
      legend.selected[party.id] = true;
      series.push(buildLineChart(party, null, 0, 0));
    });

    data.area.forEach((area: any) => {
      series.push(buildMarkArea(area, true, 0, area.meta?.style));
      series.push(buildMarkArea(area, false, 1, area.meta?.style));
    });

    series.push(buildGanttChart(gantt, 1));
    series.push(buildPeriodHighlightSeries(0, 0));

    // Activity percentage line (grid 0, yAxis 2 = percentage right axis)
    const activityPoints: any[] = [];
    data.parliamentaryElections.forEach((item: any) => {
      if (item.activity != null) {
        activityPoints.push({
          value: [item.date, item.activity],
          content: { diff: item.activityDiff, date: item.date, assembly: item.assembly, description: item.description },
        });
      }
    });
    const activitySeries: any = {
      name: 'activity',
      type: 'line',
      z: 3,
      xAxisIndex: 0,
      yAxisIndex: 2,
      symbolSize: 7,
      itemStyle: {
        borderWidth: 2,
        borderColor: '#dc2626',
      },
      color: '#dc2626',
      lineStyle: { type: 'solid', width: 3 },
      label: { show: false },
      emphasis: {
        focus: 'series',
        itemStyle: {
          borderWidth: 3,
          borderColor: '#dc2626',
          shadowBlur: 10,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
        },
        scale: true,
        scaleSize: 6,
      },
      data: activityPoints,
      tooltip: {
        formatter: (params: any) => {
          const c = params.data.content;
          const val = params.value[1];
          const diffVal = c.diff != null && c.diff !== val ? c.diff : 0;
          const sign = diffVal > 0 ? '+' : '';
          const diffColor = diffVal > 0 ? '#16a34a' : '#dc2626';

          return buildTooltipCard({
            name: 'Избирателна активност',
            date: humanDate(c.date),
            color: params.color,
            description: c.description,
            value: `${val.toFixed(2)}%`,
            diff: diffVal ? `${sign}${diffVal.toFixed(2)}%` : undefined,
            diffColor: diffVal ? diffColor : undefined,
            progressBar: { value: val, color: params.color },
            footer: c.assembly ? `${c.assembly}-то НС` : undefined,
          });
        },
      },
    };
    legend.data.push('activity');
    legend.map['activity'] = 'Избирателна активност';
    legend.selected['activity'] = true;
    series.push(activitySeries);

    // Mandates stacked area (grid 2)
    buildMandatesStackedArea(data.parliamentaryElections, style, 2, 3).forEach((s: any) => series.push(s));
    const mandatesOverlay = buildMandatesTooltipOverlay(data.parliamentaryElections, style, 2, 3);
    if (mandatesOverlay) series.push(mandatesOverlay);
    series.push(buildCurrentDateLine(2, 3));
    series.push(parliamentaryElections(data.parliamentaryElections, style, false, 2, 3));

    this.getDefault(data.parliamentaryElections, series, this.settings.legend.hide);

    this.chart = historyTimeline(
      series,
      gantt.map((group: any) => group.name),
      legend,
      { mandatesGrid: true }
    );
  }

  getDefault(elections: any, series: any, legendHide: any) {
    let legend: string[] = [];
    const selected: any = {};

    const last = [...elections].reverse().find((e: any) => e.metrics?.parties);

    series.forEach((item: any) => {
      if (item.name !== undefined) {
        legend.push(item.name);
        selected[item.name] = false;
      }
    });

    last.metrics.parties.forEach((e: any) => {
      if (e.percent >= 4) {
        selected[e.alias] = true;
      }
    });

    this.settings.defaults.forEach((e: any) => {
      selected[e] = true;
    });

    legend = legend.filter((item: any) => !legendHide.includes(item));

    return { selected, legend };
  }

  onChartReady(chart: ECharts): void {
    this.chartInstance = chart;
    this.applySeriesBorderColors(chart);

    chart.getZr().on('click', (event: any) => {
      if (!event.target) {
        const pointInPixel = [event.offsetX, event.offsetY];

        if (chart.containPixel({ gridIndex: 0 }, pointInPixel)) {
          const threshold = 6;
          const match: any = this.data.parliamentaryElections.find((el: any) => {
            const elPixel = chart.convertToPixel({ xAxisIndex: 0 }, [+new Date(el.date), 0]);
            return Math.abs(elPixel[0] - event.offsetX) < threshold;
          });

          if (match) {
            this.switchNs(match.date, 4, chart, this.data.parliamentaryElections);
            this.bigChart?.setContent({
              name: match.description,
              sources: this.transformElectionSources(match.sources),
              date: match.date,
              file: 'parliament_normalized.json',
            });
            this.bigChart?.addMarkPointByDate(match.date);
            this.cdr.detectChanges();
            return;
          }
        }

        if (this.bigChart?.content) {
          this.bigChart.closeDetailPanel();
          this.cdr.detectChanges();
        }
      }
    });

    chart.dispatchAction({
      type: 'legendAllSelect',
    });

    chart.dispatchAction({
      type: 'legendInverseSelect',
    });
  }

  switchNs(nsNumber: string, threshold: number, chartInstance: ECharts, election: any): void {
    const ns: any = election.find((item: any) => item.date === nsNumber);
    const date = ns.date;

    this.highlight(date, 'parliament-elections');

    const legend: any = chartInstance.getOption()['legend'];
    const enabled: any = [];

    this.settings.cikCharts.forEach((item: any) => {
      if (legend[0]['selected'][item.name]) {
        enabled.push(item.name);
      }
    });

    this.settings.remember.forEach((type: any) => {
      if (legend[0]['selected'][type]) {
        enabled.push(type);
      }
    });

    this.bigChart?.hideAllLegends();

    const result: any = election.find((item: any) => item.date === date);

    result.metrics.parties.forEach((party: any) => {
      if (party.percent >= threshold) {
        chartInstance.dispatchAction({
          type: 'legendSelect',
          name: party.alias,
        });
      }
    });

    enabled.forEach((item: any) => {
      chartInstance.dispatchAction({
        type: 'legendSelect',
        name: item,
      });
    });
  }

  reset(): void {
    this.maxDate = 0;

    this.loadChart(
      {
        parliamentaryElections: this.data.parliamentaryElections,
        area: this.data.area,
      },
      this.data.timeline,
      this.settings.style,
      this.settings.cikCharts
    );
  }

  restoreDefaults(): void {
    this.maxDate = 0;
    this.switches = { covid: false, protests: true, 'parliament-elections': true };
    this.bigChart?.closeDetailPanel();
    this.ngOnInit();
  }

  toggleLabels(_save = true): void {
    showHideLabels(this.chartInstance, this.switches['labels']);
  }

  highlight(date: string, name: string): void {
    const series: any = this.chartInstance.getOption()['series'];
    const filteredSeries = series.filter((item: any) => item.name === name);

    filteredSeries.forEach((series: any) => {
      series.markLine.data.forEach((item: any) => {
        item['lineStyle']['width'] = 1;
      });

      const item = series.markLine.data.find((item: any) => item.xAxis === date);

      item['lineStyle']['color'] = '#000';
      item['lineStyle']['width'] = 3;
    });

    const option = this.chartInstance.getOption();

    option['series'] = series;

    this.chartInstance.setOption(option);
  }

  onChartLegendSelectChanged(event: any) {
    let maxDate: any = null;
    const options: any = this.chartInstance.getOption();

    const s = options['series'].find((item: any) => {
      return item.name === event.name;
    });

    s.markLine?.data.forEach((item: any) => {
      if (maxDate === null || new Date(item.xAxis) > maxDate) {
        maxDate = new Date(item.xAxis);
      }
    });

    if (!maxDate) {
      return;
    }

    const max = moment(maxDate).add(6, 'months').format('YYYY-MM-DD');

    if (options['xAxis'][0]['max'] === undefined || new Date(options['xAxis'][0]['max']) < maxDate) {
      this.chartInstance.setOption({
        xAxis: [{ max: max }, { max: max }],
      });
    }
  }

  onDataClick(event: any): void {
    const date = event.data?.content?.date;
    if (!date || event.data?.content?.type === 'gantt') return;

    const match: any = this.data.parliamentaryElections.find((el: any) => el.date === date);
    if (!match) return;

    const sources = this.transformElectionSources(match.sources);
    if (sources && this.bigChart) {
      this.bigChart.content = {
        ...this.bigChart.content,
        sources,
        file: 'parliament_normalized.json',
      };
      this.cdr.detectChanges();
    }
  }

  private applySeriesBorderColors(chart: ECharts): void {
    const options: any = chart.getOption();
    if (!options?.series) return;
    const palette: string[] = options.color || [];

    const updates = options.series.map((s: any, i: number) => {
      if (s.type !== 'line' || !s.itemStyle?.borderWidth) return {};

      const color = s.color || s.itemStyle?.color || palette[i % palette.length];
      if (!color) return {};

      return {
        itemStyle: { borderColor: color },
        emphasis: { itemStyle: { borderColor: color } },
      };
    });

    chart.setOption({ series: updates });
  }

  onChangePreset() {
    switchLegends(['covid'], this.switches['covid'], this.chartInstance);
    switchLegends(['other-events'], this.switches['other-events'], this.chartInstance);
    switchLegends(['parliament-elections'], this.switches['parliament-elections'], this.chartInstance);
    switchLegends(['citizen-protests'], this.switches['protests'], this.chartInstance);
  }

  private transformElectionSources(sources: any): any[] | null {
    if (!sources || typeof sources !== 'object') return null;
    const result: any[] = [];
    if (sources.url_activity) {
      result.push({ name: 'Активност (ЦИК)', url: [sources.url_activity] });
    }
    if (sources.url_result) {
      result.push({ name: 'Резултати (ЦИК)', url: [sources.url_result] });
    }
    return result.length ? result : null;
  }
}
