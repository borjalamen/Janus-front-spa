import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface User {
  username: string;
  password: string;
  rol: 'invitado' | 'consultor' | 'devops' | 'admin';
}

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
  username = '';
  password = '';
  error = '';

  private users: User[] = [
    { username: 'invitado', password: '1234', rol: 'invitado' },
    { username: 'consultor', password: '1234', rol: 'consultor' },
    { username: 'devops', password: '1234', rol: 'devops' },
    { username: 'admin', password: '1234', rol: 'admin' }
  ];

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
    const user = this.users.find(
      u => u.username === this.username && u.password === this.password
    );

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
      this.dialogRef.close({ success: true, username: user.username, rol: user.rol });
    } else {
      this.error = 'Usuario o contraseña inválidos';
    }
  }
}
