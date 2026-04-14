import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'splitArray',
})
export class SplitArrayPipe implements PipeTransform {
  transform(value: any[], chunkSize: number): any[][] {
    if (!Array.isArray(value) || chunkSize <= 0) {
      return [];
    }

    const result: any[][] = [];
    for (let i = 0; i < value.length; i += chunkSize) {
      result.push(value.slice(i, i + chunkSize));
    }
    return result;
  }
}
