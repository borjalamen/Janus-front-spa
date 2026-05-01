import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private readonly baseUrl = `${environment.baseUrl}ai`;

  constructor(private readonly http: HttpClient) {}

  /**
   * Envía la pregunta del usuario al backend.
   * El system prompt con toda la documentación de JanusHub
   * se inyecta en el backend (OpenAiService / Groq).
   */
  query(text: string, username?: string, role?: string): Observable<{ answer: string, actionResult?: string }> {
    // X-No-Spinner evita que el interceptor bloquee la UI con el overlay de carga
    const headers = new HttpHeaders({ 'X-No-Spinner': 'true' });
    return this.http.post<{ answer: string, actionResult?: string }>(`${this.baseUrl}/query`,
      { question: text, username: username ?? '', role: role ?? '' },
      { headers });
  }
}
