import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrls: ['./projects.css'],
  standalone: true,
  imports: [CommonModule, BuscadorComponent]
})
export class ProjectsComponent {
  title = 'Projectes';

  // Exemple de projectes
  projectes = [
    { nom: 'Web ERP', client: 'Empresa X', estat: 'En curs' },
    { nom: 'Nova App Mobile', client: 'Client Y', estat: 'Finalitzat' },
    { nom: 'Migració de servidors', client: 'Empresa Z', estat: 'Actiu' },
    { nom: 'CRM Cloud', client: 'Client W', estat: 'Planificat' },
  ];

  projectesFiltrats = this.projectes;

  filtrar(valor: string) {
    if (!valor) {
      this.projectesFiltrats = this.projectes;
    } else {
      const v = valor.toLowerCase();
      this.projectesFiltrats = this.projectes.filter(p =>
        p.nom.toLowerCase().includes(v) ||
        p.client.toLowerCase().includes(v) ||
        p.estat.toLowerCase().includes(v)
      );
    }
  }
}
