import { ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { environment } from '@env/environment';
import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { CustomChart, LineChart } from 'echarts/charts';
import { DataService } from '@core/data.service';
import { BrushComponent, DataZoomComponent, MarkAreaComponent, MarkLineComponent, ToolboxComponent } from 'echarts/components';
import { HeaderComponent } from '@shared/component/header/header.component';

import { humanDate } from '@util/bg-format';
import { format } from '@util/utils';
import { transformData } from './history-chart-utils';
import { ECharts } from 'echarts';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { IconsModule } from '@shared/icons.module';
import moment from 'moment';
import { historyTimeline } from './history-timeline';
import { buildCurrentDateLine, buildGanttChart, buildLineChart, buildMarkArea, buildMandatesStackedArea, buildMandatesTooltipOverlay, buildPeriodHighlightSeries, buildTooltipCard } from '@util/chart/series';
import { showHideLabels } from '@util/chart/utils';
import { parliamentaryElections } from './history-series';
import { BigChartComponent } from '@shared/component/big-chart/big-chart.component';
import { TooltipDirective } from '@shared/directive/tooltip/tooltip.directive';
echarts.use([LineChart, MarkLineComponent, BrushComponent, ToolboxComponent, DataZoomComponent, CustomChart, MarkAreaComponent]);

interface AssemblyStats {
  assembly: number;
  ordinal: string;
  date: string;
  dateLabel: string;
  description: string;
  activity: number | null;
  activityInt: string;
  activityDec: string;
  activityDiff: number | null;
  activityDiffLabel: string;
  activityDiffSign: 'up' | 'down' | 'none';
  voted: number | null;
  registered: number | null;
  invalid: number | null;
  validTotal: number | null;
  dialArc: string;
  partiesOverBarrier: number;
  sources: { name: string; url: string }[];
  parties: {
    alias: string;
    fullName: string;
    color: string;
    percent: number;
    percentLabel: string;
    votes: number;
    mandates: number;
    votesDiff: number;
    mandatesDiff: number;
    belowThreshold: boolean;
    barWidth: number;
  }[];
}

@Component({
  selector: 'app-history',
  imports: [HeaderComponent, FormsModule, LucideAngularModule, IconsModule, BigChartComponent, TooltipDirective],
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
    'parliament-elections': false,
  };
  public assemblies: { assembly: number; date: string; year: number; yearLabel: string; ordinal: string; monthLabel: string; election: any }[] = [];
  public activeAssembly: number | null = null;
  public selectedStats: AssemblyStats | null = null;
  public statsExpanded = false;
  public settings!: {
    style: any;
    cikCharts: any;
    legend: any;
    tooltip: any;
    defaults: any;
    historyDefaults: any;
    remember: any;
  };

  public data = {
    parliamentaryElections: [],
    timeline: [],
    area: [],
  };

  public githubUrl = environment.githubUrl;

  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);
  private allPartyIds: string[] = [];

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
        this.allPartyIds = transformData(parliamentary, 4).map((p: any) => p.id);
        this.assemblies = parliamentary
          .filter((e: any) => e.assembly != null)
          .map((e: any) => {
            const d = new Date(e.date);
            const y = d.getFullYear();
            return {
              assembly: e.assembly,
              date: e.date,
              year: y,
              yearLabel: "'" + String(y).slice(-2),
              ordinal: this.getAssemblyOrdinal(e.assembly),
              monthLabel: humanDate(e.date),
              election: e,
            };
          });

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

      series.push(buildLineChart(s, { lineStyle: { type: 'dotted', width: 2 } }, 0, 0));
    });

    legend.data.push('activity');
    legend.map['activity'] = 'Избирателна активност';
    legend.selected['activity'] = true;

    transformData(data.parliamentaryElections, 4).forEach((party: any) => {
      legend.data.push(party.id);
      legend.selected[party.id] = true;
      series.push(buildLineChart(party, style[party.id] ?? null, 0, 0));
    });

    data.area.forEach((area: any) => {
      series.push(buildMarkArea(area, true, 0, area.meta?.style));
      series.push(buildMarkArea(area, false, 1, area.meta?.style));
      legend.selected[area.id] = this.switches[area.id] ?? true;
    });

    legend.selected['parliament-elections'] = this.switches['parliament-elections'] ?? true;

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
      lineStyle: { type: 'dotted', width: 3 },
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
    series.push(activitySeries);

    // Mandates stacked area (grid 2)
    buildMandatesStackedArea(data.parliamentaryElections, style, 2, 3).forEach((s: any) => series.push(s));
    const mandatesOverlay = buildMandatesTooltipOverlay(data.parliamentaryElections, style, 2, 3);
    if (mandatesOverlay) series.push(mandatesOverlay);
    series.push(buildCurrentDateLine(2, 3));
    series.push(parliamentaryElections(data.parliamentaryElections, style, false, 2, 3));

    const { selected } = this.getDefault(data.parliamentaryElections, series, this.settings.legend.hide);
    legend.selected = selected;
    data.area.forEach((area: any) => {
      legend.selected[area.id] = this.switches[area.id] ?? true;
    });
    legend.selected['parliament-elections'] = this.switches['parliament-elections'] ?? true;

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

    series.forEach((item: any) => {
      if (item.name !== undefined) {
        legend.push(item.name);
        selected[item.name] = false;
      }
    });

    this.allPartyIds.forEach((id: string) => {
      selected[id] = true;
    });

    (this.settings.historyDefaults ?? this.settings.defaults).forEach((e: any) => {
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
            this.activeAssembly = match.assembly ?? null;
            this.selectedStats = this.buildAssemblyStats(match);
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
          this.activeAssembly = null;
          this.selectedStats = null;
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

    this.onChangePreset();
  }

  switchNs(nsNumber: string, threshold: number, chartInstance: ECharts, election: any): void {
    const ns: any = election.find((item: any) => item.date === nsNumber);
    const date = ns.date;

    this.highlight(date, 'parliament-elections');

    const options: any = chartInstance.getOption();
    const current = options.legend?.[0]?.selected ?? {};
    const next: Record<string, boolean> = {};

    for (const key of Object.keys(current)) {
      next[key] = false;
    }

    this.settings.cikCharts.forEach((item: any) => {
      if (current[item.name]) next[item.name] = true;
    });

    this.settings.remember.forEach((type: any) => {
      if (current[type]) next[type] = true;
    });

    const result: any = election.find((item: any) => item.date === date);
    result.metrics.parties.forEach((party: any) => {
      if (party.percent >= threshold) next[party.alias] = true;
    });

    chartInstance.setOption({ legend: [{ selected: next }] });
  }

  reset(): void {
    this.maxDate = 0;
    this.selectedStats = null;

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

  selectAllParties(): void {
    this.setPartiesSelected(true);
  }

  deselectAllParties(): void {
    this.setPartiesSelected(false);
  }

  resetToDefaults(): void {
    if (!this.chartInstance) return;
    this.activeAssembly = null;
    this.selectedStats = null;
    this.statsExpanded = false;
    const options: any = this.chartInstance.getOption();
    const current = options.legend?.[0]?.selected ?? {};
    const next: Record<string, boolean> = {};
    for (const key of Object.keys(current)) next[key] = false;
    for (const id of this.allPartyIds) next[id] = true;
    (this.settings.historyDefaults ?? this.settings.defaults).forEach((e: string) => { next[e] = true; });
    this.data.area.forEach((area: any) => { next[area.id] = this.switches[area.id] ?? true; });
    next['parliament-elections'] = this.switches['parliament-elections'] ?? true;
    this.chartInstance.setOption({ legend: [{ selected: next }] });
  }

  private setPartiesSelected(value: boolean): void {
    if (!this.chartInstance) return;
    this.activeAssembly = null;
    this.selectedStats = null;
    const options: any = this.chartInstance.getOption();
    const current = options.legend?.[0]?.selected ?? {};
    const next = { ...current };
    for (const name of this.allPartyIds) next[name] = value;
    this.chartInstance.setOption({ legend: [{ selected: next }] });
  }

  selectAssembly(a: { assembly: number; date: string; election: any }): void {
    if (!this.chartInstance) return;

    if (this.activeAssembly === a.assembly) {
      this.activeAssembly = null;
      this.selectedStats = null;
      this.statsExpanded = false;
      this.unhighlight('parliament-elections');
      this.selectAllParties();
      return;
    }

    this.activeAssembly = a.assembly;
    this.selectedStats = this.buildAssemblyStats(a.election);
    if (!this.selectedStats) this.statsExpanded = false;
    this.highlight(a.date, 'parliament-elections');

    const threshold = 4;
    const enabledParties = new Set<string>(
      (a.election.metrics?.parties ?? [])
        .filter((p: any) => p.percent >= threshold)
        .map((p: any) => p.alias)
    );

    const options: any = this.chartInstance.getOption();
    const currentSelected = options.legend?.[0]?.selected ?? {};
    const nextSelected = { ...currentSelected };
    for (const name of this.allPartyIds) {
      nextSelected[name] = enabledParties.has(name);
    }

    this.chartInstance.setOption({ legend: [{ selected: nextSelected }] });

    this.cdr.detectChanges();
  }

  private buildAssemblyStats(election: any): AssemblyStats | null {
    if (!election) return null;
    const style = this.settings?.style ?? {};
    const fallbackPalette = ['#1e3a8a', '#b33a3a', '#1a7a5c', '#c2410c', '#7c3aed', '#0369a1', '#a16207', '#be123c', '#115e59', '#4d7c0f'];

    const rawParties: any[] = election.metrics?.parties ?? [];
    const maxPercent = rawParties.reduce((m, p) => Math.max(m, p.percent ?? 0), 0) || 1;

    const parties = [...rawParties]
      .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
      .map((p: any, i: number) => {
        const color = style[p.alias]?.lineStyle?.color ?? style[p.alias]?.itemStyle?.color ?? fallbackPalette[i % fallbackPalette.length];
        const percent = p.percent ?? 0;
        return {
          alias: p.alias,
          fullName: p.name,
          color,
          percent,
          percentLabel: percent.toFixed(2),
          votes: p.votes ?? 0,
          mandates: p.mandates ?? 0,
          votesDiff: p.votesDiff ?? 0,
          mandatesDiff: p.mandatesDiff ?? 0,
          belowThreshold: percent < 4,
          barWidth: Math.max(2, Math.round((percent / maxPercent) * 100)),
        };
      });

    const activity: number | null = election.activity ?? null;
    const dialArc = activity != null ? `${Math.max(0, Math.min(100, activity)).toFixed(2)}` : '0';

    const activityDiff: number | null = election.activityDiff ?? null;
    const isFirst = activityDiff != null && activity != null && Math.abs(activityDiff - activity) < 0.001;
    const showDiff = activityDiff != null && !isFirst;
    const activityDiffLabel = showDiff ? `${activityDiff! > 0 ? '+' : ''}${activityDiff!.toFixed(2)}%` : '';
    const activityDiffSign: 'up' | 'down' | 'none' = showDiff ? (activityDiff! > 0 ? 'up' : activityDiff! < 0 ? 'down' : 'none') : 'none';

    let activityInt = '—';
    let activityDec = '';
    if (activity != null) {
      const fixed = activity.toFixed(2);
      const [intPart, decPart] = fixed.split('.');
      activityInt = intPart;
      activityDec = decPart;
    }

    return {
      assembly: election.assembly,
      ordinal: this.getAssemblyOrdinal(election.assembly),
      date: election.date,
      dateLabel: humanDate(election.date),
      description: election.description ?? '',
      activity,
      activityInt,
      activityDec,
      activityDiff,
      activityDiffLabel,
      activityDiffSign,
      voted: election.metrics?.voted?.value ?? null,
      registered: election.metrics?.registered?.value ?? null,
      invalid: election.metrics?.invalid?.value ?? null,
      validTotal: election.metrics?.validTotal?.value ?? null,
      dialArc,
      partiesOverBarrier: parties.filter((p) => !p.belowThreshold).length,
      sources: this.transformElectionSources(election.sources) ?? [],
      parties,
    };
  }

  public formatNumber(n: number | null | undefined): string {
    if (n == null) return '—';
    return format(n, 0);
  }

  public formatSigned(n: number | null | undefined, decimals = 2): string {
    if (n == null || n === 0) return '';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(decimals)}`;
  }

  public formatSignedInt(n: number | null | undefined): string {
    if (n == null || n === 0) return '';
    const sign = n > 0 ? '+' : '';
    return `${sign}${format(n, 0)}`;
  }

  getAssemblyOrdinal(n: number): string {
    const lastDigit = n % 10;
    const lastTwoDigits = n % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return '-то';
    if (lastDigit === 1) return '-во';
    if (lastDigit === 2) return '-ро';
    return '-то';
  }

  toggleLabels(_save = true): void {
    showHideLabels(this.chartInstance, this.switches['labels']);
  }

  highlight(date: string, name: string): void {
    const allSeries: any[] = (this.chartInstance.getOption() as any)['series'];
    const updates: any[] = allSeries.map(() => ({}));
    let changed = false;

    allSeries.forEach((s: any, i: number) => {
      if (s.name !== name || !s.markLine?.data) return;

      const newData = s.markLine.data.map((item: any) => {
        const isTarget = item.xAxis === date;
        return {
          ...item,
          lineStyle: {
            ...item.lineStyle,
            ...(isTarget ? { color: '#000' } : {}),
            width: isTarget ? 3 : 1,
          },
        };
      });

      updates[i] = { markLine: { data: newData } };
      changed = true;
    });

    if (changed) {
      this.chartInstance.setOption({ series: updates });
    }
  }

  unhighlight(name: string): void {
    const allSeries: any[] = (this.chartInstance.getOption() as any)['series'];
    const updates: any[] = allSeries.map(() => ({}));
    let changed = false;

    allSeries.forEach((s: any, i: number) => {
      if (s.name !== name || !s.markLine?.data) return;
      updates[i] = {
        markLine: {
          data: s.markLine.data.map((item: any) => ({
            ...item,
            lineStyle: { ...item.lineStyle, width: 1 },
          })),
        },
      };
      changed = true;
    });

    if (changed) {
      this.chartInstance.setOption({ series: updates });
    }
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

    const seriesConfig: any = (this.chartInstance?.getOption() as any)?.series?.[event.seriesIndex];
    if (seriesConfig?.yAxisIndex === 3) {
      this.bigChart?.closeDetailPanel();
      return;
    }

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
    if (!this.chartInstance) return;
    const options: any = this.chartInstance.getOption();
    if (!options) return;
    const current = options.legend?.[0]?.selected ?? {};
    const next = { ...current };
    next['covid'] = !!this.switches['covid'];
    next['other-events'] = !!this.switches['other-events'];
    next['parliament-elections'] = !!this.switches['parliament-elections'];
    next['citizen-protests'] = !!this.switches['protests'];
    this.chartInstance.setOption({ legend: [{ selected: next }] });
  }

  private transformElectionSources(sources: any): any[] | null {
    if (!Array.isArray(sources) || !sources.length) return null;
    return [...sources].sort((a, b) => {
      const aExt = typeof a.url === 'string' && a.url.startsWith('http');
      const bExt = typeof b.url === 'string' && b.url.startsWith('http');
      return aExt === bExt ? 0 : aExt ? -1 : 1;
    });
  }
}
