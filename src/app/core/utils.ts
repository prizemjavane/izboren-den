import moment from 'moment/moment';
import { decodeData, encodeData } from '@util/utils';

export function loadFromStorage(): any {
  const data = localStorage.getItem('data2') as string;

  if (!data) {
    return null;
  }

  return decodeData(data);
}

export function reset(): void {
  localStorage.removeItem('data2');
  localStorage.removeItem('avgBoughtVotePrice');
  localStorage.removeItem('step');
  localStorage.removeItem('currency');
}

export function saveToStorage(decodedData: any): void {
  localStorage.setItem('data2', encodeData(decodedData));
}

const ROW_FIELDS = ['party', 'solidElectorate', 'boughtVote', 'controlledVote', 'feudalVote', 'socialMediaInfluencedVote', 'organicVote', 'slideVote', 'invalidVote'] as const;

export function encodeRowsCompact(rows: any[]): string {
  const compact = rows.map((r: any) => {
    const arr: any[] = ROW_FIELDS.map(f => r[f] ?? (f === 'party' ? '' : 0));
    while (arr.length > 1 && arr[arr.length - 1] === 0) arr.pop();
    return arr;
  });
  return encodeData(compact);
}

export function decodeRowsCompact(encoded: string): any[] | null {
  try {
    const data = decodeData(encoded);
    if (!Array.isArray(data) || data.length === 0) return null;

    // Compact format: array of arrays
    if (Array.isArray(data[0])) {
      return data.map((arr: any[]) => {
        const row: any = {};
        ROW_FIELDS.forEach((field, i) => {
          row[field] = i < arr.length ? arr[i] : (field === 'party' ? '' : 0);
        });
        return row;
      });
    }

    // Legacy format: array of objects
    return data;
  } catch {
    return null;
  }
}

export function thePrehod(): string {
  const startDate = moment('1989-11-10');
  const endDate = moment();
  const years = endDate.diff(startDate, 'years');

  startDate.add(years, 'years'); // Добавете годините, за да изчислите остатъка

  const months = endDate.diff(startDate, 'months');
  startDate.add(months, 'months'); // Добавете месеците, за да изчислите остатъка

  const days = endDate.diff(startDate, 'days');

  let result = '';
  result += `${years} години `;

  if (months > 0) {
    result += `${months} ` + (months > 1 ? 'месеца' : 'месец');
  }

  if (days > 0) {
    result += ` и ${days} ` + (days > 1 ? 'дни' : 'ден');
  }

  return result;
}

export function calculateMandates(votes: number[]): number[] {
  const totalMandates = 240;
  const totalVotes = votes.reduce((acc, curr) => acc + curr, 0);

  if (totalVotes === 0) {
    return Array(votes.length).fill(0);
  }

  const threshold = totalVotes * 0.04; // 4% бариера

  // Квотата се изчислява от гласовете на партиите, преминали бариерата.
  // В реалната система разпределението е по МИР, където участват само класираните партии.
  const qualifyingVotes = votes.reduce((acc, v) => acc + (v >= threshold ? v : 0), 0);

  if (qualifyingVotes === 0) {
    return Array(votes.length).fill(0);
  }

  const quota = qualifyingVotes / totalMandates; // Квота на Хеър

  const mandates: number[] = new Array(votes.length).fill(0);
  const remainders: number[] = new Array(votes.length).fill(0);

  // Първоначално разпределение — всяка партия получава цялата част от (гласове / квота)
  for (let i = 0; i < votes.length; i++) {
    if (votes[i] >= threshold) {
      mandates[i] = Math.floor(votes[i] / quota);
      remainders[i] = votes[i] - mandates[i] * quota;
    }
  }

  // Оставащите мандати се разпределят по метода на най-големия остатък (Хеър-Ниймайер)
  let remainingMandates = totalMandates - mandates.reduce((acc, curr) => acc + curr, 0);

  // Сортираме партиите по остатък (низходящо) и раздаваме по 1 допълнителен мандат
  const indices = votes
    .map((_, i) => i)
    .filter((i) => votes[i] >= threshold)
    .sort((a, b) => remainders[b] - remainders[a]);

  for (let j = 0; j < indices.length && remainingMandates > 0; j++) {
    mandates[indices[j]]++;
    remainingMandates--;
  }

  return mandates;
}
