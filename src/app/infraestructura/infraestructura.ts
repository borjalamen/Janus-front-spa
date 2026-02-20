import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';

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
  private baseUrl = `${environment.baseUrl}infra`;
  private readonly STORAGE_KEY = 'infra_projects';

  constructor(
    private http: HttpClient,
    private storage: LocalStorageService
  ) {
    // primer intentem carregar del cache
    const cached = this.storage.getObject<ProjectItem[]>(this.STORAGE_KEY);
    if (cached && cached.length) {
      this.projects = cached;
    }
    this.loadProjects();
  }

  loadProjects() {
    this.http.get<ProjectItem[]>(`${this.baseUrl}/projects`).subscribe({
      next: (data) => {
        this.projects = data;
        this.storage.setObject(this.STORAGE_KEY, this.projects);
      },
      error: (err) => {
        console.error('Error loading projects, using fallback', err);
        // si hi ha cache, el mantenim; si no, fem fallback de mostra
        if (!this.projects || this.projects.length === 0) {
          this.projects = [
            { name: 'PROY-ALPHA', status: 'UP', url: '#' },
            { name: 'PROY-BETA', status: 'WARN', url: '#' },
            { name: 'PROY-GAMMA', status: 'DOWN', url: '#' },
            { name: 'PROY-DELTA', status: 'UP', url: '#' }
          ];
        }
      }
    });
  }

  openProject(p: ProjectItem) {
    if (p.url && p.url !== '#') {
      window.open(p.url, '_blank');
    }
  }
}
