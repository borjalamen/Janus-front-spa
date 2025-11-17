import { Component, Output, EventEmitter } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscador',
  standalone: true,
  templateUrl: './buscador.html',
  styleUrls: ['./buscador.css'],
  imports: [MatFormFieldModule, MatInputModule, MatIconModule, FormsModule]
})
export class BuscadorComponent {
  valorBusqueda = '';
  @Output() buscar = new EventEmitter<string>();

  onBuscar() {
    this.buscar.emit(this.valorBusqueda);
  }
  clearBusqueda() {
    this.valorBusqueda = '';
    this.onBuscar();
  }
}
