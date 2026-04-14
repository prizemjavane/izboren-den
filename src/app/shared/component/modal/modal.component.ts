import { Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { DataService } from '@core/data.service';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
})
export class ModalComponent implements OnInit {
  @Input() public list!: string;
  @ViewChild('dialogRef') dialogRef!: ElementRef<HTMLDialogElement>;
  @Output() callOnChange = new EventEmitter<{ party: string; row: number }>();

  public row = 0;
  public partiesList: any = [];
  private dataService = inject(DataService);

  onSelect(i: number) {
    this.row = i;
    this.dialogRef.nativeElement.showModal();
  }

  close() {
    this.dialogRef.nativeElement.close();
  }

  onConfirm(party: string, row: number) {
    this.callOnChange.emit({ party, row });
  }

  ngOnInit(): void {
    this.dataService.getParties().subscribe((response) => {
      this.partiesList = response.parties.sort((a: any, b: any) => {
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
    });
  }
}
