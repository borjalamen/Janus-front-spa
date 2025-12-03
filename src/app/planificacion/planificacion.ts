import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';

@Component({
  selector: 'app-planificacion',
  templateUrl: './planificacion.html',
  styleUrls: ['./planificacion.css'],
  standalone: true,
  imports: [CommonModule, BuscadorComponent]
})
export class PlanificacionComponent {
  title = 'Planificaciones';

  
 plans = [
  { nom: 'Plan Formación 2025', responsable: 'Anna', estat: 'Activo' },
  { nom: 'Plan Mantenimiento 2024', responsable: 'Joan', estat: 'Finalizado' },
  { nom: 'Plan Seguridad', responsable: 'Carla', estat: 'Activo' },
  { nom: 'Plan Nuevas Tecnologias', responsable: 'Pau', estat: 'En proceso' },
  { nom: 'Plan Desarrollo', responsable: 'Marc', estat: 'Activo' },
  { nom: 'Plan Auditoria', responsable: 'Gemma', estat: 'Finalizado' },
  { nom: 'Plan RRHH', responsable: 'Sergi', estat: 'En procés' },
  { nom: 'Plan Infraestructura', responsable: 'Jordi', estat: 'Actiu' },
  { nom: 'Plan Calidad', responsable: 'Sílvia', estat: 'Finalizado' },
  { nom: 'Plan Sostenibilidad', responsable: 'Ramon', estat: 'Activo' },
  { nom: 'Plan Comunicación', responsable: 'Helena', estat: 'En revisión' },
  { nom: 'Plan Innovación', responsable: 'Núria', estat: 'Activo' },
  { nom: 'Plan IT', responsable: 'Oriol', estat: 'Finalizado' },
  { nom: 'Plan Atención al Cliente', responsable: 'Mireia', estat: 'En proceso' },
  { nom: 'Plan Expansión', responsable: 'Albert', estat: 'Planificado' },
  { nom: 'Plan Marketing', responsable: 'Cristina', estat: 'Activo' },
  { nom: 'Plan Logística', responsable: 'Eva', estat: 'Finalitzado' },
  { nom: 'Plan Controles Internos', responsable: 'Dani', estat: 'En curso' }
  
];

  plansFiltrats = this.plans;

  filtrar(valor: string) {
    if (!valor) {
      this.plansFiltrats = this.plans;
    } else {
      const v = valor.toLowerCase();
      this.plansFiltrats = this.plans.filter(p =>
        p.nom.toLowerCase().includes(v) ||
        p.responsable.toLowerCase().includes(v) ||
        p.estat.toLowerCase().includes(v)
      );
    }
  }
}