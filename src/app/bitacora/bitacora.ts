import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { BuscadorComponent } from '../buscador/buscador';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../local-storage.service';

interface Solucion {
  numero: number;
  descripcion: string;
  entorno: 'minsait' | 'preproduccion' | 'produccion';
  archivoNombre?: string;
  archivoBase64?: string;
  archivoTipo?: string;
}

interface Bitacora {
  id?: string;
  idProyecto?: string;
  contexto: string;
  error: string;
  soluciones: Solucion[];
  entorno: ('minsait' | 'preproduccion' | 'produccion')[];
  fecha: string;
  tags: string[];
  visible?: boolean;
}

@Component({
  selector: 'app-bitacora',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BuscadorComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TranslateModule
  ],
  templateUrl: './bitacora.html',
  styleUrls: ['./bitacora.css']
})
export class BitacoraComponent implements OnInit {

  title = 'Control de errores';
  private baseUrl = `${environment.baseUrl}bitacora`;

  // claus localStorage
  private readonly STORAGE_KEY_TAB = 'bitacora_active_tab_v1';
  private readonly STORAGE_KEY_FILTER = 'bitacora_filter_v1';
  private readonly STORAGE_KEY_FORM = 'bitacora_form_v1';          // DRAFT

  errores: Bitacora[] = [];
  erroresFiltrados: Bitacora[] = [];

  // Sistema de pestañas
  activeTab: 'crear' | 'listar' | 'solucion' = 'listar';

  // filtre actual
  searchText = '';

  // Crear/editar
  mostrarPopup = false;
  editando = false;
  formBitacora: Bitacora = this.getEmptyBitacora();
  tagsInput = '';

  // Edición inline en lista
  bitacoraEditandoId: string | null = null;
  formBitacoraInline: Bitacora | null = null;
  tagsInputInline = '';

  // Popup eliminar
  mostrarPopupDelete = false;
  bitacoraAEliminar: Bitacora | null = null;

  // Visualització
  mostrarVisualizacion = false;
  bitacoraVisualizacion: Bitacora | null = null;

  // Visualización detalle steps (carrusel)
  bitacoraDetall: Bitacora | null = null;
  mostrarDetallSteps = false;
  currentStepIndex = 0;
  slideDirection: 'left' | 'right' = 'right';

  // Loading de archivos
  loadingFileId: string | null = null; // Ej: "create-0", "inline-1"

  // Image popup (enlarge)
  showImagePopup = false;
  imagePopupUrl = '';

  // Steps expandidos en listado
  expandedSteps: Set<string> = new Set();

  // Feedback de operaciones
  errorMessage = '';
  successMessage = '';

  // Colores por entorno
  coloresEntorno = {
    minsait: '#1E88E5',
    preproduccion: '#FBC02D',
    produccion: '#E53935'
  };

  constructor(
    private http: HttpClient,
    private storage: LocalStorageService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // restaurar pestanya
    const savedTab = this.storage.get(this.STORAGE_KEY_TAB) as string | null;
    if (savedTab === 'crear' || savedTab === 'listar' || savedTab === 'solucion') {
      this.activeTab = savedTab;
    }

    // restaurar filtre
    const savedFilter = (this.storage.get(this.STORAGE_KEY_FILTER) as string) || '';
    this.searchText = savedFilter || '';

    // restaurar esborrany del formulari si estava a "crear"
    if (this.activeTab === 'crear') {
      const draft = this.storage.getObject<Bitacora>(this.STORAGE_KEY_FORM);
      if (draft) {
        this.formBitacora = draft;
        // Asegurarse de que no tenga ID al crear nueva
        delete this.formBitacora.id;
        this.tagsInput = draft.tags ? draft.tags.join(', ') : '';
      }
    }

    this.cargarBitacoras();
  }

  private getEmptyBitacora(): Bitacora {
    return {
      contexto: '',
      error: '',
      soluciones: [],
      entorno: [],
      fecha: '',
      tags: []
    };
  }

  // ===== ENTORNO MULTI-SELECT =====
  toggleBitacoraEntorno(e: string, form: Bitacora | null): void {
    if (!form) return;
    // Normalize to array in case old data has a string
    if (!Array.isArray(form.entorno)) {
      form.entorno = form.entorno ? [form.entorno] : [];
    }
    const idx = form.entorno.indexOf(e as any);
    if (idx >= 0) {
      form.entorno.splice(idx, 1);
    } else {
      (form.entorno as string[]).push(e);
    }
  }

