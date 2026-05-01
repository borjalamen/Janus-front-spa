import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';
import { AuthService } from '../auth.service';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { AgentRefreshService } from '../agent-refresh.service';

type TrainingItem = {
  id: string;
  name: string;
  link?: string;
  description?: string;
  tags?: string[];
  location?: string;
  visible?: boolean;
  deleted?: boolean;
};

type TrainingPath = {
  id: string;
  name: string;
  audience?: string;
  objectives?: string;
  prerequisites?: string;
  items: TrainingItem[];
  visible?: boolean;
};

const STORAGE_KEY = 'training_paths_v1';
const DRAFT_PATH_KEY = 'training_path_draft_v1';
const DRAFT_ITEM_KEY = 'training_item_draft_v1';

@Component({
  selector: 'app-formacion',
  templateUrl: './formacion.html',
  styleUrls: ['./formacion.css'],
  standalone: true,
  imports: [
    CommonModule,
    NgIf,
    NgForOf,
    FormsModule,
    BuscadorComponent,
    TranslateModule,
    DragDropModule,
    MatIconModule,
    HttpClientModule
  ],
})
export class FormacionComponent implements OnInit, OnDestroy {
  title = '';

  paths: TrainingPath[] = [];
  filteredPaths: TrainingPath[] = [];
  filteredAllCourses: TrainingItem[] = [];
  lastSearch: string = '';

  /** Cursos cargados desde la BD vía API (creados por el agente IA u otros) */
  apiCourses: TrainingItem[] = [];
  private agentRefreshSub!: Subscription;

  // UI state
  selectedPath?: TrainingPath;
  showPathModal = false;
  editingPath: Partial<TrainingPath> & { readonly?: boolean } = {};

  showItemModal = false;
  editingItem: Partial<TrainingItem> & { tagsString?: string; readonly?: boolean } = {};

  // tabs: 'all' = all courses search, 'paths' = training paths UI
  activeTab: 'all' | 'paths' = 'all';

  // cached search list for all courses (local paths + backend API courses)
  get allCourses(): TrainingItem[] {
    const map = new Map<string, TrainingItem>();
    // Primero los cursos de la API (base de datos)
    for (const it of this.apiCourses) {
      const key = (it.name || '').trim().toLowerCase();
      if (!key) continue;
      map.set(key, { ...it });
    }
    // Luego los cursos de rutas locales (pueden sobreescribir si tienen el mismo nombre)
    for (const p of this.paths) {
      if (!p.items) continue;
      for (const it of p.items) {
        const key = (it.name || '').trim().toLowerCase();
        if (!key) continue;
        if (!map.has(key)) map.set(key, { ...it });
      }
    }
    return Array.from(map.values());
  }

  isTab(tab: 'all' | 'paths') {
    return this.activeTab === tab;
  }

  setTab(tab: 'all' | 'paths') {
    this.activeTab = tab;
    this.filtrar(this.lastSearch || '');
  }

  get isConsultor(): boolean {
    const rol = this.auth.currentUserValue?.rol;
    return !rol || rol === 'consultor';
  }

  constructor(
    private translate: TranslateService,
    private storage: LocalStorageService,
    private auth: AuthService,
    private http: HttpClient,
    private agentRefresh: AgentRefreshService
  ) {
    this.load();
    this.loadApiCourses();
    this.translate.get('TRAINING.TITLE').subscribe(t => (this.title = t));
  }

  ngOnInit(): void {
    this.agentRefreshSub = this.agentRefresh.refresh$.subscribe(entity => {
      if (entity === 'formacion' || entity === 'all') {
        this.loadApiCourses();
      }
    });
  }

  ngOnDestroy(): void {
    this.agentRefreshSub?.unsubscribe();
  }

  /** Carga cursos desde el backend (MongoDB). Los crea el agente IA u otros procesos. */
  private loadApiCourses(): void {
    this.http.get<TrainingItem[]>(`${environment.baseUrl}formacion/all`).subscribe({
      next: (data) => {
        this.apiCourses = data || [];
        this.refreshAllCourses();
      },
      error: () => { /* silencioso: si el backend no responde, se usan solo los locales */ }
    });
  }

  private load() {
    try {
      const raw = this.storage.get(STORAGE_KEY);
      if (raw) this.paths = JSON.parse(raw) as TrainingPath[];
    } catch (e) {
      this.paths = [];
    }
    this.filteredPaths = [...this.paths];
    if (!this.selectedPath && this.paths.length) this.selectedPath = this.paths[0];
    this.refreshAllCourses();
  }

