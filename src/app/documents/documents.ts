import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { BuscadorComponent } from "../buscador/buscador";
import { TranslateModule } from "@ngx-translate/core";
import { FormsModule } from "@angular/forms";
import { DocumentService, BackendDocument } from "../document.service";
import { ProjectService, Project as BackendProject } from "../project.service";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";
import { LocalStorageService } from "../local-storage.service";

interface Project {
  projectId: string | number;
  name: string;
  date: string;
  documents: BackendDocument[];
}

@Component({
  selector: "app-documents",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    BuscadorComponent,
    TranslateModule,
  ],
  templateUrl: "./documents.html",
  styleUrls: ["./documents.css"],
})
export class DocumentsComponent implements OnInit, OnDestroy {
  title = "Documentos";
  showAddPopup = false;

  projects: Project[] = [];
  projectsFiltrats: Project[] = [];

  searchQuery = "";
  selectedProjectId: string | number | null = null;

  private readonly STORAGE_KEY_FILTER = "documents_filter_v1";
  private readonly STORAGE_KEY_SELECTED = "documents_selected_project_v1";

  projectId: string | number = "";
  name = "";
  date = "";

  selectedFile?: File;

  deleteDocPopupOpen = false;
  docToDelete: { project: Project; document: BackendDocument } | null = null;

  deleteProjectPopupOpen = false;
  projectToDelete: Project | null = null;

  imagePreviewPopupOpen = false;
  imagePreviewUrl: string | null = null;
  imagePreviewName = "";

  projectError = "";
  fileError = "";

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

