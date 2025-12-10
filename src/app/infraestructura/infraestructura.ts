import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';

interface ProjectItem {
  id?: string;
  name: string;
  url?: string;
  status: 'UP' | 'WARN' | 'DOWN';
}

@Component({
  selector: 'app-infraestructura',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './infraestructura.html',
  styleUrls: ['./infraestructura.css'],
})
export class Infraestructura {

  projects: ProjectItem[] = [];
  private baseUrl = 'http://localhost:8080/api/infra';

  constructor(private http: HttpClient) {
    this.loadProjects();
  }

  loadProjects() {
    this.http.get<ProjectItem[]>(`${this.baseUrl}/projects`).subscribe({
      next: (data) => {
        this.projects = data;
      },
      error: (err) => {
        console.error('Error loading projects, using fallback', err);
        // Fallback sample data
        this.projects = [
          { name: 'PROY-ALPHA', status: 'UP', url: '#' },
          { name: 'PROY-BETA', status: 'WARN', url: '#' },
          { name: 'PROY-GAMMA', status: 'DOWN', url: '#' },
          { name: 'PROY-DELTA', status: 'UP', url: '#' }
        ];
      }
    });
  }

  openProject(p: ProjectItem) {
    if (p.url && p.url !== '#') {
      window.open(p.url, '_blank');
    }
  }
}
