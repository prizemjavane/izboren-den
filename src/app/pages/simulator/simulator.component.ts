import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, inject, NgZone, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { calculateMandates, decodeRowsCompact, encodeRowsCompact, loadFromStorage, reset, saveToStorage } from '@core/utils';
import { NumberFormatPipe } from '@shared/pipe/number-format.pipe';
import { InputComponent } from '@shared/component/input/input.component';
import { DataService } from '@core/data.service';

import { debounceTime, fromEvent, Subject, takeUntil } from 'rxjs';
import { SaveService } from '@core/save.service';
import { LucideAngularModule } from 'lucide-angular';
import { IconsModule } from '@shared/icons.module';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { DataZoomComponent, GridComponent, LegendComponent, MarkPointComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { SourceComponent } from '@shared/component/source/source.component';
import { QuoteComponent } from '@shared/component/quote/quote.component';
import { peopleInTheElectionDay, controlledVoteChart, mandatesChart, activityLineChart } from './simulator-chart';
import { HeaderComponent } from '@shared/component/header/header.component';
import { BgDatePipe } from '@shared/pipe/bg-date.pipe';
import { percentage, toNumber } from '@util/utils';

import { MarkLineComponent } from 'echarts/components';

echarts.use([BarChart, LineChart, GridComponent, CanvasRenderer, TitleComponent, TooltipComponent, PieChart, LegendComponent, MarkLineComponent, MarkPointComponent, DataZoomComponent]);

@Component({
  selector: 'app-simulator',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    NumberFormatPipe,
    InputComponent,
    LucideAngularModule,
    IconsModule,
    NgxEchartsDirective,
    SourceComponent,
    QuoteComponent,
    HeaderComponent,
    BgDatePipe,
],
  templateUrl: './simulator.component.html',
  styleUrl: './simulator.component.scss',
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimulatorComponent implements OnInit, OnDestroy {
  @ViewChild('content') content: TemplateRef<any> | undefined;
  @ViewChildren(SourceComponent) sourceComponents!: QueryList<SourceComponent>;


  public max: any = [];
  public min: any = [];
  public available = 6575151;
  public activity = 0;
  public voted = 0;
  public overallControlledVote = 0;
  public votes = 0;
  public weightOfTheControlledVote = 0;
  public boughtVoteTotal = 0;
  public invalidVotes = 0;
  public result: any = [];
  public rows: any = [];
  public talk: any = {};
  public parties = 4;
  public avgBoughtVotePrice = 50;
  public step = 10000;
  public peopleInTheElectionDay!: any;
  public controlledVoteChart!: any;
  public mandatesChart!: any;
  public activityChart!: any;
  public showActivityChart = false;
  private parliamentaryElections: any[] = [];
  public partiesList: any = [];
  public maxParties = 10;
  public currency: 'BGN' | 'EUR' = 'EUR';
  private readonly BGN_PER_EUR = 1.95583;
  public showCompareDetail: '' | 'boughtVote' | 'seat' = '';
  public activeDropdown = -1;
  public partySearch = '';
  public latestElection: { name: string; votes: number; percentage: number; mandates: number }[] = [];
  public latestElectionDate = '';
  public coalitionSelected: boolean[] = [];
  public majorityOptions: { name: string; value: number }[] = [];
  public selectedMajorityIndex = 0;

  public quotesGroups: any[][] = [];

  public countdownDays = 0;
  public countdownHours = 0;
  public countdownMinutes = 0;
  public countdownSeconds = 0;
  public electionPassed = false;
  public electionDateStr = '';
  private electionDateTarget: Date | null = null;
  private countdownInterval: any;

  get selectedMajorityValue(): number {
    return this.majorityOptions[this.selectedMajorityIndex]?.value ?? 121;
  }

  private partyAliasMap = new Map<string, string>();
  private destroy$ = new Subject<void>();
  private latestElectionMap = new Map<string, { votes: number; percentage: number; mandates: number }>();

  public compare = {
    price: 50000000,
    currency: 'BGN',
    unit: 'km',
    description: 'Средна цена на километър на автомагистрала „Русе – Велико Търново“',
    url: 'https://www.economic.bg/bg/a/view/kilometyr-ot-magistrala-ruse-veliko-tyrnovo-skochi-do-50-mln-lv'
  }

  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);
  private saveService = inject(SaveService);
  private elRef = inject(ElementRef);
  private ngZone = inject(NgZone);

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  filteredParties(rowIndex: number): any[] {
    const selected = new Set(this.rows.filter((_: any, j: number) => j !== rowIndex).map((r: any) => r.party).filter(Boolean));
    const available = this.partiesList.filter((p: any) => !selected.has(p.name));
    if (!this.partySearch) return available;
    const q = this.partySearch.toLowerCase();
    const matchesQuery = (p: any) => (p.alias ?? p.name).toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    const exact = available.filter(matchesQuery);
    if (exact.length > 0) return exact;
    return available.filter((p: any) => this.fuzzyMatch((p.alias ?? p.name).toLowerCase(), q) || this.fuzzyMatch(p.name.toLowerCase(), q));
  }

  get hasExactMatch(): boolean {
    if (!this.partySearch) return true;
    const q = this.partySearch.toLowerCase();
    return this.partiesList.some((p: any) => (p.alias ?? p.name).toLowerCase() === q || p.name.toLowerCase() === q);
  }

  private fuzzyMatch(text: string, query: string): boolean {
    let qi = 0;
    for (let i = 0; i < text.length && qi < query.length; i++) {
      if (text[i] === query[qi]) qi++;
    }
    return qi === query.length;
  }

  openDropdown(i: number) {
    if (this.activeDropdown === i) return;
    this.activeDropdown = i;
    this.partySearch = '';
    setTimeout(() => {
      const input = this.elRef.nativeElement.querySelector('.party-search-input');
      input?.focus();
    });
  }

  closeDropdown() {
    this.activeDropdown = -1;
    this.partySearch = '';
  }

  selectParty(i: number, name: string) {
    this.rows[i]['party'] = name;
    this.closeDropdown();
    this.onInputChange();
  }

  get currencyLabel(): string {
    return this.currency === 'BGN' ? 'лв' : '€';
  }

  get comparePriceInCurrency(): number {
    return this.currency === 'EUR' ? this.compare.price / this.BGN_PER_EUR : this.compare.price;
  }

  get coalitionMandatesSum(): number {
    let sum = 0;
    for (let i = 0; i < this.rows.length; i++) {
      if (this.coalitionSelected[i]) {
        sum += this.result[i]?.mandates || 0;
      }
    }
    return sum;
  }

  onCurrencyChange(newCurrency: 'BGN' | 'EUR') {
    if (newCurrency === this.currency) return;
    if (newCurrency === 'EUR') {
      this.avgBoughtVotePrice = Math.round((this.avgBoughtVotePrice / this.BGN_PER_EUR) * 100) / 100;
    } else {
      this.avgBoughtVotePrice = Math.round(this.avgBoughtVotePrice * this.BGN_PER_EUR * 100) / 100;
    }
    this.currency = newCurrency;
    this.onInputChange();
  }

  getPartyAlias(name: string): string {
    return this.partyAliasMap.get(name) ?? name;
  }

  getLatestElectionData(partyName: string): { votes: number; percentage: number; mandates: number } | null {
    if (!partyName) return null;
    return this.latestElectionMap.get(partyName) ?? null;
  }

  useCustomText(i: number) {
    this.rows[i]['party'] = this.partySearch;
    this.closeDropdown();
    this.onInputChange();
  }

  private updateCountdown(): void {
    if (!this.electionDateTarget) {
      this.electionPassed = true;
      return;
    }
    const now = new Date();
    const diff = this.electionDateTarget.getTime() - now.getTime();

    if (diff <= 0) {
      this.electionPassed = true;
      this.countdownDays = 0;
      this.countdownHours = 0;
      this.countdownMinutes = 0;
      this.countdownSeconds = 0;
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
      }
      return;
    }

    this.electionPassed = false;
    this.countdownDays = Math.floor(diff / (1000 * 60 * 60 * 24));
    this.countdownHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    this.countdownMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    this.countdownSeconds = Math.floor((diff % (1000 * 60)) / 1000);
  }

  ngOnInit() {
    this.updateCountdown();
    this.ngZone.runOutsideAngular(() => {
      this.countdownInterval = setInterval(() => {
        this.ngZone.run(() => {
          this.updateCountdown();
          this.cdr.markForCheck();
        });
      }, 1000);
    });

    this.peopleInTheElectionDay = peopleInTheElectionDay(0, 0);
    this.controlledVoteChart = controlledVoteChart(0, 0);
    this.mandatesChart = mandatesChart(this.result);

    this.saveService.myObservable$.pipe(debounceTime(1000), takeUntil(this.destroy$)).subscribe(() => {
      this.save();
    });

    this.dataService.getParties().subscribe((response) => {
      const parties = response.parties;
      this.partiesList = parties.sort((a: any, b: any) => a.name.localeCompare(b.name, 'bg'));
      if (response.majority) {
        this.majorityOptions = response.majority;
        this.selectedMajorityIndex = 0;
      }
      this.maxParties = this.partiesList.length + 1;

      parties.forEach((p: any) => {
        if (p.alias) {
          this.partyAliasMap.set(p.name, p.alias);
        }
      });

      const allEmpty = this.rows.every((r: any) => !r.party);
      if (allEmpty) {
        this.parties = this.partiesList.length - 1;
        this.onChangePartiesNumber();
        this.partiesList.forEach((p: any, i: number) => {
          if (i < this.rows.length) {
            this.rows[i].party = p.name;
          }
        });
        this.onInputChange();
      }
      this.cdr.markForCheck();
    });

    this.dataService.getData('election-day/parliament_raw.json').subscribe((data: any[]) => {
      const withParties = data.filter((item: any) => item.metrics?.parties?.length > 0);
      withParties.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latest = withParties[withParties.length - 1];
      if (latest?.metrics?.parties) {
        this.latestElectionDate = latest.date;
        this.latestElection = latest.metrics.parties.map((p: any) => ({
          name: p.name,
          votes: p.votes,
          percentage: p.percent,
          mandates: p.mandates,
        }));
        this.latestElectionMap.clear();
        this.latestElection.forEach(p => this.latestElectionMap.set(p.name, p));
      }
      this.cdr.markForCheck();
    });

    this.dataService.getQuotes().subscribe((response) => {
      this.quotesGroups = response;
      this.cdr.markForCheck();
    });

    this.dataService.getData('parliament_normalized.json').subscribe((data: any[]) => {
      data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      this.parliamentaryElections = data;
      this.activityChart = activityLineChart(data, this.activity || null);

      const now = new Date();
      const upcoming = data.find((d: any) => new Date(d.date + 'T08:00:00+03:00').getTime() > now.getTime());
      if (upcoming) {
        this.electionDateTarget = new Date(upcoming.date + 'T08:00:00+03:00');
        this.electionDateStr = upcoming.date;
        this.updateCountdown();
      }

      this.cdr.markForCheck();
    });

    this.dataService.getDots().subscribe((response) => {
      this.talk = response.reduce((acc: any, item: any) => {
        item.tags.forEach((tag: any) => {
          if (!acc[tag]) {
            acc[tag] = [];
          }
          acc[tag].push(item);
        });
        return acc;
      }, {});

      this.cdr.detectChanges();
    });

    this.ngZone.runOutsideAngular(() => {
      fromEvent<MouseEvent>(document, 'click')
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          if (this.activeDropdown < 0) return;
          const target = event.target as HTMLElement;
          if (target.closest('.party-dropdown-wrap')) return;
          this.ngZone.run(() => {
            this.closeDropdown();
            this.cdr.markForCheck();
          });
        });
    });

    for (let i = 0; i <= this.parties; i++) {
      this.rows.push({
        party: '',
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        slideVote: 0,
        invalidVote: 0,
      });

      this.result[i] = {
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        slideVote: 0,
        invalidVote: 0,
        votes: 0,
      };

      this.min[i] = {
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        invalidVote: 0,
      };

      this.max[i] = {
        solidElectorate: this.available,
        boughtVote: this.available,
        controlledVote: this.available,
        feudalVote: this.available,
        socialMediaInfluencedVote: this.available,
        organicVote: this.available,
        slideVote: this.available,
        invalidVote: this.available,
      };
    }

    this.load();
    this.onInputChange();
  }

  public onChangePartiesNumber() {
    const rows = this.rows.length;
    const parties = toNumber(this.parties);

    if (rows - 1 > parties) {
      for (let i = parties; i < rows - 1; i++) {
        this.rows.pop();
        this.result.pop();
        this.min.pop();
        this.max.pop();
        this.coalitionSelected.pop();
      }
    }

    if (rows - 1 < parties) {
      for (let i = rows; i <= parties; i++) {
        this.rows.push({
          party: '',
          solidElectorate: 0,
          boughtVote: 0,
          controlledVote: 0,
          feudalVote: 0,
          socialMediaInfluencedVote: 0,
          organicVote: 0,
          slideVote: 0,
          invalidVote: 0,
        });

        this.result[i] = {
          solidElectorate: 0,
          boughtVote: 0,
          controlledVote: 0,
          feudalVote: 0,
          socialMediaInfluencedVote: 0,
          organicVote: 0,
          slideVote: 0,
          invalidVote: 0,
          votes: 0,
        };

        this.min[i] = {
          solidElectorate: 0,
          boughtVote: 0,
          controlledVote: 0,
          feudalVote: 0,
          socialMediaInfluencedVote: 0,
          organicVote: 0,
          invalidVote: 0,
        };

        this.max[i] = {
          solidElectorate: this.available,
          boughtVote: this.available,
          controlledVote: this.available,
          feudalVote: this.available,
          socialMediaInfluencedVote: this.available,
          organicVote: this.available,
          slideVote: this.available,
          invalidVote: this.available,
        };
      }
    }

    this.onInputChange();
  }

  onInputUp(f: any = null, i: any = null): void {
    this.rows[i][f] += this.step;

    this.onInputChange();
  }

  onInputDown(f: any = null, i: any = null): void {
    if (toNumber(this.rows[i][f]) - this.step < this.min[i][f]) {
      this.rows[i][f] = 0;
      return;
    }

    this.rows[i][f] -= this.step;

    this.onInputChange();
  }

  onInputReset(f: any = null, i: any = null): void {
    this.rows[i][f] = 0;

    this.onInputChange();
  }

  onInputChange(int: any = null, f: any = null, i: any = null) {
    if (i !== null) {
      this.rows[i][f] = toNumber(int);
    }

    this.invalidVotes = 0;
    this.voted = 0;
    this.votes = 0;
    this.overallControlledVote = 0;
    this.boughtVoteTotal = 0;

    // Pass 1: reset results and accumulate global totals
    this.rows.forEach((row: any, i: number) => {
      // if (row['boughtVote'] >= this.max[i]['boughtVote']) {
      //   row['boughtVote'] = toInt(this.max[i]['boughtVote']);
      // }
      //
      // if (row['feudalVote'] >= this.max[i]['feudalVote']) {
      //   row['feudalVote'] = toInt(this.max[i]['feudalVote']);
      // }
      //
      // if (row['controlledVote'] >= this.max[i]['controlledVote']) {
      //   row['controlledVote'] = toInt(this.max[i]['controlledVote']);
      // }

      this.result[i] = {
        voted: 0,
        votes: 0,
        percentage: 0,
        party: row['party'],
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        slideVote: 0,
        invalidVote: 0,
        solidElectoratePercentage: 0,
        boughtVotePercentage: 0,
        controlledVotePercentage: 0,
        socialMediaInfluencedVotePercentage: 0,
        organicVotePercentage: 0,
        feudalVotePercentage: 0,
        invalidVotePercentage: 0,
        slideVotePercentage: 0,
        mandates: 0,
      };

      let value;

      value = toNumber(row['solidElectorate']);
      this.voted += value;
      this.votes += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['boughtVote']);
      this.voted += value;
      this.votes += value;
      this.overallControlledVote += value;
      this.boughtVoteTotal += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['controlledVote']);
      this.voted += value;
      this.votes += value;
      this.overallControlledVote += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['feudalVote']);
      this.voted += value;
      this.votes += value;
      this.overallControlledVote += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['organicVote']);
      this.voted += value;
      this.votes += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['socialMediaInfluencedVote']);
      this.voted += value;
      this.votes += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['slideVote']);
      this.votes += value;
      this.result[i]['votes'] += value;

      value = toNumber(row['invalidVote']);
      this.invalidVotes += value;
      this.result[i]['invalidVote'] = value;
    });

    const votesForMandates: number[] = [];

    this.rows.forEach((party: any, i: number) => {
      // console.log(this.max[i]);
      const votedLeft = this.available - this.voted;
      const votesLeft = this.available - this.votes;

      this.min[i]['slideVote'] =
        (party['solidElectorate'] +
          party['boughtVote'] +
          party['controlledVote'] +
          party['feudalVote'] +
          party['socialMediaInfluencedVote'] +
          party['organicVote'] -
          party['invalidVote']) *
        -1;

      // if ((votedLeft + party['solidElectorate']) > ((votedLeft + party['solidElectorate']) * (this.asd / 100))) {
      //   this.result[i]['solidElectorate'] = (votedLeft + party['solidElectorate']) * (this.asd / 100);
      // }

      this.max[i]['solidElectorate'] = votedLeft + party['solidElectorate'];
      this.max[i]['boughtVote'] = votedLeft + party['boughtVote'];
      this.max[i]['controlledVote'] = votedLeft + party['controlledVote'];
      this.max[i]['feudalVote'] = votedLeft + party['feudalVote'];
      this.max[i]['socialMediaInfluencedVote'] = votedLeft + party['socialMediaInfluencedVote'];
      this.max[i]['organicVote'] = votedLeft + party['organicVote'];
      this.max[i]['invalidVote'] = votedLeft + party['invalidVote'];
      this.max[i]['slideVote'] = votesLeft;
      this.max[i]['invalidVote'] =
        party['solidElectorate'] +
        party['boughtVote'] +
        party['controlledVote'] +
        party['feudalVote'] +
        party['organicVote'] +
        party['socialMediaInfluencedVote'] +
        party['slideVote'];

      this.result[i]['solidElectorate'] = party['solidElectorate'] + this.result[i]['solidElectorate'];
      this.result[i]['boughtVote'] = party['boughtVote'] + this.result[i]['boughtVote'];
      this.result[i]['controlledVote'] = party['controlledVote'] + this.result[i]['controlledVote'];
      this.result[i]['feudalVote'] = party['feudalVote'] + this.result[i]['feudalVote'];
      this.result[i]['socialMediaInfluencedVote'] = party['socialMediaInfluencedVote'] + this.result[i]['socialMediaInfluencedVote'];
      this.result[i]['organicVote'] = party['organicVote'] + this.result[i]['organicVote'];
      this.result[i]['slideVote'] = party['slideVote'] + this.result[i]['slideVote'];
      this.result[i]['votes'] -= party['invalidVote'];
      this.result[i]['invalidVote'] = party['invalidVote'] + this.result[i]['invalidVote'];
      this.result[i]['percentage'] = percentage(this.result[i]['votes'], this.votes - this.invalidVotes, 3);

      votesForMandates.push(this.result[i]['votes']);

      // Percentage breakdowns (merged from separate loop)
      if (this.voted > 0) {
        this.result[i]['solidElectoratePercentage'] = percentage(this.result[i]['solidElectorate'], this.voted, 3);
        this.result[i]['boughtVotePercentage'] = percentage(this.result[i]['boughtVote'], this.voted, 3);
        this.result[i]['controlledVotePercentage'] = percentage(this.result[i]['controlledVote'], this.voted, 3);
        this.result[i]['feudalVotePercentage'] = percentage(this.result[i]['feudalVote'], this.voted, 3);
        this.result[i]['socialMediaInfluencedVotePercentage'] = percentage(this.result[i]['socialMediaInfluencedVote'], this.voted, 3);
        this.result[i]['organicVotePercentage'] = percentage(this.result[i]['organicVote'], this.voted, 3);
        this.result[i]['slideVotePercentage'] = percentage(this.result[i]['slideVote'], this.voted, 3);
        this.result[i]['invalidVotePercentage'] = percentage(this.result[i]['invalidVote'], this.voted, 3);
      }
    });

    const mandates = calculateMandates(votesForMandates);

    for (let idx = 0; idx < this.rows.length; idx++) {
      this.result[idx]['mandates'] = mandates[idx];
    }

    this.activity = percentage(this.voted, this.available);
    this.weightOfTheControlledVote = percentage(this.overallControlledVote, this.voted);

    this.saveService.changeValue();

    this.peopleInTheElectionDay = peopleInTheElectionDay(this.available, this.voted);
    this.controlledVoteChart = controlledVoteChart(this.voted, this.overallControlledVote);
    this.mandatesChart = mandatesChart(this.result);

    if (this.parliamentaryElections.length > 0) {
      this.activityChart = activityLineChart(this.parliamentaryElections, this.activity || null);
    }

    this.cdr.markForCheck();
  }

  private load(): void {
    let data: any = null;

    const encoded = this.activatedRoute.snapshot.queryParamMap.get('data2');
    if (encoded) {
      data = decodeRowsCompact(encoded);
    }

    if (!data) {
      data = loadFromStorage();
    }

    // Load avgBoughtVotePrice: query string first, then localStorage
    const qPrice = this.activatedRoute.snapshot.queryParamMap.get('price');
    if (qPrice != null && !isNaN(Number(qPrice))) {
      this.avgBoughtVotePrice = Number(qPrice);
    } else {
      const storedPrice = localStorage.getItem('avgBoughtVotePrice');
      if (storedPrice != null && !isNaN(Number(storedPrice))) {
        this.avgBoughtVotePrice = Number(storedPrice);
      }
    }

    // Load step: query string first, then localStorage
    const qStep = this.activatedRoute.snapshot.queryParamMap.get('step');
    if (qStep != null && !isNaN(Number(qStep))) {
      this.step = Number(qStep);
    } else {
      const storedStep = localStorage.getItem('step');
      if (storedStep != null && !isNaN(Number(storedStep))) {
        this.step = Number(storedStep);
      }
    }

    // Load currency: query string first, then localStorage
    const qCurrency = this.activatedRoute.snapshot.queryParamMap.get('currency');
    if (qCurrency === 'BGN' || qCurrency === 'EUR') {
      this.currency = qCurrency;
    } else {
      const storedCurrency = localStorage.getItem('currency');
      if (storedCurrency === 'BGN' || storedCurrency === 'EUR') {
        this.currency = storedCurrency;
      }
    }

    if (data && Array.isArray(data) && data.length > 0) {
      this.parties = data.length - 1;
      this.rows = data;

      this.result = [];
      this.min = [];
      this.max = [];
      this.coalitionSelected = [];
      for (let i = 0; i <= this.parties; i++) {
        this.result[i] = {
          solidElectorate: 0,
          boughtVote: 0,
          controlledVote: 0,
          feudalVote: 0,
          socialMediaInfluencedVote: 0,
          organicVote: 0,
          slideVote: 0,
          invalidVote: 0,
          votes: 0,
        };

        this.min[i] = {
          solidElectorate: 0,
          boughtVote: 0,
          controlledVote: 0,
          feudalVote: 0,
          socialMediaInfluencedVote: 0,
          organicVote: 0,
          invalidVote: 0,
        };

        this.max[i] = {
          solidElectorate: this.available,
          boughtVote: this.available,
          controlledVote: this.available,
          feudalVote: this.available,
          socialMediaInfluencedVote: this.available,
          organicVote: this.available,
          slideVote: this.available,
          invalidVote: this.available,
        };
      }

      if (encoded) {
        saveToStorage(data);
      }
    }
  }

  private save(): void {
    saveToStorage(this.rows);
    localStorage.setItem('avgBoughtVotePrice', String(this.avgBoughtVotePrice));
    localStorage.setItem('step', String(this.step));
    localStorage.setItem('currency', this.currency);

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { data2: encodeRowsCompact(this.rows), price: this.avgBoughtVotePrice, step: this.step, currency: this.currency },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  toHighwayLength(amount: number): { km: number; m: number } {
    const amountInBGN = this.currency === 'EUR' ? amount * this.BGN_PER_EUR : amount;
    const totalMeters = (amountInBGN / this.compare.price) * 1000;
    const km = Math.floor(totalMeters / 1000);
    const m = Math.round(totalMeters % 1000);
    return { km, m };
  }

  onClearVisited(): void {
    this.sourceComponents.forEach(sc => sc.clearVisited());
  }

  onReloadParties(): void {
    this.onResetAll();

    if (this.partiesList.length > 0) {
      this.parties = this.partiesList.length - 1;
      this.onChangePartiesNumber();
      this.partiesList.forEach((p: any, i: number) => {
        if (i < this.rows.length) {
          this.rows[i].party = p.name;
        }
      });
      this.onInputChange();
    }
  }

  onResetAll(): void {
    this.min = [];
    this.max = [];
    this.result = [];
    this.rows = [];
    this.coalitionSelected = [];
    this.avgBoughtVotePrice = 50;
    this.step = 10000;
    this.currency = 'EUR';

    reset();

    this.router.navigate([], {
      relativeTo: this.activatedRoute,
    });

    for (let i = 0; i <= this.parties; i++) {
      this.rows.push({
        party: '',
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        slideVote: 0,
        invalidVote: 0,
      });

      this.result[i] = {
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        slideVote: 0,
        invalidVote: 0,
        votes: 0,
      };

      this.min[i] = {
        solidElectorate: 0,
        boughtVote: 0,
        controlledVote: 0,
        feudalVote: 0,
        socialMediaInfluencedVote: 0,
        organicVote: 0,
        invalidVote: 0,
      };

      this.max[i] = {
        solidElectorate: this.available,
        boughtVote: this.available,
        controlledVote: this.available,
        feudalVote: this.available,
        socialMediaInfluencedVote: this.available,
        organicVote: this.available,
        slideVote: this.available,
        invalidVote: this.available,
      };
    }

    this.onInputChange();
  }

}
