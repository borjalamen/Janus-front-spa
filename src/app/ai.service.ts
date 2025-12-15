import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  constructor(private http: HttpClient) {}

  // Envía una consulta al backend AI (implementación backend necesaria)
  query(text: string): Observable<{ answer: string }>{
    return this.http.post<{ answer: string }>('/api/ai/query', { question: text });
  }
}
