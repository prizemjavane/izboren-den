import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { CustomChart, LineChart } from 'echarts/charts';
import { BrushComponent, DataZoomComponent, MarkAreaComponent, MarkLineComponent, MarkPointComponent, ToolboxComponent } from 'echarts/components';
import { ECharts } from 'echarts';
import { LucideAngularModule } from 'lucide-angular';
import { IconsModule } from '@shared/icons.module';
import { BgDatePipe } from '@shared/pipe/bg-date.pipe';
import { humanDateDiff } from '@util/bg-format';
import { saveAsImage, legendAllUnSelect } from '@util/chart/utils';
import { TooltipDirective } from '@shared/directive/tooltip/tooltip.directive';
import { buildGanttHighlightUpdates, buildGanttResetUpdates, buildPeriodHighlightUpdates, clearPeriodHighlightUpdates } from '@util/chart/highlights';
import { environment } from '@env/environment';

echarts.use([LineChart, MarkLineComponent, MarkPointComponent, BrushComponent, ToolboxComponent, DataZoomComponent, CustomChart, MarkAreaComponent]);

@Component({
  selector: 'app-big-chart',
  imports: [NgxEchartsDirective, BgDatePipe, LucideAngularModule, IconsModule, TooltipDirective],
  templateUrl: './big-chart.component.html',
  styleUrl: './big-chart.component.scss',
  providers: [provideEchartsCore({ echarts })],
})
export class BigChartComponent {
  @Input() options: any;
  @Input() height = '75vh';

  @Output() chartReady = new EventEmitter<ECharts>();
  @Output() dataClick = new EventEmitter<any>();
  @Output() legendSelectChanged = new EventEmitter<any>();

  public chartInstance!: ECharts;
  public content: any = null;
  public selectedGanttIndex: number | null = null;
  private markedPoint: { seriesIndex: number; originalData: any[] } | null = null;
  private clickedPoint: { seriesIndex: number; dataIndex: number } | null = null;

  protected readonly humanDateDiff = humanDateDiff;

  get diffInfo(): { text: string; color: string } | null {
    if (!this.content) return null;
    const raw = this.content.change ?? this.content.diff ?? 0;
    if (!raw || raw === this.content.displayValue) return null;
    const sign = raw > 0 ? '+' : '';
    const color = raw > 0 ? '#16a34a' : '#dc2626';
    const formatted = Number.isInteger(raw) ? raw.toLocaleString('en-US') : raw.toFixed(2);
    return { text: `${sign}${formatted}`, color };
  }

