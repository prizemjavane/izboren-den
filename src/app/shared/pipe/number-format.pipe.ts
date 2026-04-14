import { Pipe, PipeTransform } from '@angular/core';
import { format } from '@util/utils';

@Pipe({
  name: 'numberFormat',
  standalone: true,
})
export class NumberFormatPipe implements PipeTransform {
  transform(value: number, decimalPlaces = 0): string {
    return format(value, decimalPlaces);
  }
}
