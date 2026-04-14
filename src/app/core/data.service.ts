import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private http = inject(HttpClient);

  getDots(): Observable<any> {
    return this.http.get<any>('data/dots.json');
  }

  getData(path: string): Observable<any> {
    return this.http.get<any>('data/' + path);
  }

  getParties(): Observable<any> {
    return this.http.get<any>('data/defaults.json');
  }

  getElections(): Observable<any> {
    return this.http.get<any>('data/election-day/data_normalized.json');
  }


  getWho(): Observable<any> {
    return this.http.get<any>('data/election-day/data_normalized.json');
  }

  getQuotes(): Observable<any> {
    return this.http.get<any>('data/quotes.json');
  }
}
