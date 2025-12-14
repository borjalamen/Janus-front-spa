import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  fetchVersion(): Observable<string> {
    return this.http.get(`${environment.baseUrl}config/all`, { responseType: 'text' });
  }
}
