import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Modelo `Proyecto` y tipos auxiliares basados en el CSV proporcionado
export interface Task {
  titulo: string;
  prioridad?: string;
  estado?: string;
  completadoPercent?: number | null;
  notas?: string;
}

export interface DatabaseInfo {
  tipo?: string;
  uri?: string;
  usuario?: string | null;
  password?: string | null;
  notas?: string;
}

export interface DockerImage {
  image?: string;
  purpose?: string | null;
}

export interface OpenShiftInfo {
  usuario?: string | null;
  url?: string | null;
  token?: string | null;
  kibana?: string | null;
  grafana?: string | null;
}

export interface Proyecto {
  nombre?: string;
  codigoProyecto?: string;
  codigoImputacion?: string | null;
  urlEntornoDesarrollo?: string | null;
  urlEntornoIntegracion?: string | null;
  urlEntornoPreproduccion?: string | null;
  urlEntornoProduccion?: string | null;
  horaDaily?: string | null;
  ip?: string[];
  lote?: string | null;
  departamento?: string | null;
  responsableProyecto?: string | null;
  responsableTecnico?: string | null;
  tareas: Task[];
  herramientas?: string[];
  herramientasMind?: {
    bitbucket?: string;
    nexus?: string[];
    sonar?: { prefix?: string; url?: string; tokenUser?: string; tokenValue?: string }[];
    jenkins?: string[];
    crontab?: string;
  };
  jenkinsNodes?: string[];
  dockerImages?: DockerImage[];
  pipelines?: string[];
  repositorios?: string[];
  bbdd?: DatabaseInfo[];
  openshift?: OpenShiftInfo[];
  usuarios?: string[];
  notasGenerales?: string | null;
  entornoNotas?: string | null;
  equipoMinsait?: { nombre?: string; rol?: string; email?: string }[];
  devMachines?: { identifier?: string; ip?: string; user?: string; password?: string; ram?: string; cpu?: string; disk?: string }[];
  codeRepos?: string[];
  artifactRepos?: string[];
}

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrls: ['./projects.css'],
  standalone: true,
  imports: [CommonModule, BuscadorComponent, TranslateModule, FormsModule, RouterLink, MatIconModule]
})
export class ProjectsComponent {
  title = '';

  // Control de pestañas
  activeTab: string = 'LIST';

  // Lista de proyectos (ahora instancias de `Proyecto`)
  private STORAGE_KEY = 'projects_v1';

  projectes: Proyecto[] = [];
  projectesFiltrats: Proyecto[] = this.projectes;

  // UI state
  showProjectModal = false;
  editingProject: Partial<Proyecto> & { ipString?: string; tareasString?: string; lote?: string; departamento?: string; readonly?: boolean } = {};

  // confirm
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  // Import
  csvTextImport: string = '';
  importResult: { success: boolean; message: string } | null = null;

  // New project form - sub-tabs
  newProjectTab: 'info' | 'minsait' | 'dev' | 'mind' = 'info';
  
  // New project form - extended fields
  newProjectMinsaitMembers: Array<{ nombre: string; rol: string; email: string }> = [];
  newProjectDevMachines: Array<{
    identifier: string;
    ip: string;
    user: string;
    password: string;
    ram: string;
    cpu: string;
    disk: string;
  }> = [];
  newProjectCodeRepos: Array<{ name: string; url: string }> = [];
  newProjectArtifactRepos: Array<{ name: string; url: string }> = [];
  newProjectJenkinsList: Array<{ name: string; url: string }> = [];
  newProjectSonarList: Array<{ prefix: string; url: string; tokenUser: string; tokenValue: string }> = [];

  cambiarTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'NEW') {
      this.limpiarFormulario();
      this.newProjectTab = 'info';
    }
    this.importResult = null;
  }

  cambiarNewProjectTab(tab: 'info' | 'minsait' | 'dev' | 'mind') {
    this.newProjectTab = tab;
  }

  limpiarFormulario() {
    this.editingProject = { 
      nombre: '', 
      codigoProyecto: '', 
      codigoImputacion: '',
      ipString: '', 
      tareasString: '', 
      lote: '', 
      departamento: '',
      responsableProyecto: '',
      responsableTecnico: '',
      urlEntornoDesarrollo: '',
      urlEntornoIntegracion: '',
      urlEntornoPreproduccion: '',
      urlEntornoProduccion: '',
      horaDaily: '',
      notasGenerales: ''
    } as any;
    this.newProjectMinsaitMembers = [];
    this.newProjectDevMachines = [];
    this.newProjectCodeRepos = [];
    this.newProjectArtifactRepos = [];
    this.newProjectJenkinsList = [];
    this.newProjectSonarList = [];
  }

  // Helper methods for new project form
  addNewProjectMember() {
    this.newProjectMinsaitMembers.push({ nombre: '', rol: '', email: '' });
  }
  removeNewProjectMember(index: number) {
    this.newProjectMinsaitMembers.splice(index, 1);
  }

  addNewProjectDevMachine() {
    this.newProjectDevMachines.push({ identifier: '', ip: '', user: '', password: '', ram: '', cpu: '', disk: '' });
  }
  removeNewProjectDevMachine(index: number) {
    this.newProjectDevMachines.splice(index, 1);
  }

  addNewProjectCodeRepo() {
    this.newProjectCodeRepos.push({ name: '', url: '' });
  }
  removeNewProjectCodeRepo(index: number) {
    this.newProjectCodeRepos.splice(index, 1);
  }

  addNewProjectArtifactRepo() {
    this.newProjectArtifactRepos.push({ name: '', url: '' });
  }
  removeNewProjectArtifactRepo(index: number) {
    this.newProjectArtifactRepos.splice(index, 1);
  }

  addNewProjectJenkins() {
    this.newProjectJenkinsList.push({ name: '', url: '' });
  }
  removeNewProjectJenkins(index: number) {
    this.newProjectJenkinsList.splice(index, 1);
  }

  addNewProjectSonar() {
    this.newProjectSonarList.push({ prefix: '', url: '', tokenUser: '', tokenValue: '' });
  }
  removeNewProjectSonar(index: number) {
    this.newProjectSonarList.splice(index, 1);
  }

  filtrar(valor: string) {
    if (!valor) {
      this.projectesFiltrats = this.projectes;
      return;
    }
    const v = valor.toLowerCase();
    this.projectesFiltrats = this.projectes.filter(p => {
      const nombre = (p.nombre || '').toLowerCase();
      const codigo = (p.codigoProyecto || '').toLowerCase();
      const resp = (p.responsableProyecto || '').toLowerCase();
      return nombre.includes(v) || codigo.includes(v) || resp.includes(v);
    });
  }

  constructor(private translate: TranslateService, private storage: LocalStorageService) {
    this.title = this.translate.instant('PROJECTS.TITLE');
    this.load();
  }

  private load() {
    try {
      const raw = this.storage.get(this.STORAGE_KEY);
      if (raw) this.projectes = JSON.parse(raw) as Proyecto[];
    } catch (e) { this.projectes = []; }
    this.projectesFiltrats = [...this.projectes];
  }

  private save() {
    this.storage.setObject(this.STORAGE_KEY, this.projectes);
    this.projectesFiltrats = [...this.projectes];
  }

  // selection handled in detail page via router

  newProject() {
    this.editingProject = { nombre: '', codigoProyecto: '', ipString: '', tareasString: '', lote: '', departamento: '' } as any;
    this.activeTab = 'NEW';
  }

  saveProject() {
    if ((this.editingProject as any).readonly) return;
    const partial = this.editingProject as Partial<Proyecto> & { ipString?: string; tareasString?: string };
    if (!partial.nombre || !partial.nombre.trim()) {
      alert('El nombre del proyecto es obligatorio');
      return;
    }
    const proyecto: Proyecto = {
      nombre: (partial.nombre||'').trim(),
      codigoProyecto: (partial.codigoProyecto||'').trim(),
      codigoImputacion: (partial as any).codigoImputacion || null,
      ip: (partial.ipString||'').split(',').map(s=>s.trim()).filter(Boolean),
      lote: partial.lote || null,
      departamento: partial.departamento || null,
      responsableProyecto: partial.responsableProyecto || null,
      responsableTecnico: partial.responsableTecnico || null,
      urlEntornoDesarrollo: (partial as any).urlEntornoDesarrollo || null,
      urlEntornoIntegracion: (partial as any).urlEntornoIntegracion || null,
      urlEntornoPreproduccion: (partial as any).urlEntornoPreproduccion || null,
      urlEntornoProduccion: (partial as any).urlEntornoProduccion || null,
      horaDaily: (partial as any).horaDaily || null,
      tareas: this.parseTareasString(partial.tareasString||''),
      herramientas: partial.herramientas || [],
      jenkinsNodes: partial.jenkinsNodes || [],
      dockerImages: partial.dockerImages || [],
      pipelines: partial.pipelines || [],
      repositorios: partial.repositorios || [],
      bbdd: partial.bbdd || [],
      openshift: partial.openshift || [],
      usuarios: partial.usuarios || [],
      notasGenerales: partial.notasGenerales || null,
      equipoMinsait: this.newProjectMinsaitMembers.filter(m => m.nombre || m.rol || m.email),
      herramientasMind: {
        codeRepos: this.newProjectCodeRepos.filter(r => r.name || r.url),
        artifactRepos: this.newProjectArtifactRepos.filter(r => r.name || r.url),
        jenkins: this.newProjectJenkinsList.filter(j => j.name || j.url),
        sonarList: this.newProjectSonarList.filter(s => s.prefix || s.url)
      } as any,
      devMachines: this.newProjectDevMachines.filter(m => m.ip || m.identifier) as any
    };

    if (!proyecto.codigoProyecto) proyecto.codigoProyecto = Math.random().toString(36).slice(2,9);

    const idx = this.projectes.findIndex(x => x.codigoProyecto === proyecto.codigoProyecto);
    if (idx === -1) this.projectes.push(proyecto);
    else this.projectes[idx] = proyecto;

    this.save();
    this.showProjectModal = false;
    this.editingProject = {};
    this.activeTab = 'LIST';
    alert('✅ Proyecto guardado correctamente');
  }

  private parseTareasString(s: string): Task[] {
    if (!s) return [];
    return s.split(/\r?\n/).map(line => {
      const parts = line.split('|').map(p=>p.trim());
      const titulo = parts[0] || '';
      const prioridad = parts[1] || '';
      const estado = parts[2] || '';
      const percent = parseInt((parts[3]||'').replace(/[^0-9]/g,''),10);
      const notas = parts.slice(4).join('|') || '';
      return { titulo, prioridad, estado, completadoPercent: isNaN(percent)? null: percent, notas } as Task;
    }).filter(t => t.titulo);
  }

  confirmDeleteProject(code?: string, name?: string) {
    const tpl = this.translate.instant('PROJECTS.DELETE_CONFIRM');
    const msg = tpl.replace('{{name}}', name || '');
    this.promptConfirm(msg, () => this.deleteProject(code));
  }

  deleteProject(code?: string) {
    if (!code) return;
    this.projectes = this.projectes.filter(p => p.codigoProyecto !== code);
    this.save();
  }

  promptConfirm(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  confirmOk() {
    if (this.confirmAction) this.confirmAction();
    this.showConfirm = false;
    this.confirmAction = null;
  }

  confirmCancel() { this.showConfirm = false; this.confirmAction = null; }

  // --- Parseador CSV simple y tolerante ---
  // Entrada: contenido CSV (como el attachment). Devuelve array de `Proyecto`.
  parseCsvToProyectos(csv: string): Proyecto[] {
    if (!csv) return [];

    const rows = csv.split(/\r?\n/).map(r => r.trim());
    const text = rows.join('\n');

    const proyecto: Proyecto = {
      nombre: undefined,
      codigoProyecto: undefined,
      ip: [],
      responsableProyecto: null,
      responsableTecnico: null,
      tareas: [],
      herramientas: [],
      jenkinsNodes: [],
      dockerImages: [],
      pipelines: [],
      repositorios: [],
      bbdd: [],
      openshift: [],
      usuarios: [],
      notasGenerales: null
    };

    // Helpers
    const ipRe = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
    const mongoRe = /mongodb:\/\/[\w\-:@.\/]+/gi;
    const dockerImgRe = /\d{1,3}(?:\.\d{1,3}){3}:?\d*\/[\w\-\/.:]+/g;
    const codigoProjRe = /c[oó]digo de proyecto[:\s]*([A-Z0-9- ]*\d+)/i;
    const responsableProjRe = /Responsable del proyecto:\s*([^\n;]+)/i;
    const responsableTecRe = /Responsable t[eé]cnico:\s*([^\n;]+)/i;

    // Buscar código proyecto
    const codigoMatch = text.match(codigoProjRe);
    if (codigoMatch && codigoMatch.length) {
      proyecto.codigoProyecto = (codigoMatch[0].split(':').pop() || '').trim();
    } else {
      // alternativa: buscar patrón "- 2578" u otros números grandes cerca del texto
      const alt = text.match(/-\s*(\d{3,5})/);
      if (alt) proyecto.codigoProyecto = alt[1];
    }

    // Buscar responsables
    const r1 = text.match(responsableProjRe);
    if (r1) proyecto.responsableProyecto = r1[1].trim();
    const r2 = text.match(responsableTecRe);
    if (r2) proyecto.responsableTecnico = r2[1].trim();

    // IPs
    const ips = text.match(ipRe) || [];
    proyecto.ip = Array.from(new Set(ips));

    // MongoDB URIs
    const mongos = text.match(mongoRe) || [];
    mongos.forEach(m => proyecto.bbdd!.push({ tipo: 'mongodb', uri: m }));

    // Docker images
    const imgs = text.match(dockerImgRe) || [];
    imgs.forEach(i => proyecto.dockerImages!.push({ image: i }));

    // Jenkins nodes (buscamos "Nodo" o "gestio" IDs)
    const jenkinsNodes: string[] = [];
    rows.forEach(r => {
      if (/Nodo\s*\d+|gestio\d*/i.test(r)) {
        const matches = r.match(ipRe) || r.match(/gestio\w*/gi) || [];
        matches.forEach(m => jenkinsNodes.push(m));
      }
    });
    proyecto.jenkinsNodes = Array.from(new Set(jenkinsNodes));

    // Users - buscar lineas con guiones o listas cortas identificadas en CSV
    const usuarios: string[] = [];
    rows.forEach(r => {
      // ejemplo: "12345678Z - SANTIAGO..."
      const u = r.match(/\b\d{8,}[A-Z]?\b\s*-\s*[^;\n]+/i);
      if (u) usuarios.push(u[0].trim());
    });
    proyecto.usuarios = usuarios;

    // Openshift blocks: buscar secciones que contienen 'Openshift' y capturar líneas siguientes
    const openshiftBlocks: OpenShiftInfo[] = [];
    const openshiftIdx = rows.findIndex(r => /Openshift/i.test(r));
    if (openshiftIdx >= 0) {
      for (let i = openshiftIdx; i < Math.min(rows.length, openshiftIdx + 20); i++) {
        const line = rows[i];
        if (/Usuario:\s*/i.test(line)) {
          const user = line.split(':').pop()!.trim();
          const urlLine = rows[i + 1] || '';
          const url = urlLine.match(/https?:\/\/[^\s]+/i)?.[0] || null;
          openshiftBlocks.push({ usuario: user, url });
        }
      }
    }
    proyecto.openshift = openshiftBlocks;

    // Tareas: detectar tabla con header "Tarea;Prioridad" y parsear siguientes filas
    const headerIdx = rows.findIndex(r => /Tarea;?\s*Prioridad/i.test(r));
    if (headerIdx >= 0) {
      for (let i = headerIdx + 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || /^;?;?;?$/.test(r)) break;
        // split por ; y limpiar
        const cols = r.split(';').map(c => c.replace(/^\s+|\s+$/g, '').replace(/^"|"$/g, ''));
        // buscar primer columna con texto
        const titulo = cols.find(c => c && /[A-Za-z0-9]/.test(c)) || '';
        if (!titulo) continue;
        const prioridad = cols[2] || cols[1] || '';
        const estado = cols[3] || '';
        const percentRaw = cols[4] || '';
        const notas = cols.slice(5).join(' ').trim();
        const percent = parseInt((percentRaw || '').replace(/[^0-9]/g, ''), 10);
        proyecto.tareas.push({ titulo: titulo.trim(), prioridad: prioridad.trim(), estado: estado.trim(), completadoPercent: isNaN(percent) ? null : percent, notas });
      }
    }

    // Pipelines: buscar líneas con 'job/' o 'JOB/' o 'Cron'
    const pipelines: string[] = [];
    rows.forEach(r => {
      if (/jenkins\.indra|job\//i.test(r) || /Cron/i.test(r)) {
        pipelines.push(r.trim());
      }
    });
    proyecto.pipelines = Array.from(new Set(pipelines));

    // Repositorios: buscar bitbucket URLs
    const repoMatches = text.match(/https?:\/\/[^\s"']+bitbucket[^\s"']*/gi) || [];
    proyecto.repositorios = Array.from(new Set(repoMatches));

    // Docker/Nginx images y notas generales (último bloque grande)
    const notasGenerales = rows.slice(0, 80).join('\n');
    proyecto.notasGenerales = notasGenerales;

    return [proyecto];
  }

  // Ejemplo: utilizar el CSV adjunto (pasando su contenido) para parsear y cargar la lista
  // En la práctica, el CSV se leería como texto (file input, fetch, etc.). Aquí mostramos uso con un string.
  ejemploCargarDesdeCsv(csvContent: string) {
    const proys = this.parseCsvToProyectos(csvContent);
    this.projectes = proys;
    this.projectesFiltrats = this.projectes;
  }

  // ===== MÉTODOS PARA ESTADÍSTICAS =====
  getDepartamentosUnicos(): number {
    const depts = new Set(this.projectes.map(p => p.departamento).filter(Boolean));
    return depts.size;
  }

  getLotesUnicos(): number {
    const lotes = new Set(this.projectes.map(p => p.lote).filter(Boolean));
    return lotes.size;
  }

  getTotalTareas(): number {
    return this.projectes.reduce((acc, p) => acc + (p.tareas?.length || 0), 0);
  }

  getResumenDepartamentos(): { nombre: string; count: number }[] {
    const map = new Map<string, number>();
    this.projectes.forEach(p => {
      const dept = p.departamento || 'Sin departamento';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ===== MÉTODOS PARA IMPORTACIÓN =====
  onCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.processCsvImport(content);
    };
    
    reader.onerror = () => {
      this.importResult = { success: false, message: '❌ Error al leer el archivo' };
    };
    
    reader.readAsText(file);
  }

  importFromText() {
    if (!this.csvTextImport.trim()) {
      this.importResult = { success: false, message: '❌ El texto está vacío' };
      return;
    }
    this.processCsvImport(this.csvTextImport);
  }

  private processCsvImport(content: string) {
    try {
      const proyectos = this.parseCsvToProyectos(content);
      if (proyectos.length === 0) {
        this.importResult = { success: false, message: '❌ No se encontraron proyectos en el archivo' };
        return;
      }

      // Añadir proyectos importados
      proyectos.forEach(p => {
        if (!p.codigoProyecto) {
          p.codigoProyecto = 'PRJ-' + Math.random().toString(36).slice(2, 9).toUpperCase();
        }
        const existingIdx = this.projectes.findIndex(x => x.codigoProyecto === p.codigoProyecto);
        if (existingIdx === -1) {
          this.projectes.push(p);
        } else {
          this.projectes[existingIdx] = p;
        }
      });

      this.save();
      this.importResult = { success: true, message: `✅ Se importaron ${proyectos.length} proyecto(s) correctamente` };
      this.csvTextImport = '';
    } catch (error) {
      this.importResult = { success: false, message: '❌ Error al procesar el archivo CSV' };
    }
  }
}
