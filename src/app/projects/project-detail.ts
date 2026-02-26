import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { DocumentService, BackendDocument } from '../document.service';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';
import { SafePipe } from '../safe.pipe';

import { Proyecto, Task } from './projects';

type Volume = { name?: string; capacity?: string };
type OpenShift = { identifier?: string; user?: string; password?: string; ram?: string; cpu?: string; disk?: string; volumes?: Volume[] };
type DBConfig = { identifier?: string; engine?: string; instanceName?: string; host?: string; port?: string; sid?: string; user?: string; password?: string; description?: string; properties?: string; contactPerson?: string; contactMail?: string };
type OtherTool = { identifier?: string; name?: string; path?: string; running?: boolean; contactPerson?: string; contactMail?: string };
type DevMachine = { ip: string; user: string; password: string; identifier?: string; openshiftEnabled?: boolean; openshifts?: OpenShift[]; ram?: string; cpu?: string; disk?: string; dbEnabled: boolean; dbs?: DBConfig[]; otherToolEnabled: boolean; otherTools?: OtherTool[] };

type ProjectDetailTab = 'info' | 'minsait' | 'dev' | 'mind' | 'docs';

type ProjectDetailDraft = {
  codigoProyecto: string | null;
  ipString: string;
  nexusString: string;
  docsString: string;
  activeTab: ProjectDetailTab;
  selectedDevMachineIndex: number;
  devMachines: DevMachine[];
  codeRepos: Array<{ name?: string; url?: string }>;
  artifactRepos: Array<{ name?: string; url?: string }>;
  jenkinsList: Array<{ name?: string; url?: string }>;
  crontabList: Array<{ expr?: string; desc?: string }>;
  sonarList: Array<{ prefix?: string; url?: string; tokenUser?: string; tokenValue?: string }>;
  equipoMinsait: Proyecto['equipoMinsait'];
  responsableProyecto: string;
  responsableTecnico: string;
  horaDaily: string | null;
  entornoNotas: string;
  notasGenerales: string | null;
};

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, MatIconModule, SafePipe],
  templateUrl: './project-detail.html',
  styleUrls: ['./project-detail.css']
})
export class ProjectDetailComponent implements OnInit, OnChanges, OnDestroy {
  @Input() proyecto?: Proyecto;
  @Input() mode: 'view' | 'edit' = 'view';
  @Output() close = new EventEmitter<void>();

  private _editing = false;
  get editing() { return this._editing; }
  set editing(v: boolean) {
    const prev = this._editing;
    this._editing = !!v;
    if (!prev && this._editing) {
      try { this.loadProjectDocuments(); } catch (e) { /* noop */ }
      this.restoreDraft();
    }
  }

  // Documentos agregados durante creación
  projectDocumentsFromCreation: Array<{
    nombre: string;
    descripcion: string;
    tipo: string;
    path: string;
  }> = [];

  // Para cargar archivos en la vista de detalle
  detailFileInput: File | null = null;
  detailFileDescription: string = '';
  documentPreviewUrls: Map<string, string> = new Map();
  documentCsvContents: Map<string, string[][]> = new Map();

  projectDocs: BackendDocument[] = [];
  selectedDocFile?: File;
  loadingDocs = false;
  docsSearch = '';
  projectDocMeta: Array<{ name: string; size?: number; contentType?: string; lastModified?: string }> = [];
  readonly MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
  uploadError: string | null = null;

  // Validación de documentos - popup de confirmación
  showUploadConfirmPopup = false;
  pendingUploadFile?: File;
  uploadValidationErrors: string[] = [];

