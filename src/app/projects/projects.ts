import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrls: ['./projects.css'],
  standalone: true,
  imports: [CommonModule, BuscadorComponent, TranslateModule]
})
export class ProjectsComponent {
  title = 'Proyectos';

  // Exemple de projectes
  projectes = [
    { nom: 'Web ERP', client: 'Empresa X', estat: 'En curso' },
    { nom: 'Nueva App Mobile', client: 'Cliene Y', estat: 'Finalizado' },
    { nom: 'Migración de servidores', client: 'Empresa Z', estat: 'Activo' },
    { nom: 'CRM Cloud', client: 'Cliente W', estat: 'Planificado' },
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
