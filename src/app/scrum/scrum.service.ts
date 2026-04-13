import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type ScrumTaskStatus = 'todo' | 'doing' | 'done';

export interface ScrumComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ScrumTaskRecord {
  id?: string;
  title: string;
  estimate?: string;
  priority?: number;
  description?: string;
  comments?: ScrumComment[];
  assignee?: string | null;
  color?: string;
  status: ScrumTaskStatus;
  createdAt?: string;
  updatedAt?: string;
  visible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScrumService {
  private readonly baseUrl = `${environment.baseUrl}scrum`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ScrumTaskRecord[]> {
    return this.http.get<ScrumTaskRecord[]>(`${this.baseUrl}/all`);
  }

  create(payload: ScrumTaskRecord): Observable<ScrumTaskRecord> {
    return this.http.post<ScrumTaskRecord>(`${this.baseUrl}/create`, payload);
  }

  update(id: string, payload: ScrumTaskRecord): Observable<ScrumTaskRecord> {
    return this.http.put<ScrumTaskRecord>(`${this.baseUrl}/update/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }
}
