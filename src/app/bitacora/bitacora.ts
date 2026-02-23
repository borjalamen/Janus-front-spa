import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BuscadorComponent } from '../buscador/buscador';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../local-storage.service';

interface Solucion {
  numero: number;
  descripcion: string;
  entorno: 'minsait' | 'preproduccion' | 'produccion';
}

interface Bitacora {
  id?: string;
  idProyecto?: string;
  contexto: string;
  error: string;
  soluciones: Solucion[];
  entorno: 'minsait' | 'preproduccion' | 'produccion';
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

  // Popup eliminar
  mostrarPopupDelete = false;
  bitacoraAEliminar: Bitacora | null = null;

  // Visualització
  mostrarVisualizacion = false;
  bitacoraVisualizacion: Bitacora | null = null;

  // Colores por entorno
  coloresEntorno = {
    minsait: '#1E88E5',
    preproduccion: '#FBC02D',
    produccion: '#E53935'
  };

  constructor(
    private http: HttpClient,
    private storage: LocalStorageService
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
      entorno: 'minsait',
      fecha: '',
      tags: []
    };
  }

  // ===== DRAFT: guardar formulari =====
  private saveFormDraft(): void {
    const draft: Bitacora = {
      ...this.formBitacora,
      tags: this.tagsInput
        ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : []
    };
    this.storage.setObject(this.STORAGE_KEY_FORM, draft);
  }

  // cridar des de (ngModelChange)
  onFormChange(): void {
    this.saveFormDraft();
  }

  // ===== CARGAR =====
  cargarBitacoras() {
    this.http.get<Bitacora[]>(`${this.baseUrl}/all`).subscribe({
      next: (data) => {
        console.log('✅ Bitácoras cargadas:', data);
        this.errores = data;
        this.erroresFiltrados = [...data];

        if (this.searchText && this.searchText.trim()) {
          this.filtrar(this.searchText);
        }
      },
      error: (err) => console.error('❌ Error cargando bitácoras', err)
    });
  }

  // ===== CANVI DE PESTANYA (amb persistència) =====
  setActiveTab(tab: 'crear' | 'listar' | 'solucion') {
    this.activeTab = tab;
    this.storage.set(this.STORAGE_KEY_TAB, tab);

    if (tab === 'crear') {
      const draft = this.storage.getObject<Bitacora>(this.STORAGE_KEY_FORM);
      if (draft) {
        this.formBitacora = draft;
        this.tagsInput = draft.tags ? draft.tags.join(', ') : '';
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
      this.tagsInput = draft.tags ? draft.tags.join(', ') : '';
    } else {
      this.formBitacora = this.getEmptyBitacora();
      this.tagsInput = '';
    }
    this.setActiveTab('crear');
  }

  // ===== POPUP EDITAR =====
  abrirPopupEditar(bitacora: Bitacora) {
    this.editando = true;
    this.formBitacora = { ...bitacora };
    if (!this.formBitacora.soluciones) {
      this.formBitacora.soluciones = [];
    }
    this.tagsInput = bitacora.tags ? bitacora.tags.join(', ') : '';
    this.setActiveTab('crear');
  }

  // ===== CERRAR =====
  cerrarPopup() {
    this.mostrarPopup = false;
    this.formBitacora = this.getEmptyBitacora();
    this.tagsInput = '';
    this.editando = false;
    this.setActiveTab('listar');
  }

  // ===== GUARDAR (CREAR O ACTUALIZAR) =====
  guardarBitacora() {
    this.formBitacora.tags = this.tagsInput
      ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : [];

    if (!this.formBitacora.soluciones || this.formBitacora.soluciones.length === 0) {
      alert('Debe agregar al menos una solución');
      return;
    }

    if (this.editando && this.formBitacora.id) {
      this.http.put(`${this.baseUrl}/update/${this.formBitacora.id}`, this.formBitacora)
        .subscribe({
          next: () => {
            console.log('✅ Bitácora actualizada');
            this.cargarBitacoras();
            this.formBitacora = this.getEmptyBitacora();
            this.tagsInput = '';
            this.editando = false;

            // esborrem draft quan guardem
            this.storage.remove(this.STORAGE_KEY_FORM);

            this.setActiveTab('listar');
          },
          error: (err) => console.error('❌ Error actualizando bitácora', err)
        });
    } else {
      this.http.post(`${this.baseUrl}/create`, this.formBitacora)
        .subscribe({
          next: () => {
            console.log('✅ Bitácora creada');
            this.cargarBitacoras();
            this.formBitacora = this.getEmptyBitacora();
            this.tagsInput = '';

            // esborrem draft quan guardem
            this.storage.remove(this.STORAGE_KEY_FORM);

            this.setActiveTab('listar');
          },
          error: (err) => console.error('❌ Error creando bitácora', err)
        });
    }
  }

  // ===== CONFIRMAR ELIMINAR =====
  confirmarEliminar(bitacora: Bitacora) {
    this.bitacoraAEliminar = bitacora;
    this.mostrarPopupDelete = true;
  }

  cancelarEliminar() {
    this.mostrarPopupDelete = false;
    this.bitacoraAEliminar = null;
  }

  // ===== ELIMINAR =====
  eliminarBitacora() {
    if (!this.bitacoraAEliminar || !this.bitacoraAEliminar.id) return;

    this.http.delete(`${this.baseUrl}/delete/${this.bitacoraAEliminar.id}`)
      .subscribe({
        next: () => {
          console.log('✅ Bitácora eliminada');
          this.cargarBitacoras();
          this.cancelarEliminar();
        },
        error: (err) => console.error('❌ Error eliminando bitácora', err)
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
        return 'Minsait (Azul)';
      case 'preproduccion':
        return 'Preproducción (Amarillo)';
      case 'produccion':
        return 'Producción (Rojo)';
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
}
