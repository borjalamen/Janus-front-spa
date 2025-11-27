import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css']
})
export class LoginDialogComponent {
  username = '';
  password = '';
  error: string | null = null;

  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  login() {
    // Aquí puedes validar contra un backend real
    if (!this.username || !this.password) {
      this.error = 'Usuario y contraseña requeridos';
      return;
    }

    // Ejemplo de roles
    let rol: 'invitado' | 'consultor' | 'devops' | 'admin' = 'invitado';
    if (this.username === 'admin') rol = 'admin';
    else if (this.username === 'devops') rol = 'devops';
    else if (this.username === 'consultor') rol = 'consultor';

    this.dialogRef.close({ success: true, username: this.username, rol });
  }

  cancelar() {
    this.dialogRef.close({ success: false });
  }
}
