import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

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
    MatDialogModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css']
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
  rol: string = '';
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

  login(): void {
    // Aquí puedes validar según tu lógica
    if (!this.username || !this.password || !this.rol) {
      this.error = 'Por favor completa todos los campos';
      return;
    }

    // Simulación de login: acepta cualquier combinación
    // Puedes reemplazar por validación real
    this.dialogRef.close({
      username: this.username,
      rol: this.rol
    });
  }
}
