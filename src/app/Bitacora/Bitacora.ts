import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';

@Component({
  selector: 'app-bitacora',
  templateUrl: './bitacora.html',
  styleUrls: ['./bitacora.css'],
  imports: [CommonModule, BuscadorComponent],
})
export class BitacoraComponent {
  title = 'Bitácora DevOps';

  errores = [
    {
      nombre: 'NullInjectorError: No provider for HttpClient',
      causa: 'No se importó HttpClientModule en app.module.ts.',
      solucion: 'Agregar HttpClientModule en imports.',
      resuelto: false
    },
    {
      nombre: 'ERESOLVE unable to resolve dependency tree',
      causa: 'Conflicto de versiones npm.',
      solucion: 'Ejecutar: npm install --legacy-peer-deps',
      resuelto: false
    },
    {
      nombre: 'HTTP 401 Unauthorized',
      causa: 'Token ausente o expirado.',
      solucion: 'Revisar interceptor y expiración del JWT.',
      resuelto: false
    },
    {
      nombre: 'Docker: port is already allocated',
      causa: 'Un contenedor o proceso ya usa el puerto.',
      solucion: 'docker ps + docker stop <id>',
      resuelto: false
    },
    {
      nombre: 'fatal: refusing to merge unrelated histories',
      causa: 'Repositorios sin historia común.',
      solucion: 'git pull --allow-unrelated-histories',
      resuelto: true
    }
  ];

  erroresFiltrados = this.errores;

  filtrar(valor: string) {
    if (!valor) {
      this.erroresFiltrados = this.errores;
      return;
    }

    const v = valor.toLowerCase();
    this.erroresFiltrados = this.errores.filter(e =>
      e.nombre.toLowerCase().includes(v) ||
      e.causa.toLowerCase().includes(v) ||
      e.solucion.toLowerCase().includes(v)
    );
  }

  toggleResuelto(error: any) {
    error.resuelto = !error.resuelto;
  }
}
