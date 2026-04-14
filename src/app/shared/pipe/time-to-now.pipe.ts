import { Pipe, PipeTransform } from '@angular/core';
import moment from 'moment';
import { humanDateDiff } from '@util/bg-format';

@Pipe({
  name: 'timeToNow',
})
export class TimeToNowPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const date = moment(value, 'YYYY-MM-DD');

    if (!date.isValid()) return '';

    return humanDateDiff(value, new Date().getTime());
  }
}
