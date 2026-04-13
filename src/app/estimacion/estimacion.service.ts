import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EstimationTask {
  id: string;
  title: string;
  estimates: number[];
}

export interface EstimationComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface EstimacionRecord {
  id?: string;
  estimationName?: string;
  projectCode?: string;
  projectName?: string;
  requester?: string;
  requesterEmail?: string;
  notes?: string;
  comments?: EstimationComment[];
  weeks?: string[];
  tasks?: EstimationTask[];
  createdAt?: string;
  visible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EstimacionService {
  private readonly baseUrl = `${environment.baseUrl}estimaciones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<EstimacionRecord[]> {
    return this.http.get<EstimacionRecord[]>(`${this.baseUrl}/all`);
  }

  create(payload: EstimacionRecord): Observable<EstimacionRecord> {
    return this.http.post<EstimacionRecord>(`${this.baseUrl}/create`, payload);
  }

  update(id: string, payload: EstimacionRecord): Observable<EstimacionRecord> {
    return this.http.put<EstimacionRecord>(`${this.baseUrl}/update/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/delete/${id}`);
  }
}