  isBitacoraEntornoSelected(e: string, form: Bitacora | null): boolean {
    if (!form) return false;
    if (!Array.isArray(form.entorno)) return (form.entorno as any) === e;
    return form.entorno.includes(e as any);
  }

  getGradientForEntornos(entornos: string | string[]): string {
    const list: string[] = Array.isArray(entornos) ? entornos : [entornos];
    const colors = list.map(e => this.coloresEntorno[e as keyof typeof this.coloresEntorno] || '#999');
    if (colors.length === 0) return 'linear-gradient(135deg, #888, #555)';
    if (colors.length === 1) return `linear-gradient(135deg, ${colors[0]}, ${colors[0]}cc)`;
    const stops = colors.map((c, i) => `${c} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ');
    return `linear-gradient(135deg, ${stops})`;
  }

  // ===== IMAGE POPUP =====
  openImagePopup(url: string): void {
    this.imagePopupUrl = url;
    this.showImagePopup = true;
  }

  closeImagePopup(): void {
    this.showImagePopup = false;
    this.imagePopupUrl = '';
  }

  // ===== DRAFT: guardar formulari =====
  private saveFormDraft(): void {
    const draft: Bitacora = {
      ...this.formBitacora,
      tags: this.tagsInput
        ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : []
    };
    // NO guardar el ID en el draft para evitar sobrescribir bitácoras existentes
    delete draft.id;
    this.storage.setObject(this.STORAGE_KEY_FORM, draft);
  }

  // cridar des de (ngModelChange)
  onFormChange(): void {
    this.saveFormDraft();
  }

  // ===== CARGAR =====
  cargarBitacoras() {
    this.http.get<any[]>(`${this.baseUrl}/all`).subscribe({
      next: (data) => {
        console.log('✅ Bitácoras cargadas:', data);
        // Normalize entorno: backend stores as comma-string, frontend uses string[]
        this.errores = data.map(e => ({
          ...e,
          entorno: this.normalizeEntorno(e.entorno)
        }));
        this.erroresFiltrados = [...this.errores];

        if (this.searchText && this.searchText.trim()) {
          this.filtrar(this.searchText);
        }
      },
      error: (err) => console.error('❌ Error cargando bitácoras', err)
    });
  }

  /** Convert any entorno representation to string[] */
  private normalizeEntorno(raw: any): ('minsait' | 'preproduccion' | 'produccion')[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return (raw as string).split(',').map(s => s.trim()).filter(s => s) as any;
  }

  /** Convert string[] to comma-separated string for the backend */
  private serializeEntorno(arr: string[]): string {
    return (arr || []).join(',');
  }

  // ===== CANVI DE PESTANYA (amb persistència) =====
  setActiveTab(tab: 'crear' | 'listar' | 'solucion') {
    this.activeTab = tab;
    this.storage.set(this.STORAGE_KEY_TAB, tab);

    if (tab === 'crear') {
      // Si estábamos editando, resetear al modo crear
      if (this.editando) {
        this.editando = false;
        this.formBitacora = this.getEmptyBitacora();
        this.tagsInput = '';
        this.storage.remove(this.STORAGE_KEY_FORM);
      } else {
        const draft = this.storage.getObject<Bitacora>(this.STORAGE_KEY_FORM);
        if (draft) {
          this.formBitacora = draft;
          // Asegurarse de que no tenga ID al crear nueva
          delete this.formBitacora.id;
          this.tagsInput = draft.tags ? draft.tags.join(', ') : '';
        }
      }
    }
  }

  // ===== FILTRAR =====
  filtrar(valor: string): void {
    this.searchText = (valor || '').toLowerCase();
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchText);

    const v = this.searchText;
    if (!v) {
      this.erroresFiltrados = [...this.errores];
      return;
    }

    this.erroresFiltrados = this.errores.filter(e => {
      const contextMatch = e.contexto?.toLowerCase().includes(v);
      const errorMatch = e.error?.toLowerCase().includes(v);
      const tagsMatch = e.tags?.some((tag: string) => tag.toLowerCase().includes(v));

      const solucionesMatch = e.soluciones?.some((sol: any) =>
        sol.descripcion?.toLowerCase().includes(v) ||
        sol.entorno?.toLowerCase().includes(v)
      );

      return contextMatch || errorMatch || tagsMatch || solucionesMatch;
    });
  }

  // ===== POPUP CREAR =====
  abrirPopupCrear() {
    this.editando = false;
    const draft = this.storage.getObject<Bitacora>(this.STORAGE_KEY_FORM);
    if (draft) {
      this.formBitacora = draft;
      // Asegurarse de que no tenga ID al crear nueva
      delete this.formBitacora.id;
      this.tagsInput = draft.tags ? draft.tags.join(', ') : '';
    } else {
      this.formBitacora = this.getEmptyBitacora();
      this.tagsInput = '';
    }
    this.setActiveTab('crear');
  }

  // ===== EDITAR INLINE =====
  abrirPopupEditar(bitacora: Bitacora) {
    // Si ya está editando otra, cancelar primero
    if (this.bitacoraEditandoId && this.bitacoraEditandoId !== bitacora.id) {
      this.cancelarEditarInline();
    }
    
    this.bitacoraEditandoId = bitacora.id || null;
    // Deep copy to avoid mutating the list item
    this.formBitacoraInline = JSON.parse(JSON.stringify(bitacora));
    if (this.formBitacoraInline) {
      if (!this.formBitacoraInline.soluciones) {
        this.formBitacoraInline.soluciones = [];
      }
      this.tagsInputInline = bitacora.tags ? bitacora.tags.join(', ') : '';
    }
  }

  // ===== CANCELAR EDICIÓN INLINE =====
  cancelarEditarInline() {
    this.bitacoraEditandoId = null;
    this.formBitacoraInline = null;
    this.tagsInputInline = '';
    // Resetear editando para evitar problemas al crear nuevas
    this.editando = false;
  }

  // ===== GUARDAR EDICIÓN INLINE =====
  guardarEditarInline() {
    if (!this.formBitacoraInline || !this.formBitacoraInline.id) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.formBitacoraInline.tags = this.tagsInputInline
      ? this.tagsInputInline.split(',').map(t => t.trim()).filter(t => t)
      : [];

    if (!this.formBitacoraInline.contexto || !this.formBitacoraInline.contexto.trim()) {
      this.errorMessage = 'El campo Contexto es obligatorio.';
      return;
    }
    if (!this.formBitacoraInline.error || !this.formBitacoraInline.error.trim()) {
      this.errorMessage = 'El campo Error es obligatorio.';
      return;
    }

    const payload: any = {
      ...this.formBitacoraInline,
      entorno: this.serializeEntorno(this.formBitacoraInline.entorno),
      fecha: this.normalizeFecha(this.formBitacoraInline.fecha),
      soluciones: (this.formBitacoraInline.soluciones || []).map((s: any) => ({
        numero: s.numero,
        descripcion: s.descripcion,
        entorno: s.entorno,
        archivoNombre: s.archivoNombre || null,
        archivoTipo: s.archivoTipo || null,
        archivoBase64: s.archivoBase64 || null
      }))
    };

    this.http.put(`${this.baseUrl}/update/${this.formBitacoraInline.id}`, payload)
      .subscribe({
        next: () => {
          this.successMessage = 'Bitácora actualizada correctamente.';
          this.cargarBitacoras();
          this.cancelarEditarInline();
          setTimeout(() => { this.successMessage = ''; }, 1500);
        },
        error: (err) => {
          console.error('❌ Error actualizando bitácora', err);
          this.errorMessage = 'Error al actualizar: ' + (err?.error?.message || err?.message || 'Error del servidor');
        }
      });
  }

  // ===== AGREGAR SOLUCIÓN INLINE =====
  agregarSolucionInline() {
    if (!this.formBitacoraInline) {
      this.formBitacoraInline = this.getEmptyBitacora();
    }
    const form = this.formBitacoraInline;
    if (!form.soluciones) {
      form.soluciones = [];
    }
    const numero = form.soluciones.length + 1;
    form.soluciones.push({
      numero,
      descripcion: '',
      entorno: 'minsait'
    });
  }

  // ===== ELIMINAR SOLUCIÓN INLINE =====
  eliminarSolucionInline(index: number) {
    if (this.formBitacoraInline && this.formBitacoraInline.soluciones) {
      this.formBitacoraInline.soluciones.splice(index, 1);
      // Renumerar
      this.formBitacoraInline.soluciones.forEach((s, i) => {
        s.numero = i + 1;
      });
    }
  }

  // ===== SELECCIONAR ARCHIVO INLINE =====
  onFileSelectedInline(event: Event, solucion: any) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      solucion.archivoNombre = file.name;
      solucion.archivoTipo = file.type;

      // Mostrar spinner mientras se carga
      const fileId = `inline-${solucion.numero}`;
      this.loadingFileId = fileId;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        solucion.archivoBase64 = e.target.result;
        this.loadingFileId = null; // Ocultar spinner
        this.saveFormDraft();
      };
      reader.readAsDataURL(file);
    }
  }

  // ===== CERRAR =====
  cerrarPopup() {
    this.mostrarPopup = false;
    this.formBitacora = this.getEmptyBitacora();
    this.tagsInput = '';
    this.editando = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.storage.remove(this.STORAGE_KEY_FORM);
    this.setActiveTab('listar');
  }

  // ===== GUARDAR (CREAR O ACTUALIZAR) =====
  guardarBitacora() {
    this.errorMessage = '';
    this.successMessage = '';

    this.formBitacora.tags = this.tagsInput
      ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : [];

    if (!this.formBitacora.contexto || !this.formBitacora.contexto.trim()) {
      this.errorMessage = 'El campo Contexto es obligatorio.';
      return;
    }
    if (!this.formBitacora.error || !this.formBitacora.error.trim()) {
      this.errorMessage = 'El campo Error es obligatorio.';
      return;
    }

    // Build payload: normalize fecha to ISO datetime and strip archivoBase64
    let payload: any;

    if (this.editando && this.formBitacora.id) {
      // EDITAR: Incluir el ID para actualizar
      payload = {
        ...this.formBitacora,
        entorno: this.serializeEntorno(this.formBitacora.entorno),
        fecha: this.normalizeFecha(this.formBitacora.fecha),
        soluciones: (this.formBitacora.soluciones || []).map((s: any) => ({
          numero: s.numero,
          descripcion: s.descripcion,
          entorno: s.entorno,
          archivoNombre: s.archivoNombre || null,
          archivoTipo: s.archivoTipo || null,
          archivoBase64: s.archivoBase64 || null
        }))
      };
    } else {
      // CREAR: Nunca incluir ID - construir payload SIN ID
      payload = {
        contexto: this.formBitacora.contexto,
        error: this.formBitacora.error,
        entorno: this.serializeEntorno(this.formBitacora.entorno),
        fecha: this.normalizeFecha(this.formBitacora.fecha),
        tags: this.formBitacora.tags,
        soluciones: (this.formBitacora.soluciones || []).map((s: any) => ({
          numero: s.numero,
          descripcion: s.descripcion,
          entorno: s.entorno,
          archivoNombre: s.archivoNombre || null,
          archivoTipo: s.archivoTipo || null,
          archivoBase64: s.archivoBase64 || null
        }))
      };
      // Asegurarse 100% de que NO hay ID
      delete payload.id;
    }

    if (this.editando && this.formBitacora.id) {
      this.http.put(`${this.baseUrl}/update/${this.formBitacora.id}`, payload)
        .subscribe({
          next: () => {
            this.successMessage = 'Bitácora actualizada correctamente.';
            this.cargarBitacoras();
            this.formBitacora = this.getEmptyBitacora();
            this.tagsInput = '';
            this.editando = false;
            this.storage.remove(this.STORAGE_KEY_FORM);
            setTimeout(() => { this.successMessage = ''; this.setActiveTab('listar'); }, 800);
          },
          error: (err) => {
            console.error('❌ Error actualizando bitácora', err);
            this.errorMessage = 'Error al actualizar: ' + (err?.error?.message || err?.message || 'Error del servidor');
          }
        });
    } else {
      this.http.post(`${this.baseUrl}/create`, payload)
        .subscribe({
          next: () => {
            this.successMessage = 'Bitácora creada correctamente.';
            this.cargarBitacoras();
            this.formBitacora = this.getEmptyBitacora();
            this.tagsInput = '';
            this.storage.remove(this.STORAGE_KEY_FORM);
            setTimeout(() => { this.successMessage = ''; this.setActiveTab('listar'); }, 800);
          },
          error: (err) => {
            console.error('❌ Error creando bitácora', err);
            this.errorMessage = 'Error al guardar: ' + (err?.error?.message || err?.message || 'Error del servidor');
          }
        });
    }
  }

  // Normalize fecha: input[type=date] returns 'YYYY-MM-DD', backend needs 'YYYY-MM-DDTHH:mm:ss'
  private normalizeFecha(fecha: string): string {
    if (!fecha) return new Date().toISOString().split('.')[0];
    // Already has time component
    if (fecha.includes('T')) return fecha;
    // Just a date string - append midnight time
    return fecha + 'T00:00:00';
  }

  // ===== CONFIRMAR ELIMINAR =====
  confirmarEliminar(bitacora: Bitacora) {
    console.log('🔵 confirmarEliminar() called with:', bitacora);
    this.bitacoraAEliminar = bitacora;
    this.mostrarPopupDelete = true;
    console.log('🔵 mostrarPopupDelete:', this.mostrarPopupDelete);
  }

  cancelarEliminar() {
    console.log('🔵 cancelarEliminar() called');
    this.mostrarPopupDelete = false;
    this.bitacoraAEliminar = null;
  }

  // ===== ELIMINAR =====
  eliminarBitacora() {
    console.log('🔵 eliminarBitacora() called');
    console.log('🔵 bitacoraAEliminar:', this.bitacoraAEliminar);
    
    if (!this.bitacoraAEliminar || !this.bitacoraAEliminar.id) {
      console.error('❌ bitacoraAEliminar no tiene ID:', this.bitacoraAEliminar);
      return;
    }

    const deleteUrl = `${this.baseUrl}/delete/${this.bitacoraAEliminar.id}`;
    console.log('🔵 Enviando DELETE a:', deleteUrl);
    
    this.http.delete(deleteUrl)
      .subscribe({
        next: (response) => {
          console.log('✅ Bitácora eliminada, respuesta:', response);
          this.cancelarEliminar();
          this.cargarBitacoras();
        },
        error: (err) => {
          console.error('❌ Error eliminando bitácora:', err);
          if (err.error && err.error.message) {
            this.errorMessage = 'Error al eliminar: ' + err.error.message;
          } else {
            this.errorMessage = 'Error al eliminar la bitácora';
          }
        }
      });
  }

  // ===== MÉTODOS DE SOLUCIONES =====
  agregarSolucion() {
    if (!this.formBitacora.soluciones) {
      this.formBitacora.soluciones = [];
    }
    const numero = this.formBitacora.soluciones.length + 1;
    this.formBitacora.soluciones.push({
      numero,
      descripcion: '',
      entorno: 'minsait'
    });
    this.saveFormDraft(); // si afegeixes solució, també guardem
  }

  eliminarSolucion(index: number) {
    if (this.formBitacora.soluciones) {
      this.formBitacora.soluciones.splice(index, 1);
      this.formBitacora.soluciones.forEach((sol, i) => {
        sol.numero = i + 1;
      });
      this.saveFormDraft();
    }
  }

  getColorEntorno(entorno: string): string {
    return this.coloresEntorno[entorno as keyof typeof this.coloresEntorno] || '#2196F3';
  }

  getNombreEntorno(entorno: string): string {
    switch (entorno) {
      case 'minsait':
        return 'Minsait';
      case 'preproduccion':
        return 'Preproducción';
      case 'produccion':
        return 'Producción';
      default:
        return entorno;
    }
  }

  // ===== VISUALIZAR SOLUCIONES =====
  abrirVisualizacion(bitacora: Bitacora) {
    this.bitacoraVisualizacion = { ...bitacora };
    this.mostrarVisualizacion = true;
    this.setActiveTab('solucion');
  }

  toggleVisualizacion(bitacora: Bitacora) {
    if (this.mostrarVisualizacion && this.bitacoraVisualizacion?.id === bitacora.id) {
      this.cerrarVisualizacion();
    } else {
      this.bitacoraVisualizacion = { ...bitacora };
      this.mostrarVisualizacion = true;
      this.setActiveTab('solucion');
    }
  }

  cerrarVisualizacion() {
    this.mostrarVisualizacion = false;
    this.bitacoraVisualizacion = null;
    this.setActiveTab('listar');
  }

  // ===== TOGGLE STEPS EN LISTADO =====
  openDetallSteps(bitacora: Bitacora) {
    this.bitacoraDetall = { ...bitacora };
    this.mostrarDetallSteps = true;
    this.currentStepIndex = 0;
    this.slideDirection = 'right';
  }

  closeDetallSteps() {
    this.mostrarDetallSteps = false;
    this.bitacoraDetall = null;
    this.currentStepIndex = 0;
  }

  nextStep() {
    if (this.bitacoraDetall && this.bitacoraDetall.soluciones && this.currentStepIndex < this.bitacoraDetall.soluciones.length - 1) {
      this.slideDirection = 'right';
      this.currentStepIndex++;
    }
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.slideDirection = 'left';
      this.currentStepIndex--;
    }
  }

  goToStep(index: number) {
    if (index > this.currentStepIndex) {
      this.slideDirection = 'right';
    } else if (index < this.currentStepIndex) {
      this.slideDirection = 'left';
    }
    this.currentStepIndex = index;
  }

  onFileSelected(event: Event, solucion: Solucion) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      solucion.archivoNombre = file.name;
      solucion.archivoTipo = file.type;

      // Mostrar spinner mientras se carga
      const fileId = `create-${solucion.numero}`;
      this.loadingFileId = fileId;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        solucion.archivoBase64 = e.target.result;
        this.loadingFileId = null; // Ocultar spinner
        this.onFormChange();
      };
      reader.readAsDataURL(file);
    }
  }

  esImagen(s: Solucion): boolean {
    return !!s.archivoTipo && s.archivoTipo.startsWith('image/');
  }

  esPdf(s: Solucion): boolean {
    return s.archivoTipo === 'application/pdf';
  }

  getSafeUrl(base64: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(base64);
  }

  esCsv(s: Solucion): boolean {
    return s.archivoTipo === 'text/csv' || 
           s.archivoTipo === 'application/vnd.ms-excel' ||
           (s.archivoNombre?.toLowerCase().endsWith('.csv') || false);
  }

  parseCsvData(s: Solucion): any[][] {
    if (!s.archivoBase64) return [];
    
    try {
      // Decode base64 to text
      const base64Data = s.archivoBase64.split(',')[1] || s.archivoBase64;
      const csvText = atob(base64Data);
      
      // Simple CSV parser
      const lines = csvText.split('\n').filter(line => line.trim());
      return lines.map(line => {
        // Handle quoted values and commas
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });
    } catch (e) {
      console.error('Error parsing CSV:', e);
      return [];
    }
  }

  getExtension(nombre?: string): string {
    if (!nombre) return '';
    return nombre.split('.').pop()?.toUpperCase() || '';
  }

  getFileType(s: Solucion): string {
    if (!s.archivoTipo && !s.archivoNombre) return '';
    
    if (this.esImagen(s)) return 'Imagen';
    if (this.esPdf(s)) return 'PDF';
    if (this.esCsv(s)) return 'CSV';
    
    // Por archivo nombre si tipo MIME no es claro
    if (s.archivoNombre) {
      const ext = this.getExtension(s.archivoNombre);
      if (ext === 'XLSX' || ext === 'XLS') return 'Excel';
      if (ext === 'DOCX' || ext === 'DOC') return 'Word';
      if (ext === 'PPTX' || ext === 'PPT') return 'PowerPoint';
      if (ext === 'ZIP' || ext === 'RAR' || ext === 'TAR' || ext === 'GZ') return 'Comprimido';
      if (ext === 'TXT') return 'Texto';
      if (ext === 'JSON') return 'JSON';
      if (ext === 'XML') return 'XML';
    }
    
    // Genérico
    return s.archivoTipo?.split('/')[1]?.toUpperCase() || 'Archivo';
  }

  // ===== DOCUMENTACIÓN: Métodos auxiliares =====


}