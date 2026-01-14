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
  nexusString = '';
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
        if (this.proyecto) {
          const p = this.proyecto;
          p.ip = (p.ip||[]);
          this.ipString = (p.ip||[]).join(', ');
          p.herramientasMind = p.herramientasMind || {} as any;
          const h = p.herramientasMind as any;
          h.nexus = h.nexus || [];
          h.sonar = h.sonar || {} as any;
          this.nexusString = (h.nexus || []).join('\n');
        }
      }
    } catch (e) { this.proyecto = undefined; }
  }

  // safe helper to use in templates: always returns an object
  get hm() {
    if (!this.proyecto) return {} as any;
    const p = this.proyecto;
    const hm = p.herramientasMind = p.herramientasMind || {} as any;
    hm.sonar = hm.sonar || {} as any;
    hm.nexus = hm.nexus || [] as any;
    return hm as any;
  }

  isValidUrl(s?: string) {
    if (!s) return false;
    try {
      const u = new URL(s);
      return ['http:', 'https:'].includes(u.protocol);
    } catch (e) { return false; }
  }

  openUrl(href?: string) {
    if (!href) return;
    try { window.open(href, '_blank'); } catch(e) { /* noop */ }
  }

  back() {
    this.router.navigate(['/projects']);
  }

  save() {
    if (!this.proyecto) return;
    const p = this.proyecto;
    // sincronizar ipString -> proyecto.ip
    try {
      p.ip = (this.ipString||'').split(',').map(s=>s.trim()).filter(Boolean);
      // sync nexus textarea -> proyecto.herramientasMind.nexus
      const hm = p.herramientasMind = p.herramientasMind || {} as any;
      hm.nexus = (this.nexusString||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    
      // lote y departamento se enlazan por ngModel directamente a `proyecto`,
      // por lo que no hace falta sincronizarlos explícitamente aquí.
    } catch(e) { /* ignore */ }
    try {
      const raw = localStorage.getItem('projects_v1');
      const arr: Proyecto[] = raw ? JSON.parse(raw) : [];
      const code = p.codigoProyecto || '';
      const idx = arr.findIndex(x => x.codigoProyecto === code);
      if (idx === -1) arr.push(p);
      else arr[idx] = p;
      localStorage.setItem('projects_v1', JSON.stringify(arr));
      this.editing = false;
    } catch (e) { /* noop */ }
  }
}
