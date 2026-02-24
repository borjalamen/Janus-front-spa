import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private versionSubject = new BehaviorSubject<string>('');
  version$ = this.versionSubject.asObservable();

  constructor(private http: HttpClient) {}

  fetchVersion(): Observable<string> {
    return this.http.get(`${environment.baseUrl}config/all`, { responseType: 'text' });
  }

  setVersion(version: string): void {
    this.versionSubject.next(version);
  }
}
