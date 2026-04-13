import { Component, OnDestroy, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from "@angular/material/button";
import { TranslateModule } from "@ngx-translate/core";
import { forkJoin, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

import { BuscadorComponent } from "../buscador/buscador";
import { DocumentService, BackendDocument } from "../document.service";
import { ProjectService, Project as BackendProject } from "../project.service";
import { LocalStorageService } from "../local-storage.service";

interface ProjectView {
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
  docToDelete: { project: ProjectView; document: BackendDocument } | null =
    null;

  deleteProjectPopupOpen = false;
  projectToDelete: ProjectView | null = null;

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
    forkJoin({
      folders: this.documentService.getAllFolders().pipe(
        catchError((err) => {
          console.error("Error carregant carpetes", err);
          return of([] as Array<string | number>);
        }),
      ),
      projects: this.projectService.getAll().pipe(
        catchError((err) => {
          console.error("Error carregant projectes", err);
          return of([] as BackendProject[]);
        }),
      ),
    }).subscribe(({ folders, projects }) => {
      const nameMap = this.buildProjectNameMap(projects || []);

      const projectIdsFromProjects = (projects || [])
        .map((p) => p.id)
        .filter((id): id is string => !!id);

      const projectIdsFromFolders = (folders || []).map((f) => String(f));

      const allIds = Array.from(
        new Set([...projectIdsFromProjects, ...projectIdsFromFolders]),
      );

      if (allIds.length === 0) {
        this.projects = [];
        this.projectsFiltrats = [];
        this.selectedProjectId = null;
        return;
      }

      const requests = allIds.map((id) =>
        this.documentService.getAllFiles(id).pipe(
          map((files: BackendDocument[]) => ({
            projectId: id,
            name: nameMap.get(String(id)) || `Project ${id}`,
            date: "",
            documents: files || [],
          })),
          catchError((err) => {
            console.error(`Error carregant documents del projecte ${id}`, err);
            return of({
              projectId: id,
              name: nameMap.get(String(id)) || `Project ${id}`,
              date: "",
              documents: [],
            } as ProjectView);
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
    this.storage.set(this.STORAGE_KEY_SELECTED, String(project.projectId));
  }

  /**
   * Pujar document al projecte
   */
  addDocument(): void {
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

    const formData = new FormData();
    formData.append("file", this.selectedFile);
    formData.append("descripcion", "");

    this.projectService
      .uploadProjectDocument(String(this.projectId), formData)
      .subscribe({
        next: (response: any) => {
          console.log("Documento subido al proyecto", response);

          const targetProject = this.projects.find(
            (p) => String(p.projectId) === String(this.projectId),
          );

          if (targetProject && response?.document) {
            targetProject.documents = [
              ...(targetProject.documents || []),
              response.document,
            ];
          }

          this.projectsFiltrats = [...this.projects];

          this.showToast("Documento subido correctamente al proyecto", true);
          this.toggleAddPopup();
          this.loadProjects();
        },
        error: (err) => {
          console.error("Error subiendo documento al proyecto", err);
          this.showToast("Error al subir el documento al proyecto", false);
        },
      });
  }

  confirmDeleteDocument(project: ProjectView, doc: BackendDocument): void {
    this.docToDelete = { project, document: doc };
    this.deleteDocPopupOpen = true;
  }

  cancelDeleteDocument(): void {
    this.deleteDocPopupOpen = false;
    this.docToDelete = null;
  }

  /**
   * Esborrar document del projecte
   */
  deleteDocument(): void {
    if (!this.docToDelete) return;

    const { project, document } = this.docToDelete;

    // Fem servir el mateix nom que veus al popup
    const displayName = this.resolveDocumentName(document);

    if (!displayName) {
      console.error("No s'ha pogut determinar el nom del fitxer per esborrar");
      this.showToast("Error al eliminar el documento", false);
      return;
    }

    this.projectService
      .deleteProjectDocument(String(project.projectId), displayName)
      .subscribe({
        next: () => {
          // Traiem-lo de la llista local
          project.documents = (project.documents || []).filter(
            (d) => this.resolveDocumentName(d) !== displayName,
          );

          this.projectsFiltrats = [...this.projects];

          this.loadProjects();
          this.cancelDeleteDocument();
          this.showToast("Documento eliminado correctamente", true);
        },
        error: (err) => {
          console.error("Error esborrant document (projecte)", err);
          this.showToast("Error al eliminar el documento", false);
        },
      });
  }

  confirmDeleteProject(project: ProjectView): void {
    this.projectToDelete = project;
    this.deleteProjectPopupOpen = true;
  }

  cancelDeleteProject(): void {
    this.deleteProjectPopupOpen = false;
    this.projectToDelete = null;
  }

  deleteProject(): void {
    if (!this.projectToDelete) return;

    const id = this.projectToDelete.projectId;

    this.documentService.deleteProjectFiles(id).subscribe({
      next: () => {
        this.projects = this.projects.filter(
          (p) => String(p.projectId) !== String(id),
        );
        this.projectsFiltrats = this.projectsFiltrats.filter(
          (p) => String(p.projectId) !== String(id),
        );

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

  viewDocument(project: ProjectView, doc: BackendDocument): void {
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
      error: (err) => {
        console.error("Error visualitzant document", err);
        this.showToast("Error al visualizar el documento", false);
      },
    });
  }

  downloadDocument(project: ProjectView, doc: BackendDocument): void {
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
      error: (err) => {
        console.error("Error descarregant document", err);
        this.showToast("Error al descargar el documento", false);
      },
    });
  }

  closeImagePreview(): void {
    this.imagePreviewPopupOpen = false;
    this.imagePreviewName = "";
    this.releaseImagePreviewUrl();
  }

  private openImagePreview(url: string, doc: BackendDocument): void {
    this.releaseImagePreviewUrl();
    this.imagePreviewUrl = url;
    this.imagePreviewName = this.resolveDocumentName(doc);
    this.imagePreviewPopupOpen = true;
  }

  private releaseImagePreviewUrl(): void {
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

    const anyDoc = doc as any;
    return (
      anyDoc?.name ||
      anyDoc?.nombre ||
      anyDoc?.path?.split("/").pop() ||
      "document"
    );
  }
}
