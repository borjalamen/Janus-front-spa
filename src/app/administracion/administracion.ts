import { Component } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.html',
  styleUrls: ['./administracion.css'],
  standalone: true,
  imports: [BuscadorComponent,CommonModule]
})
export class AdministracionComponent {
  title = 'Administración';

  // Exemple de llista d'usuaris
  usuaris = [
    { nom: 'Anna', rol: 'admin', email: 'anna@exemple.com' },
    { nom: 'Joan', rol: 'usuari', email: 'joan@exemple.com' },
    { nom: 'Carla', rol: 'editor', email: 'carla@exemple.com' },
    { nom: 'Pau', rol: 'admin', email: 'pau@exemple.com' },
    { nom: 'Marta', rol: 'usuari', email: 'marta@exemple.com' },
    { nom: 'Sergi', rol: 'usuari', email: 'sergi@exemple.com' },
    { nom: 'Laia', rol: 'editor', email: 'laia@exemple.com' },
    { nom: 'Albert', rol: 'usuari', email: 'albert@exemple.com' },
  ];

  usuarisFiltrats = this.usuaris;

  filtrar(valor: string) {
    if (!valor) {
      this.usuarisFiltrats = this.usuaris;
    } else {
      const v = valor.toLowerCase();
      this.usuarisFiltrats = this.usuaris.filter(u =>
        u.nom.toLowerCase().includes(v) ||
        u.rol.toLowerCase().includes(v) ||
        u.email.toLowerCase().includes(v)
      );
    }
  }
}