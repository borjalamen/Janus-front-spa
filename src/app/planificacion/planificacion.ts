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
  { nom: 'Pla Formació 2025', responsable: 'Anna', estat: 'Actiu' },
  { nom: 'Pla Manteniment 2024', responsable: 'Joan', estat: 'Finalitzat' },
  { nom: 'Pla Seguretat', responsable: 'Carla', estat: 'Actiu' },
  { nom: 'Pla Noves Tecnologies', responsable: 'Pau', estat: 'En procés' },
  { nom: 'Pla Desenvolupament', responsable: 'Marc', estat: 'Actiu' },
  { nom: 'Pla Auditoria', responsable: 'Gemma', estat: 'Finalitzat' },
  { nom: 'Pla RRHH', responsable: 'Sergi', estat: 'En procés' },
  { nom: 'Pla Infraestructura', responsable: 'Jordi', estat: 'Actiu' },
  { nom: 'Pla Qualitat', responsable: 'Sílvia', estat: 'Finalitzat' },
  { nom: 'Pla Sostenibilitat', responsable: 'Ramon', estat: 'Actiu' },
  { nom: 'Pla Comunicació', responsable: 'Helena', estat: 'En revisió' },
  { nom: 'Pla Innovació', responsable: 'Núria', estat: 'Actiu' },
  { nom: 'Pla IT', responsable: 'Oriol', estat: 'Finalitzat' },
  { nom: 'Pla Atenció al Client', responsable: 'Mireia', estat: 'En procés' },
  { nom: 'Pla Expansió', responsable: 'Albert', estat: 'Planificat' },
  { nom: 'Pla Marketing', responsable: 'Cristina', estat: 'Actiu' },
  { nom: 'Pla Logística', responsable: 'Eva', estat: 'Finalitzat' },
  { nom: 'Pla Controls Interns', responsable: 'Dani', estat: 'En curs' }
  
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