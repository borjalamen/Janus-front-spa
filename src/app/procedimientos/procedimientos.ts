import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-procedimientos',
  templateUrl: './procedimientos.html',
  styleUrls: ['./procedimientos.css'],
  standalone: true,
  imports: [CommonModule, BuscadorComponent, TranslateModule]
})
export class ProcedimientosComponent {
  title = 'Procedimientos';

procedimientos = [
  { nombre: 'Proceso de alta', responsable: 'Laura', estado: 'Activo' },
  { nombre: 'Proceso de baja', responsable: 'Mark', estado: 'Finalizado' },
  { nombre: 'Protocolo de Seguridad', responsable: 'Álex', estado: 'En revisión' },
  { nombre: 'Actualización ISO', responsable: 'Marta', estado: 'Activo' },
];

  procedimientosFiltrados = this.procedimientos;

  filtrar(valor: string) {
    if (!valor) {
      this.procedimientosFiltrados = this.procedimientos;
    } else {
      const v = valor.toLowerCase();
      this.procedimientosFiltrados = this.procedimientos.filter(p =>
        p.nombre.toLowerCase().includes(v) ||
        p.responsable.toLowerCase().includes(v) ||
        p.estado.toLowerCase().includes(v)
      );
    }
  }
}

