import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-herramientas',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="herramientas-container">
      <h2>{{ 'MENU.TOOLS' | translate }}</h2>
      <p>Área de herramientas. Añade aquí las utilidades del equipo.</p>
    </div>
  `
})
export class Herramientas {}
