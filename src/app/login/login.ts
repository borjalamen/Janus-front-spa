import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule} from "@angular/forms";
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [ CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
   constructor(private router: Router) {}
  login() {
    
    if (this.username === 'Janus' && this.password === '1234') {
      alert('Login completado con éxito');
      this.router.navigate(['/usuari']);
    } else {
      this.error = "Usuario o contraseña incorrectos";
      alert(this.error);
    }
  }
}
