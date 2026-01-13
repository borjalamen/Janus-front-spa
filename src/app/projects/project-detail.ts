import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { Proyecto, Task } from './projects';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.css']
})
export class ProjectDetailComponent {
  proyecto?: Proyecto;
  editing = false;
  ipString = '';
  routeMode: string = 'view';

  constructor(private route: ActivatedRoute, private router: Router) {
    const code = this.route.snapshot.paramMap.get('code') || undefined;
    const mode = this.route.snapshot.queryParamMap.get('mode') || 'view';
    this.routeMode = mode;
    this.editing = mode === 'edit';

    // Cargar proyecto desde localStorage
    try {
      const raw = localStorage.getItem('projects_v1');
      if (raw) {
        const arr = JSON.parse(raw) as Proyecto[];
        this.proyecto = arr.find(p => p.codigoProyecto === code);
        if (this.proyecto) this.ipString = (this.proyecto.ip||[]).join(', ');
      }
    } catch (e) { this.proyecto = undefined; }
  }

  back() {
    this.router.navigate(['/projects']);
  }

  save() {
    if (!this.proyecto) return;
    // sincronizar ipString -> proyecto.ip
    try {
      this.proyecto.ip = (this.ipString||'').split(',').map(s=>s.trim()).filter(Boolean);
    
      // lote y departamento se enlazan por ngModel directamente a `proyecto`,
      // por lo que no hace falta sincronizarlos explícitamente aquí.
    } catch(e) { /* ignore */ }
    try {
      const raw = localStorage.getItem('projects_v1');
      const arr: Proyecto[] = raw ? JSON.parse(raw) : [];
      const idx = arr.findIndex(p => p.codigoProyecto === this.proyecto!.codigoProyecto);
      if (idx === -1) arr.push(this.proyecto);
      else arr[idx] = this.proyecto;
      localStorage.setItem('projects_v1', JSON.stringify(arr));
      this.editing = false;
    } catch (e) { /* noop */ }
  }
}
