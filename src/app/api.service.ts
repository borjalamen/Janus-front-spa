import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  fetchVersion(): Observable<string> {
    const url = `${environment.baseUrl}config/all`;
    console.log('🔗 Fetching version from:', url);
    return this.http.get(url, { responseType: 'text' });
  }
}
