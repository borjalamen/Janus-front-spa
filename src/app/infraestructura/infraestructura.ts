import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { ProjectService } from '../project.service';

type TrafficStatus = 'UP' | 'WARN' | 'DOWN';

interface ProjectItem {
  id?: string;
  name: string;
  code?: string;
  status: TrafficStatus;
  checking?: boolean;
}

const STATUSES: TrafficStatus[] = ['UP', 'WARN', 'DOWN'];

function randomStatus(): TrafficStatus {
  return STATUSES[Math.floor(Math.random() * STATUSES.length)];
}

@Component({
  selector: 'app-infraestructura',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule],
  templateUrl: './infraestructura.html',
  styleUrls: ['./infraestructura.css'],
})
export class Infraestructura {

  projects: ProjectItem[] = [];
  loading = true;
  error = false;
  filterText = '';

  get filteredProjects(): ProjectItem[] {
    const q = this.filterText.trim().toLowerCase();
    if (!q) return this.projects;
    return this.projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.code ?? '').toLowerCase().includes(q)
    );
  }

  constructor(private projectService: ProjectService) {
    this.loadProjects();
  }

  checkProject(p: ProjectItem): void {
    p.checking = true;
    setTimeout(() => {
      p.status = randomStatus();
      p.checking = false;
    }, 1200);
  }

  loadProjects() {
    this.loading = true;
    this.error = false;
    this.projectService.getAll().subscribe({
      next: (data) => {
        this.projects = data
          .filter(p => p.visible !== false && p.deleted !== true)
          .map(p => ({
            id: p.id,
            name: p.nombre ?? p.codigoProyecto ?? '—',
            code: p.codigoProyecto,
            status: randomStatus(),
          }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading projects', err);
        this.error = true;
        this.loading = false;
      }
    });
  }
}

