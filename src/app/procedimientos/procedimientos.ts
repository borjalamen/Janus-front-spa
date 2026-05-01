import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BuscadorComponent } from '../buscador/buscador';
import { ProceduresService, Procedure, ProcedureStep } from '../procedure.service';
import { AuthService } from '../auth.service';
import { LocalStorageService } from '../local-storage.service';
import { AgentRefreshService } from '../agent-refresh.service';

@Component({
  selector: 'app-procedimientos',
  templateUrl: './procedimientos.html',
  styleUrls: ['./procedimientos.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule, BuscadorComponent]
})
export class ProcedimientosComponent implements OnInit, OnDestroy {
  title = 'Procedimientos';
  activeTab: string = 'listar'; // Control de pestanyes

  // Dades i filtrat
  procedures: Procedure[] = [];
  procedimientosFiltrados: Procedure[] = [];
  paginaActualProcedimientos = 1;
  readonly procedimientosPorPagina = 10;

  // Formulari Crear/Editar
  modoForm: 'crear' | 'editar' = 'crear';
  procForm: Procedure = this.initEmptyProcedure();
  primerResponsable = '';

  // Modals i Estats de Vista
  mostrarPopupDelete = false;
  procAEliminar: Procedure | null = null;
  showImagePopup = false;
  imagePopupUrl: string | null = null;
  
  // Detall i Carrusel
  procDetall: Procedure | null = null;
  mostrarDetallSteps = false;
  currentStepIndex = 0;
  slideDirection: 'left' | 'right' = 'right';

  // Feedback (Toast)
  toastMsg = '';
  toastOk = true;
  private _toastTimer: any = null;

  // Keys per LocalStorage
  private readonly STORAGE_KEY_FORM = 'procedimientos_form_state';
  private agentRefreshSub!: Subscription;

  constructor(
    private proceduresService: ProceduresService,
    private authService: AuthService,
    private storage: LocalStorageService,
    private agentRefresh: AgentRefreshService
  ) {}

  ngOnInit(): void {
    this.cargarProcedimientos();
    this.restoreFromLocalStorage();
    this.agentRefreshSub = this.agentRefresh.refresh$.subscribe(entity => {
      if (entity === 'procedimiento' || entity === 'all') this.cargarProcedimientos();
    });
  }

  ngOnDestroy(): void {
    this.agentRefreshSub?.unsubscribe();
  }

  // ===== CARREGA I DADES =====

  cargarProcedimientos(): void {
    this.proceduresService.getAll().subscribe({
      next: (data) => {
        this.procedures = this.sortByDate(data);
        this.procedimientosFiltrados = [...this.procedures];
      },
      error: (err) => console.error('Error carregant procediments', err)
    });
  }

  private sortByDate(data: Procedure[]): Procedure[] {
    return data.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  initEmptyProcedure(): Procedure {
    return {
      titulo: '',
      descripcion: '',
      departamento: '',
      entorno: 'minsait',
      tags: [],
      steps: [],
      visible: true,
      deleted: false
    };
  }

  // ===== GESTIÓ FORMULARI (AUTOSAVE) =====

  private restoreFromLocalStorage(): void {
    const saved = this.storage.getObject<any>(this.STORAGE_KEY_FORM);
    if (saved) {
      this.procForm = saved.procForm;
      this.primerResponsable = saved.primerResponsable;
      this.modoForm = saved.modoForm;
      this.activeTab = 'crear';
    }
  }

  saveFormToLocalStorage(): void {
    this.storage.setObject(this.STORAGE_KEY_FORM, {
      procForm: this.procForm,
      primerResponsable: this.primerResponsable,
      modoForm: this.modoForm
    });
  }

  private clearFormLocalStorage(): void {
    this.storage.remove(this.STORAGE_KEY_FORM);
  }

  // ===== ACCIONS PRINCIPALS =====

  obrirPopupCrear(): void {
    this.modoForm = 'crear';
    this.procForm = this.initEmptyProcedure();
    this.primerResponsable = '';
    this.activeTab = 'crear';
    this.saveFormToLocalStorage();
  }

  obrirPopupEditar(proc: Procedure): void {
    this.modoForm = 'editar';
    this.procForm = JSON.parse(JSON.stringify(proc)); // Deep copy
    this.primerResponsable = this.procForm.steps?.[0]?.responsable || '';
    this.activeTab = 'crear';
    this.saveFormToLocalStorage();
  }

  tancarPopup(): void {
    this.activeTab = 'listar';
    this.clearFormLocalStorage();
  }

  guardarProcedimiento(): void {
    if (!this.procForm.titulo) {
      this.showToast('⚠️ El títol és obligatori', false);
      return;
    }

    const obs = this.modoForm === 'editar' && this.procForm.id
      ? this.proceduresService.update(this.procForm.id, this.procForm)
      : this.proceduresService.create(this.procForm);

    obs.subscribe({
      next: (saved) => {
        this.showToast(this.modoForm === 'editar' ? '✅ Actualitzat' : '✅ Creat');

        this.proceduresService.getAll().subscribe({
          next: (data) => {
            this.procedures = data;

            if (this.modoForm === 'crear') {
              // Ordenar per data de creació descendent i posar el nou al principi
              this.procedures.sort((a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateB - dateA;
              });
            }

            this.procedimientosFiltrados = [...this.procedures];
            this.paginaActualProcedimientos = 1; // ← torna a la 1a pàgina
            this.tancarPopup();
          },
          error: () => {
            this.procedimientosFiltrados = [...this.procedures];
            this.tancarPopup();
          }
        });
      },
      error: () => this.showToast('❌ Error al guardar', false)
    });
  }

  // ===== GESTIÓ DE STEPS =====

  afegirStep(): void {
    const nouStep: ProcedureStep = {
      id: `step-${Date.now()}`,
      titulo: '',
      descripcion: '',
      responsable: this.primerResponsable || '',
      metodo: '',
      orden: (this.procForm.steps?.length || 0) + 1,
      tags: [],
      entorno: (this.procForm.entorno as any) || 'minsait',
      imageUrl: ''
    };
    this.procForm.steps = [...(this.procForm.steps || []), nouStep];
    this.saveFormToLocalStorage();
  }

  eliminarStep(idx: number): void {
    this.procForm.steps?.splice(idx, 1);
    this.saveFormToLocalStorage();
  }

  // ===== GESTIÓ DE TAGS (CORRECCIÓ) =====

  onProcTagsChange(value: string): void {
    this.procForm.tags = value.split(',').map(t => t.trim()).filter(t => t !== '');
    this.saveFormToLocalStorage();
  }

  onStepTagsChange(value: string, index: number): void {
    if (this.procForm.steps) {
      this.procForm.steps[index].tags = value.split(',').map(t => t.trim()).filter(t => t !== '');
      this.saveFormToLocalStorage();
    }
  }

  // ===== IMATGES =====

  onStepImageSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        if (this.procForm.steps) {
          this.procForm.steps[index].imageUrl = reader.result as string;
          this.saveFormToLocalStorage();
        }
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  onClickFileIcon(fileInput: HTMLInputElement): void { fileInput.click(); }

  openImagePopup(url: string): void {
    this.imagePopupUrl = url;
    this.showImagePopup = true;
  }

  closeImagePopup(): void { this.showImagePopup = false; }

  // ===== CARRUSEL / VISTA DETALL =====

  verSteps(p: Procedure): void {
    this.procDetall = p;
    this.mostrarDetallSteps = true;
    this.currentStepIndex = 0;
  }

  tancarDetallSteps(): void {
    this.mostrarDetallSteps = false;
    this.procDetall = null;
  }

  nextStep(): void {
    if (this.procDetall?.steps && this.currentStepIndex < this.procDetall.steps.length - 1) {
      this.slideDirection = 'right';
      this.currentStepIndex++;
    }
  }

  prevStep(): void {
    if (this.currentStepIndex > 0) {
      this.slideDirection = 'left';
      this.currentStepIndex--;
    }
  }

  // ===== FILTRAT I PAGINACIÓ =====

  filtrar(valor: string): void {
    const v = valor.toLowerCase();
    this.procedimientosFiltrados = this.procedures.filter(p =>
      (p.titulo?.toLowerCase() || '').includes(v) ||
      (p.descripcion?.toLowerCase() || '').includes(v)
    );
    this.paginaActualProcedimientos = 1;
  }
  get procedimientosPaginados(): Procedure[] {
    const inicio = (this.paginaActualProcedimientos - 1) * this.procedimientosPorPagina;
    return this.procedimientosFiltrados.slice(inicio, inicio + this.procedimientosPorPagina);
  }

  get totalPaginasProcedimientos(): number {
    return Math.ceil(this.procedimientosFiltrados.length / this.procedimientosPorPagina);
  }

  get paginasArrayProcedimientos(): number[] {
    return Array.from({ length: this.totalPaginasProcedimientos }, (_, i) => i + 1);
  }

  cambiarPaginaProcedimientos(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalPaginasProcedimientos) {
      this.paginaActualProcedimientos = pagina;
    }
  }

  // ===== HELPERS VISTA =====

  getColorEntorno(entorno: string): string {
    const key = (entorno || '').toLowerCase();
    if (key.includes('minsait')) return '#1E88E5';
    if (key.includes('preprod')) return '#FBC02D';
    if (key.includes('produc')) return '#E53935';
    return '#757575';
  }

  getNombreEntorno(entorno: string): string {
    if (entorno === 'minsait') return 'Minsait';
    if (entorno === 'preproduccion') return 'Preproducció';
    if (entorno === 'produccion') return 'Producció';
    return entorno;
  }

  getNumeroDepartamento(entorno: string): number {
    if (entorno === 'minsait') return 1;
    if (entorno === 'preproduccion') return 2;
    if (entorno === 'produccion') return 3;
    return 0;
  }

  showToast(msg: string, ok = true): void {
    this.toastMsg = msg;
    this.toastOk = ok;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toastMsg = ''), 3000);
  }

  // Handlers canvi inputs simples per autosave
  onTituloChange(v: string) { this.procForm.titulo = v; this.saveFormToLocalStorage(); }
  onDescripcionChange(v: string) { this.procForm.descripcion = v; this.saveFormToLocalStorage(); }
  onPrimerResponsableChange(v: string) { this.primerResponsable = v; this.saveFormToLocalStorage(); }
  onStepTituloChange(v: string, i: number) { if(this.procForm.steps) this.procForm.steps[i].titulo = v; this.saveFormToLocalStorage(); }
  onStepResponsableChange(v: string, i: number) { if(this.procForm.steps) this.procForm.steps[i].responsable = v; this.saveFormToLocalStorage(); }
  onStepDescripcionChange(v: string, i: number) { if(this.procForm.steps) this.procForm.steps[i].descripcion = v; this.saveFormToLocalStorage(); }

  confirmarEliminar(proc: Procedure): void {
    this.procAEliminar = proc;
    this.mostrarPopupDelete = true;
  }

  cancelarEliminar(): void {
    this.mostrarPopupDelete = false;
    this.procAEliminar = null;
  }

  eliminarProcedimiento(): void {
    if (this.procAEliminar?.id) {
      this.proceduresService.delete(this.procAEliminar.id).subscribe(() => {
        this.cargarProcedimientos();
        this.cancelarEliminar();
        this.showToast('Eliminat correctament');
      });
    }
  }
}