import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [
    CommonModule,
    BuscadorComponent,
    MatButtonModule,
    TranslateModule
  ],
  templateUrl: './bitacora.html',
  styleUrls: ['./bitacora.css']   // <-- NOMBRE CON MAYÚSCULA
})
export class BitacoraComponent {

  title = 'Control de errores';

  errores = [
    {
      id: 1,
      titulo: 'Error de despliegue en Jenkins',
      descripcion: 'El pipeline falla en el stage de build por versión incorrecta de Node.',
      categoria: 'DevOps',
      resuelto: false
    },
    {
      id: 2,
      titulo: 'Timeout en API REST',
      descripcion: 'La API no responde en menos de 5 segundos en PRE.',
      categoria: 'Backend',
      resuelto: true
    },
    {
      id: 3,
      titulo: 'Problema con permisos en GitLab',
      descripcion: 'No se puede hacer push por pérdida de credenciales SSH.',
      categoria: 'Repo',
      resuelto: false
    }
  ];

  erroresFiltrados = this.errores;

  filtrar(valor: string) {
    const v = valor.toLowerCase();

    this.erroresFiltrados = this.errores.filter(e =>
      e.titulo.toLowerCase().includes(v) ||
      e.descripcion.toLowerCase().includes(v) ||
      e.categoria.toLowerCase().includes(v)
    );
  }

  toggleResuelto(error: any) {
    error.resuelto = !error.resuelto;
  }
}
