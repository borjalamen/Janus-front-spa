// src/app/documents/documents.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../document.service';

interface Project {
  projectId: string | number;
  name: string;
  date: string;
  documents: string[];
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    BuscadorComponent,
    TranslateModule
  ],
  templateUrl: './documents.html',
  styleUrls: ['./documents.css']
})
export class DocumentsComponent implements OnInit {
  title = 'Documentos';
  showAddPopup = false;

  projects: Project[] = [];
  projectsFiltrats: Project[] = [];

  // popup afegir
  projectId!: string | number;
  name = '';
  date = '';

  selectedFile?: File;

  // popup eliminar document
  deleteDocPopupOpen = false;
  docToDelete: { project: Project; document: string } | null = null;

  // popup eliminar projecte
  deleteProjectPopupOpen = false;
  projectToDelete: Project | null = null;

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  // ===== CARREGAR PROJECTES + DOCUMENTS DEL BACK =====
  loadProjects() {
    this.documentService.getAllFolders().subscribe({
      next: ids => {
        this.projects = [];

        ids.forEach(id => {
          this.documentService.getAllFiles(id).subscribe({
            next: docs => {
              this.projects.push({
                projectId: id,
                name: `Project ${id}`,
                date: '',
                documents: docs || []
              });

              this.projectsFiltrats = [...this.projects];

            },
            error: err => console.error('Error carregant fitxers', err)
          });
        });
      },
      error: err => console.error('Error carregant carpetes', err)
    });
  }

  // ===== POPUP AFEGIR =====
  toggleAddPopup() {
    this.showAddPopup = !this.showAddPopup;
    if (!this.showAddPopup) {
      this.projectId = '';
      this.name = '';
      this.date = '';
      this.selectedFile = undefined;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.name = file.name;
      console.log('FITXER SELECCIONAT', this.selectedFile);
    }
  }

  // filtre per id o nom
  filtrar(valor: string) {
    if (!valor) {
      this.projectsFiltrats = [...this.projects];
    } else {
      const lower = valor.toLowerCase();
      this.projectsFiltrats = this.projects.filter(
        p =>
          String(p.projectId).toLowerCase().includes(lower) ||
          p.name.toLowerCase().includes(lower)
      );
    }
  }

  // ===== AFEGIR DOCUMENT (NO DUPLICA PROJECTES) =====
  addDocument() {
    console.log('ADD', this.projectId, this.selectedFile);

    if (!this.projectId || !this.selectedFile) {
      console.warn('Falten projectId o fitxer');
      return;
    }

    this.documentService.uploadDocument(this.projectId, this.selectedFile)
      .subscribe({
        next: () => {

          this.loadProjects();
          this.toggleAddPopup();
        },
          
        error: err => console.error('Error pujant document', err)
      });
  }

  // ===== DOCUMENTS =====
  confirmDeleteDocument(project: Project, doc: string) {
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

    console.log('DELETE DOC', project.projectId, document);

    this.documentService.deleteDocument(project.projectId, document)
      .subscribe({
        next: () => {
          this.loadProjects();          
          this.cancelDeleteDocument();
        },
        error: err => console.error('Error esborrant document', err)
      });
  }

  // ===== PROJECTES =====
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

    this.documentService.deleteProjectFiles(this.projectToDelete.projectId)
      .subscribe({
        next: () => {
            this.loadProjects();
          this.cancelDeleteProject();
        },
          
        error: err => console.error('Error esborrant projecte', err)
      });
  }
}
