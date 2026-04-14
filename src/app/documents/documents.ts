import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { TranslateModule } from "@ngx-translate/core";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { BuscadorComponent } from "../buscador/buscador";
import { DocumentService } from "../document.service";
import { ProjectService, Project as BackendProject } from "../project.service";
import { LocalStorageService } from "../local-storage.service";

type DocItem = any;

interface ProjectView {
  projectId: string | number;
  name: string;
  date: string;
  documents: DocItem[];
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
    BuscadorComponent,
  ],
  templateUrl: "./documents.html",
  styleUrls: ["./documents.css"],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  title = "Documentos";

  showAddPopup = false;

  projects: ProjectView[] = [];
  projectsFiltrats: ProjectView[] = [];

  searchQuery = "";
  selectedProjectId: string | number | null = null;

  private readonly STORAGE_KEY_FILTER = "documents_filter_v1";
  private readonly STORAGE_KEY_SELECTED = "documents_selected_project_v1";

  projectId: string | number = "";
  name = "";
  date = "";
  selectedFile?: File;

  projectError = "";
  fileError = "";

  deleteDocPopupOpen = false;
  docToDelete: { project: ProjectView; document: DocItem } | null = null;

  imagePreviewPopupOpen = false;
  imagePreviewUrl: string | null = null;
  imagePreviewName = "";

  toastMsg = "";
  toastOk = true;
  private toastTimeout: any;

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
    private storage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    const savedSelected = this.storage.get(this.STORAGE_KEY_SELECTED) as
      | string
      | null;

    this.searchQuery = "";
    this.storage.set(this.STORAGE_KEY_FILTER, "");

    this.loadProjectsWithUiState("", savedSelected);
  }

  ngOnDestroy(): void {
    this.releaseImagePreviewUrl();

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
  }

  private showToast(msg: string, ok: boolean = true): void {
    this.toastMsg = msg;
    this.toastOk = ok;

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      this.toastMsg = "";
    }, 3000);
  }

  private loadProjectsWithUiState(
    savedFilter: string,
    savedSelected: string | null,
  ): void {
    this.projectService.getAll().subscribe({
      next: (projects: BackendProject[]) => {
        const realProjects = (projects || []).filter((p) => !!p.id);

        if (realProjects.length === 0) {
          this.projects = [];
          this.projectsFiltrats = [];
          this.selectedProjectId = null;
          return;
        }

        const requests = realProjects.map((p) =>
          this.documentService.getAllFiles(String(p.id)).pipe(
            map((files: any[]) => ({
              projectId: String(p.id),
              name: p.nombre || p.codigoProyecto || String(p.id),
              date: "",
              documents: Array.isArray(files) ? files : [],
            })),
            catchError((err: unknown) => {
              console.error(
                `Error carregant documents del projecte ${p.id}`,
                err,
              );
              return of({
                projectId: String(p.id),
                name: p.nombre || p.codigoProyecto || String(p.id),
                date: "",
                documents: [],
              } as ProjectView);
            }),
          ),
        );

        forkJoin(requests).subscribe((projectsWithDocs: ProjectView[]) => {
          this.projects = projectsWithDocs;
          this.projectsFiltrats = [...projectsWithDocs];

          if (savedFilter && savedFilter.trim()) {
            this.filtrar(savedFilter);
          }

          if (savedSelected != null) {
            const found = this.projects.find(
              (p) => String(p.projectId) === String(savedSelected),
            );

            if (found) {
              this.selectedProjectId = found.projectId;
            } else {
              this.selectedProjectId = null;
              this.storage.set(this.STORAGE_KEY_SELECTED, "");
            }
          }
        });
      },
      error: (err: unknown) => {
        console.error("Error carregant projectes", err);
        this.projects = [];
        this.projectsFiltrats = [];
        this.selectedProjectId = null;
      },
    });
  }

  loadProjects(): void {
    this.loadProjectsWithUiState(
      this.searchQuery || "",
      this.selectedProjectId ? String(this.selectedProjectId) : null,
    );
  }

  toggleAddPopup(): void {
    this.showAddPopup = !this.showAddPopup;

    if (!this.showAddPopup) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.projectId = "";
    this.name = "";
    this.date = "";
    this.selectedFile = undefined;
    this.projectError = "";
    this.fileError = "";
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      this.selectedFile = file;
      this.name = file.name;
      this.fileError = "";
    }
  }

  onProjectChange(): void {
    this.validateProjectId();
  }

  validateProjectId(): boolean {
    if (!this.projectId && this.projectId !== 0) {
      this.projectError = "El proyecto es obligatorio";
      return false;
    }

    const exists = this.projects.some(
      (p) => String(p.projectId) === String(this.projectId),
    );

    if (!exists) {
      this.projectError = "El código de proyecto no existe";
      return false;
    }

    this.projectError = "";
    return true;
  }

  filtrar(valor: string): void {
    this.searchQuery = valor || "";
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchQuery);

    if (!valor) {
      this.projectsFiltrats = [...this.projects];
      return;
    }

    const lower = valor.toLowerCase();

    this.projectsFiltrats = this.projects.filter((project) => {
      const docsText = (project.documents || [])
        .map((doc) => this.resolveDocumentName(doc))
        .join(" ");

      const haystack =
        `${project.projectId || ""} ${project.name || ""} ${docsText}`.toLowerCase();

      return haystack.includes(lower);
    });
  }

  selectProject(project: ProjectView): void {
    this.selectedProjectId = project.projectId;
    this.storage.set(
      this.STORAGE_KEY_SELECTED,
      String(this.selectedProjectId ?? ""),
    );
  }

  addDocument(): void {
    const validProject = this.validateProjectId();

    if (!this.selectedFile) {
      this.fileError = "Debes seleccionar un archivo";
    } else {
      this.fileError = "";
    }

    if (!validProject || !this.selectedFile) {
      return;
    }

    this.documentService
      .uploadDocument(String(this.projectId), this.selectedFile)
      .subscribe({
        next: () => {
          this.showToast("Documento subido correctamente", true);
          this.toggleAddPopup();
          this.loadProjects();
        },
        error: (err: unknown) => {
          console.error("Error subiendo documento", err);
          this.showToast("Error al subir el documento", false);
        },
      });
  }

  confirmDeleteDocument(project: ProjectView, document: DocItem): void {
    this.docToDelete = { project, document };
    this.deleteDocPopupOpen = true;
  }

  cancelDeleteDocument(): void {
    this.docToDelete = null;
    this.deleteDocPopupOpen = false;
  }

  deleteDocument(): void {
    if (!this.docToDelete) return;

    const { project, document } = this.docToDelete;
    const fileName = this.extractFileName(document);

    this.documentService
      .deleteDocument(String(project.projectId), fileName)
      .subscribe({
        next: () => {
          this.showToast("Documento eliminado correctamente", true);
          this.cancelDeleteDocument();
          this.loadProjects();
        },
        error: (err: unknown) => {
          console.error("Error eliminando documento", err);
          this.showToast("Error al eliminar el documento", false);
        },
      });
  }

  viewDocument(project: ProjectView, doc: DocItem): void {
    const fileName = this.extractFileName(doc);

    this.documentService
      .getFile(String(project.projectId), fileName)
      .subscribe({
        next: (blob: Blob) => {
          const mime = this.getMimeType(doc, blob);

          if (mime.startsWith("image/")) {
            this.releaseImagePreviewUrl();
            this.imagePreviewUrl = URL.createObjectURL(blob);
            this.imagePreviewName = this.resolveDocumentName(doc);
            this.imagePreviewPopupOpen = true;
            return;
          }

          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");

          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 10000);
        },
        error: (err: unknown) => {
          console.error("Error visualizando documento", err);
          this.showToast("Error al abrir el documento", false);
        },
      });
  }

  downloadDocument(project: ProjectView, doc: DocItem): void {
    const fileName = this.extractFileName(doc);

    this.documentService
      .getFile(String(project.projectId), fileName)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = this.resolveDocumentName(doc);
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        },
        error: (err: unknown) => {
          console.error("Error descargando documento", err);
          this.showToast("Error al descargar el documento", false);
        },
      });
  }

  closeImagePreview(): void {
    this.imagePreviewPopupOpen = false;
    this.imagePreviewName = "";
    this.releaseImagePreviewUrl();
  }

  private releaseImagePreviewUrl(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
  }

  resolveDocumentName(doc: DocItem): string {
    if (typeof doc === "string") {
      return doc;
    }

    return (
      doc?.name ||
      doc?.nombre ||
      doc?.originalName ||
      this.extractFileName(doc) ||
      "Documento"
    );
  }

  private extractFileName(doc: DocItem): string {
    if (typeof doc === "string") {
      return doc;
    }

    const path = doc?.path || doc?.storedPath || doc?.url || "";

    if (path && String(path).includes("/")) {
      return String(path).split("/").pop() || this.fallbackDocumentName(doc);
    }

    if (path) {
      return String(path);
    }

    return this.fallbackDocumentName(doc);
  }

  private fallbackDocumentName(doc: DocItem): string {
    if (typeof doc === "string") {
      return doc;
    }

    return doc?.name || doc?.nombre || doc?.originalName || "documento";
  }

  private getMimeType(doc: DocItem, blob: Blob): string {
    if (typeof doc === "string") {
      return blob.type || this.guessMimeFromName(doc);
    }

    return (
      doc?.contentType ||
      doc?.tipo ||
      blob.type ||
      this.guessMimeFromName(this.resolveDocumentName(doc))
    );
  }

  private guessMimeFromName(name: string): string {
    const lower = (name || "").toLowerCase();

    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".svg")
    ) {
      return "image/*";
    }

    if (lower.endsWith(".pdf")) {
      return "application/pdf";
    }

    return "";
  }
}
