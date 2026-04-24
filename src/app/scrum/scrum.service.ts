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
  sprintId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  visible?: boolean;
}

export interface RegisteredUserRecord {
  id?: string;
  username?: string;
  fullName?: string;
  roles?: string[];
  status?: string;
}

export interface SprintSnapshotRecord {
  date: string;
  remainingTasks: number;
  doneTasks: number;
  totalTasks: number;
  remainingHours: number;
  doneHours: number;
  totalHours: number;
}

export interface ScrumSprintRecord {
  id?: string;
  sprintKey?: string;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  totalTasks?: number;
  doneTasks?: number;
  totalHours?: number;
  doneHours?: number;
  snapshots?: SprintSnapshotRecord[];
}

@Injectable({ providedIn: 'root' })
export class ScrumService {
  private readonly baseUrl = `${environment.baseUrl}scrum`;
  private readonly usersUrl = `${environment.baseUrl}users`;

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

  getRegisteredUsers(): Observable<RegisteredUserRecord[]> {
    return this.http.get<RegisteredUserRecord[]>(`${this.usersUrl}/all`);
  }

  // ── Sprint endpoints ──────────────────────────────────────────────────────

  getActiveSprint(): Observable<ScrumSprintRecord> {
    return this.http.get<ScrumSprintRecord>(`${this.baseUrl}/sprint/active`);
  }

  getSprintHistory(): Observable<ScrumSprintRecord[]> {
    return this.http.get<ScrumSprintRecord[]>(`${this.baseUrl}/sprint/history`);
  }

  startSprint(payload: ScrumSprintRecord): Observable<ScrumSprintRecord> {
    return this.http.post<ScrumSprintRecord>(`${this.baseUrl}/sprint/start`, payload);
  }

  saveSnapshot(sprintId: string, snapshot: SprintSnapshotRecord): Observable<ScrumSprintRecord> {
    return this.http.put<ScrumSprintRecord>(`${this.baseUrl}/sprint/${sprintId}/snapshot`, snapshot);
  }

  endSprint(sprintId: string, summary: ScrumSprintRecord): Observable<ScrumSprintRecord> {
    return this.http.put<ScrumSprintRecord>(`${this.baseUrl}/sprint/${sprintId}/end`, summary);
  }
}

