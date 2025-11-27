import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    FormsModule,
    CommonModule,
    MatDialogModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css']
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
  error: string = '';

  // Aquí podemos definir los roles válidos
  private rolesMap: { [key: string]: string } = {
    'Janus': 'Administrador',
    'Consultor': 'Consultor',
    'DevOps': 'Devops'
  };

  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  ngOnInit(): void {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  login(): void {
    const usernameTrim = this.username.trim();

    if (!usernameTrim || !this.password) {
      this.error = 'Debe introducir usuario y contraseña';
      return;
    }

    // Validación simple
    if ((usernameTrim === 'Janus' && this.password === '1234') ||
        (usernameTrim === 'Consultor' && this.password === '1234') ||
        (usernameTrim === 'DevOps' && this.password === '1234')) {
      
      // Se obtiene el rol según el usuario
      const rol = this.rolesMap[usernameTrim] || 'Usuario';
      
      // Cerramos el diálogo devolviendo usuario y rol
      this.dialogRef.close({ username: usernameTrim, rol });

    } else {
      this.error = 'Usuario o contraseña incorrectos';
    }
  }
}
