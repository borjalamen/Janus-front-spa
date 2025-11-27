import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    FormsModule,
    CommonModule,
    MatDialogModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css'],
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
  rol: 'admin' | 'consultor' | 'devops' = 'consultor'; // ✅ propiedad rol añadida
  error: string = '';

  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  ngOnInit(): void {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  login() {
    if (this.username === 'Janus' && this.password === '1234') {
      // Puedes hacer algo con el rol si quieres
      console.log('Usuario:', this.username, 'Rol:', this.rol);
      this.dialogRef.close({ username: this.username, rol: this.rol });
    } else {
      this.error = 'Usuario o contraseña inválidos';
    }
  }
}
