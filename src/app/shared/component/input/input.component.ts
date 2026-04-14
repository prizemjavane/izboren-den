import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NumberFormatPipe } from '@shared/pipe/number-format.pipe';

@Component({
  selector: 'app-input',
  imports: [FormsModule, NumberFormatPipe],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @Input() public max!: string;
  @Input() public min = 0;
  @Input() public percentage = 0;
  @Input()
  set result(value: number) {
    this.valueFormatted = value.toLocaleString('en-US');
    this.valueRaw = value;
  }

  @Output() callOnChange = new EventEmitter<string>();
  @Output() callOnInc = new EventEmitter<string>();
  @Output() callOnDec = new EventEmitter<string>();
  @Output() callOnReset = new EventEmitter<void>();

  interval: any;
  valueRaw!: number;
  valueFormatted!: string;

  onChange(event: any): void {
    const value = (event.target as HTMLInputElement).value.replace(/,/g, '');
    this.callOnChange.emit(value);
  }

  inc(): void {
    if (this.interval) {
      this.stopIncrement();
    }

    this.interval = setInterval(() => {
      this.callOnInc.emit();
    }, 50);
  }

  dec(): void {
    if (this.interval) {
      this.stopIncrement();
    }

    this.interval = setInterval(() => {
      this.callOnDec.emit();
    }, 50);
  }

  reset(): void {
    this.callOnReset.emit();
  }

  stopIncrement() {
    clearInterval(this.interval);
  }
}
