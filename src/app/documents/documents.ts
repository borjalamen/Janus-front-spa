import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';

interface Project {
  projectId: number;
  name: string;
  date: string;
  documents?: { name: string; date: string }[];
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    BuscadorComponent
  ],
  templateUrl: './documents.html',
  styleUrls: ['./documents.css']
})
export class DocumentsComponent {
  title = 'Documents';
  showAddPopup = false;

  projects: Project[] = [
    { projectId: 1, name: 'Project A', date: '2025-01-10', documents: [{ name: 'Doc1.pdf', date: '2025-01-11' }] },
    { projectId: 2, name: 'Project B', date: '2025-01-15', documents: [{ name: 'Doc2.pdf', date: '2025-01-16' }] },
  ];

  projectsFiltrats = [...this.projects];

  // Variables del popup
  projectId!: number;
  name = '';
  date = '';

  // Fitxer seleccionat
  selectedFile?: File;

  deleteDocPopupOpen = false;
  docToDelete: { project: Project, document: { name: string; date: string } } | null = null;

  toggleAddPopup() {
    this.showAddPopup = !this.showAddPopup;
    if (!this.showAddPopup) {
      this.projectId = 0;
      this.name = '';
      this.date = '';
      this.selectedFile = undefined;
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.name = file.name; // Omple automàticament el camp de nom
    }
  }
  

  // Filtra projectes pel nom
  filtrar(valor: string) {
    if (!valor) {
      this.projectsFiltrats = [...this.projects];
    } else {
      const lower = valor.toLowerCase();
      this.projectsFiltrats = this.projects.filter(
        p => p.name.toLowerCase().includes(lower)
      );
    }
  }

  // Afegeix un document a un projecte
  addDocument() {
    const project = this.projects.find(p => p.projectId === this.projectId);
    if (project) {
      if (!project.documents) project.documents = [];
      project.documents.push({ name: this.name, date: this.date });
    } else {
      // Si no existeix el projecte, el crea
      this.projects.push({
        projectId: this.projectId,
        name: `Project ${this.projectId}`,
        date: this.date,
        documents: [{ name: this.name, date: this.date }]
      });
    }

    this.toggleAddPopup();
    this.projectsFiltrats = [...this.projects];
  }

   confirmDeleteDocument(project: Project, doc: { name: string; date: string }) {
    this.docToDelete = { project, document: doc };
    this.deleteDocPopupOpen = true;
  }

   cancelDeleteDocument() {
    this.deleteDocPopupOpen = false;
    this.docToDelete = null;
  }

   deleteDocument() {
    if (this.docToDelete) {
      const { project, document } = this.docToDelete;
      project.documents = project.documents?.filter(d => d !== document);
      this.cancelDeleteDocument();
    }
  }
}
