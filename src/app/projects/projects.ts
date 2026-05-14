import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { BuscadorComponent } from "../buscador/buscador";
import { TranslateModule, TranslateService } from "@ngx-translate/core";
import { LocalStorageService } from "../local-storage.service";
import { ProjectService, Project, Department, ConnectivityEntry, ExternalService, Daily } from "../project.service";
import { FormsModule } from "@angular/forms";
import { ProjectDetailComponent } from "./project-detail";
import { AuthService } from "../auth.service";
import { Subscription } from "rxjs";
import { AgentRefreshService } from "../agent-refresh.service";

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

export interface Proyecto extends Project {
  ipString?: string;
  tareasString?: string;
  readonly?: boolean;
}

@Component({
  selector: "app-projects",
  templateUrl: "./projects.html",
  styleUrls: ["./projects.css"],
  standalone: true,
  imports: [
    CommonModule,
    BuscadorComponent,
    TranslateModule,
    FormsModule,
    MatIconModule,
    ProjectDetailComponent,
  ],
})
export class ProjectsComponent implements OnInit, OnDestroy {
  title = "";

  activeTab: "LIST" | "NEW" | "IMPORT" = "LIST";

  private readonly STORAGE_DRAFT_KEY = "projects_draft";
  private readonly STORAGE_TAB_KEY = "projects_active_tab";
  private readonly STORAGE_LAST_PROJECT_KEY = "projects_last_project_code";
  private readonly STORAGE_LAST_CREATED_PROJECT_KEY =
    "projects_last_created_project_code";

  projectes: Proyecto[] = [];
  projectesFiltrats: Proyecto[] = this.projectes;
  isLoading = false;