  private showToast(msg: string, ok: boolean = true) {
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
  ) {
    forkJoin({
      ids: this.documentService.getAllFolders().pipe(
        catchError((err) => {
          console.error("❌ Error carregant carpetes", err);
          return of([] as Array<string | number>);
        }),
      ),
      projects: this.projectService.getAll().pipe(
        catchError((err) => {
          console.error("❌ Error carregant projectes", err);
          return of([] as BackendProject[]);
        }),
      ),
    }).subscribe(({ ids, projects }) => {
      const nameMap = this.buildProjectNameMap(projects || []);
      const projectIds = (projects || [])
        .map((p) => p.id)
        .filter((id): id is string => !!id);

      const allIds = Array.from(new Set(projectIds));

      if (allIds.length === 0) {
        this.projects = [];
        this.projectsFiltrats = [];
        this.selectedProjectId = null;
        return;
      }

      const requests = allIds.map((id) =>
        this.documentService.getAllFiles(id).pipe(
          map((files: BackendDocument[]) => {
            const docs: BackendDocument[] = files || [];
            return {
              projectId: id,
              name: nameMap.get(String(id)) || `Project ${id}`,
              date: "",
              documents: docs,
            } as Project;
          }),
          catchError(() => {
            return of({
              projectId: id,
              name: nameMap.get(String(id)) || `Project ${id}`,
              date: "",
              documents: [],
            } as Project);
          }),
        ),
      );

      forkJoin(requests).subscribe((projectsWithDocs) => {
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
    });
  }

  private buildProjectNameMap(projects: BackendProject[]): Map<string, string> {
    const map = new Map<string, string>();

    projects.forEach((p) => {
      if (p.id) {
        map.set(String(p.id), p.nombre || p.codigoProyecto || String(p.id));
      }
      if (p.codigoProyecto) {
        map.set(String(p.codigoProyecto), p.nombre || p.codigoProyecto);
      }
    });

    return map;
  }

  loadProjects() {
    this.loadProjectsWithUiState(
      this.searchQuery || "",
      this.selectedProjectId ? String(this.selectedProjectId) : null,
    );
  }

  toggleAddPopup() {
    this.showAddPopup = !this.showAddPopup;

    if (!this.showAddPopup) {
      this.projectId = "";
      this.name = "";
      this.date = "";
      this.selectedFile = undefined;
      this.projectError = "";
      this.fileError = "";
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];

    if (file) {
      this.selectedFile = file;
      this.name = file.name;
      this.fileError = "";
    }
  }

  onProjectChange() {
    this.validateProjectId();
  }

  validateProjectId() {
    if (!this.projectId) {
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

  filtrar(valor: string) {
    this.searchQuery = valor || "";
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchQuery);

    if (!valor) {
      this.projectsFiltrats = [...this.projects];
    } else {
      const lower = valor.toLowerCase();

      this.projectsFiltrats = this.projects.filter((p) => {
        const docsText = (p.documents || [])
          .map((d) => this.resolveDocumentName(d))
          .join(" ");

        const haystack =
          `${p.projectId || ""} ${p.name || ""} ${docsText}`.toLowerCase();
        return haystack.includes(lower);
      });
    }
  }

  selectProject(p: Project) {
    this.selectedProjectId = p.projectId;
    this.storage.set(this.STORAGE_KEY_SELECTED, String(p.projectId));
  }

  addDocument() {
    this.projectError = "";
    this.fileError = "";

    const validProject = this.validateProjectId();

    if (!this.selectedFile) {
      this.fileError = "Debes seleccionar un archivo";
    }

    if (!validProject || !this.selectedFile) {
      this.showToast("Revisa los campos obligatorios", false);
      return;
    }

    this.documentService
      .uploadDocument(this.projectId, this.selectedFile)
      .subscribe({
        next: (response: any) => {
          const uploadedDoc = response?.document ?? response;

          const project = this.projects.find(
            (p) => String(p.projectId) === String(this.projectId),
          );

          if (!project) {
            this.showToast(
              "El archivo se subió, pero no se encontró el proyecto",
              false,
            );
            return;
          }

          project.documents = [...(project.documents || []), uploadedDoc];

          const payload = {
            ...project,
            documents: project.documents,
          };

          this.projectService
            .update(String(project.projectId), payload as any)
            .subscribe({
              next: () => {
                this.projectsFiltrats = [...this.projects];
                this.showToast("Documento subido correctamente", true);
                this.toggleAddPopup();
              },
              error: (err) => {
                console.error("Error guardando documentos en proyecto", err);
                this.showToast(
                  "Se subió el archivo, pero no se pudo asociar al proyecto",
                  false,
                );
              },
            });
        },
        error: (err) => {
          console.error("Error subiendo documento", err);
          this.showToast("Error al subir el documento", false);
        },
      });
  }

  confirmDeleteDocument(project: Project, doc: BackendDocument) {
    this.docToDelete = { project, document: doc };
    this.deleteDocPopupOpen = true;
  }

  cancelDeleteDocument() {
    this.deleteDocPopupOpen = false;
    this.docToDelete = null;
  }

  deleteDocument() {
    if (!this.docToDelete) return;

    const { project, document } = this.docToDelete;

    this.documentService.deleteDocument(project.projectId, document).subscribe({
      next: () => {
        this.loadProjects();
        this.cancelDeleteDocument();
        this.showToast("Documento eliminado correctamente", true);
      },
      error: (err) => {
        console.error("Error esborrant document", err);
        this.showToast("Error al eliminar el documento", false);
      },
    });
  }

  confirmDeleteProject(project: Project) {
    this.projectToDelete = project;
    this.deleteProjectPopupOpen = true;
  }

  cancelDeleteProject() {
    this.deleteProjectPopupOpen = false;
    this.projectToDelete = null;
  }

  deleteProject() {
    if (!this.projectToDelete) return;

    const id = this.projectToDelete.projectId;

    this.documentService.deleteProjectFiles(id).subscribe({
      next: () => {
        this.projects = this.projects.filter((p) => p.projectId !== id);
        this.projectsFiltrats = this.projects.filter((p) => p.projectId !== id);

        if (
          this.selectedProjectId &&
          String(this.selectedProjectId) === String(id)
        ) {
          this.selectedProjectId = null;
          this.storage.set(this.STORAGE_KEY_SELECTED, "");
        }

        this.cancelDeleteProject();
        this.showToast("Proyecto eliminado correctamente", true);
      },
      error: (err) => {
        console.error("Error esborrant projecte", err);
        this.showToast("Error al eliminar el proyecto", false);
      },
    });
  }

  viewDocument(project: Project, doc: BackendDocument) {
    this.documentService.downloadFile(project.projectId, doc).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);

        if (this.isImageDocument(blob, doc)) {
          this.openImagePreview(url, doc);
          return;
        }

        const newWindow = window.open(url, "_blank");

        if (!newWindow) {
          const link = document.createElement("a");
          link.href = url;
          link.download = this.resolveDocumentName(doc);
          link.click();
        }

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => {
        this.showToast("Error al visualizar el documento", false);
      },
    });
  }

  downloadDocument(project: Project, doc: BackendDocument) {
    this.documentService.downloadFile(project.projectId, doc).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = this.resolveDocumentName(doc);

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
      },
      error: () => {
        this.showToast("Error al descargar el documento", false);
      },
    });
  }

  closeImagePreview() {
    this.imagePreviewPopupOpen = false;
    this.imagePreviewName = "";
    this.releaseImagePreviewUrl();
  }

  private openImagePreview(url: string, doc: BackendDocument) {
    this.releaseImagePreviewUrl();
    this.imagePreviewUrl = url;
    this.imagePreviewName = this.resolveDocumentName(doc);
    this.imagePreviewPopupOpen = true;
  }

  private releaseImagePreviewUrl() {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = null;
    }
  }

  private isImageDocument(blob: Blob, doc: BackendDocument): boolean {
    if (blob.type && blob.type.startsWith("image/")) {
      return true;
    }

    const fileName = this.resolveDocumentName(doc).toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName);
  }

  resolveDocumentName(doc: BackendDocument): string {
    if (typeof doc === "string") {
      return doc;
    }

    const asAny = doc as any;
    return asAny.name || asAny.nombre || "document";
  }
}
