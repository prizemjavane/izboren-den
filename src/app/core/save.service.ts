import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SaveService {
  private mySubject = new BehaviorSubject<string>('');
  myObservable$ = this.mySubject.asObservable();

  changeValue() {
    this.mySubject.next('');
  }
}