  private save() {
    this.storage.setObject(STORAGE_KEY, this.paths);
    this.filteredPaths = [...this.paths];
    this.refreshAllCourses();
  }

  refreshAllCourses() {
    this.filteredAllCourses = this.allCourses.map(i => ({ ...i }));
  }

  filtrar(valor: string) {
    this.lastSearch = valor || '';
    const v = (valor || '').toLowerCase();
    if (this.activeTab === 'all') {
      if (!v) {
        this.refreshAllCourses();
        return;
      }
      this.filteredAllCourses = this.allCourses.filter(it =>
        (it.name || '').toLowerCase().includes(v) ||
        (it.description || '').toLowerCase().includes(v) ||
        ((it.tags || []).join(' ').toLowerCase().includes(v))
      );
    } else {
      if (!v) {
        this.filteredPaths = this.paths;
        return;
      }
      this.filteredPaths = this.paths.filter(p => {
        const itemsText = (p.items || [])
          .map(i => `${i.name || ''} ${i.description || ''} ${i.link || ''} ${(i.tags || []).join(' ')}`)
          .join(' ');
        const haystack = `${p.name || ''} ${p.audience || ''} ${p.objectives || ''} ${p.prerequisites || ''} ${itemsText}`
          .toLowerCase();
        return haystack.includes(v);
      });
    }
  }

  selectPath(p: TrainingPath) {
    this.selectedPath = p;
  }

  // Cridat quan canvies algun camp del Path (modal)
  onPathFormChange(): void {
    if (this.editingPath.readonly) return;
    this.storage.setObject(DRAFT_PATH_KEY, this.editingPath);
  }

  newPath() {
    const draft =
      this.storage.getObject<Partial<TrainingPath> & { readonly?: boolean }>(
        DRAFT_PATH_KEY
      );

    if (draft && (draft.name || draft.audience || draft.objectives || draft.prerequisites)) {
      this.editingPath = { ...draft, readonly: false };
    } else {
      this.editingPath = {
        name: '',
        audience: '',
        objectives: '',
        prerequisites: '',
        items: [],
        visible: true,
      };
    }
    this.showPathModal = true;
  }

  editPath(p: TrainingPath) {
    this.editingPath = { ...p };
    this.showPathModal = true;
  }

  viewPath(p: TrainingPath) {
    this.editingPath = { ...p } as any;
    this.editingPath.readonly = true;
    this.showPathModal = true;
  }

  savePath() {
    const p = this.editingPath as TrainingPath;
    if (!p.name) return;
    if (!p.id) {
      p.id = Math.random().toString(36).slice(2, 9);
      p.items = p.items || [];
      this.paths.push(p as TrainingPath);
    } else {
      const idx = this.paths.findIndex(x => x.id === p.id);
      if (idx !== -1) this.paths[idx] = p as TrainingPath;
    }
    this.save();
    this.refreshAllCourses();

    // esborrem draft del path
    this.storage.remove(DRAFT_PATH_KEY);

    this.showPathModal = false;
    this.editingPath = {};
  }

  deletePath(id: string) {
    this.paths = this.paths.filter(p => p.id !== id);
    if (this.selectedPath?.id === id) this.selectedPath = this.paths[0];
    this.save();
    this.refreshAllCourses();
  }

  // confirmation modal state
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  confirmDeletePath(id: string, name?: string) {
    const question = this.translate.instant('TRAINING.DELETE_PATH_QUESTION', {
      name: name || '',
    });
    this.promptConfirm(question, () => this.deletePath(id));
  }

  // Items (formaciones) inside path
  addItem() {
    if (!this.selectedPath) return;
    this.openCourseSelector();
  }

  // Course selector modal state
  showCourseSelector = false;
  selectedCandidate?: TrainingItem;
  selectorCandidates: TrainingItem[] = [];
  selectorFilteredCandidates: TrainingItem[] = [];

  openCourseSelector() {
    this.selectorCandidates = this.allCourses.map(i => ({ ...i }));
    this.selectorFilteredCandidates = [...this.selectorCandidates];
    this.selectedCandidate = undefined;
    this.showCourseSelector = true;
  }

  selectCourse(candidate: TrainingItem) {
    this.selectedCandidate = candidate;
  }

