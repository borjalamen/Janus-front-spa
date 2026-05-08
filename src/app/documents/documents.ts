import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { TranslateModule } from "@ngx-translate/core";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { DocumentService } from "../document.service";
import { ProjectService, Project as BackendProject } from "../project.service";
import { LocalStorageService } from "../local-storage.service";
import { AuthService } from "../auth.service";

interface FlatDoc {
  projectId: string;
  projectCode: string;
  projectName: string;
  fileName: string;
  extension: string;
  contentType: string;
  size: number;
  lastModified: string;
}

interface ProjectView {
  projectId: string | number;
  codigoProyecto: string;
  name: string;
  date: string;
  documents: any[];
}

@Component({
  selector: "app-documents",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    TranslateModule,
  ],
  templateUrl: "./documents.html",
  styleUrls: ["./documents.css"],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  title = "Documentos";

  showAddPopup = false;

  projects: ProjectView[] = [];
  filteredProjectsForPopup: ProjectView[] = [];
  projectSearch = "";

  // Flat doc grid
  allDocs: FlatDoc[] = [];
  filterProject = "";
  filterFileName = "";
  filterExtension = "";
  filterDate = "";
  sortCol: keyof FlatDoc = "fileName";
  sortAsc = true;
  docPage = 1;
  readonly docPageSize = 15;

  // Add form
  projectId: string | number = "";
  name = "";
  selectedFile?: File;
  projectError = "";
  fileError = "";

  // Delete popup
  deleteDocPopupOpen = false;
  docToDelete: FlatDoc | null = null;

  // Image preview
  imagePreviewPopupOpen = false;
  imagePreviewUrl: string | null = null;
  previewCaption = "";

  toastMsg = "";
  toastOk = true;
  private toastTimeout: any;

  constructor(
    private readonly documentService: DocumentService,
    private readonly projectService: ProjectService,
    private readonly storage: LocalStorageService,
    public authService: AuthService,
  ) {}

  get canManageDocuments(): boolean {
    return this.authService.isAdmin || this.authService.isDevOps;
  }

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.releaseImagePreviewUrl();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  private showToast(msg: string, ok = true): void {
    this.toastMsg = msg;
    this.toastOk = ok;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => { this.toastMsg = ""; }, 3000);
  }

  loadProjects(): void {
    this.projectService.getAll().subscribe({
      next: (projects: BackendProject[]) => {
        const realProjects = (projects || []).filter((p) => !!p.id);
        if (realProjects.length === 0) {
          this.projects = [];
          this.filteredProjectsForPopup = [];
          this.allDocs = [];
          return;
        }

        const requests = realProjects.map((p) =>
          this.documentService.getFolderInfo(String(p.id)).pipe(
            map((files: any[]) => ({
              projectId: String(p.id),
              codigoProyecto: p.codigoProyecto || String(p.id),
              name: p.nombre || p.codigoProyecto || String(p.id),
              date: "",
              documents: Array.isArray(files) ? files : [],
            } as ProjectView)),
            catchError(() => of({
              projectId: String(p.id),
              codigoProyecto: p.codigoProyecto || String(p.id),
              name: p.nombre || p.codigoProyecto || String(p.id),
              date: "",
              documents: [],
            } as ProjectView)),
          ),
        );

        forkJoin(requests).subscribe((pvs: ProjectView[]) => {
          this.projects = pvs;
          this.filteredProjectsForPopup = [...pvs];
          this.buildFlatDocs(pvs);
          this.docPage = 1;
        });
      },
      error: () => {
        this.projects = [];
        this.filteredProjectsForPopup = [];
        this.allDocs = [];
      },
    });
  }

  private buildFlatDocs(pvs: ProjectView[]): void {
    this.allDocs = pvs.flatMap((pv) =>
      (pv.documents || []).map((file: any) => {
        const fname: string = typeof file === "string" ? file : (file.name || "");
        const dotIdx = fname.lastIndexOf(".");
        const ext = dotIdx >= 0 ? fname.slice(dotIdx + 1).toLowerCase() : "-";
        return {
          projectId: String(pv.projectId),
          projectCode: pv.codigoProyecto,
          projectName: pv.name,
          fileName: fname,
          extension: ext,
          contentType: file?.contentType || "-",
          size: file?.size || 0,
          lastModified: file?.lastModified || "",
        } as FlatDoc;
      }),
    );
  }

  // ---- GRID ----

  get filteredDocs(): FlatDoc[] {
    let docs = this.allDocs;
    if (this.filterProject) {
      const t = this.filterProject.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.projectName.toLowerCase().includes(t) ||
          d.projectCode.toLowerCase().includes(t),
      );
    }
    if (this.filterFileName) {
      const t = this.filterFileName.toLowerCase();
      docs = docs.filter((d) => d.fileName.toLowerCase().includes(t));
    }
    if (this.filterExtension) {
      const t = this.filterExtension.toLowerCase();
      docs = docs.filter((d) => d.extension.toLowerCase().includes(t));
    }
    if (this.filterDate) {
      docs = docs.filter((d) => (d.lastModified || "").includes(this.filterDate));
    }
    const col = this.sortCol;
    const asc = this.sortAsc;
    return [...docs].sort((a, b) => {
      const va = String((a as any)[col] ?? "");
      const vb = String((b as any)[col] ?? "");
      const cmp = va.localeCompare(vb, undefined, { numeric: true });
      return asc ? cmp : -cmp;
    });
  }

  get totalDocPages(): number {
    return Math.max(1, Math.ceil(this.filteredDocs.length / this.docPageSize));
  }

  get pagedDocs(): FlatDoc[] {
    const start = (this.docPage - 1) * this.docPageSize;
    return this.filteredDocs.slice(start, start + this.docPageSize);
  }

  get docPagesArray(): number[] {
    const total = this.totalDocPages;
    const c = this.docPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (c > 3) pages.push(-1);
    for (let i = Math.max(2, c - 1); i <= Math.min(total - 1, c + 1); i++) pages.push(i);
    if (c < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  sortBy(col: keyof FlatDoc): void {
    if (this.sortCol === col) this.sortAsc = !this.sortAsc;
    else { this.sortCol = col; this.sortAsc = true; }
    this.docPage = 1;
  }

  onFilterChange(): void {
    this.docPage = 1;
  }

  clearFilters(): void {
    this.filterProject = "";
    this.filterFileName = "";
    this.filterExtension = "";
    this.filterDate = "";
    this.docPage = 1;
  }

  // ---- ADD POPUP ----

  toggleAddPopup(): void {
    if (!this.canManageDocuments) {
      this.showToast("No tienes permisos para gestionar documentos", false);
      return;
    }
    this.showAddPopup = !this.showAddPopup;
    if (this.showAddPopup) { this.projectSearch = ""; this.filteredProjectsForPopup = [...this.projects]; }
    else this.resetForm();
  }

  private resetForm(): void {
    this.projectId = "";
    this.name = "";
    this.selectedFile = undefined;
    this.projectError = "";
    this.fileError = "";
    this.projectSearch = "";
    this.filteredProjectsForPopup = [...this.projects];
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) { this.selectedFile = file; this.name = file.name; this.fileError = ""; }
  }

  onProjectChange(): void { this.validateProjectId(); }

  validateProjectId(): boolean {
    if (!this.projectId && this.projectId !== 0) { this.projectError = "El proyecto es obligatorio"; return false; }
    if (!this.projects.some((p) => String(p.projectId) === String(this.projectId))) {
      this.projectError = "El código de proyecto no existe"; return false;
    }
    this.projectError = "";
    return true;
  }

  filterProjectsForPopup(): void {
    const term = (this.projectSearch || "").trim().toLowerCase();
    this.filteredProjectsForPopup = term
      ? this.projects.filter(
          (p) =>
            String(p.projectId).toLowerCase().includes(term) ||
            p.name.toLowerCase().includes(term),
        )
      : [...this.projects];
  }

  addDocument(): void {
    if (!this.canManageDocuments) { this.showToast("No tienes permisos para subir documentos", false); return; }
    const ok = this.validateProjectId();
    this.fileError = this.selectedFile ? "" : "Debes seleccionar un archivo";
    if (!ok || !this.selectedFile) return;
    this.documentService.uploadDocument(String(this.projectId), this.selectedFile).subscribe({
      next: () => { this.showToast("Documento subido correctamente"); this.toggleAddPopup(); this.loadProjects(); },
      error: () => this.showToast("Error al subir el documento", false),
    });
  }

  // ---- ACTIONS ----

  viewDocument(doc: FlatDoc): void {
    this.documentService.getFile(doc.projectId, doc.fileName).subscribe({
      next: (blob: Blob) => {
        const mime = blob.type || this.guessMimeFromName(doc.fileName);
        if (mime.startsWith("image/")) {
          this.releaseImagePreviewUrl();
          this.imagePreviewUrl = URL.createObjectURL(blob);
          this.previewCaption = doc.fileName;
          this.imagePreviewPopupOpen = true;
          return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: () => this.showToast("Error al abrir el documento", false),
    });
  }

  downloadDocument(doc: FlatDoc): void {
    this.documentService.getFile(doc.projectId, doc.fileName).subscribe({
      next: (blob: Blob) => {
        const url = globalThis.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        globalThis.URL.revokeObjectURL(url);
      },
      error: () => this.showToast("Error al descargar el documento", false),
    });
  }

  confirmDeleteDocument(doc: FlatDoc): void {
    if (!this.canManageDocuments) { this.showToast("No tienes permisos para eliminar documentos", false); return; }
    this.docToDelete = doc;
    this.deleteDocPopupOpen = true;
  }

  cancelDeleteDocument(): void {
    this.docToDelete = null;
    this.deleteDocPopupOpen = false;
  }

  deleteDocument(): void {
    if (!this.canManageDocuments || !this.docToDelete) return;
    const { projectId, fileName } = this.docToDelete;
    this.documentService.deleteDocument(projectId, fileName).subscribe({
      next: () => { this.showToast("Documento eliminado correctamente"); this.cancelDeleteDocument(); this.loadProjects(); },
      error: () => this.showToast("Error al eliminar el documento", false),
    });
  }

  closeImagePreview(): void {
    this.imagePreviewPopupOpen = false;
    this.previewCaption = "";
    this.releaseImagePreviewUrl();
  }

  private releaseImagePreviewUrl(): void {
    if (this.imagePreviewUrl) { URL.revokeObjectURL(this.imagePreviewUrl); this.imagePreviewUrl = null; }
  }

  private guessMimeFromName(name: string): string {
    const l = (name || "").toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.exec(l)) return "image/*";
    if (l.endsWith(".pdf")) return "application/pdf";
    return "";
  }

  canViewOnline(doc: FlatDoc): boolean {
    const ext = (doc.extension || "").toLowerCase();
    return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
  }

  formatDate(iso: string): string {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  formatSize(bytes: number): string {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  getExtColor(ext: string): string {
    const m: Record<string, string> = {
      pdf: "#e53935", doc: "#1976d2", docx: "#1976d2",
      xls: "#388e3c", xlsx: "#388e3c", csv: "#388e3c",
      png: "#8e24aa", jpg: "#8e24aa", jpeg: "#8e24aa", gif: "#8e24aa", svg: "#8e24aa",
      ppt: "#e65100", pptx: "#e65100",
      txt: "#607d8b", md: "#607d8b",
      mp4: "#0097a7", avi: "#0097a7", mov: "#0097a7",
    };
    return m[ext] || "#546e7a";
  }
}
