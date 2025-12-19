import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private baseUrl = `${environment.baseUrl}ai`;

  constructor(private http: HttpClient) {}

  // Envía una consulta al backend AI
  query(text: string): Observable<{ answer: string }> {
    

    return this.http.post<{ answer: string }>(`${this.baseUrl}/query`, {
      question: text
    });
  }
}
