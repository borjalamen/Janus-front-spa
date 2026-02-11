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

  // formulari basat en el model del backend
  procForm: Procedure = {
    titulo: '',
    descripcion: '',
    departamento: '',
    tags: [],
    steps: [],
    visible: true,
    deleted: false
  };

  // responsable principal (primer pas)
  primerResponsable = '';

  // popup delete
  mostrarPopupDelete = false;
  procAEliminar: Procedure | null = null;

  // Vista de steps
  mostrarSteps = false;
  procSeleccionada: Procedure | null = null;

  constructor(
    private proceduresService: ProceduresService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarProcedimientos();
  }

  get canEdit(): boolean {
    return this.authService.canEdit;
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
        (p.titulo || '').toLowerCase().includes(v) ||
        (p.departamento || '').toLowerCase().includes(v) ||
        (p.steps?.[0]?.responsable || '').toLowerCase().includes(v)
      );
    }
  }

  // ===== CREATE / UPDATE =====
  obrirPopupCrear() {
    this.editando = null;
    this.procForm = {
      titulo: '',
      descripcion: '',
      departamento: '',
      tags: [],
      steps: [],
      visible: true,
      deleted: false
    };
    this.primerResponsable = '';
    this.mostrarPopup = true;
  }

  obrirPopupEditar(proc: Procedure) {
    this.editando = proc;
    // còpia superficial
    this.procForm = {
      id: proc.id,
      titulo: proc.titulo ?? '',
      descripcion: proc.descripcion ?? '',
      departamento: proc.departamento ?? '',
      tags: proc.tags ?? [],
      steps: proc.steps ? [...proc.steps] : [],
      visible: proc.visible ?? true,
      deleted: proc.deleted ?? false,
      createdAt: proc.createdAt,
      updatedAt: proc.updatedAt
    };
    this.primerResponsable = proc.steps?.[0]?.responsable || '';
    this.mostrarPopup = true;
  }

  tancarPopup() {
    this.mostrarPopup = false;
    this.editando = null;
  }

  guardarProcedimiento() {
    if (!this.procForm.titulo || !this.procForm.descripcion) {
      alert('Falta títol o descripció');
      return;
    }

    // muntem steps mínimament si l’usuari ha posat responsable
    if (this.primerResponsable) {
      this.procForm.steps = this.procForm.steps && this.procForm.steps.length
        ? this.procForm.steps
        : [{
            id: 'step-1',
            titulo: 'Pas inicial',
            descripcion: 'Primer pas del procediment',
            responsable: this.primerResponsable,
            metodo: '',
            orden: 1,
            tags: []
          }];
      this.procForm.steps[0].responsable = this.primerResponsable;
    }

    // adaptar body al contracte del back (Postman)
    const body: any = {
      titulo: this.procForm.titulo,
      descripcion: this.procForm.descripcion,
      departamento: this.procForm.departamento,
      tags: this.procForm.tags ?? [],
      steps: this.procForm.steps ?? [],
      isVisible: this.procForm.visible ?? true
      // no enviem isDeleted, createdAt, updatedAt: els gestiona el back
    };

    if (this.editando && this.editando.id) {
      // UPDATE
      this.proceduresService.update(this.editando.id, body).subscribe({
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
      this.proceduresService.create(body).subscribe({
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

  // ===== veure steps =====
  verSteps(proc: Procedure) {
    this.procSeleccionada = proc;
    this.mostrarSteps = true;
  }

  tancarSteps() {
    this.mostrarSteps = false;
    this.procSeleccionada = null;
  }
}