  // Tipos de archivo permitidos
  readonly ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.json', '.xml', '.zip', '.rar', '.7z', '.png', '.jpg', '.jpeg', '.gif', '.svg'];
  readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml'
  ];

  ipString = '';
  nexusString = '';
  docsString = '';
  activeTab: ProjectDetailTab = 'info';
  routeMode: string = 'view';
  devMachines: DevMachine[] = [];
  selectedDevMachineIndex: number = -1;

  // dynamic lists for MIND tools
  codeRepos: Array<{ name?: string; url?: string }> = [];
  artifactRepos: Array<{ name?: string; url?: string }> = [];
  jenkinsList: Array<{ name?: string; url?: string }> = [];
  crontabList: Array<{ expr?: string; desc?: string }> = [];
  sonarList: Array<{ prefix?: string; url?: string; tokenUser?: string; tokenValue?: string }> = [];

  // removal workflow
  removeCandidate: { type: 'code' | 'artifact' | 'jenkins' | 'crontab' | 'member' | 'sonar' | 'openshift' | 'db' | 'othertool' | 'machine' | 'document', index: number } | null = null;
  removeDocCandidate: string | null = null;

  // STORAGE KEY per draft de detall
  private readonly STORAGE_DRAFT_KEY = 'project_detail_draft';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private translate: TranslateService,
    private storage: LocalStorageService
  ) {
    // Inicializar propiedades básicas
    this.routeMode = this.mode === 'edit' ? 'edit' : 'view';
    this._editing = this.mode === 'edit';
  }

  ngOnInit() {
    // Inicializar datos cuando el proyecto esté disponible
    if (this.proyecto) {
      this.initializeProjectData();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['proyecto']) {
      // Cargar datos cuando el proyecto cambia (incluso en el primer cambio)
      if (this.proyecto) {
        this.initializeProjectData();
      }
    }
  }

  private initializeProjectData() {
    if (!this.proyecto) return;

    const p = this.proyecto;
    p.ip = (p.ip || []);
    (p as any).entornoNotas = (p as any).entornoNotas || '';
    this.ipString = (p.ip || []).join(', ');

    // Cargar documentos agregados durante creación
    this.projectDocumentsFromCreation = (p as any).documents && Array.isArray((p as any).documents)
      ? (p as any).documents
      : [];

    console.log('📄 Documentos cargados:', this.projectDocumentsFromCreation);
    
    // Limpiar URLs previas
    this.documentPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    this.documentPreviewUrls.clear();
    this.documentCsvContents.clear();
    
    // Cargar previews de documentos
    this.loadDocumentPreviews();

    this.devMachines = (p as any).devMachines && Array.isArray((p as any).devMachines)
      ? (p as any).devMachines as DevMachine[]
      : [];

    this.devMachines = this.devMachines.map(m => ({
      ip: m.ip || '',
      user: m.user || '',
      password: m.password || '',
      identifier: (m as any).identifier || '',
      openshiftEnabled: !!m.openshiftEnabled,
      openshifts: (m as any).openshifts && Array.isArray((m as any).openshifts)
        ? (m as any).openshifts.map((o: any) =>
            Object.assign({ identifier: '', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] }, o || {})
          )
        : ((m as any).openshift
          ? [Object.assign({ identifier: '', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] }, (m as any).openshift || {})]
          : []),
      ram: (m as any).ram || '',
      cpu: (m as any).cpu || '',
      disk: (m as any).disk || '',
      dbEnabled: !!(m as any).dbEnabled,
      dbs: (m as any).dbs && Array.isArray((m as any).dbs)
        ? (m as any).dbs.map((d: any) =>
            Object.assign(
              {
                identifier: '',
                engine: '',
                instanceName: '',
                host: '',
                port: '',
                sid: '',
                user: '',
                password: '',
                description: '',
                properties: '',
                contactPerson: '',
                contactMail: ''
              },
              d || {}
            )
          )
        : ((m as any).dbConfig
          ? [Object.assign(
              {
                identifier: '',
                engine: '',
                instanceName: '',
                host: '',
                port: '',
                sid: '',
                user: '',
                password: '',
                description: '',
                properties: '',
                contactPerson: '',
                contactMail: ''
              },
              (m as any).dbConfig || {}
            )]
          : []),
      otherToolEnabled: !!(m as any).otherToolEnabled,
      otherTools: (m as any).otherTools && Array.isArray((m as any).otherTools)
        ? (m as any).otherTools.map((t: any) =>
            Object.assign(
              { identifier: '', name: '', path: '', running: false, contactPerson: '', contactMail: '' },
              t || {}
            )
          )
        : ((m as any).otherTool
          ? [Object.assign(
              { identifier: '', name: '', path: '', running: false, contactPerson: '', contactMail: '' },
              (m as any).otherTool || {}
            )]
          : [])
    } as DevMachine));

    this.selectedDevMachineIndex = this.devMachines.length ? 0 : -1;

    p.herramientasMind = p.herramientasMind || {} as any;
    const h = p.herramientasMind as any;
    h.nexus = h.nexus || [];
    h.codeRepos = h.codeRepos || [];
    h.artifactRepos = h.artifactRepos || [];
    h.jenkins = h.jenkins || [];
    h.crontabs = h.crontabs || [];

    this.codeRepos = (h.codeRepos || []).slice();
    this.artifactRepos = (h.artifactRepos || []).slice();
    this.jenkinsList = (h.jenkins || []).slice();
    this.crontabList = (h.crontabs || []).slice();

    h.sonar = h.sonar || {} as any;
    if (Array.isArray(h.sonarList) && h.sonarList.length) {
      this.sonarList = (h.sonarList || []).slice();
    } else if (h.sonar && (h.sonar.prefix || h.sonar.url || h.sonar.tokenUser || h.sonar.tokenValue)) {
      this.sonarList = [{
        prefix: h.sonar.prefix || '',
        url: h.sonar.url || '',
        tokenUser: h.sonar.tokenUser || '',
        tokenValue: h.sonar.tokenValue || ''
      }];
    } else {
      this.sonarList = [];
    }

    this.nexusString = (h.nexus || []).join('\n');
    (p as any).documentacion = (p as any).documentacion || '';
    this.docsString = (p as any).documentacion || '';
    (p as any).equipoMinsait = (p as any).equipoMinsait || [];

    if (this._editing) {
      this.restoreDraft();
    }

    try { this.loadProjectDocuments(); } catch (e) { /* noop */ }
  }

  // ===== DRAFT LOCALSTORAGE =====
  saveDraft(): void {
    if (!this.proyecto) return;
    const draft: ProjectDetailDraft = {
      codigoProyecto: this.proyecto.codigoProyecto || null,
      ipString: this.ipString,
      nexusString: this.nexusString,
      docsString: this.docsString,
      activeTab: this.activeTab,
      selectedDevMachineIndex: this.selectedDevMachineIndex,
      devMachines: this.devMachines,
      codeRepos: this.codeRepos,
      artifactRepos: this.artifactRepos,
      jenkinsList: this.jenkinsList,
      crontabList: this.crontabList,
      sonarList: this.sonarList,
      equipoMinsait: this.proyecto.equipoMinsait || [],
      responsableProyecto: this.proyecto.responsableProyecto || '',
      responsableTecnico: this.proyecto.responsableTecnico || '',
      horaDaily: this.proyecto.horaDaily || null,
      entornoNotas: (this.proyecto as any).entornoNotas || '',
      notasGenerales: this.proyecto.notasGenerales || null
    };
    this.storage.setObject(this.STORAGE_DRAFT_KEY, draft);
  }

  restoreDraft(): void {
    if (!this.proyecto) return;
    const draft = this.storage.getObject<ProjectDetailDraft>(this.STORAGE_DRAFT_KEY);
    if (!draft) return;
    if (draft.codigoProyecto && draft.codigoProyecto !== this.proyecto.codigoProyecto) return;

    this.ipString = draft.ipString ?? this.ipString;
    this.nexusString = draft.nexusString ?? this.nexusString;
    this.docsString = draft.docsString ?? this.docsString;

    const validTabs: ProjectDetailTab[] = ['info', 'minsait', 'dev', 'mind', 'docs'];
    if (draft.activeTab && validTabs.includes(draft.activeTab)) {
      this.activeTab = draft.activeTab;
    }

    this.selectedDevMachineIndex = draft.selectedDevMachineIndex ?? this.selectedDevMachineIndex;
    if (Array.isArray(draft.devMachines)) this.devMachines = draft.devMachines;
    if (Array.isArray(draft.codeRepos)) this.codeRepos = draft.codeRepos;
    if (Array.isArray(draft.artifactRepos)) this.artifactRepos = draft.artifactRepos;
    if (Array.isArray(draft.jenkinsList)) this.jenkinsList = draft.jenkinsList;
    if (Array.isArray(draft.crontabList)) this.crontabList = draft.crontabList;
    if (Array.isArray(draft.sonarList)) this.sonarList = draft.sonarList;

    this.proyecto.equipoMinsait = draft.equipoMinsait || this.proyecto.equipoMinsait || [];
    this.proyecto.responsableProyecto = draft.responsableProyecto ?? this.proyecto.responsableProyecto;
    this.proyecto.responsableTecnico = draft.responsableTecnico ?? this.proyecto.responsableTecnico;
    this.proyecto.horaDaily = draft.horaDaily ?? this.proyecto.horaDaily;
    (this.proyecto as any).entornoNotas = draft.entornoNotas ?? (this.proyecto as any).entornoNotas;
    this.proyecto.notasGenerales = draft.notasGenerales ?? this.proyecto.notasGenerales;
  }

  clearDraft(): void {
    this.storage.remove(this.STORAGE_DRAFT_KEY);
  }

  private getDocsProjectId(): string | number | undefined {
    if (!this.proyecto) return undefined;
    return (this.proyecto as any).id || this.proyecto.codigoProyecto;
  }

  loadProjectDocuments() {
    const pid = this.getDocsProjectId();
    if (!pid) { this.projectDocs = []; return; }
    this.loadingDocs = true;
    this.documentService.getFolderInfo(pid).subscribe({
      next: (meta: any[]) => {
        if (Array.isArray(meta) && meta.length) {
          this.projectDocMeta = meta.map(m => ({
            name: (m.name || m.nombre || '').toString(),
            size: m.size,
            contentType: m.contentType,
            lastModified: m.lastModified
          }));
          this.projectDocs = this.projectDocMeta.map(m => m.name as any);
          this.loadingDocs = false;
        } else {
          this.documentService.getAllFiles(pid).subscribe({
            next: (files: BackendDocument[]) => {
              this.projectDocs = files || [];
              this.projectDocMeta = (files || []).map(f => ({ name: f }));
              this.loadingDocs = false;
            },
            error: (err: any) => {
              console.error('Error cargando documentos proyecto', err);
              this.projectDocs = [];
              this.projectDocMeta = [];
              this.loadingDocs = false;
            }
          });
        }
      },
      error: (err: any) => {
        console.warn('No se pudo obtener metadata de carpeta', err);
        this.documentService.getAllFiles(pid).subscribe({
          next: (files: BackendDocument[]) => {
            this.projectDocs = files || [];
            this.projectDocMeta = (files || []).map(f => ({ name: f }));
            this.loadingDocs = false;
          },
          error: (err2: any) => {
            console.error('Error cargando documentos proyecto', err2);
            this.projectDocs = [];
            this.projectDocMeta = [];
            this.loadingDocs = false;
          }
        });
      }
    });
  }

  onDocFileSelected(event: any) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const validationErrors = this.validateFile(file);
    if (validationErrors.length > 0) {
      this.pendingUploadFile = file;
      this.uploadValidationErrors = validationErrors;
      this.showUploadConfirmPopup = true;
      this.selectedDocFile = undefined;
    } else {
      this.selectedDocFile = file;
      this.uploadProjectDocument();
    }
  }

  validateFile(file: File): string[] {
    const errors: string[] = [];
    if (file.size > this.MAX_UPLOAD_BYTES) {
      errors.push(`El archivo excede el tamaño máximo permitido (${this.formatBytes(file.size)} > ${this.formatBytes(this.MAX_UPLOAD_BYTES)})`);
    }
    const fileName = file.name.toLowerCase();
    const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) {
      const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : 'sin extensión';
      errors.push(`Tipo de archivo no permitido: ${ext}`);
    }
    if (file.type && !this.ALLOWED_MIME_TYPES.includes(file.type)) {
      if (!hasValidExtension) {
        errors.push(`Tipo MIME no reconocido: ${file.type}`);
      }
    }
    if (/[<>:"|?*]/.test(file.name)) {
      errors.push('El nombre del archivo contiene caracteres no permitidos');
    }
    return errors;
  }

  confirmUploadAnyway() {
    if (this.pendingUploadFile) {
      this.selectedDocFile = this.pendingUploadFile;
      this.showUploadConfirmPopup = false;
      this.pendingUploadFile = undefined;
      this.uploadValidationErrors = [];
      this.uploadProjectDocument();
    }
  }

  cancelUpload() {
    this.showUploadConfirmPopup = false;
    this.pendingUploadFile = undefined;
    this.uploadValidationErrors = [];
    this.selectedDocFile = undefined;
    try {
      const el = document.getElementById('project-doc-file') as HTMLInputElement | null;
      if (el) el.value = '';
    } catch (e) {}
  }

  deleteUploadedFile() {
    this.showUploadConfirmPopup = false;
    this.pendingUploadFile = undefined;
    this.uploadValidationErrors = [];
    this.selectedDocFile = undefined;
    try {
      const el = document.getElementById('project-doc-file') as HTMLInputElement | null;
      if (el) el.value = '';
    } catch (e) {}
  }

  uploadProjectDocument() {
    const pid = this.getDocsProjectId();
    if (!pid || !this.selectedDocFile) return;
    const fileRef = this.selectedDocFile;
    this.uploadError = null;
    if (fileRef.size != null && fileRef.size > this.MAX_UPLOAD_BYTES) {
      const msg = this.translate.instant('PROJECTS.UPLOAD_ERROR_TOO_LARGE');
      this.uploadError = `${msg} (${this.formatBytes(fileRef.size)} > ${this.formatBytes(this.MAX_UPLOAD_BYTES)})`;
      return;
    }
    this.documentService.uploadDocument(pid, this.selectedDocFile).subscribe({
      next: () => {
        const uploadedName = fileRef ? fileRef.name : '';
        this.selectedDocFile = undefined;
        try {
          const el = document.getElementById('project-doc-file') as HTMLInputElement | null;
          if (el) el.value = '';
        } catch (e) {}
        this.loadingDocs = true;
        try { this.loadProjectDocuments(); } catch (e) {}
        this.pollForFile(pid, uploadedName || '', 8, 300)
          .then(() => {
            this.loadProjectDocuments();
            this.loadingDocs = false;
          })
          .catch(() => {
            this.loadProjectDocuments();
            this.loadingDocs = false;
          });
      },
      error: (err: any) => {
        console.error('Error subiendo documento', err);
        try {
          if (err && err.status === 413) this.uploadError = this.translate.instant('PROJECTS.UPLOAD_ERROR_TOO_LARGE');
          else this.uploadError = this.translate.instant('PROJECTS.UPLOAD_GENERIC_ERROR');
        } catch (e) {
          this.uploadError = this.translate.instant('PROJECTS.UPLOAD_GENERIC_ERROR');
        }
      }
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) { val = val / 1024; i++; }
    return `${Math.round(val * 10) / 10} ${units[i]}`;
  }

  private async pollForFile(projectId: string | number, fileName: string, attempts = 5, initialDelay = 300): Promise<boolean> {
    if (!fileName) return Promise.resolve(true);
    const target = (fileName || '').toLowerCase().trim();
    let delay = initialDelay;
    for (let i = 0; i < attempts; i++) {
      try {
        try {
          const meta = await this.documentService.getFolderInfo(projectId).toPromise();
          if (Array.isArray(meta)) {
            const found = meta.some((m: any) => {
              const n = (m && (m.name || m.nombre) || '').toString().toLowerCase();
              return n === target || n.endsWith(target) || n.indexOf(target) >= 0;
            });
            if (found) return true;
          }
        } catch (e) {}
        try {
          const files = await this.documentService.getAllFiles(projectId).toPromise();
          if (Array.isArray(files)) {
            const found = files.some((f: any) => {
              const n = (f || '').toString().toLowerCase();
              return n === target || n.endsWith(target) || n.indexOf(target) >= 0;
            });
            if (found) return true;
          }
        } catch (e) {}
      } catch (e) {}
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
    try { window.open(href, '_blank'); } catch (e) { /* noop */ }
  }

  back() {
    this.close.emit();
  }

  save() {
    if (!this.proyecto) return;
    const p = this.proyecto;
    try {
      p.ip = (this.ipString || '').split(',').map(s => s.trim()).filter(Boolean);
      const hm = p.herramientasMind = p.herramientasMind || {} as any;
      hm.nexus = (this.nexusString || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      hm.codeRepos = (this.codeRepos || []).map(c => ({ name: c.name || '', url: c.url || '' }));
      hm.artifactRepos = (this.artifactRepos || []).map(a => ({ name: a.name || '', url: a.url || '' }));
      hm.jenkins = (this.jenkinsList || []).map(j => ({ name: j.name || '', url: j.url || '' }));
      hm.crontabs = (this.crontabList || []).map(c => ({ expr: c.expr || '', desc: c.desc || '' }));
      hm.sonarList = (this.sonarList || []).map(s => ({
        prefix: s.prefix || '',
        url: s.url || '',
        tokenUser: s.tokenUser || '',
        tokenValue: s.tokenValue || ''
      }));
      (p as any).documentacion = this.docsString || '';
      p.equipoMinsait = p.equipoMinsait || [];
      p.horaDaily = p.horaDaily || null;
    } catch (e) { /* ignore */ }

    try {
      const raw = this.storage.get('projects_v1');
      const arr: Proyecto[] = raw ? JSON.parse(raw) : [];
      const code = p.codigoProyecto || '';
      const idx = arr.findIndex(x => x.codigoProyecto === code);
      (p as any).devMachines = this.devMachines.map(m => ({
        ip: m.ip,
        user: m.user,
        password: m.password,
        openshiftEnabled: !!m.openshiftEnabled,
        openshifts: (m.openshifts || []).map(o =>
          Object.assign({}, o || { identifier: '', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] })
        ),
        ram: m.ram,
        cpu: m.cpu,
        disk: m.disk,
        dbEnabled: !!m.dbEnabled,
        dbs: (m.dbs || []).map(d =>
          Object.assign(
            {},
            d || {
              identifier: '',
              engine: '',
              instanceName: '',
              host: '',
              port: '',
              sid: '',
              user: '',
              password: '',
              description: '',
              properties: '',
              contactPerson: '',
              contactMail: ''
            }
          )
        ),
        otherToolEnabled: !!m.otherToolEnabled,
        otherTools: (m.otherTools || []).map(t =>
          Object.assign(
            {},
            t || { identifier: '', name: '', path: '', running: false, contactPerson: '', contactMail: '' }
          )
        )
      }));
      (p as any).equipoMinsait = p.equipoMinsait || [];
      if (idx === -1) arr.push(p);
      else arr[idx] = p;
      this.storage.setObject('projects_v1', arr);
      this.editing = false;
      this.clearDraft();
    } catch (e) { /* noop */ }
  }

  addDevMachine() {
    const newIndex = this.devMachines.length;
    this.devMachines.push({
      ip: '',
      user: '',
      password: '',
      identifier: '',
      openshiftEnabled: false,
      openshifts: [],
      ram: '',
      dbEnabled: false,
      dbs: [],
      otherToolEnabled: false,
      otherTools: []
    });
    this.selectedDevMachineIndex = newIndex;
    this.saveDraft();
  }

  // code repos
  addCodeRepo() { this.codeRepos.push({ name: '', url: '' }); this.saveDraft(); }
  removeCodeRepo(i: number) { if (i >= 0 && i < this.codeRepos.length) this.codeRepos.splice(i, 1); this.saveDraft(); }

  // artifact repos
  addArtifactRepo() { this.artifactRepos.push({ name: '', url: '' }); this.saveDraft(); }
  removeArtifactRepo(i: number) { if (i >= 0 && i < this.artifactRepos.length) this.artifactRepos.splice(i, 1); this.saveDraft(); }

  // jenkins
  addJenkins() { this.jenkinsList.push({ name: '', url: '' }); this.saveDraft(); }
  removeJenkins(i: number) { if (i >= 0 && i < this.jenkinsList.length) this.jenkinsList.splice(i, 1); this.saveDraft(); }

  // crontab
  addCrontab() { this.crontabList.push({ expr: '', desc: '' }); this.saveDraft(); }
  removeCrontab(i: number) { if (i >= 0 && i < this.crontabList.length) this.crontabList.splice(i, 1); this.saveDraft(); }

  // sonar dynamic entries
  addSonar() { this.sonarList.push({ prefix: '', url: '', tokenUser: '', tokenValue: '' }); this.saveDraft(); }
  removeSonar(i: number) { if (i >= 0 && i < this.sonarList.length) this.sonarList.splice(i, 1); this.saveDraft(); }

  // confirm remove generic
  promptRemove(type: 'code' | 'artifact' | 'jenkins' | 'crontab' | 'member' | 'sonar' | 'openshift' | 'db' | 'othertool' | 'machine' | 'document', index: number) {
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
    this.saveDraft();
  }

  removeMember(index: number) {
    if (!this.proyecto || !Array.isArray(this.proyecto.equipoMinsait)) return;
    if (index >= 0 && index < this.proyecto.equipoMinsait.length) this.proyecto.equipoMinsait.splice(index, 1);
    this.saveDraft();
  }

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
      if (this.devMachines.length === 0) this.selectedDevMachineIndex = -1;
      else if (this.selectedDevMachineIndex >= this.devMachines.length) this.selectedDevMachineIndex = this.devMachines.length - 1;
      this.saveDraft();
    }
  }

  addVolume(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.openshifts = m.openshifts || [];
    if (m.openshifts.length === 0) {
      m.openshifts.push({ identifier: '', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] });
    }
    const last = m.openshifts[m.openshifts.length - 1];
    last.volumes = last.volumes || [];
    last.volumes.push({ name: '', capacity: '' });
    this.saveDraft();
  }

  removeVolume(machineIndex: number, volumeIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m || !Array.isArray(m.openshifts) || m.openshifts.length === 0) return;
    const last = m.openshifts[m.openshifts.length - 1];
    if (!last || !Array.isArray(last.volumes)) return;
    if (volumeIndex >= 0 && volumeIndex < last.volumes.length) last.volumes.splice(volumeIndex, 1);
    this.saveDraft();
  }

  removeOpenshift(machineIndex: number, openshiftIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof openshiftIndex === 'number' && Array.isArray(m.openshifts)) {
      if (openshiftIndex >= 0 && openshiftIndex < m.openshifts.length) m.openshifts.splice(openshiftIndex, 1);
    } else {
      m.openshiftEnabled = false;
      m.openshifts = [];
    }
    this.saveDraft();
  }

  removeDb(machineIndex: number, dbIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof dbIndex === 'number' && Array.isArray(m.dbs)) {
      if (dbIndex >= 0 && dbIndex < m.dbs.length) m.dbs.splice(dbIndex, 1);
    } else {
      m.dbEnabled = false;
      m.dbs = [];
    }
    this.saveDraft();
  }

  removeOtherTool(machineIndex: number, otherIndex?: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    if (typeof otherIndex === 'number' && Array.isArray(m.otherTools)) {
      if (otherIndex >= 0 && otherIndex < m.otherTools.length) m.otherTools.splice(otherIndex, 1);
    } else {
      m.otherToolEnabled = false;
      m.otherTools = [];
    }
    this.saveDraft();
  }

  addOpenshift(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.openshifts = m.openshifts || [];
    m.openshifts.push({ identifier: '', user: '', password: '', ram: '', cpu: '', disk: '', volumes: [] });
    m.openshiftEnabled = true;
    this.saveDraft();
  }

  addDb(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.dbs = m.dbs || [];
    m.dbs.push({
      identifier: '',
      engine: '',
      instanceName: '',
      host: '',
      port: '',
      sid: '',
      user: '',
      password: '',
      description: '',
      properties: '',
      contactPerson: '',
      contactMail: ''
    });
    m.dbEnabled = true;
    this.saveDraft();
  }

  addOtherTool(machineIndex: number) {
    const m = this.devMachines[machineIndex];
    if (!m) return;
    m.otherTools = m.otherTools || [];
    m.otherTools.push({
      identifier: '',
      name: '',
      path: '',
      running: false,
      contactPerson: '',
      contactMail: ''
    });
    m.otherToolEnabled = true;
    this.saveDraft();
  }

  getDocumentIcon(doc: any): string {
    if (doc.tipo && doc.tipo.startsWith('image/')) return '🖼️';
    if (doc.tipo === 'application/pdf') return '📄';
    if (doc.tipo === 'text/csv') return '📊';
    if (doc.nombre.toLowerCase().endsWith('.docx') || doc.nombre.toLowerCase().endsWith('.doc')) return '📝';
    if (doc.nombre.toLowerCase().endsWith('.xlsx') || doc.nombre.toLowerCase().endsWith('.xls')) return '📈';
    if (doc.nombre.toLowerCase().endsWith('.pptx') || doc.nombre.toLowerCase().endsWith('.ppt')) return '🎯';
    if (doc.nombre.toLowerCase().endsWith('.zip') || doc.nombre.toLowerCase().endsWith('.rar')) return '📦';
    return '📎';
  }

  getDocumentTypeName(doc: any): string {
    const tipo = doc.tipo || '';
    const nombre = doc.nombre.toLowerCase();

    if (tipo.startsWith('image/')) return 'Imagen';
    if (tipo === 'application/pdf' || nombre.endsWith('.pdf')) return 'PDF';
    if (tipo === 'text/csv' || nombre.endsWith('.csv')) return 'CSV';
    if (nombre.endsWith('.docx') || nombre.endsWith('.doc')) return 'Word';
    if (nombre.endsWith('.xlsx') || nombre.endsWith('.xls')) return 'Excel';
    if (nombre.endsWith('.pptx') || nombre.endsWith('.ppt')) return 'PowerPoint';
    if (nombre.endsWith('.zip') || nombre.endsWith('.rar')) return 'Comprimido';
    if (nombre.endsWith('.txt')) return 'Texto';
    
    const ext = nombre.split('.').pop()?.toUpperCase() || 'Archivo';
    return ext;
  }

  // Métodos para manejar documentos en la vista de detalle
  onDetailDocumentSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.detailFileInput = input.files[0];
    }
  }

  addDetailDocument() {
    if (!this.detailFileInput || !this.proyecto?.id) {
      alert('Por favor, selecciona un archivo');
      return;
    }

    const formData = new FormData();
    formData.append('file', this.detailFileInput);
    formData.append('descripcion', this.detailFileDescription);

    // Subir archivo al servidor (importar ProjectService si no está)
    const http = (this as any).http || (this.documentService as any).http;
    if (!http) {
      console.error('No se puede acceder a HttpClient');
      return;
    }

    http.post(`http://localhost:8080/api/projects/${this.proyecto.id}/documents/upload`, formData)
      .subscribe({
        next: (response: any) => {
          console.log('✅ Documento subido:', response);
          // Agregar a la lista local
          if (response.document) {
            this.projectDocumentsFromCreation.push(response.document);
          }
          // Limpiar formulario
          this.detailFileInput = null;
          this.detailFileDescription = '';
          const fileInput = document.querySelector('#fileInputDetail') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
          const fileInput2 = document.querySelector('#fileInputDetail2') as HTMLInputElement;
          if (fileInput2) fileInput2.value = '';
          alert('✅ Documento agregado correctamente');
        },
        error: (err: any) => {
          console.error('❌ Error al subir documento:', err);
          alert('❌ Error al subir el documento');
        }
      });
  }

  removeProjectDocument(index: number) {
    if (!this.proyecto?.id) return;

    const doc = this.projectDocumentsFromCreation[index];
    if (!confirm(`¿Eliminar el documento "${doc.nombre}"?`)) return;

    // Extraer el nombre del archivo desde el path
    const fileName = doc.path.split('/').pop();
    if (!fileName) return;

    const http = (this as any).http || (this.documentService as any).http;
    if (!http) {
      console.error('No se puede acceder a HttpClient');
      return;
    }

    http.delete(
      `http://localhost:8080/api/projects/${this.proyecto.id}/documents/delete?fileName=${encodeURIComponent(fileName)}`
    ).subscribe({
      next: () => {
        this.projectDocumentsFromCreation.splice(index, 1);
        alert('✅ Documento eliminado correctamente');
      },
      error: (err: any) => {
        console.error('❌ Error al eliminar documento:', err);
        alert('❌ Error al eliminar el documento');
      }
    });
  }

  downloadDocument(doc: any) {
    if (!this.proyecto?.id || !doc.path) return;

    const fileName = doc.path.split('/').pop();
    if (!fileName) return;

    const http = (this as any).http || (this.documentService as any).http;
    if (!http) {
      console.error('No se puede acceder a HttpClient');
      return;
    }

    http.get(
      `http://localhost:8080/api/projects/${this.proyecto.id}/documents/download?fileName=${encodeURIComponent(fileName)}`,
      { responseType: 'blob' }
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err: any) => {
        console.error('❌ Error al descargar documento:', err);
        alert('❌ Error al descargar el documento');
      }
    });
  }

  private loadDocumentPreviews() {
    if (!this.proyecto?.id || !this.projectDocumentsFromCreation.length) return;

    this.projectDocumentsFromCreation.forEach((doc: any) => {
      const fileName = doc.path?.split('/').pop();
      if (!fileName) return;

      const http = (this as any).http || (this.documentService as any).http;
      if (!http) return;

      // Cargar blob del documento
      http.get(
        `http://localhost:8080/api/projects/${this.proyecto!.id}/documents/download?fileName=${encodeURIComponent(fileName)}`,
        { responseType: 'blob' }
      ).subscribe({
        next: (blob: Blob) => {
          // Para PDFs e imágenes, crear Object URL
          if (doc.tipo?.startsWith('image/') || doc.tipo === 'application/pdf') {
            const url = URL.createObjectURL(blob);
            this.documentPreviewUrls.set(doc.path, url);
          }
          // Para CSVs, leer y parsear contenido
          else if (doc.tipo === 'text/csv' || doc.nombre?.endsWith('.csv')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const text = e.target?.result as string;
              const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()));
              this.documentCsvContents.set(doc.path, rows);
            };
            reader.readAsText(blob);
          }
        },
        error: (err: any) => {
          console.error('Error al cargar preview de documento:', err);
        }
      });
    });
  }

  getDocumentPreviewUrl(doc: any): string | null {
    return this.documentPreviewUrls.get(doc.path) || null;
  }

  getDocumentCsvContent(doc: any): string[][] | null {
    return this.documentCsvContents.get(doc.path) || null;
  }

  ngOnDestroy() {
    // Limpiar object URLs al destruir componente
    this.documentPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }
}