  formatDisplayValue(value: number): string {
    if (value == null) return '';
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  get editUrl(): string {
    return `${environment.githubUrl}/edit/main/public/data/${this.content?.file}`;
  }

  readonly wikiDisclaimerUrl = `${environment.githubUrl}/blob/main/public/data/election-day/README.md`;

  private static readonly STORAGE_KEY = 'visitedSources';
  visitedUrls = new Set<string>();

  constructor() {
    try {
      const stored = localStorage.getItem(BigChartComponent.STORAGE_KEY);
      this.visitedUrls = new Set(stored ? JSON.parse(stored) : []);
    } catch {
      this.visitedUrls = new Set();
    }
  }

  isVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  markVisited(url: string): void {
    this.visitedUrls.add(url);
    localStorage.setItem(BigChartComponent.STORAGE_KEY, JSON.stringify([...this.visitedUrls]));
  }

  sourceUrl(item: any): string {
    return Array.isArray(item.url) ? item.url[0] : item.url;
  }

  sourceUrls(item: any): string[] {
    return Array.isArray(item.url) ? item.url : [item.url];
  }

  clearVisited(): void {
    this.visitedUrls.clear();
    localStorage.removeItem(BigChartComponent.STORAGE_KEY);
  }

  onChartInit(chart: any): void {
    this.chartInstance = chart;
    this.chartReady.emit(chart);
  }

  onChartClick(event: any): void {
    this.clearVisited();
    this.content = event.data.content;

    if (event.data.content?.sources) {
      event.data.content.sources.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    if (event.seriesType === 'line' && event.data.content?.type !== 'gantt') {
      if (this.clickedPoint?.seriesIndex === event.seriesIndex && this.clickedPoint?.dataIndex === event.dataIndex) {
        this.closeDetailPanel();
        return;
      }

      const legendOpts: any = this.chartInstance.getOption()?.['legend'];
      const formatter = legendOpts?.[0]?.formatter;
      const displayName = typeof formatter === 'function' ? formatter(event.seriesName) : event.seriesName;

      this.clickedPoint = { seriesIndex: event.seriesIndex, dataIndex: event.dataIndex };
      this.content = {
        ...this.content,
        seriesId: event.seriesName,
        seriesName: displayName,
        seriesColor: event.color,
        displayValue: event.data.value?.[1],
      };
    }

    this.addMarkPoint(event.seriesIndex, event.dataIndex, event.color);

    if (event.data.content?.type === 'gantt') {
      if (this.selectedGanttIndex === event.dataIndex) {
        this.closeDetailPanel();
        return;
      }
      this.selectedGanttIndex = event.dataIndex;
      const updates = buildGanttHighlightUpdates((this.chartInstance.getOption() as any).series, event.dataIndex);
      if (updates.length) this.chartInstance.setOption({ series: updates });
    } else {
      this.clearGanttHighlight();
    }

    if (event.data.content?.from && event.seriesType !== 'custom') {
      this.showPeriodLines(event.data.content.from, event.data.content.to, event.data.itemStyle?.color ?? event.color);
    } else {
      this.clearPeriodLines();
    }

    this.dataClick.emit(event);
    this.resizeChartAfterPanel();
  }

  onChartLegendSelectChanged(event: any): void {
    if (this.content?.seriesId === event.name && !event.selected[event.name]) {
      this.closeDetailPanel();
    }
    this.legendSelectChanged.emit(event);
  }

  setContent(data: any): void {
    this.clearVisited();
    this.content = data;
    this.resizeChartAfterPanel();
  }

  closeDetailPanel(): void {
    this.clearVisited();
    this.content = null;
    this.clickedPoint = null;
    this.removeMarkPoint();
    this.clearGanttHighlight();
    this.clearPeriodLines();
    this.resizeChartAfterPanel();
  }

  saveImage(prefix = ''): void {
    saveAsImage(this.chartInstance, prefix);
  }

  hideAllLegends(): void {
    legendAllUnSelect(this.chartInstance);
  }

  unselectAll(): void {
    this.closeDetailPanel();
    this.hideAllLegends();
  }

  addMarkPoint(seriesIndex: number, dataIndex: number, color?: string): void {
    const options: any = this.chartInstance.getOption();
    const series = options.series[seriesIndex];
    if (!series?.data?.[dataIndex]) return;

    const coord = series.data[dataIndex].value;
    const resolvedColor = color || series.lineStyle?.color || series.itemStyle?.color || series.color || '#333';

    const baseline =
      this.markedPoint && this.markedPoint.seriesIndex === seriesIndex
        ? this.markedPoint.originalData
        : series.markPoint?.data || [];

    const updates: any[] = options.series.map(() => ({}));

    if (this.markedPoint && this.markedPoint.seriesIndex !== seriesIndex) {
      updates[this.markedPoint.seriesIndex] = {
        markPoint: { data: this.markedPoint.originalData },
      };
    }

    updates[seriesIndex] = {
      markPoint: {
        silent: true,
        data: [
          ...baseline,
          {
            coord,
            symbol: 'circle',
            symbolSize: 16,
            itemStyle: { color: 'rgba(0,0,0,0)', borderColor: resolvedColor, borderWidth: 3 },
            label: { show: false },
          },
        ],
        animation: true,
        animationDuration: 300,
      },
    };

    this.markedPoint = { seriesIndex, originalData: baseline };
    this.chartInstance.setOption({ series: updates });
  }

  addMarkPointByDate(date: string): void {
    this.removeMarkPoint();
    const options: any = this.chartInstance.getOption();
    for (let si = 0; si < options.series.length; si++) {
      const s = options.series[si];
      if (s.type !== 'line' || !s.data) continue;
      const di = s.data.findIndex((d: any) => d?.content?.date === date || d?.value?.[0] === date);
      if (di >= 0) {
        this.addMarkPoint(si, di);
        return;
      }
    }
  }

  removeMarkPoint(): void {
    if (!this.markedPoint) return;

    const options: any = this.chartInstance.getOption();
    const updates: any[] = options.series.map(() => ({}));
    updates[this.markedPoint.seriesIndex] = {
      markPoint: { data: this.markedPoint.originalData },
    };

    this.chartInstance.setOption({ series: updates });
    this.markedPoint = null;
  }

  private clearGanttHighlight(): void {
    if (this.selectedGanttIndex === null) return;
    this.selectedGanttIndex = null;
    const updates = buildGanttResetUpdates((this.chartInstance.getOption() as any).series);
    if (updates.length) this.chartInstance.setOption({ series: updates });
  }

  private showPeriodLines(from: string | number, to: string | number, color?: string): void {
    const updates = buildPeriodHighlightUpdates((this.chartInstance.getOption() as any).series, from, to, color);
    if (updates.length) this.chartInstance.setOption({ series: updates });
  }

  private clearPeriodLines(): void {
    const updates = clearPeriodHighlightUpdates((this.chartInstance.getOption() as any).series);
    if (updates.length) this.chartInstance.setOption({ series: updates });
  }

  private resizeChartAfterPanel(): void {
    setTimeout(() => {
      this.chartInstance?.resize();
    }, 320);
  }
}
