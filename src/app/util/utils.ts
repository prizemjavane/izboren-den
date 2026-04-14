import Decimal from 'decimal.js';

export function sortArrayByReference(referenceArray: any, targetArray: any) {
  const sortedArray: any = [];
  const referenceSet = new Set(referenceArray);

  referenceArray.forEach((item: any) => {
    if (referenceSet.has(item)) {
      const index = targetArray.indexOf(item);
      if (index !== -1) {
        sortedArray.push(targetArray[index]);
      }
    }
  });

  return sortedArray;
}

export function decodeData(data: any): any {
  return JSON.parse(fromBase64(data));
}

export function encodeData(data: any): any {
  return toBase64(JSON.stringify(data));
}

export function toBase64(str: string) {
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

export function fromBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function percentage(part: number, total: number, round = 2): number {
  const result = new Decimal(part).dividedBy(new Decimal(total)).times(100);

  if (result.isFinite()) {
    return result.toDecimalPlaces(round, Decimal.ROUND_HALF_UP).toNumber();
  }

  return 0;
}

export function format(part: number, round = 2): string {
  const result = new Decimal(part);

  if (result.isFinite()) {
    return result.toDecimalPlaces(round, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('en-US');
  }

  return '0';
}

export function toNumber(number: string | number): number {
  if (number === '' || number === '0' || number === 0) {
    return 0;
  }

  return new Decimal(number).toNumber();
}
