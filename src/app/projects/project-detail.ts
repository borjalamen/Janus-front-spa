import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DocumentService, BackendDocument } from '../document.service';
import { TranslateService } from '@ngx-translate/core';

import { Proyecto, Task } from './projects';

type Volume = { name?: string; capacity?: string };
type OpenShift = { identifier?: string; user?: string; password?: string; ram?: string; cpu?: string; disk?: string; volumes?: Volume[] };
type DBConfig = { identifier?: string; engine?: string; instanceName?: string; host?: string; port?: string; sid?: string; user?: string; password?: string; description?: string; properties?: string; contactPerson?: string; contactMail?: string };
type OtherTool = { identifier?: string; name?: string; path?: string; running?: boolean; contactPerson?: string; contactMail?: string };
type DevMachine = { ip: string; user: string; password: string; identifier?: string; openshiftEnabled?: boolean; openshifts?: OpenShift[]; ram?: string; cpu?: string; disk?: string; dbEnabled: boolean; dbs?: DBConfig[]; otherToolEnabled: boolean; otherTools?: OtherTool[] };

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.css']
})
export class ProjectDetailComponent {
  proyecto?: Proyecto;
  private _editing = false;
  get editing() { return this._editing; }
  set editing(v: boolean) {
    const prev = this._editing;
    this._editing = !!v;
    // if we just entered editing mode, refresh document list to pick latest changes
    if (!prev && this._editing) {
      try { this.loadProjectDocuments(); } catch(e) { /* noop */ }
    }
  }
  projectDocs: BackendDocument[] = [];
  selectedDocFile?: File;
  loadingDocs = false;
  docsSearch = '';
  projectDocMeta: Array<{ name: string; size?: number; contentType?:string; lastModified?:string }> = [];
  // máximo permitido por el cliente antes de intentar subir (por defecto 20MB)
  readonly MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
  uploadError: string | null = null;
  ipString = '';
  nexusString = '';
  docsString = '';
  activeTab: 'info' | 'minsait' | 'dev' | 'mind' | 'docs' = 'info';
  routeMode: string = 'view';
  devMachines: DevMachine[] = [];
  selectedDevMachineIndex: number = -1;
  // dynamic lists for MIND tools
  codeRepos: Array<{name?:string; url?:string}> = [];
  artifactRepos: Array<{name?:string; url?:string}> = [];
  jenkinsList: Array<{name?:string; url?:string}> = [];
  crontabList: Array<{expr?:string; desc?:string}> = [];
  sonarList: Array<{prefix?:string; url?:string; tokenUser?:string; tokenValue?:string}> = [];
  // removal workflow
  removeCandidate: { type: 'code'|'artifact'|'jenkins'|'crontab'|'member'|'sonar'|'openshift'|'db'|'othertool'|'machine'|'document' , index: number } | null = null;
  removeDocCandidate: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router, private documentService: DocumentService, private translate: TranslateService) {
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
          // garantizar estructura de arrays (openshifts, dbs, otherTools) para cada máquina
          this.devMachines = this.devMachines.map(m => ({
            ip: m.ip || '', user: m.user || '', password: m.password || '', identifier: (m as any).identifier || '',
            openshiftEnabled: !!m.openshiftEnabled,
            openshifts: (m as any).openshifts && Array.isArray((m as any).openshifts) ? (m as any).openshifts.map((o: any) => Object.assign({ identifier:'', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] }, o || {})) : ((m as any).openshift ? [ Object.assign({ identifier:'', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] }, (m as any).openshift || {}) ] : []),
            ram: (m as any).ram || '', cpu: (m as any).cpu || '', disk: (m as any).disk || '',
            dbEnabled: !!(m as any).dbEnabled,
            dbs: (m as any).dbs && Array.isArray((m as any).dbs) ? (m as any).dbs.map((d: any) => Object.assign({ identifier: '', engine: '', instanceName: '', host: '', port: '', sid: '', user: '', password: '', description: '', properties: '', contactPerson: '', contactMail: '' }, d || {})) : ((m as any).dbConfig ? [ Object.assign({ identifier: '', engine: '', instanceName: '', host: '', port: '', sid: '', user: '', password: '', description: '', properties: '', contactPerson: '', contactMail: '' }, (m as any).dbConfig || {}) ] : []),
            otherToolEnabled: !!(m as any).otherToolEnabled,
            otherTools: (m as any).otherTools && Array.isArray((m as any).otherTools) ? (m as any).otherTools.map((t: any) => Object.assign({ identifier: '', name: '', path: '', running: false, contactPerson: '', contactMail: '' }, t || {})) : ((m as any).otherTool ? [ Object.assign({ identifier: '', name: '', path: '', running: false, contactPerson: '', contactMail: '' }, (m as any).otherTool || {}) ] : [])
          } as DevMachine));
          // initialize selected index to first machine if any
          this.selectedDevMachineIndex = this.devMachines.length ? 0 : -1;
          p.herramientasMind = p.herramientasMind || {} as any;
          const h = p.herramientasMind as any;
          h.nexus = h.nexus || [];
          h.codeRepos = h.codeRepos || [];
          h.artifactRepos = h.artifactRepos || [];
          h.jenkins = h.jenkins || [];
          h.crontabs = h.crontabs || [];
          this.codeRepos = (h.codeRepos||[]).slice();
          this.artifactRepos = (h.artifactRepos||[]).slice();
          this.jenkinsList = (h.jenkins||[]).slice();
          this.crontabList = (h.crontabs||[]).slice();
          h.sonar = h.sonar || {} as any;
          // sonar may be stored as object (legacy) or as a list
          if (Array.isArray(h.sonarList) && h.sonarList.length) {
            this.sonarList = (h.sonarList||[]).slice();
          } else if (h.sonar && (h.sonar.prefix || h.sonar.url || h.sonar.tokenUser || h.sonar.tokenValue)) {
            this.sonarList = [{ prefix: h.sonar.prefix||'', url: h.sonar.url||'', tokenUser: h.sonar.tokenUser||'', tokenValue: h.sonar.tokenValue||'' }];
          } else {
            this.sonarList = [];
          }
          this.nexusString = (h.nexus || []).join('\n');
          (p as any).documentacion = (p as any).documentacion || '';
          this.docsString = (p as any).documentacion || '';
            // ensure equipoMinsait exists
          (p as any).equipoMinsait = (p as any).equipoMinsait || [];
            // load project documents for this project (if any)
            try { this.loadProjectDocuments(); } catch(e) { /* noop */ }
        }
      }
    } catch (e) { this.proyecto = undefined; }
  }

  // helper to determine idProyecto for document service
  private getDocsProjectId(): string | number | undefined {
    if (!this.proyecto) return undefined;
    // prefer explicit numeric id if present, otherwise use project code
    // backend accepts either numeric or string ids; use codigoProyecto by default
    return (this.proyecto as any).id || this.proyecto.codigoProyecto;
  }

  // load files for current project
  loadProjectDocuments() {
    const pid = this.getDocsProjectId();
    if (!pid) { this.projectDocs = []; return; }
    this.loadingDocs = true;
    // try to load metadata first (more informative)
    this.documentService.getFolderInfo(pid).subscribe({
      next: (meta:any[]) => {
        if (Array.isArray(meta) && meta.length) {
          // normalize meta entries
          this.projectDocMeta = meta.map(m => ({ name: (m.name||m.nombre||'').toString(), size: m.size, contentType: m.contentType, lastModified: m.lastModified }));
          this.projectDocs = this.projectDocMeta.map(m => m.name as any);
          this.loadingDocs = false;
        } else {
          // fallback to filenames only
          this.documentService.getAllFiles(pid).subscribe({
            next: (files: BackendDocument[]) => { this.projectDocs = files || []; this.projectDocMeta = (files||[]).map(f => ({ name: f })); this.loadingDocs = false; },
            error: (err: any) => { console.error('Error cargando documentos proyecto', err); this.projectDocs = []; this.projectDocMeta = []; this.loadingDocs = false; }
          });
        }
      },
      error: (err: any) => {
        console.warn('No se pudo obtener metadata de carpeta', err);
        // fallback to filenames only
        this.documentService.getAllFiles(pid).subscribe({
          next: (files: BackendDocument[]) => { this.projectDocs = files || []; this.projectDocMeta = (files||[]).map(f => ({ name: f })); this.loadingDocs = false; },
          error: (err2: any) => { console.error('Error cargando documentos proyecto', err2); this.projectDocs = []; this.projectDocMeta = []; this.loadingDocs = false; }
        });
      }
    });
  }

  onDocFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (file) {
      this.selectedDocFile = file;
    }
  }

  uploadProjectDocument() {
    const pid = this.getDocsProjectId();
    if (!pid || !this.selectedDocFile) return;
    const fileRef = this.selectedDocFile;
    // reset any previous error
    this.uploadError = null;
    // client-side size check to avoid 413 errors
    if (fileRef.size != null && fileRef.size > this.MAX_UPLOAD_BYTES) {
      const msg = this.translate.instant('PROJECTS.UPLOAD_ERROR_TOO_LARGE');
      this.uploadError = `${msg} (${this.formatBytes(fileRef.size)} > ${this.formatBytes(this.MAX_UPLOAD_BYTES)})`;
      return;
    }
    this.documentService.uploadDocument(pid, this.selectedDocFile).subscribe({
      next: () => {
        // capture filename then clear selection and file input UI
        const uploadedName = fileRef ? fileRef.name : '';
        this.selectedDocFile = undefined;
        try {
          const el = document.getElementById('project-doc-file') as HTMLInputElement | null;
          if (el) el.value = '';
        } catch (e) {}
        // try an immediate refresh then start polling to be robust against backend delays
        this.loadingDocs = true;
        // immediate refresh (may show it already)
        try { this.loadProjectDocuments(); } catch(e) {}
        // start polling for new file to appear (more tolerant matching)
        console.debug('[ProjectDetail] uploaded filename=', uploadedName, 'projectId=', pid);
        this.pollForFile(pid, uploadedName || '', 8, 300)
          .then(found => {
            // refresh list regardless
            this.loadProjectDocuments();
            this.loadingDocs = false;
          })
          .catch(() => {
            // if polling failed, still try to reload once
            this.loadProjectDocuments();
            this.loadingDocs = false;
          });
      },
      error: (err: any) => {
        console.error('Error subiendo documento', err);
        try {
          if (err && err.status === 413) this.uploadError = this.translate.instant('PROJECTS.UPLOAD_ERROR_TOO_LARGE');
          else this.uploadError = this.translate.instant('PROJECTS.UPLOAD_GENERIC_ERROR');
        } catch(e) { this.uploadError = this.translate.instant('PROJECTS.UPLOAD_GENERIC_ERROR'); }
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B','KB','MB','GB','TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length-1) { val = val/1024; i++; }
    return `${Math.round(val*10)/10} ${units[i]}`;
  }

  private async pollForFile(projectId: string | number, fileName: string, attempts = 5, initialDelay = 300): Promise<boolean> {
    if (!fileName) return Promise.resolve(true);
    const target = (fileName || '').toLowerCase().trim();
    let delay = initialDelay;
    for (let i = 0; i < attempts; i++) {
      console.debug(`[ProjectDetail] poll attempt ${i+1}/${attempts} for '${fileName}' on project ${projectId}`);
      try {
        // First try folder info (metadata with name)
        try {
          const meta = await this.documentService.getFolderInfo(projectId).toPromise();
          console.debug('[ProjectDetail] folderInfo=', meta);
          if (Array.isArray(meta)) {
            const found = meta.some((m: any) => {
              const n = (m && (m.name || m.nombre) || '').toString().toLowerCase();
              return n === target || n.endsWith(target) || n.indexOf(target) >= 0;
            });
            if (found) return true;
          }
        } catch (e) {
          console.debug('[ProjectDetail] folderInfo error', e);
        }

        // Fallback to getAllFiles which may return simple names
        try {
          const files = await this.documentService.getAllFiles(projectId).toPromise();
          console.debug('[ProjectDetail] getAllFiles=', files);
          if (Array.isArray(files)) {
            const found = files.some((f: any) => {
              const n = (f || '').toString().toLowerCase();
              return n === target || n.endsWith(target) || n.indexOf(target) >= 0;
            });
            if (found) return true;
          }
        } catch (e) {
          console.debug('[ProjectDetail] getAllFiles error', e);
        }
      } catch (e) {
        // ignore and retry
      }
      await new Promise(res => setTimeout(res, delay));
      delay = Math.min(3000, Math.round(delay * 1.8));
    }
    return false;
  }

  downloadProjectDocument(fileName: string) {
    const pid = this.getDocsProjectId();
    if (!pid) return;
    this.documentService.downloadFile(pid, fileName).subscribe({
      next: (blob: Blob) => {
        try {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (e) {
          console.error('Error descargando fichero', e);
        }
      },
      error: (err: any) => console.error('Error solicitando fichero', err)
    });
  }

  get filteredProjectDocs() {
    const q = (this.docsSearch || '').trim().toLowerCase();
    if (!q) return this.projectDocMeta.length ? this.projectDocMeta : this.projectDocs.map(n => ({ name: n } as any));
    // search across name, lastModified, size
    const all = this.projectDocMeta.length ? this.projectDocMeta : this.projectDocs.map(n => ({ name: n } as any));
    return all.filter(d => {
      const parts: string[] = [];
      parts.push(d.name || '');
      if (d.lastModified) parts.push(d.lastModified);
      if (d.size != null) parts.push(String(d.size));
      return parts.join(' ').toLowerCase().includes(q);
    });
  }

  confirmDeleteProjectDocument(fileName: string) {
    if (!fileName) return;
    if (!confirm('¿Desea eliminar el fichero "' + fileName + '"?')) return;
    const pid = this.getDocsProjectId();
    if (!pid) return;
    this.documentService.deleteDocument(pid, fileName).subscribe({
      next: () => this.loadProjectDocuments(),
      error: (err: any) => console.error('Error eliminando documento', err)
    });
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
      // persist dynamic lists
      hm.codeRepos = (this.codeRepos||[]).map(c => ({ name: c.name||'', url: c.url||'' }));
      hm.artifactRepos = (this.artifactRepos||[]).map(a => ({ name: a.name||'', url: a.url||'' }));
      hm.jenkins = (this.jenkinsList||[]).map(j => ({ name: j.name||'', url: j.url||'' }));
      hm.crontabs = (this.crontabList||[]).map(c => ({ expr: c.expr||'', desc: c.desc||'' }));
      // persist sonar list
      hm.sonarList = (this.sonarList||[]).map(s => ({ prefix: s.prefix||'', url: s.url||'', tokenUser: s.tokenUser||'', tokenValue: s.tokenValue||'' }));
      // sync documentation
      (p as any).documentacion = this.docsString || '';
    
      // Asegurar que los campos de equipo Minsait estén definidos y persistir la lista
      p.equipoMinsait = p.equipoMinsait || [];
      p.horaDaily = p.horaDaily || null;
    } catch(e) { /* ignore */ }
    try {
      const raw = localStorage.getItem('projects_v1');
      const arr: Proyecto[] = raw ? JSON.parse(raw) : [];
      const code = p.codigoProyecto || '';
      const idx = arr.findIndex(x => x.codigoProyecto === code);
      // persistir máquinas de desarrollo
      // ensure new fields are persisted
      (p as any).devMachines = this.devMachines.map(m => ({
        ip: m.ip, user: m.user, password: m.password, openshiftEnabled: !!m.openshiftEnabled, openshifts: (m.openshifts||[]).map(o => Object.assign({}, o || { identifier:'', user:'', password:'', ram:'', cpu:'', disk:'', volumes: [] })), ram: m.ram, cpu: m.cpu, disk: m.disk,
        dbEnabled: !!m.dbEnabled, dbs: (m.dbs||[]).map(d => Object.assign({}, d || { identifier:'', engine:'', instanceName:'', host:'', port:'', sid:'', user:'', password:'', description:'', properties:'', contactPerson:'', contactMail:'' })),
        otherToolEnabled: !!m.otherToolEnabled, otherTools: (m.otherTools||[]).map(t => Object.assign({}, t || { identifier:'', name:'', path:'', running:false, contactPerson:'', contactMail:'' }))
      }));
      // persistir equipo minsait
      (p as any).equipoMinsait = p.equipoMinsait || [];
      if (idx === -1) arr.push(p);
      else arr[idx] = p;
      localStorage.setItem('projects_v1', JSON.stringify(arr));
      this.editing = false;
    } catch (e) { /* noop */ }
  }

  addDevMachine() {
    const newIndex = this.devMachines.length;
    this.devMachines.push({ ip: '', user: '', password: '', identifier: '', openshiftEnabled: false, openshifts: [], ram: '', dbEnabled: false, dbs: [], otherToolEnabled: false, otherTools: [] });
    this.selectedDevMachineIndex = newIndex;
  }

  // code repos
  addCodeRepo() { this.codeRepos.push({ name: '', url: '' }); }
  removeCodeRepo(i:number) { if (i>=0 && i < this.codeRepos.length) this.codeRepos.splice(i,1); }

  // artifact repos
  addArtifactRepo() { this.artifactRepos.push({ name: '', url: '' }); }
  removeArtifactRepo(i:number) { if (i>=0 && i < this.artifactRepos.length) this.artifactRepos.splice(i,1); }

  // jenkins
  addJenkins() { this.jenkinsList.push({ name: '', url: '' }); }
  removeJenkins(i:number) { if (i>=0 && i < this.jenkinsList.length) this.jenkinsList.splice(i,1); }

  // crontab
  addCrontab() { this.crontabList.push({ expr: '', desc: '' }); }
  removeCrontab(i:number) { if (i>=0 && i < this.crontabList.length) this.crontabList.splice(i,1); }

  // sonar dynamic entries
  addSonar() { this.sonarList.push({ prefix:'', url:'', tokenUser:'', tokenValue:'' }); }
  removeSonar(i:number) { if (i>=0 && i < this.sonarList.length) this.sonarList.splice(i,1); }

  // confirm remove generic
  promptRemove(type: 'code'|'artifact'|'jenkins'|'crontab'|'member'|'sonar'|'openshift'|'db'|'othertool'|'machine'|'document', index:number) {
    this.removeCandidate = { type, index };
  }
  confirmRemove() {
    if (!this.removeCandidate) return;
    const { type, index } = this.removeCandidate;
    if (type === 'code') this.removeCodeRepo(index);
    else if (type === 'artifact') this.removeArtifactRepo(index);
    else if (type === 'jenkins') this.removeJenkins(index);
    else if (type === 'crontab') this.removeCrontab(index);
    else if (type === 'sonar') this.removeSonar(index);
    else if (type === 'member') this.removeMember(index);
    else if (type === 'openshift') this.removeOpenshift(index);
    else if (type === 'db') this.removeDb(index);
    else if (type === 'othertool') this.removeOtherTool(index);
    else if (type === 'machine') this.removeDevMachine(index);
    else if (type === 'document') {
      const fileName = this.removeDocCandidate;
      const pid = this.getDocsProjectId();
      if (fileName && pid) {
        this.documentService.deleteDocument(pid, fileName).subscribe({
          next: () => { this.loadProjectDocuments(); },
          error: (err: any) => console.error('Error eliminando documento', err)
        });
      }
      this.removeDocCandidate = null;
    }
    this.removeCandidate = null;
  }
  cancelRemove() { this.removeCandidate = null; }

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
    if (index >= 0 && index < this.devMachines.length) {
      this.devMachines.splice(index, 1);
      // adjust selection
      if (this.devMachines.length === 0) this.selectedDevMachineIndex = -1;
      else if (this.selectedDevMachineIndex >= this.devMachines.length) this.selectedDevMachineIndex = this.devMachines.length - 1;
    }
  }

  addVolume(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.openshifts = m.openshifts || [];
    if (m.openshifts.length === 0) {
      m.openshifts.push({ identifier:'', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] });
    }
    const last = m.openshifts[m.openshifts.length - 1];
    last.volumes = last.volumes || [];
    last.volumes.push({ name: '', capacity: '' });
  }

  removeVolume(machineIndex: number, volumeIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m || !Array.isArray(m.openshifts) || m.openshifts.length === 0) return;
    const last = m.openshifts[m.openshifts.length - 1];
    if (!last || !Array.isArray(last.volumes)) return;
    if (volumeIndex >= 0 && volumeIndex < last.volumes.length) last.volumes.splice(volumeIndex, 1);
  }

  // Clearers used by the small remove buttons in dev-duo blocks
  removeOpenshift(machineIndex: number, openshiftIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof openshiftIndex === 'number' && Array.isArray(m.openshifts)) {
      if (openshiftIndex >=0 && openshiftIndex < m.openshifts.length) m.openshifts.splice(openshiftIndex, 1);
    } else {
      m.openshiftEnabled = false;
      m.openshifts = [];
    }
  }

  removeDb(machineIndex: number, dbIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof dbIndex === 'number' && Array.isArray(m.dbs)) {
      if (dbIndex >=0 && dbIndex < m.dbs.length) m.dbs.splice(dbIndex, 1);
    } else {
      m.dbEnabled = false;
      m.dbs = [];
    }
  }

  removeOtherTool(machineIndex: number, otherIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof otherIndex === 'number' && Array.isArray(m.otherTools)) {
      if (otherIndex >=0 && otherIndex < m.otherTools.length) m.otherTools.splice(otherIndex, 1);
    } else {
      m.otherToolEnabled = false;
      m.otherTools = [];
    }
  }

  addOpenshift(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.openshifts = m.openshifts || [];
    m.openshifts.push({ identifier:'', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] });
  }

  addDb(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.dbs = m.dbs || [];
    m.dbs.push({ identifier: '', engine:'', instanceName:'', host:'', port:'', sid:'', user:'', password:'', description:'', properties:'', contactPerson:'', contactMail:'' });
  }

  addOtherTool(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.otherTools = m.otherTools || [];
    m.otherTools.push({ identifier: '', name:'', path:'', running:false, contactPerson:'', contactMail:'' });
  }
}
