import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

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
  styleUrls: ['./login-dialog.css'],
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
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
    // Lista de usuarios de ejemplo
    const users = [
      { username: 'Janus', password: '1234', rol: 'admin' },
      { username: 'Consultor', password: '1234', rol: 'consultor' },
      { username: 'Devops', password: '1234', rol: 'devops' }
    ];

    const user = users.find(u => u.username === this.username && u.password === this.password);

    if (user) {
      // Devuelve al AppComponent el username y rol
      this.dialogRef.close({ success: true, username: user.username, rol: user.rol as Rol });
    } else {
      this.error = 'Usuario o contraseña incorrectos';
    }
  }

  cancel() {
    this.dialogRef.close({ success: false });
  }
}
