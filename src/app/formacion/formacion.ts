import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';

@Component({
  selector: 'app-formacion',
  templateUrl: './formacion.html',
  styleUrls: ['./formacion.css'],
  imports: [CommonModule, BuscadorComponent],
})
export class FormacionComponent {
  title = 'Formación';
  formaciones = [
    { nombre: 'Curso Angular Básico', responsable: 'Ana', estado: 'Activo' },
    { nombre: 'Seminario Ciberseguridad', responsable: 'Luis', estado: 'Finalizado' },
    { nombre: 'Workshop UX/UI', responsable: 'María', estado: 'En proceso' },
    { nombre: 'Certificación Scrum', responsable: 'Pedro', estado: 'Planeado' },
  ];
  formacionesFiltradas = this.formaciones;

  filtrar(valor: string) {
    if (!valor) {
      this.formacionesFiltradas = this.formaciones;
    } else {
      const v = valor.toLowerCase();
      this.formacionesFiltradas = this.formaciones.filter(f =>
        f.nombre.toLowerCase().includes(v) ||
        f.responsable.toLowerCase().includes(v) ||
        f.estado.toLowerCase().includes(v)
      );
    }
  }
}
