import { Pipe, PipeTransform } from '@angular/core';
import { humanDate } from '@util/bg-format';

@Pipe({
  name: 'bgDate',
})
export class BgDatePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    return humanDate(value);
  }
}
