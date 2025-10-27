import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-documents',
  imports: [CommonModule],
  templateUrl: './documents.html',
  styleUrl: './documents.css',
})
export class DocumentsComponent {
documents = [
  { name: 'Document 1.pdf', date: '2025-01-15' },
  { name: 'Document 2.pdf', date: '2025-01-20' },
];
}
