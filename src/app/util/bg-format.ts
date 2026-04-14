import moment from 'moment';

export function humanDate(date?: string | number) {
  return moment(date).format('D MMMM YYYY г.');
}

export function humanDateDiff(from: string | number, to: string | number, inDays = false): string {
  const startTimestamp = from;
  let endTimestamp = to;

  if (endTimestamp === null) {
    endTimestamp = new Date().getTime();
  }

  const startDate = moment(startTimestamp);
  const endDate = moment(endTimestamp);

  if (inDays) {
    return endDate.diff(startDate, 'days') + ' дни';
  }

  const years = endDate.diff(startDate, 'years');
  startDate.add(years, 'years');

  const months = endDate.diff(startDate, 'months');
  startDate.add(months, 'months');

  const days = endDate.diff(startDate, 'days');

  const parts = [];

  if (years > 0) {
    parts.push(`${years} ${years !== 1 ? 'години' : 'година'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months !== 1 ? 'месеца' : 'месец'}`);
  }
  if (days > 0) {
    parts.push(`${days} ${days !== 1 ? 'дни' : 'ден'}`);
  }

  return parts.join(', ');
}

export function humanValue(value: number, unit?: string, magnitude?: number, onlySuffix = false): string {
  const magnitudes: any = {
    1000000000: 'млрд.',
    1000000: 'млн.',
    1000: 'хил.',
  };

  const units: any = {
    BGN: 'лева',
    EUR: 'евро',
    percent: '%',
  };

  let suffix = '';

  if (unit === 'percent') {
    suffix = '%';
  } else {
    if (magnitude && magnitudes[magnitude]) {
      suffix += ' ' + magnitudes[magnitude];
    }

    if (unit && units[unit]) {
      suffix += ' ' + units[unit];
    }
  }

  if (onlySuffix) {
    return suffix;
  }

  return value.toLocaleString('en-US') + suffix;
}
