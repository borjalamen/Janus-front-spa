import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BuscadorComponent } from '../buscador/buscador';
import { ProceduresService, Procedure } from '../procedure.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-procedimientos',
  templateUrl: './procedimientos.html',
  styleUrls: ['./procedimientos.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, BuscadorComponent]
})
export class ProcedimientosComponent implements OnInit {
  title = 'Procedimientos';

  procedures: Procedure[] = [];
  procedimientosFiltrados: Procedure[] = [];

  // popup crear / editar
  mostrarPopup = false;
  editando: Procedure | null = null;
  procForm: Procedure = { nombre: '', responsable: '', estado: '', descripcion: '' };

  // popup delete
  mostrarPopupDelete = false;
  procAEliminar: Procedure | null = null;

  constructor(
    private proceduresService: ProceduresService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarProcedimientos();
  }

  get canEdit(): boolean {
    return this.authService.canEdit;   // admin o devops
  }

  // ===== READ =====
  cargarProcedimientos() {
    this.proceduresService.getAll().subscribe({
      next: data => {
        this.procedures = data;
        this.procedimientosFiltrados = [...this.procedures];
      },
      error: err => console.error('Error carregant procediments', err)
    });
  }

  filtrar(valor: string) {
    if (!valor) {
      this.procedimientosFiltrados = [...this.procedures];
    } else {
      const v = valor.toLowerCase();
      this.procedimientosFiltrados = this.procedures.filter(p =>
        p.nombre.toLowerCase().includes(v) ||
        p.responsable.toLowerCase().includes(v) ||
        p.estado.toLowerCase().includes(v)
      );
    }
  }

  // ===== CREATE / UPDATE =====
  obrirPopupCrear() {
    this.editando = null;
    this.procForm = { nombre: '', responsable: '', estado: '', descripcion: '' };
    this.mostrarPopup = true;
  }

  obrirPopupEditar(proc: Procedure) {
    this.editando = proc;
    this.procForm = { ...proc };
    this.mostrarPopup = true;
  }

  tancarPopup() {
    this.mostrarPopup = false;
    this.editando = null;
  }

  guardarProcedimiento() {
    if (!this.procForm.nombre || !this.procForm.responsable || !this.procForm.estado) {
      alert('Falta nombre, responsable o estado');
      return;
    }

    if (this.editando && this.editando.id) {
      // UPDATE
      this.proceduresService.update(this.editando.id, this.procForm).subscribe({
        next: updated => {
          const idx = this.procedures.findIndex(p => p.id === updated.id);
          if (idx !== -1) this.procedures[idx] = updated;
          this.procedimientosFiltrados = [...this.procedures];
          this.tancarPopup();
        },
        error: err => console.error('Error actualitzant procediment', err)
      });
    } else {
      // CREATE
      this.proceduresService.create(this.procForm).subscribe({
        next: created => {
          this.procedures.push(created);
          this.procedimientosFiltrados = [...this.procedures];
          this.tancarPopup();
        },
        error: err => console.error('Error creant procediment', err)
      });
    }
  }

  // ===== DELETE =====
  confirmarEliminar(proc: Procedure) {
    this.procAEliminar = proc;
    this.mostrarPopupDelete = true;
  }

  cancelarEliminar() {
    this.mostrarPopupDelete = false;
    this.procAEliminar = null;
  }

  eliminarProcedimiento() {
    if (!this.procAEliminar?.id) {
      this.mostrarPopupDelete = false;
      return;
    }

    this.proceduresService.delete(this.procAEliminar.id).subscribe({
      next: () => {
        this.procedures = this.procedures.filter(p => p.id !== this.procAEliminar!.id);
        this.procedimientosFiltrados = [...this.procedures];
        this.cancelarEliminar();
      },
      error: err => console.error('Error eliminant procediment', err)
    });
  }
}