  pageSize = 8;
  currentPage = 0;

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.projectesFiltrats.length / this.pageSize),
    );
  }

  get pagedProjectesFiltrats(): Proyecto[] {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    return this.projectesFiltrats.slice(start, end);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
    }
  }

  toastMsg = "";
  toastOk = true;
  private _toastTimer: any = null;

  openProjectTabs: { project: Proyecto; mode: 'view' | 'edit' }[] = [];
  activeProjectId: string | null = null;

  get selectedProjectForDetail(): Proyecto | undefined {
    if (!this.activeProjectId) return undefined;
    return this.openProjectTabs.find(t => t.project.id === this.activeProjectId)?.project;
  }
  get detailMode(): 'view' | 'edit' {
    if (!this.activeProjectId) return 'view';
    return this.openProjectTabs.find(t => t.project.id === this.activeProjectId)?.mode ?? 'view';
  }
  get showDetailModal(): boolean { return this.openProjectTabs.length > 0; }
  get detailViewActive(): boolean { return this.activeProjectId !== null; }

  showProjectModal = false;
  editingProject: Partial<Proyecto> & {
    ipString?: string;
    tareasString?: string;
    lote?: string;
    departamento?: string;
    readonly?: boolean;
  } = {};

  showConfirm = false;
  confirmMessage = "";
  private confirmAction: (() => void) | null = null;

  jsonTextImport = "";
  projectJsonFile: File | null = null;
  importResult: { success: boolean; message: string } | null = null;

  newProjectTab: "info" | "minsait" | "dev" | "mind" | "connectivity" | "documentos" = "info";
  newProjectConnectivities: ConnectivityEntry[] = [];
  newProjectExternalServices: ExternalService[] = [];
  newProjectConnTooltipIndex: number | null = null;

  newProjectMinsaitMembers: Array<{
    nombre: string;
    rol: string;
    email: string;
  }> = [];

  newProjectDailies: Daily[] = [];
  readonly WEEK_DAYS = ['L','M','X','J','V','S','D'];

  newProjectDevMachines: Array<{
    identifier: string;
    ip: string;
    user: string;
    password: string;
    ram: string;
    cpu: string;
    disk: string;
    openshifts: Array<{
      identifier?: string; user?: string; password?: string;
      ram?: string; cpu?: string; disk?: string;
      volumes: Array<{ name?: string; capacity?: string }>;
    }>;
    dbs: Array<{
      identifier?: string; engine?: string; instanceName?: string;
      host?: string; port?: string; sid?: string;
      user?: string; password?: string; description?: string;
      properties?: string; contactPerson?: string; contactMail?: string;
    }>;
    otherTools: Array<{
      identifier?: string; name?: string; path?: string;
      contactPerson?: string; contactMail?: string;
    }>;
  }> = [];

  newProjectCodeRepos: Array<{ name: string; url: string }> = [];
  newProjectArtifactRepos: Array<{ name: string; url: string }> = [];
  newProjectJenkinsList: Array<{ name: string; url: string }> = [];
  newProjectSonarList: Array<{
    prefix: string;
    url: string;
    tokenUser: string;
    tokenValue: string;
  }> = [];

  newProjectDocuments: Array<{
    file: File;
    nombre: string;
    descripcion: string;
    tipo: string;
  }> = [];

  projectFileInput: File | null = null;
  newProjectPdfThumbnails: Map<string, string> = new Map();
  projectFileDescription: string = "";
  departments: Department[] = [];
  private agentRefreshSub!: Subscription;

  constructor(
    private translate: TranslateService,
    private storage: LocalStorageService,
    private projectService: ProjectService,
    public authService: AuthService,
    private agentRefresh: AgentRefreshService
  ) {
    this.title = this.translate.instant("PROJECTS.TITLE");

    const savedTab = this.storage.get(this.STORAGE_TAB_KEY) as any;
    if (savedTab === "LIST" || savedTab === "NEW" || savedTab === "IMPORT") {
      this.activeTab = savedTab;
    }

    this.restoreDraft();
  }

  ngOnInit(): void {
    if (
      !this.authService.canManageProjects &&
      (this.activeTab === "NEW" || this.activeTab === "IMPORT")
    ) {
      this.activeTab = "LIST";
      this.storage.set(this.STORAGE_TAB_KEY, "LIST");
    }

    this.loadProjects();
    this.loadDepartments();
    this.projectService.getExternalServices().subscribe({
      next: (services) => { this.newProjectExternalServices = services; },
      error: () => { this.newProjectExternalServices = []; }
    });
    this.agentRefreshSub = this.agentRefresh.refresh$.subscribe(entity => {
      if (entity === 'proyecto' || entity === 'all') this.loadProjects();
    });
  }

  ngOnDestroy(): void {
    this.agentRefreshSub?.unsubscribe();
  }

  private loadProjects() {
    this.isLoading = true;

    this.projectService.getAll().subscribe({
      next: (projects) => {
        const sorted = (projects as Proyecto[])
          .slice()
          .sort((a, b) => Number(b.id) - Number(a.id));

        this.projectes = sorted;

        // Posem primer l'últim projecte creat
        this.prioritizeLastCreatedProject();

        this.projectesFiltrats = [...this.projectes];
        this.currentPage = 0;
        this.isLoading = false;

        // Restaurar l'últim projecte obert
        this.restoreLastProject();
      },
      error: (err) => {
        console.error("❌ Error al cargar proyectos:", err);
        this.showToast(
          "❌ Error al cargar proyectos. Verifica la consola.",
          false,
        );
        this.projectes = [];
        this.projectesFiltrats = [];
        this.currentPage = 0;
        this.isLoading = false;
      },
    });
  }

  private loadDepartments() {
    this.projectService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments;
      },
      error: (err) => {
        console.error("❌ Error al cargar departamentos:", err);
        this.departments = [];
        this.showToast("❌ Error al carregar els departaments", false);
      },
    });
  }

  private restoreLastProject(): void {
    const lastCode = this.storage.get(this.STORAGE_LAST_PROJECT_KEY) as
      | string
      | null;

    if (!lastCode || !this.projectes?.length) return;

    const project = this.projectes.find((p) => p.codigoProyecto === lastCode);
    if (!project) return;

    this.openProjectDetail(project, "view");
  }

  private prioritizeLastCreatedProject(): void {
    const lastCreatedCode = this.storage.get(
      this.STORAGE_LAST_CREATED_PROJECT_KEY,
    ) as string | null;

    if (!lastCreatedCode || !this.projectes?.length) return;

    const index = this.projectes.findIndex(
      (p) => p.codigoProyecto === lastCreatedCode,
    );

    if (index <= 0) return;

    const [project] = this.projectes.splice(index, 1);
    this.projectes.unshift(project);
  }

  openProjectDetail(project: Proyecto, mode: "view" | "edit" = "view") {
    if (mode === "edit" && !this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per editar projectes", false);
      return;
    }

    if (project.codigoProyecto) {
      this.storage.set(this.STORAGE_LAST_PROJECT_KEY, project.codigoProyecto);
    }

    // Si ya está abierto, actualizar modo y activar
    const existing = this.openProjectTabs.find(t => t.project.id === project.id);
    if (existing) {
      existing.mode = mode;
      this.activeProjectId = project.id ?? null;
      return;
    }

    if (project.id) {
      this.projectService.getById(project.id).subscribe({
        next: (fullProject) => {
          const fp = fullProject as Proyecto;
          this.openProjectTabs.push({ project: fp, mode });
          this.activeProjectId = fp.id ?? null;
        },
        error: (err) => {
          console.error("❌ Error al cargar proyecto:", err);
          this.openProjectTabs.push({ project, mode });
          this.activeProjectId = project.id ?? null;
        },
      });
    } else {
      this.openProjectTabs.push({ project, mode });
      this.activeProjectId = project.id ?? null;
    }
  }

  closeProjectDetail(id?: string) {
    const closeId = id ?? this.activeProjectId;
    if (!closeId) return;
    this.openProjectTabs = this.openProjectTabs.filter(t => t.project.id !== closeId);
    if (this.activeProjectId === closeId) {
      this.activeProjectId = this.openProjectTabs.length > 0 ? this.openProjectTabs[this.openProjectTabs.length - 1].project.id ?? null : null;
    }
    // Si no quedan tabs abiertos, limpiar la clave de localStorage para que no se restaure al recargar
    if (this.openProjectTabs.length === 0) {
      this.storage.remove(this.STORAGE_LAST_PROJECT_KEY);
    } else {
      // Actualizar la clave con el último tab activo
      const lastTab = this.openProjectTabs[this.openProjectTabs.length - 1];
      if (lastTab.project.codigoProyecto) {
        this.storage.set(this.STORAGE_LAST_PROJECT_KEY, lastTab.project.codigoProyecto);
      }
    }
  }

  saveDraft(): void {
    const draft = {
      editingProject: this.editingProject,
      newProjectTab: this.newProjectTab,
      newProjectMinsaitMembers: this.newProjectMinsaitMembers,
      newProjectDailies: this.newProjectDailies,
      newProjectDevMachines: this.newProjectDevMachines,
      newProjectCodeRepos: this.newProjectCodeRepos,
      newProjectArtifactRepos: this.newProjectArtifactRepos,
      newProjectJenkinsList: this.newProjectJenkinsList,
      newProjectSonarList: this.newProjectSonarList,
      newProjectDocuments: this.newProjectDocuments,
      newProjectConnectivities: this.newProjectConnectivities,
    };
    this.storage.setObject(this.STORAGE_DRAFT_KEY, draft);
  }

  restoreDraft(): void {
    const draft = this.storage.getObject<any>(this.STORAGE_DRAFT_KEY);
    if (!draft) return;

    if (draft.editingProject) {
      this.editingProject = { ...draft.editingProject };
      // Normalizar objetos responsable por si el borrador es de una versión anterior
      const ep = this.editingProject as any;
      if (!ep.responsableProyecto || typeof ep.responsableProyecto === "string") {
        ep.responsableProyecto = { nombre: ep.responsableProyecto || "", email: "" };
      }
      if (!ep.responsableTecnico || typeof ep.responsableTecnico === "string") {
        ep.responsableTecnico = { nombre: ep.responsableTecnico || "", email: "" };
      }
    }
    if (draft.newProjectTab) this.newProjectTab = draft.newProjectTab;
    if (draft.newProjectMinsaitMembers)
      this.newProjectMinsaitMembers = draft.newProjectMinsaitMembers;
    if (Array.isArray(draft.newProjectDailies))
      this.newProjectDailies = draft.newProjectDailies;
    if (draft.newProjectDevMachines)
      this.newProjectDevMachines = draft.newProjectDevMachines.map((m: any) => ({
        ...m,
        openshifts: m.openshifts ?? [],
        dbs: m.dbs ?? [],
        otherTools: m.otherTools ?? [],
      }));
    if (draft.newProjectCodeRepos)
      this.newProjectCodeRepos = draft.newProjectCodeRepos;
    if (draft.newProjectArtifactRepos)
      this.newProjectArtifactRepos = draft.newProjectArtifactRepos;
    if (draft.newProjectJenkinsList)
      this.newProjectJenkinsList = draft.newProjectJenkinsList;
    if (draft.newProjectSonarList)
      this.newProjectSonarList = draft.newProjectSonarList;
    if (draft.newProjectDocuments)
      this.newProjectDocuments = draft.newProjectDocuments;
    if (Array.isArray(draft.newProjectConnectivities))
      this.newProjectConnectivities = draft.newProjectConnectivities;
  }

  addNewProjectDaily(): void {
    this.newProjectDailies.push({ hora: '09:00', dias: ['L','M','X','J','V'], notas: '' });
    this.saveDraft();
  }

  removeNewProjectDaily(i: number): void {
    this.newProjectDailies.splice(i, 1);
    this.saveDraft();
  }

  newProjectToggleDay(daily: Daily, day: string): void {
    if (!daily.dias) daily.dias = [];
    const idx = daily.dias.indexOf(day);
    if (idx >= 0) daily.dias.splice(idx, 1);
    else daily.dias.push(day);
    this.saveDraft();
  }

  clearDraft(): void {
    this.storage.remove(this.STORAGE_DRAFT_KEY);
  }

  cambiarTab(tab: "LIST" | "NEW" | "IMPORT") {
    if (
      !this.authService.canManageProjects &&
      (tab === "NEW" || tab === "IMPORT")
    ) {
      this.showToast(
        "❌ No tens permisos per accedir a aquesta pestanya",
        false,
      );
      return;
    }

    this.activeTab = tab;
    this.storage.set(this.STORAGE_TAB_KEY, tab);
    this.importResult = null;
  }

  newProject() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per crear projectes", false);
      return;
    }

    this.limpiarFormulario();
    this.activeTab = "NEW";
    this.storage.set(this.STORAGE_TAB_KEY, "NEW");
    this.saveDraft();
  }

  cambiarNewProjectTab(
    tab: "info" | "minsait" | "dev" | "mind" | "connectivity" | "documentos",
  ) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per editar projectes", false);
      return;
    }

    this.newProjectTab = tab;
    this.saveDraft();
  }

  limpiarFormulario() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per netejar el formulari", false);
      return;
    }

    this.editingProject = {
      nombre: "",
      codigoProyecto: "",
      codigoImputacion: "",
      ipString: "",
      tareasString: "",
      lote: "",
      departamento: "",
      responsableProyecto: { nombre: "", email: "" },
      responsableTecnico: { nombre: "", email: "" },
      urlEntornoDesarrollo: "",
      urlEntornoIntegracion: "",
      urlEntornoPreproduccion: "",
      urlEntornoProduccion: "",
      horaDaily: "",
      dailies: [],
      notasGenerales: "",
    } as any;

    this.newProjectMinsaitMembers = [];
    this.newProjectDailies = [];
    this.newProjectDevMachines = [];
    this.newProjectCodeRepos = [];
    this.newProjectArtifactRepos = [];
    this.newProjectJenkinsList = [];
    this.newProjectSonarList = [];
    this.newProjectDocuments = [];
    this.newProjectConnectivities = [];
    this.newProjectConnTooltipIndex = null;
    this.projectFileInput = null;
    this.projectFileDescription = "";
    this.newProjectTab = "info";

    this.clearDraft();
  }

  addNewProjectConnectivity(): void {
    this.newProjectConnectivities = [
      ...this.newProjectConnectivities,
      { id: crypto.randomUUID(), role: 'PRODUCER', type: 'INTERNAL', environments: [], notes: '' },
    ];
    this.saveDraft();
  }

  removeNewProjectConnectivity(index: number): void {
    this.newProjectConnectivities = this.newProjectConnectivities.filter((_, i) => i !== index);
    this.saveDraft();
  }

  newProjectHasEnv(conn: ConnectivityEntry, env: string): boolean {
    return (conn.environments || []).includes(env);
  }

  newProjectToggleEnv(conn: ConnectivityEntry, env: string): void {
    const envs = conn.environments || [];
    conn.environments = envs.includes(env) ? envs.filter(e => e !== env) : [...envs, env];
    this.saveDraft();
  }

  newProjectOnConnTypeChange(conn: ConnectivityEntry): void {
    conn.internalProjectId = undefined;
    conn.internalProjectCode = undefined;
    conn.internalProjectName = undefined;
    conn.externalServiceId = undefined;
    conn.externalServiceName = undefined;
    conn.otherName = undefined;
    conn.otherCode = undefined;
    conn.otherNotes = undefined;
    this.saveDraft();
  }

  newProjectOnInternalProjectChange(conn: ConnectivityEntry): void {
    const proj = this.projectes.find(p => p.id === conn.internalProjectId);
    if (proj) {
      conn.internalProjectCode = proj.codigoProyecto;
      conn.internalProjectName = proj.nombre;
    }
    this.saveDraft();
  }

  newProjectOnExternalServiceChange(conn: ConnectivityEntry): void {
    const svc = this.newProjectExternalServices.find(s => s.id === conn.externalServiceId);
    if (svc) conn.externalServiceName = svc.name;
    this.saveDraft();
  }

  newProjectToggleConnTooltip(index: number): void {
    this.newProjectConnTooltipIndex = this.newProjectConnTooltipIndex === index ? null : index;
  }

  addNewProjectMember() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectMinsaitMembers.push({ nombre: "", rol: "", email: "" });
    this.saveDraft();
  }

  removeNewProjectMember(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectMinsaitMembers.splice(i, 1);
    this.saveDraft();
  }

  addNewProjectDevMachine() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectDevMachines.push({
      identifier: "",
      ip: "",
      user: "",
      password: "",
      ram: "",
      cpu: "",
      disk: "",
      openshifts: [],
      dbs: [],
      otherTools: [],
    });
    this.saveDraft();
  }

  removeNewProjectDevMachine(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectDevMachines.splice(i, 1);
    this.saveDraft();
  }

  addNewProjectOpenShift(i: number) {
    this.newProjectDevMachines[i].openshifts.push({
      identifier: "", user: "", password: "", ram: "", cpu: "", disk: "", volumes: []
    });
    this.saveDraft();
  }
  removeNewProjectOpenShift(i: number, oi: number) {
    this.newProjectDevMachines[i].openshifts.splice(oi, 1);
    this.saveDraft();
  }
  addNewProjectOsVolume(i: number, oi: number) {
    this.newProjectDevMachines[i].openshifts[oi].volumes.push({ name: "", capacity: "" });
    this.saveDraft();
  }
  removeNewProjectOsVolume(i: number, oi: number, vi: number) {
    this.newProjectDevMachines[i].openshifts[oi].volumes.splice(vi, 1);
    this.saveDraft();
  }
  addNewProjectDb(i: number) {
    this.newProjectDevMachines[i].dbs.push({
      identifier: "", engine: "", instanceName: "", host: "", port: "",
      sid: "", user: "", password: "", description: "", properties: "",
      contactPerson: "", contactMail: ""
    });
    this.saveDraft();
  }
  removeNewProjectDb(i: number, di: number) {
    this.newProjectDevMachines[i].dbs.splice(di, 1);
    this.saveDraft();
  }
  addNewProjectOtherTool(i: number) {
    this.newProjectDevMachines[i].otherTools.push({
      identifier: "", name: "", path: "", contactPerson: "", contactMail: ""
    });
    this.saveDraft();
  }
  removeNewProjectOtherTool(i: number, ti: number) {
    this.newProjectDevMachines[i].otherTools.splice(ti, 1);
    this.saveDraft();
  }

  addNewProjectCodeRepo() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectCodeRepos.push({ name: "", url: "" });
    this.saveDraft();
  }

  removeNewProjectCodeRepo(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectCodeRepos.splice(i, 1);
    this.saveDraft();
  }

  addNewProjectArtifactRepo() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectArtifactRepos.push({ name: "", url: "" });
    this.saveDraft();
  }

  removeNewProjectArtifactRepo(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectArtifactRepos.splice(i, 1);
    this.saveDraft();
  }

  addNewProjectJenkins() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectJenkinsList.push({ name: "", url: "" });
    this.saveDraft();
  }

  removeNewProjectJenkins(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectJenkinsList.splice(i, 1);
    this.saveDraft();
  }

  addNewProjectSonar() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectSonarList.push({
      prefix: "",
      url: "",
      tokenUser: "",
      tokenValue: "",
    });
    this.saveDraft();
  }

  removeNewProjectSonar(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per modificar el projecte", false);
      return;
    }
    this.newProjectSonarList.splice(i, 1);
    this.saveDraft();
  }

  onDocumentSelected(event: Event) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per afegir documents", false);
      return;
    }

    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.projectFileInput = file;
    }
  }

  addNewProjectDocument() {
    if (!this.authService.canManageProjects) {
      this.showToast(
        "❌ No tens permisos per afegir documents al projecte",
        false,
      );
      return;
    }

    if (!this.projectFileInput) {
      this.showToast("⚠️ Por favor, selecciona un archivo", false);
      return;
    }

    const doc = {
      file: this.projectFileInput,
      nombre: this.projectFileInput.name,
      descripcion: this.projectFileDescription,
      tipo: this.projectFileInput.type || "application/octet-stream",
    };

    this.newProjectDocuments.push(doc);

    if (doc.tipo === 'application/pdf') {
      this.renderNewProjectPdfThumbnail(doc);
    }

    this.projectFileInput = null;
    this.projectFileDescription = "";
    const fileInput = document.querySelector(
      "#fileInputProject",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";

    this.saveDraft();
  }

  removeNewProjectDocument(i: number) {
    if (!this.authService.canManageProjects) {
      this.showToast(
        "❌ No tens permisos per eliminar documents del projecte",
        false,
      );
      return;
    }

    this.newProjectDocuments.splice(i, 1);
    this.saveDraft();
  }

  getDocumentIcon(doc: any): string {
    if (doc.tipo && doc.tipo.startsWith("image/")) return "🖼️";
    if (doc.tipo === "application/pdf") return "📄";
    if (doc.tipo === "application/json") return "🧩";
    if (
      doc.nombre.toLowerCase().endsWith(".docx") ||
      doc.nombre.toLowerCase().endsWith(".doc")
    )
      return "📝";
    if (
      doc.nombre.toLowerCase().endsWith(".xlsx") ||
      doc.nombre.toLowerCase().endsWith(".xls")
    )
      return "📈";
    if (
      doc.nombre.toLowerCase().endsWith(".pptx") ||
      doc.nombre.toLowerCase().endsWith(".ppt")
    )
      return "🎯";
    if (
      doc.nombre.toLowerCase().endsWith(".zip") ||
      doc.nombre.toLowerCase().endsWith(".rar")
    )
      return "📦";
    return "📎";
  }

  getDocumentPreviewUrl(doc: any): string | null {
    if (!doc.file) return null;
    if (
      doc.tipo &&
      (doc.tipo.startsWith("image/") || doc.tipo === "application/pdf")
    ) {
      return URL.createObjectURL(doc.file);
    }
    return null;
  }

  getNewProjectPdfThumbnail(doc: any): string | null {
    return this.newProjectPdfThumbnails.get(doc.nombre) || null;
  }

  openNewProjectPdfDocument(doc: any): void {
    if (doc.file) {
      const url = URL.createObjectURL(doc.file);
      window.open(url, '_blank');
    }
  }

  private async renderNewProjectPdfThumbnail(doc: any): Promise<void> {
    if (!doc.file) return;
    try {
      const arrayBuffer = await doc.file.arrayBuffer();
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.js';
      const pdf = await (pdfjsLib as any).getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const scale = 300 / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
      this.newProjectPdfThumbnails.set(doc.nombre, canvas.toDataURL('image/jpeg', 0.85));
      await pdf.destroy();
    } catch (e) {
      console.warn('Error al renderizar miniatura PDF', e);
    }
  }

  getDocumentTypeName(doc: any): string {
    const tipo = doc.tipo || "";
    const nombre = doc.nombre.toLowerCase();

    if (tipo.startsWith("image/")) return "Imagen";
    if (tipo === "application/pdf" || nombre.endsWith(".pdf")) return "PDF";
    if (tipo === "application/json" || nombre.endsWith(".json")) return "JSON";
    if (nombre.endsWith(".docx") || nombre.endsWith(".doc")) return "Word";
    if (nombre.endsWith(".xlsx") || nombre.endsWith(".xls")) return "Excel";
    if (nombre.endsWith(".pptx") || nombre.endsWith(".ppt"))
      return "PowerPoint";
    if (nombre.endsWith(".zip") || nombre.endsWith(".rar")) return "Comprimido";
    if (nombre.endsWith(".txt")) return "Texto";

    const ext = nombre.split(".").pop()?.toUpperCase() || "Archivo";
    return ext;
  }

  filtrar(valor: string) {
    if (!valor) {
      this.projectesFiltrats = [...this.projectes];
      this.currentPage = 0;
      return;
    }
    const v = valor.toLowerCase();
    this.projectesFiltrats = this.projectes.filter((p) => {
      const haystack = JSON.stringify({
        id: p.id,
        codigoProyecto: p.codigoProyecto,
        nombre: p.nombre,
        codigoImputacion: p.codigoImputacion,
        lote: p.lote,
        departamento: p.departamento,
        responsableProyecto: p.responsableProyecto,
        responsableTecnico: p.responsableTecnico,
        horaDaily: p.horaDaily,
        notasGenerales: p.notasGenerales,
        ip: p.ip,
        tareas: p.tareas,
        herramientas: p.herramientas,
        jenkinsNodes: p.jenkinsNodes,
        dockerImages: p.dockerImages,
        pipelines: p.pipelines,
        repositorios: p.repositorios,
        bbdd: p.bbdd,
        openshift: p.openshift,
        usuarios: p.usuarios,
        equipoMinsait: p.equipoMinsait,
        herramientasMind: p.herramientasMind,
        devMachines: p.devMachines,
      }).toLowerCase();
      return haystack.includes(v);
    });
    this.currentPage = 0;
  }

  saveProject() {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per guardar projectes", false);
      return;
    }

    if ((this.editingProject as any).readonly) return;

    const partial = this.editingProject as Partial<Proyecto> & {
      ipString?: string;
      tareasString?: string;
    };

    if (!partial.nombre || !partial.nombre.trim()) {
      this.showToast("⚠️ El nombre del proyecto es obligatorio", false);
      return;
    }

    if (!partial.codigoProyecto || !partial.codigoProyecto.trim()) {
      this.showToast("⚠️ El código del proyecto es obligatorio", false);
      return;
    }

    if (!/^\d+$/.test(partial.codigoProyecto.trim())) {
      this.showToast(
        "⚠️ El código del proyecto debe contener solo números",
        false,
      );
      return;
    }

    const proyecto: Partial<Proyecto> = {
      nombre: (partial.nombre || "").trim(),
      codigoProyecto: (partial.codigoProyecto || "").trim(),
      codigoImputacion: (partial as any).codigoImputacion || null,
      ip: (partial.ipString || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      lote: partial.lote || null,
      departamento: partial.departamento || null,
      responsableProyecto: partial.responsableProyecto || null,
      responsableTecnico: partial.responsableTecnico || null,
      urlEntornoDesarrollo: (partial as any).urlEntornoDesarrollo || null,
      urlEntornoIntegracion: (partial as any).urlEntornoIntegracion || null,
      urlEntornoPreproduccion: (partial as any).urlEntornoPreproduccion || null,
      urlEntornoProduccion: (partial as any).urlEntornoProduccion || null,
      horaDaily: (partial as any).horaDaily || null,
      dailies: this.newProjectDailies,
      tareas: this.parseTareasString(partial.tareasString || ""),
      herramientas: partial.herramientas || [],
      jenkinsNodes: partial.jenkinsNodes || [],
      dockerImages: partial.dockerImages || [],
      pipelines: partial.pipelines || [],
      repositorios: partial.repositorios || [],
      bbdd: partial.bbdd || [],
      openshift: partial.openshift || [],
      usuarios: partial.usuarios || [],
      notasGenerales: partial.notasGenerales || null,
      equipoMinsait: this.newProjectMinsaitMembers.filter(
        (m) => m.nombre || m.rol || m.email,
      ),
      herramientasMind: {
        codeRepos: this.newProjectCodeRepos.filter((r) => r.name || r.url),
        artifactRepos: this.newProjectArtifactRepos.filter(
          (r) => r.name || r.url,
        ),
        jenkins: this.newProjectJenkinsList.filter((j) => j.name || j.url),
        sonarList: this.newProjectSonarList.filter((s) => s.prefix || s.url),
      } as any,
      devMachines: this.newProjectDevMachines.filter(
        (m) => m.ip || m.identifier,
      ) as any,
      connectivities: this.newProjectConnectivities,
    };

    const isEdit = partial.id !== undefined && partial.id !== "";

    if (isEdit) {
      const codeConflict = this.projectes.find(
        (p) =>
          p.codigoProyecto === proyecto.codigoProyecto &&
          p.id !== (partial as any).id,
      );

      if (codeConflict) {
        this.showToast(
          `⚠️ El código "${proyecto.codigoProyecto}" ya está en uso por otro proyecto`,
          false,
        );
        return;
      }
    }

    if (isEdit) {
      this.projectService.update(partial.id!, proyecto).subscribe({
        next: (updated) => {
          const idx = this.projectes.findIndex((p) => p.id === updated.id);

          if (idx !== -1) {
            this.projectes[idx] = updated as Proyecto;
          }

          this.projectes = [...this.projectes].sort(
            (a, b) => Number(b.id) - Number(a.id),
          );
          this.projectesFiltrats = [...this.projectes];

          if (this.newProjectDocuments.length > 0) {
            this.uploadProjectDocuments(partial.id!);
          }

          this.showProjectModal = false;
          this.editingProject = {};
          this.activeTab = "LIST";
          this.storage.set(this.STORAGE_TAB_KEY, "LIST");
          this.clearDraft();
          this.showToast("✅ Proyecto actualizado correctamente");
        },
        error: (err) => {
          console.error("Error al actualizar proyecto:", err);
          const errorMsg =
            err.error?.error || "Error desconocido al actualizar el proyecto";
          this.showToast(`❌ ${errorMsg}`, false);
        },
      });
    } else {
      this.projectService.create(proyecto).subscribe({
        next: (created) => {
          if (created.codigoProyecto) {
            this.storage.set(
              this.STORAGE_LAST_CREATED_PROJECT_KEY,
              created.codigoProyecto,
            );
          }

          this.projectes.unshift(created as Proyecto);
          this.projectes = [...this.projectes].sort(
            (a, b) => Number(b.id) - Number(a.id),
          );

          this.prioritizeLastCreatedProject();

          this.projectesFiltrats = [...this.projectes];

          if (this.newProjectDocuments.length > 0 && created.id) {
            this.uploadProjectDocuments(created.id);
          }

          this.showProjectModal = false;
          this.editingProject = {};
          this.activeTab = "LIST";
          this.storage.set(this.STORAGE_TAB_KEY, "LIST");
          this.clearDraft();
          this.showToast("✅ Proyecto guardado correctamente");
        },
        error: (err) => {
          console.error("Error al guardar proyecto:", err);
          const errorMsg =
            err.error?.error || "Error desconocido al guardar el proyecto";
          this.showToast(`❌ ${errorMsg}`, false);
        },
      });
    }
  }

  private uploadProjectDocuments(projectId: string) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per pujar documents", false);
      return;
    }

    if (!projectId || this.newProjectDocuments.length === 0) return;

    let uploadedCount = 0;
    const totalDocs = this.newProjectDocuments.length;

    this.newProjectDocuments.forEach((doc) => {
      const formData = new FormData();
      formData.append("file", doc.file);
      formData.append("descripcion", doc.descripcion);

      this.projectService.uploadProjectDocument(projectId, formData).subscribe({
        next: (response) => {
          uploadedCount++;

          if (uploadedCount === totalDocs) {
            this.reloadProject(projectId);
            this.newProjectDocuments = [];
          }
        },
        error: (err) => {
          uploadedCount++;
          console.error(
            `❌ Error al subir documento ${uploadedCount}/${totalDocs}:`,
            err,
          );
          this.showToast(
            `❌ Error al subir el documento "${doc.nombre}"`,
            false,
          );
        },
      });
    });
  }

  private reloadProject(projectId: string) {
    this.projectService.getById(projectId).subscribe({
      next: (updatedProject) => {
        const idx = this.projectes.findIndex((p) => p.id === projectId);
        if (idx !== -1) {
          this.projectes[idx] = updatedProject as Proyecto;
          this.projectesFiltrats = [...this.projectes];
        }
      },
      error: (err) => {
        console.error("❌ Error al recargar proyecto:", err);
      },
    });
  }

  private parseTareasString(s: string): Task[] {
    if (!s) return [];
    return s
      .split(/\r?\n/)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const titulo = parts[0] || "";
        const prioridad = parts[1] || "";
        const estado = parts[2] || "";
        const percent = parseInt((parts[3] || "").replace(/[^0-9]/g, ""), 10);
        const notas = parts.slice(4).join("|") || "";
        return {
          titulo,
          prioridad,
          estado,
          completadoPercent: isNaN(percent) ? null : percent,
          notas,
        } as Task;
      })
      .filter((t) => t.titulo);
  }

  confirmDeleteProject(code?: string, name?: string) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per eliminar projectes", false);
      return;
    }

    const tpl = this.translate.instant("PROJECTS.DELETE_CONFIRM");
    const msg = tpl.replace("{{name}}", name || "");
    this.promptConfirm(msg, () => this.deleteProject(code));
  }

  deleteProject(code?: string) {
    if (!this.authService.canManageProjects) {
      this.showToast("❌ No tens permisos per eliminar projectes", false);
      return;
    }

    if (!code) return;
    const project = this.projectes.find((p) => p.codigoProyecto === code);
    if (!project || !project.id) return;

    this.projectService.softDelete(project.id).subscribe({
      next: () => {
        this.projectes = this.projectes.filter(
          (p) => p.codigoProyecto !== code,
        );
        this.projectesFiltrats = [...this.projectes];
        this.currentPage = 0;
        this.showToast("✅ Proyecto eliminado correctamente");

        const lastCode = this.storage.get(this.STORAGE_LAST_PROJECT_KEY);
        if (lastCode === code) {
          this.storage.remove(this.STORAGE_LAST_PROJECT_KEY);
        }

        const lastCreatedCode = this.storage.get(
          this.STORAGE_LAST_CREATED_PROJECT_KEY,
        );
        if (lastCreatedCode === code) {
          this.storage.remove(this.STORAGE_LAST_CREATED_PROJECT_KEY);
        }
      },
      error: (err) => {
        console.error("Error al eliminar proyecto:", err);
        this.showToast("❌ Error al eliminar el proyecto", false);
      },
    });
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

  confirmCancel() {
    this.showConfirm = false;
    this.confirmAction = null;
  }

  onJsonFileSelected(event: Event) {
    if (!this.authService.canManageProjects) {
      this.importResult = {
        success: false,
        message: "❌ No tens permisos per importar projectes",
      };
      return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.projectJsonFile = file;
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.processJsonImport(content);
    };

    reader.onerror = () => {
      this.importResult = {
        success: false,
        message: "❌ Error al leer el archivo JSON",
      };
    };

    reader.readAsText(file);
  }

  importFromJsonText() {
    if (!this.authService.canManageProjects) {
      this.importResult = {
        success: false,
        message: "❌ No tens permisos per importar projectes",
      };
      return;
    }

    if (!this.jsonTextImport.trim()) {
      this.importResult = {
        success: false,
        message: "❌ El texto JSON está vacío",
      };
      return;
    }

    this.processJsonImport(this.jsonTextImport);
  }

  parseJsonToProyectos(json: string): Proyecto[] {
    const data = JSON.parse(json);
    const proyectos = Array.isArray(data) ? data : data.projects;

    if (!Array.isArray(proyectos)) return [];

    return proyectos as Proyecto[];
  }

  private processJsonImport(content: string) {
    if (!this.authService.canManageProjects) {
      this.importResult = {
        success: false,
        message: "❌ No tens permisos per importar projectes",
      };
      return;
    }

    try {
      const proyectos = this.parseJsonToProyectos(content);
      if (proyectos.length === 0) {
        this.importResult = {
          success: false,
          message: "❌ No se encontraron proyectos en el archivo JSON",
        };
        return;
      }

      let imported = 0;
      proyectos.forEach((p) => {
        if (!p.codigoProyecto) {
          p.codigoProyecto =
            "PRJ-" + Math.random().toString(36).slice(2, 9).toUpperCase();
        }

        this.projectService.create(p).subscribe({
          next: (created) => {
            this.projectes.push(created as Proyecto);
            imported++;
            if (imported === proyectos.length) {
              this.projectes = [...this.projectes].sort(
                (a, b) => Number(b.id) - Number(a.id),
              );
              this.projectesFiltrats = [...this.projectes];
              this.currentPage = 0;
              this.importResult = {
                success: true,
                message: `✅ Se importaron ${proyectos.length} proyecto(s) correctamente`,
              };
              this.jsonTextImport = "";
              this.projectJsonFile = null;
            }
          },
          error: (err) => {
            console.error("Error al importar proyecto:", err);
          },
        });
      });
    } catch {
      this.importResult = {
        success: false,
        message: "❌ Error al procesar el archivo JSON",
      };
    }
  }

  getDepartamentosUnicos(): number {
    const depts = new Set(
      this.projectes.map((p) => p.departamento).filter(Boolean),
    );
    return depts.size;
  }

  getLotesUnicos(): number {
    const lotes = new Set(this.projectes.map((p) => p.lote).filter(Boolean));
    return lotes.size;
  }

  getTotalTareas(): number {
    return this.projectes.reduce((acc, p) => acc + (p.tareas?.length || 0), 0);
  }

  getResumenDepartamentos(): { nombre: string; count: number }[] {
    const map = new Map<string, number>();
    this.projectes.forEach((p) => {
      const dept = p.departamento || "Sin departamento";
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => b.count - a.count);
  }

  showToast(msg: string, ok = true) {
    this.toastMsg = msg;
    this.toastOk = ok;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toastMsg = ""), 3500);
  }
}
