import { Component } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.html',
  styleUrls: ['./administracion.css'],
  standalone: true,
  imports: [BuscadorComponent, CommonModule, MatIconModule, FormsModule]
})
export class AdministracionComponent {
  title = 'Administración';

  mostrarLlista = false;
  mostrarPopup = false;

  nouUsuari = {
    nombre: '',
    contrasenya: '',
    rols: {
      admin: false,
      consultor: false,
      devops: false
    }
  };


  // Exemple de llista d'usuaris
  usuaris = [
  { nom: 'Anna', rols: ['admin'], email: 'anna@exemple.com' },
  { nom: 'Joan', rols: ['usuari'], email: 'joan@exemple.com' },
  { nom: 'Carla', rols: ['editor'], email: 'carla@exemple.com' },
  { nom: 'Pau', rols: ['admin'], email: 'pau@exemple.com' },
  { nom: 'Marta', rols: ['usuari'], email: 'marta@exemple.com' },
  { nom: 'Sergi', rols: ['usuari'], email: 'sergi@exemple.com' },
  { nom: 'Laia', rols: ['editor'], email: 'laia@exemple.com' },
  { nom: 'Albert', rols: ['usuari'], email: 'albert@exemple.com' },
];
  usuarisFiltrats = [...this.usuaris];

   filtrar(valor: string) {
    if (!valor) {
      this.usuarisFiltrats = [...this.usuaris];
    } else {
      const v = valor.toLowerCase();
      this.usuarisFiltrats = this.usuaris.filter(u =>
        u.nom.toLowerCase().includes(v) ||
        u.rols.join(', ').toLowerCase().includes(v) ||
        u.email.toLowerCase().includes(v)
      );
    }
  }

  
  toggleLlista() {
    this.mostrarLlista = !this.mostrarLlista;
  }

   obrirPopup() {
    this.mostrarPopup = true;
  }

  tancarPopup() {
    this.mostrarPopup = false;
  }


 guardarUsuari() {
    const rolsSeleccionats = Object.entries(this.nouUsuari.rols)
      .filter(([k, v]) => v)
      .map(([k]) => k);

       if (!this.nouUsuari.nombre || rolsSeleccionats.length === 0) {
      alert('Introduce nombre y al menos un rol');
      return;
    }


    this.usuaris.push({
      nom: this.nouUsuari.nombre,
      rols: rolsSeleccionats,
      email: `${this.nouUsuari.nombre.toLowerCase()}@exemple.com`
    });

    this.usuarisFiltrats = [...this.usuaris];
    this.tancarPopup();

   
    this.nouUsuari = {
      nombre: '',
      contrasenya: '',
      rols: { admin: false, consultor: false, devops: false }
    };
  }

  isArray(val: any): boolean { return Array.isArray(val); }
}
