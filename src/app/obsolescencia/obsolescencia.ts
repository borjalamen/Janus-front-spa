import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';

export interface ObsolescenciaEntry {
  id: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  techName: string;
  techVersion: string;
  techComment?: string;
  markedAt: string;
}

@Component({
  selector: 'app-obsolescencia',
  templateUrl: './obsolescencia.html',
  styleUrls: ['./obsolescencia.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, HttpClientModule],
})
export class ObsolescenciaComponent implements OnInit {
  private readonly api = `${environment.baseUrl}obsolescencia`;

  allEntries: ObsolescenciaEntry[] = [];
  filteredEntries: ObsolescenciaEntry[] = [];
  searchText = '';
  pageSize = 10;
  currentPage = 1;

  get isAdmin(): boolean {
    return this.auth.currentUserValue?.rol === 'admin';
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEntries.length / this.pageSize));
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get pagedEntries(): ObsolescenciaEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.http.get<ObsolescenciaEntry[]>(this.api).subscribe({
      next: data => {
        this.allEntries = data;
        this.filtrar();
      },
      error: () => {
        this.allEntries = [];
        this.filteredEntries = [];
      }
    });
  }

  filtrar(): void {
    const q = this.searchText.toLowerCase().trim();
    this.filteredEntries = !q
      ? [...this.allEntries]
      : this.allEntries.filter(e =>
          (e.projectCode ?? '').toLowerCase().includes(q) ||
          (e.projectName ?? '').toLowerCase().includes(q) ||
          (e.techName ?? '').toLowerCase().includes(q) ||
          (e.techVersion ?? '').toLowerCase().includes(q)
        );
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.searchText = '';
    this.filtrar();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  delete(entry: ObsolescenciaEntry): void {
    if (!confirm(`¿Eliminar el registro de obsolescencia de "${entry.techName}" (${entry.projectCode})?`)) return;
    this.http.delete(`${this.api}/${entry.id}`).subscribe(() => this.load());
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });
  }
}