  filterSelector(query: string) {
    const v = (query || '').toLowerCase();
    if (!v) {
      this.selectorFilteredCandidates = [...this.selectorCandidates];
      return;
    }
    this.selectorFilteredCandidates = this.selectorCandidates.filter(it =>
      (it.name || '').toLowerCase().includes(v) ||
      (it.description || '').toLowerCase().includes(v) ||
      ((it.tags || []).join(' ').toLowerCase().includes(v))
    );
  }

  confirmAddSelectedCourse() {
    if (!this.selectedPath || !this.selectedCandidate) return;
    const itemCopy: TrainingItem = {
      ...this.selectedCandidate,
      id: Math.random().toString(36).slice(2, 9),
    };
    this.selectedPath.items.push(itemCopy);
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
    this.refreshAllCourses();
    this.showCourseSelector = false;
    this.selectedCandidate = undefined;
  }

  // Cridat quan canvies algun camp del Item (modal)
  onItemFormChange(): void {
    if (this.editingItem.readonly) return;
    this.storage.setObject(DRAFT_ITEM_KEY, this.editingItem);
  }

  editItem(item: TrainingItem) {
    this.editingItem = {
      ...item,
      tagsString: (item.tags || []).join(','),
    };
    this.showItemModal = true;
  }

  saveItem() {
    if (!this.selectedPath) return;
    if ((this.editingItem as any).readonly) return;
    const itPartial =
      this.editingItem as Partial<TrainingItem> & { tagsString?: string };
    const it: TrainingItem = {
      id: itPartial.id || '',
      name: itPartial.name || '',
      link: itPartial.link,
      description: itPartial.description,
      tags: itPartial.tags || [],
      location: itPartial.location,
      visible: itPartial.visible,
      deleted: itPartial.deleted,
    };
    if (!it.name) return;
    const tagsArr = (itPartial.tagsString || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    it.tags = tagsArr;
    if (!it.id) {
      it.id = Math.random().toString(36).slice(2, 9);
      this.selectedPath.items.push(it);
    } else {
      const idx = this.selectedPath.items.findIndex(x => x.id === it.id);
      if (idx !== -1) this.selectedPath.items[idx] = it;
    }
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
    this.refreshAllCourses();

    // esborrem draft del item
    this.storage.remove(DRAFT_ITEM_KEY);

    this.showItemModal = false;
    this.editingItem = {};
  }

  openCourseLink(it: TrainingItem) {
    if (!it || !it.link) return;
    try {
      window.open(it.link, '_blank');
    } catch (e) {
      /* ignore */
    }
  }

  /** Actions for All Courses tab */
  addCourseFromAll() {
    if (!this.selectedPath) {
      const p: TrainingPath = {
        id: Math.random().toString(36).slice(2, 9),
        name: this.translate.instant('TRAINING.ALL_COURSES'),
        items: [],
        visible: true,
      } as TrainingPath;
      this.paths.push(p);
      this.selectedPath = p;
    }
    this.editingItem = {
      name: '',
      link: '',
      description: '',
      tags: [],
      location: '',
      visible: true,
      tagsString: '',
    };
    this.showItemModal = true;
  }

  viewCourse(it: TrainingItem) {
    this.editingItem = {
      ...it,
      tagsString: (it.tags || []).join(','),
    } as any;
    this.editingItem.readonly = true;
    this.showItemModal = true;
  }

  closeView() {
    if (this.editingItem) this.editingItem.readonly = false;
    this.showItemModal = false;
    this.editingItem = {};
  }

  editCourse(it: TrainingItem) {
    const found = this.paths.find(p => p.items.some(i => i.id === it.id));
    if (found) this.selectedPath = found;
    this.editItem(it);
  }

  confirmDeleteCourse(id: string, name?: string) {
    const question = this.translate.instant('TRAINING.DELETE_ITEM_QUESTION', {
      name: name || '',
    });
    this.promptConfirm(question, () => this.deleteCourseById(id));
  }

  deleteCourseById(id: string) {
    for (const p of this.paths) {
      const idx = p.items.findIndex(i => i.id === id);
      if (idx !== -1) {
        p.items.splice(idx, 1);
        break;
      }
    }
    this.save();
    this.refreshAllCourses();
  }

  copyToClipboard(text?: string) {
    const link = (text || '').toString();
    if (!link.trim()) {
      this.showToast(this.translate.instant('TRAINING.NO_LINK'), '');
      return;
    }
    const clipboardApi =
      navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText;
    if (clipboardApi) {
      (navigator as any).clipboard
        .writeText(link)
        .then(() => {
          this.showToast(this.translate.instant('TRAINING.LINK_COPIED'), link);
        })
        .catch(() => {
          this.showToast(this.translate.instant('TRAINING.COPY_FAILED'), '');
        });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = link;
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok)
          this.showToast(
            this.translate.instant('TRAINING.LINK_COPIED'),
            link
          );
        else
          this.showToast(
            this.translate.instant('TRAINING.COPY_FAILED'),
            ''
          );
      } catch (e) {
        this.showToast(this.translate.instant('TRAINING.COPY_FAILED'), '');
      }
    }
  }

  // toast state
  toastMessage = '';
  toastVisible = false;
  toastMessagePrefix = '';

  showToast(prefix: string, message: string, ms = 2500) {
    this.toastMessagePrefix = prefix;
    this.toastMessage = message;
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, ms);
  }

  dropItem(event: CdkDragDrop<TrainingItem[]>) {
    if (!this.selectedPath) return;
    moveItemInArray(
      this.selectedPath.items,
      event.previousIndex,
      event.currentIndex
    );
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
  }

  exportPathToCsv() {
    if (!this.selectedPath) return;
    const rows: string[] = [];
    rows.push(
      ['Index', 'Name', 'Link', 'Description', 'Tags', 'Location', 'Visible'].join(
        ','
      )
    );
    this.selectedPath.items.forEach((it, idx) => {
      const line = [
        (idx + 1).toString(),
        '"' + (it.name || '').replace(/"/g, '""') + '"',
        '"' + (it.link || '') + '"',
        '"' + (it.description || '').replace(/"/g, '""') + '"',
        '"' + (it.tags || []).join(';') + '"',
        '"' + (it.location || '') + '"',
        it.visible ? '1' : '0',
      ].join(',');
      rows.push(line);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nameSafe = (this.selectedPath.name || 'training')
      .replace(/[^a-z0-9\-]/gi, '_')
      .toLowerCase();
    a.download = `training-${nameSafe}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  removeItem(id: string) {
    if (!this.selectedPath) return;
    this.selectedPath.items = this.selectedPath.items.filter(i => i.id !== id);
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
    this.refreshAllCourses();
  }

  confirmDeleteItem(id: string, name?: string) {
    const question = this.translate.instant('TRAINING.DELETE_ITEM_QUESTION', {
      name: name || '',
    });
    this.promptConfirm(question, () => this.removeItem(id));
  }

  promptConfirm(message: string, action: () => void) {
    this.confirmMessage = message;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  confirmOk() {
    if (this.confirmAction) this.confirmAction();
    this.confirmAction = null;
    this.showConfirm = false;
    this.confirmMessage = '';
  }

  confirmCancel() {
    this.confirmAction = null;
    this.showConfirm = false;
    this.confirmMessage = '';
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPORT / EXPORT EXCEL — COURSES (tab All courses)
  // ═══════════════════════════════════════════════════════════════

  showImportModal = false;
  importResult: { imported: number; skipped: number; errors: string[] } | null = null;
  isImporting = false;
  importError = '';

  // ═══════════════════════════════════════════════════════════════
  // IMPORT / EXPORT EXCEL — TRAINING PATHS (tab Training paths)
  // ═══════════════════════════════════════════════════════════════

  showImportPathModal = false;
  importPathResult: { paths: number; courses: number; reused: number; skipped: number; errors: string[] } | null = null;
  isImportingPath = false;
  importPathError = '';

  /** Devuelve el curso existente (por nombre exacto, case-insensitive) o null */
  private findExistingCourse(name: string): TrainingItem | null {
    const key = name.trim().toLowerCase();
    for (const p of this.paths) {
      const found = (p.items || []).find(i => (i.name || '').trim().toLowerCase() === key);
      if (found) return found;
    }
    return null;
  }

  async downloadPathExcelTemplate() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    // Hoja 1: Paths
    const pathHeaders = [['path_name', 'audience', 'objectives', 'prerequisites']];
    const wsPath = XLSX.utils.aoa_to_sheet(pathHeaders);
    wsPath['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 60 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsPath, 'Paths');

    // Hoja 2: Courses (con columna path_name para agrupar)
    const courseHeaders = [['path_name', 'name', 'link', 'description', 'tags (semicolon-separated)', 'location']];
    const wsCourses = XLSX.utils.aoa_to_sheet(courseHeaders);
    wsCourses['!cols'] = [{ wch: 35 }, { wch: 40 }, { wch: 60 }, { wch: 60 }, { wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsCourses, 'Courses');

    XLSX.writeFile(wb, 'training-paths-template.xlsx');
  }

  triggerImportPathInput() {
    const input = document.getElementById('excel-import-path-input') as HTMLInputElement;
    if (input) input.click();
  }

  async onPathExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!input) return;
    input.value = '';
    if (!file) return;

    this.isImportingPath = true;
    this.importPathError = '';
    this.importPathResult = null;
    this.showImportPathModal = true;

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });

      // ── Leer hoja Paths ──────────────────────────────────────────
      const pathSheetName = wb.SheetNames.find((n: string) => n.toLowerCase().includes('path')) ?? wb.SheetNames[0];
      const pathRows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[pathSheetName], { header: 1 });

      // ── Leer hoja Courses ────────────────────────────────────────
      const courseSheetName = wb.SheetNames.find((n: string) => n.toLowerCase().includes('course') || n.toLowerCase().includes('cours')) ?? wb.SheetNames[1];
      const courseRows: any[][] = courseSheetName ? XLSX.utils.sheet_to_json(wb.Sheets[courseSheetName], { header: 1 }) : [];

      if (pathRows.length < 2 && courseRows.length < 2) {
        this.importPathError = 'El fichero no contiene datos en ninguna de las hojas.';
        this.isImportingPath = false;
        return;
      }

      let pathsCreated = 0;
      let coursesAdded = 0;
      let reused = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Mapa path_name → TrainingPath (existente o nuevo)
      const pathMap = new Map<string, TrainingPath>();

      // Procesar paths (fila 0 = cabecera)
      for (const row of pathRows.slice(1)) {
        const pathName = (row[0] ?? '').toString().trim();
        if (!pathName) { skipped++; continue; }

        let existing = this.paths.find(p => p.name.trim().toLowerCase() === pathName.toLowerCase());
        if (!existing) {
          existing = {
            id: Math.random().toString(36).slice(2, 9),
            name: pathName,
            audience: (row[1] ?? '').toString().trim(),
            objectives: (row[2] ?? '').toString().trim(),
            prerequisites: (row[3] ?? '').toString().trim(),
            items: [],
            visible: true,
          };
          this.paths.push(existing);
          pathsCreated++;
        }
        pathMap.set(pathName.toLowerCase(), existing);
      }

      // Procesar courses (fila 0 = cabecera)
      // Columnas: path_name(0), name(1), link(2), description(3), tags(4), location(5)
      for (const row of courseRows.slice(1)) {
        const pathName = (row[0] ?? '').toString().trim();
        const courseName = (row[1] ?? '').toString().trim();
        if (!courseName) { skipped++; continue; }

        // Buscar el path destino
        let targetPath = pathMap.get(pathName.toLowerCase());
        if (!targetPath && pathName) {
          // Path nombrado en Courses pero no en Paths → crearlo
          targetPath = this.paths.find(p => p.name.trim().toLowerCase() === pathName.toLowerCase());
          if (!targetPath) {
            targetPath = {
              id: Math.random().toString(36).slice(2, 9),
              name: pathName,
              items: [],
              visible: true,
            };
            this.paths.push(targetPath);
            pathsCreated++;
          }
          pathMap.set(pathName.toLowerCase(), targetPath);
        }
        if (!targetPath) { skipped++; continue; }

        // Reutilizar curso existente si el nombre ya está en cualquier path
        let courseItem = this.findExistingCourse(courseName);
        if (courseItem) {
          // Añadir referencia (copia con nuevo id) si no está ya en este path
          const alreadyInPath = targetPath.items.some(
            i => (i.name || '').trim().toLowerCase() === courseName.toLowerCase()
          );
          if (!alreadyInPath) {
            targetPath.items.push({ ...courseItem, id: Math.random().toString(36).slice(2, 9) });
            reused++;
          } else {
            skipped++;
          }
        } else {
          // Curso nuevo
          const link = (row[2] ?? '').toString().trim();
          const description = (row[3] ?? '').toString().trim();
          const tagsRaw = (row[4] ?? '').toString().trim();
          const location = (row[5] ?? '').toString().trim();
          const tags = tagsRaw ? tagsRaw.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
          const newItem: TrainingItem = {
            id: Math.random().toString(36).slice(2, 9),
            name: courseName, link, description, tags, location, visible: true, deleted: false
          };
          targetPath.items.push(newItem);
          coursesAdded++;

          // Enviar al backend (fire-and-forget — errores no bloquean)
          this.http.post(`${environment.baseUrl}formacion/import`, [{ name: courseName, link, description, tags, location }])
            .subscribe({ error: (e) => errors.push(`Error guardando "${courseName}" en servidor`) });
        }

        // Sincronizar el path en this.paths
        const idx = this.paths.findIndex(p => p.id === targetPath!.id);
        if (idx !== -1) this.paths[idx] = targetPath!;
      }

      this.save();
      this.refreshAllCourses();

      this.importPathResult = { paths: pathsCreated, courses: coursesAdded, reused, skipped, errors };
      this.isImportingPath = false;

    } catch (e: any) {
      this.importPathError = 'Error al procesar el fichero: ' + (e?.message ?? e);
      this.isImportingPath = false;
    }
  }

  closeImportPathModal() {
    this.showImportPathModal = false;
    this.importPathResult = null;
    this.importPathError = '';
  }

  async downloadExcelTemplate() {
    const XLSX = await import('xlsx');
    const headers = [['name', 'link', 'description', 'tags (semicolon-separated)', 'location']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws['!cols'] = [{ wch: 40 }, { wch: 60 }, { wch: 60 }, { wch: 40 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Courses');
    XLSX.writeFile(wb, 'courses-template.xlsx');
  }

  triggerImportInput() {
    const input = document.getElementById('excel-import-input') as HTMLInputElement;
    if (input) input.click();
  }

  async onExcelFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!input) return;
    input.value = '';
    if (!file) return;

    this.isImporting = true;
    this.importError = '';
    this.importResult = null;
    this.showImportModal = true;

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        this.importError = 'El fichero no contiene datos (mínimo cabecera + 1 fila).';
        this.isImporting = false;
        return;
      }

      // Cabecera en la fila 0: name(0), link(1), description(2), tags(3), location(4)
      const dataRows = rows.slice(1);
      const courses: TrainingItem[] = [];
      const payloadForBackend: any[] = [];

      for (const row of dataRows) {
        const name = (row[0] ?? '').toString().trim();
        if (!name) continue;
        const link = (row[1] ?? '').toString().trim();
        const description = (row[2] ?? '').toString().trim();
        const tagsRaw = (row[3] ?? '').toString().trim();
        const location = (row[4] ?? '').toString().trim();
        const tags = tagsRaw ? tagsRaw.split(';').map((t: string) => t.trim()).filter(Boolean) : [];

        courses.push({
          id: Math.random().toString(36).slice(2, 9),
          name, link, description, tags, location, visible: true, deleted: false
        });
        payloadForBackend.push({ name, link, description, tags, location });
      }

      if (courses.length === 0) {
        this.importError = 'No se encontraron filas con datos válidos (la columna "name" es obligatoria).';
        this.isImporting = false;
        return;
      }

      // Guardar en localStorage (path "Importados")
      const IMPORT_PATH_NAME = 'Importados';
      let importPath = this.paths.find(p => p.name === IMPORT_PATH_NAME);
      if (!importPath) {
        importPath = {
          id: Math.random().toString(36).slice(2, 9),
          name: IMPORT_PATH_NAME,
          items: [],
          visible: true,
        };
        this.paths.push(importPath);
      }
      importPath.items.push(...courses);
      this.save();
      this.refreshAllCourses();

      // Enviar al backend
      this.http.post<{ imported: number; skipped: number; errors: string[] }>(
        `${environment.baseUrl}formacion/import`,
        payloadForBackend
      ).subscribe({
        next: (res) => {
          this.importResult = res;
          this.isImporting = false;
        },
        error: () => {
          // Aunque el back falle, los cursos ya están en localStorage
          this.importResult = { imported: courses.length, skipped: 0, errors: ['No se pudo contactar con el servidor, los cursos se guardaron localmente.'] };
          this.isImporting = false;
        }
      });

    } catch (e: any) {
      this.importError = 'Error al procesar el fichero: ' + (e?.message ?? e);
      this.isImporting = false;
    }
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importResult = null;
    this.importError = '';
  }
}
