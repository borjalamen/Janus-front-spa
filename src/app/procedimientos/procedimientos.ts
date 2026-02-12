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

  activeTab: 'crear' | 'listar' = 'listar';

  procedures: Procedure[] = [];
  procedimientosFiltrados: Procedure[] = [];

  // popup crear / editar
  editando: Procedure | null = null;

  // mode del formulari
  modoForm: 'crear' | 'editar' = 'crear';

  // formulari basat en el model del backend
  procForm: Procedure = {
    titulo: '',
    descripcion: '',
    departamento: '',
    entorno: 'minsait',
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

  // índex step carrusel
  currentStepIndex = 0;

  coloresEntorno = {
    minsait: '#1E88E5',
    preproduccion: '#FBC02D',
    produccion: '#E53935'
  };

  getColorEntorno(entorno: string): string {
    return this.coloresEntorno[entorno as keyof typeof this.coloresEntorno] || '#757575';
  }

  getNombreEntorno(entorno: string): string {
    switch (entorno) {
      case 'minsait': return 'Minsait (Blau)';
      case 'preproduccion': return 'Preproducció (Groc)';
      case 'produccion': return 'Producció (Roig)';
      default: return entorno;
    }
  }

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
    this.modoForm = 'crear';
    this.procForm = {
      titulo: '',
      descripcion: '',
      departamento: '',
      entorno: 'minsait',
      tags: [],
      steps: [],
      visible: true,
      deleted: false
    };
    this.primerResponsable = '';
    this.activeTab = 'crear';
  }

  obrirPopupEditar(proc: Procedure) {
    this.editando = proc;
    this.modoForm = 'editar';
    // còpia superficial
    this.procForm = {
      id: proc.id,
      titulo: proc.titulo ?? '',
      descripcion: proc.descripcion ?? '',
      departamento: proc.departamento ?? '',
      entorno: proc.entorno ?? '',
      tags: proc.tags ?? [],
      steps: proc.steps ? [...proc.steps] : [],
      visible: proc.visible ?? true,
      deleted: proc.deleted ?? false,
      createdAt: proc.createdAt,
      updatedAt: proc.updatedAt
    };
    this.primerResponsable = proc.steps?.[0]?.responsable || '';
    this.activeTab = 'crear';
  }

  tancarPopup() {
    this.editando = null;
    this.modoForm = 'crear';
    this.activeTab = 'listar';
  }

  guardarProcedimiento() {
    if (!this.procForm.titulo || !this.procForm.descripcion) {
      alert('Falta títol o descripció');
      return;
    }

    if ((!this.procForm.steps || this.procForm.steps.length === 0) && this.primerResponsable) {
      this.procForm.steps = [{
        id: 'step-1',
        titulo: 'Pas inicial',
        descripcion: 'Primer pas del procediment',
        responsable: this.primerResponsable,
        metodo: '',
        orden: 1,
        tags: []
      }];
    } else if (this.procForm.steps && this.procForm.steps.length > 0 && this.primerResponsable) {
      this.procForm.steps[0].responsable = this.primerResponsable;
    }

    const body: any = {
      titulo: this.procForm.titulo,
      descripcion: this.procForm.descripcion,
      departamento: this.procForm.departamento,
      entorno: this.procForm.entorno,
      tags: this.procForm.tags ?? [],
      steps: this.procForm.steps ?? [],
      isVisible: this.procForm.visible ?? true
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

  // ===== ver steps (carrusel) =====
  verSteps(proc: Procedure) {
    this.procSeleccionada = proc;
    this.mostrarSteps = true;
    this.currentStepIndex = 0;
  }

  tancarSteps() {
    this.mostrarSteps = false;
    this.procSeleccionada = null;
  }

  nextStep() {
    if (!this.procSeleccionada?.steps || this.procSeleccionada.steps.length === 0) return;
    const total = this.procSeleccionada.steps.length;
    this.currentStepIndex = (this.currentStepIndex + 1) % total;
  }

  prevStep() {
    if (!this.procSeleccionada?.steps || this.procSeleccionada.steps.length === 0) return;
    const total = this.procSeleccionada.steps.length;
    this.currentStepIndex = (this.currentStepIndex - 1 + total) % total;
  }

  getColorDepartamento(dep?: string): string {
    switch ((dep || '').toLowerCase()) {
      case 'minsait': return '#1E88E5';
      case 'preproduccion': return '#FBC02D';
      case 'produccion': return '#E53935';
      default: return '#757575';
    }
  }

  getNombreDepartamento(dep?: string): string {
    switch ((dep || '').toLowerCase()) {
      case 'minsait': return 'Minsait';
      case 'preproduccion': return 'Preproducció';
      case 'produccion': return 'Producció';
      default: return dep || 'Otros';
    }
  }

  getNumeroDepartamento(dep?: string): number {
    switch ((dep || '').toLowerCase()) {
      case 'minsait': return 1;
      case 'preproduccion': return 2;
      case 'produccion': return 3;
      default: return 0;
    }
  }

  afegirStep() {
    const nouIndex = (this.procForm.steps?.length || 0) + 1;
    this.procForm.steps = [
      ...(this.procForm.steps || []),
      {
        id: `step-${nouIndex}`,
        titulo: `Step ${nouIndex}`,
        descripcion: '',
        responsable: this.primerResponsable || '',
        metodo: '',
        orden: nouIndex,
        tags: []
      }
    ];
  }

  eliminarStep(idx: number) {
    if (!this.procForm.steps) return;
    this.procForm.steps.splice(idx, 1);
  }
}
