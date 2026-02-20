import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { BuscadorComponent } from '../buscador/buscador';
import { ProceduresService, Procedure, ProcedureStep } from '../procedure.service';
import { AuthService } from '../auth.service';
import { LocalStorageService } from '../local-storage.service';

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

  // crear / editar
  editando: Procedure | null = null;
  modoForm: 'crear' | 'editar' = 'crear';

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

  primerResponsable = '';

  // eliminar
  mostrarPopupDelete = false;
  procAEliminar: Procedure | null = null;

  // vista de steps dins la mateixa pantalla
  procDetall: Procedure | null = null;
  mostrarDetallSteps = false;

  // carrusel steps
  currentStepIndex = 0;
  slideDirection: 'left' | 'right' = 'right';

  coloresEntorno = {
    minsait: '#1E88E5',
    preproduccion: '#FBC02D',
    produccion: '#E53935'
  };

  private readonly STORAGE_KEY_FORM = 'procedimientos_form';
  private readonly STORAGE_KEY_TAB = 'procedimientos_tab';

  constructor(
    private proceduresService: ProceduresService,
    private authService: AuthService,
    private storage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.restoreFromLocalStorage();
    this.cargarProcedimientos();
  }

  // ===== LOCAL STORAGE =====

  private restoreFromLocalStorage(): void {
    // restaurar tab actiu
    const savedTab = this.storage.get(this.STORAGE_KEY_TAB);
    if (savedTab === 'crear' || savedTab === 'listar') {
      this.activeTab = savedTab as any;
    }

    // restaurar formulari
    const savedForm = this.storage.getObject<Procedure & { primerResponsable?: string }>(this.STORAGE_KEY_FORM);
    if (savedForm) {
      this.procForm = {
        titulo: savedForm.titulo || '',
        descripcion: savedForm.descripcion || '',
        departamento: savedForm.departamento || '',
        entorno: (savedForm.entorno as any) || 'minsait',
        tags: savedForm.tags || [],
        steps: savedForm.steps || [],
        visible: savedForm.visible ?? true,
        deleted: savedForm.deleted ?? false,
        id: savedForm.id,
        createdAt: savedForm.createdAt,
        updatedAt: savedForm.updatedAt
      };
      this.primerResponsable = savedForm.primerResponsable || savedForm.steps?.[0]?.responsable || '';
      this.modoForm = savedForm.id ? 'editar' : 'crear';
    }
  }

  private saveFormToLocalStorage(): void {
    const data: Procedure & { primerResponsable?: string } = {
      ...this.procForm,
      primerResponsable: this.primerResponsable
    };
    this.storage.setObject(this.STORAGE_KEY_FORM, data);
    this.storage.set(this.STORAGE_KEY_TAB, this.activeTab);
  }

  private clearFormLocalStorage(): void {
    this.storage.remove(this.STORAGE_KEY_FORM);
  }

  get canEdit(): boolean {
    return this.authService.canEdit;
  }

  // COLORS ENTORN
  getColorEntorno(entorno: string): string {
    const key = (entorno || '').toLowerCase().trim();
    console.log('getColorEntorno key=', key);

    if (key.includes('minsait')) {
      return '#1E88E5';
    }
    if (key.includes('preprod')) {
      return '#FBC02D';
    }
    if (key.includes('produc')) {
      return '#E53935';
    }
    return '#FBC02D';
  }

  getNombreEntorno(entorno: string): string {
    switch ((entorno || '').toLowerCase()) {
      case 'minsait': return 'Minsait';
      case 'preproduccion': return 'Preproducció';
      case 'produccion': return 'Producció';
      default: return entorno;
    }
  }

  getNumeroDepartamento(entorno: string): number {
    switch ((entorno || '').toLowerCase()) {
      case 'minsait': return 1;
      case 'preproduccion': return 2;
      case 'produccion': return 3;
      default: return 0;
    }
  }

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
      return;
    }
    const v = valor.toLowerCase();
    this.procedimientosFiltrados = this.procedures.filter(p =>
      (p.titulo || '').toLowerCase().includes(v) ||
      (p.departamento || '').toLowerCase().includes(v) ||
      (p.steps?.[0]?.responsable || '').toLowerCase().includes(v)
    );
  }

  // ==== CREATE / UPDATE ====

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
    this.saveFormToLocalStorage();
  }

  obrirPopupEditar(proc: Procedure) {
    this.editando = proc;
    this.modoForm = 'editar';
    this.procForm = {
      id: proc.id,
      titulo: proc.titulo ?? '',
      descripcion: proc.descripcion ?? '',
      departamento: proc.departamento ?? '',
      entorno: (proc.entorno as any) ?? 'minsait',
      tags: proc.tags ?? [],
      steps: proc.steps ? proc.steps.map((s: any, idx: number): ProcedureStep => ({
        id: s.id ?? `step-${idx + 1}`,
        titulo: s.titulo ?? '',
        descripcion: s.descripcion ?? '',
        responsable: s.responsable ?? '',
        metodo: s.metodo ?? '',
        orden: s.orden ?? (idx + 1),
        tags: s.tags ?? [],
        entorno: (s.entorno as any) ?? (proc.entorno as any) ?? 'minsait',
        imageUrl: s.imageUrl ?? ''
      })) : [],
      visible: proc.visible ?? true,
      deleted: proc.deleted ?? false,
      createdAt: proc.createdAt,
      updatedAt: proc.updatedAt
    };
    this.primerResponsable = proc.steps?.[0]?.responsable || '';
    this.activeTab = 'crear';
    this.saveFormToLocalStorage();
  }

  tancarPopup() {
    this.editando = null;
    this.modoForm = 'crear';
    this.activeTab = 'listar';
    this.clearFormLocalStorage();
  }

  guardarProcedimiento() {
    if (!this.procForm.titulo || !this.procForm.descripcion) {
      alert('Falta títol o descripció');
      return;
    }

    // primer step amb responsable si cal
    if ((!this.procForm.steps || this.procForm.steps.length === 0) && this.primerResponsable) {
      const step: ProcedureStep = {
        id: 'step-1',
        titulo: 'Pas inicial',
        descripcion: 'Primer pas del procediment',
        responsable: this.primerResponsable,
        metodo: '',
        orden: 1,
        tags: [],
        entorno: (this.procForm.entorno as any) || 'minsait',
        imageUrl: ''
      };
      this.procForm.steps = [step];
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

    console.log('BODY ENVIAT:', body);

    if (this.editando && this.editando.id) {
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

  // ==== DELETE ====

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

  // ==== STEPS (formulari) ====

  afegirStep() {
    const nouIndex = (this.procForm.steps?.length || 0) + 1;
    const nouStep: ProcedureStep = {
      id: `step-${nouIndex}`,
      titulo: this.procForm.titulo || '',
      descripcion: '',
      responsable: this.primerResponsable || '',
      metodo: '',
      orden: nouIndex,
      tags: [],
      entorno: (this.procForm.entorno as any) || 'minsait',
      imageUrl: ''
    };
    console.log('NOU STEP AFEGIT:', nouStep);
    this.procForm.steps = [...(this.procForm.steps || []), nouStep];
    this.saveFormToLocalStorage();
  }

  eliminarStep(idx: number) {
    if (!this.procForm.steps) return;
    this.procForm.steps.splice(idx, 1);
    this.saveFormToLocalStorage();
  }

  obrirImatgeNovaFinestra(url?: string) {
    if (!url) return;
    window.open(url, '_blank');
  }

  // ==== VISTA DE STEPS + CARRUSEL ====

  verSteps(p: Procedure) {
    this.procDetall = p;
    console.log('STEPS DETALL:', this.procDetall.steps);
    this.mostrarDetallSteps = true;
    this.resetCarousel();
  }

  tancarDetallSteps() {
    this.mostrarDetallSteps = false;
    this.procDetall = null;
  }

  nextStep() {
    if (!this.procDetall?.steps) return;
    if (this.currentStepIndex < this.procDetall.steps.length - 1) {
      this.slideDirection = 'right';
      this.currentStepIndex++;
      const s = this.procDetall.steps[this.currentStepIndex];
      console.log('STEP INDEX', this.currentStepIndex, 'ENTORNO=', s.entorno);
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0 && this.procDetall?.steps) {
      this.slideDirection = 'left';
      this.currentStepIndex--;
      const s = this.procDetall.steps[this.currentStepIndex];
      console.log('STEP INDEX', this.currentStepIndex, 'ENTORNO=', s.entorno);
    }
  }

  resetCarousel() {
    this.currentStepIndex = 0;
    this.slideDirection = 'right';
  }

  onProcTagsChange(value: string) {
    this.procForm.tags = value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    this.saveFormToLocalStorage();
  }

  onStepTagsChange(value: string, index: number) {
    if (!this.procForm.steps) return;

    this.procForm.steps[index].tags = value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    this.saveFormToLocalStorage();
  }

  // ==== IMATGE STEP DES D'ARXIU ====

  onStepImageSelected(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // URL temporal del navegador per a previsualitzar
    const objectUrl = URL.createObjectURL(file);

    if (!this.procForm.steps) {
      this.procForm.steps = [];
    }
    this.procForm.steps[index].imageUrl = objectUrl;
    this.saveFormToLocalStorage();
  }

  onClickFileIcon(fileInput: HTMLInputElement): void {
    fileInput.click();
  }
}
