import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
@Component({
  selector: 'app-login',
  imports: [ CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule, MatIconModule ],
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
