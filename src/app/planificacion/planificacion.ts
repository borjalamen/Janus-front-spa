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
  title = 'Planificacions';

  
  plans = [
    { nom: 'Pla Formació 2025', responsable: 'Anna', estat: 'Actiu' },
    { nom: 'Pla Manteniment 2024', responsable: 'Joan', estat: 'Finalitzat' },
    { nom: 'Pla Seguretat', responsable: 'Carla', estat: 'Actiu' },
    { nom: 'Pla Noves Tecnologies', responsable: 'Pau', estat: 'En procés' },
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