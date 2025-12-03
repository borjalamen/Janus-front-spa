import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './usuari.html',
  styleUrls: ['./usuari.css']
})
export class UsuarioComponent {
  username: string;
  rol: string;

  constructor() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.username = user.username ?? 'Sin usuario';
      this.rol = user.rol ?? 'Sin rol';
    } else {
      this.username = 'Sin usuario';
      this.rol = 'Sin rol';
    }
  }
}
