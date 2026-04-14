import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortUrl',
})
export class ShortUrlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    return value.replace(/^https?:\/\/(www\.)?/, '');
  }
}
