import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';

@Component({
  selector: 'app-documents',
  imports: [CommonModule, BuscadorComponent],
  templateUrl: './documents.html',
  styleUrl: './documents.css',
})
export class DocumentsComponent {
  documents = [
    { name: 'Document 1.pdf', date: '2025-01-15' },
    { name: 'Document 2.pdf', date: '2025-01-20' },
  ];

  documentsFiltrats = this.documents; // Array amb el resultat filtrat

  filtrar(valor: string) {
    if (!valor) {
      this.documentsFiltrats = this.documents;
    } else {
      this.documentsFiltrats = this.documents.filter(doc =>
        doc.name.toLowerCase().includes(valor.toLowerCase())
      );
    }
  }
}