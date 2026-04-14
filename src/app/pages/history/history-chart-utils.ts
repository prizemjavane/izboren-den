import { LineChart, LineChartData } from '@util/chart/series';

export function transformData(input: any, threshold = 4): LineChart[] {
  const result: LineChart[] = [];
  const collection: Record<string, LineChart> = {};

  input.forEach((entry: { date: any; metrics: { parties: any } }) => {
    if (!entry.metrics?.parties) return;
    entry.metrics.parties.forEach(
      (party: { alias: any; votes: any; percent: any; name: string; votesDiff: number; votesDiffPercent: number; mandates: number; mandatesDiff: number }) => {
        if (party.percent >= threshold) {
          const alias = party.alias;

          if (!collection[alias]) {
            collection[alias] = {
              id: alias,
              name: alias,
              data: [],
            };
          }

          const dataItem: LineChartData = {
            date: entry.date,
            change: party.votesDiff,
            changePercent: party.votesDiffPercent,
            value: party.votes,
            mandates: party.mandates,
            mandatesDiff: party.mandatesDiff,
            percent: party.percent,
            description: (entry as any).description,
          };

          collection[alias].data.push(dataItem);
        }
      }
    );
  });

  const sortedEntries = Object.entries(collection).sort(([keyA], [keyB]) => {
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });

  const sortedObj = Object.fromEntries(sortedEntries);

  for (const party in sortedObj) {
    result.push(collection[party]);
  }

  return result;
}
