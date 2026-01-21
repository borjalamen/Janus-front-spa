import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BuscadorComponent } from '../buscador/buscador';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

interface Bitacora {
  id?: string;
  idProyecto?: string;
  contexto: string;
  error: string;
  solucion: string;
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

  errores: Bitacora[] = [];
  erroresFiltrados: Bitacora[] = [];

  // Popup crear/editar
  mostrarPopup = false;
  editando = false;
  formBitacora: Bitacora = this.getEmptyBitacora();
  tagsInput = '';

  // Popup eliminar
  mostrarPopupDelete = false;
  bitacoraAEliminar: Bitacora | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarBitacoras();
  }

  private getEmptyBitacora(): Bitacora {
    return {
      contexto: '',
      error: '',
      solucion: '',
      fecha: '',
      tags: []
    };
  }

  // ===== CARGAR =====
  cargarBitacoras() {
    this.http.get<Bitacora[]>(`${this.baseUrl}/all`).subscribe({
      next: (data) => {
        console.log('✅ Bitácoras cargadas:', data);
        this.errores = data;
        this.erroresFiltrados = [...data];
      },
      error: (err) => console.error('❌ Error cargando bitácoras', err)
    });
  }

  // ===== FILTRAR =====
  filtrar(valor: string): void {
    const v = valor.toLowerCase();
    if (!v) {
      this.erroresFiltrados = [...this.errores];
      return;
    }

    this.erroresFiltrados = this.errores.filter(e =>
      (e.contexto?.toLowerCase().includes(v)) ||
      (e.error?.toLowerCase().includes(v)) ||
      (e.solucion?.toLowerCase().includes(v)) ||
      (e.tags?.some((tag: string) => tag.toLowerCase().includes(v)))
    );
  }

  // ===== POPUP CREAR =====
  abrirPopupCrear() {
    this.editando = false;
    this.formBitacora = this.getEmptyBitacora();
    this.tagsInput = '';
    this.mostrarPopup = true;
  }

  // ===== POPUP EDITAR =====
  abrirPopupEditar(bitacora: Bitacora) {
    this.editando = true;
    this.formBitacora = { ...bitacora };
    this.tagsInput = bitacora.tags ? bitacora.tags.join(', ') : '';
    this.mostrarPopup = true;
  }

  // ===== CERRAR POPUP =====
  cerrarPopup() {
    this.mostrarPopup = false;
    this.formBitacora = this.getEmptyBitacora();
    this.tagsInput = '';
  }

  // ===== GUARDAR (CREAR O ACTUALIZAR) =====
  guardarBitacora() {
    // Parsear tags
    this.formBitacora.tags = this.tagsInput
      ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
      : [];

    if (this.editando && this.formBitacora.id) {
      // ACTUALIZAR
      this.http.put(`${this.baseUrl}/update/${this.formBitacora.id}`, this.formBitacora)
        .subscribe({
          next: () => {
            console.log('✅ Bitácora actualizada');
            this.cargarBitacoras();
            this.cerrarPopup();
          },
          error: (err) => console.error('❌ Error actualizando bitácora', err)
        });
    } else {
      // CREAR
      this.http.post(`${this.baseUrl}/create`, this.formBitacora)
        .subscribe({
          next: () => {
            console.log('✅ Bitácora creada');
            this.cargarBitacoras();
            this.cerrarPopup();
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
}
