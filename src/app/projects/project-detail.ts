import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { Proyecto, Task } from './projects';

type Volume = { name?: string; capacity?: string };
type OpenShift = { user?: string; password?: string; ram?: string; cpu?: string; disk?: string; volumes?: Volume[] };
type DevMachine = { ip: string; user: string; password: string; openshiftEnabled?: boolean; openshift?: OpenShift; ram?: string; cpu?: string; disk?: string };

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
  docsString = '';
  activeTab: 'info' | 'minsait' | 'dev' | 'mind' | 'docs' = 'info';
  routeMode: string = 'view';
  devMachines: DevMachine[] = [];

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
          // ensure notes field exists for environment
          (p as any).entornoNotas = (p as any).entornoNotas || '';
          this.ipString = (p.ip||[]).join(', ');
          // cargar máquinas de desarrollo si existen
          this.devMachines = (p as any).devMachines && Array.isArray((p as any).devMachines) ? (p as any).devMachines as DevMachine[] : [];
          // garantizar estructura openshift para cada máquina
          this.devMachines = this.devMachines.map(m => ({
            ip: m.ip || '', user: m.user || '', password: m.password || '',
            openshiftEnabled: !!m.openshiftEnabled,
            openshift: m.openshift || { user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] },
            ram: (m as any).ram || '', cpu: (m as any).cpu || '', disk: (m as any).disk || ''
          } as DevMachine));
          p.herramientasMind = p.herramientasMind || {} as any;
          const h = p.herramientasMind as any;
          h.nexus = h.nexus || [];
          h.sonar = h.sonar || {} as any;
          this.nexusString = (h.nexus || []).join('\n');
          (p as any).documentacion = (p as any).documentacion || '';
          this.docsString = (p as any).documentacion || '';
          // ensure equipoMinsait exists
          (p as any).equipoMinsait = (p as any).equipoMinsait || [];
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
      // sync documentation
      (p as any).documentacion = this.docsString || '';
    
      // Asegurar que los campos de equipo Minsait estén definidos y persistir la lista
      p.equipoMinsait = p.equipoMinsait || [];
      p.horaDaily = p.horaDaily || null;
      p.dailyAccessPerson = p.dailyAccessPerson || null;
    } catch(e) { /* ignore */ }
    try {
      const raw = localStorage.getItem('projects_v1');
      const arr: Proyecto[] = raw ? JSON.parse(raw) : [];
      const code = p.codigoProyecto || '';
      const idx = arr.findIndex(x => x.codigoProyecto === code);
      // persistir máquinas de desarrollo
      (p as any).devMachines = this.devMachines;
      // persistir equipo minsait
      (p as any).equipoMinsait = p.equipoMinsait || [];
      if (idx === -1) arr.push(p);
      else arr[idx] = p;
      localStorage.setItem('projects_v1', JSON.stringify(arr));
      this.editing = false;
    } catch (e) { /* noop */ }
  }

  addDevMachine() {
    this.devMachines.push({ ip: '', user: '', password: '', openshiftEnabled: false, openshift: { user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] } });
  }

  addMember() {
    if (!this.proyecto) return;
    this.proyecto.equipoMinsait = this.proyecto.equipoMinsait || [];
    this.proyecto.equipoMinsait.push({ nombre: '', rol: '', email: '' });
  }

  removeMember(index: number) {
    if (!this.proyecto || !Array.isArray(this.proyecto.equipoMinsait)) return;
    if (index >= 0 && index < this.proyecto.equipoMinsait.length) this.proyecto.equipoMinsait.splice(index, 1);
  }

  // confirm remove flow
  removeCandidateIndex: number | null = null;
  promptRemoveMember(index: number) {
    this.removeCandidateIndex = index;
  }

  confirmRemoveMember() {
    if (this.removeCandidateIndex === null) return;
    this.removeMember(this.removeCandidateIndex);
    this.removeCandidateIndex = null;
  }

  cancelRemoveMember() {
    this.removeCandidateIndex = null;
  }

  removeDevMachine(index: number) {
    if (index >= 0 && index < this.devMachines.length) this.devMachines.splice(index, 1);
  }

  addVolume(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.openshift = m.openshift || { user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] };
    m.openshift.volumes = m.openshift.volumes || [];
    m.openshift.volumes.push({ name: '', capacity: '' });
  }

  removeVolume(machineIndex: number, volumeIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m || !m.openshift || !Array.isArray(m.openshift.volumes)) return;
    if (volumeIndex >= 0 && volumeIndex < (m.openshift.volumes || []).length) m.openshift!.volumes!.splice(volumeIndex, 1);
  }
}
