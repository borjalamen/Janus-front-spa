import { Component } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

type TrainingItem = {
  id: string;
  name: string;
  link?: string;
  description?: string;
  tags?: string[];
  location?: string;
  visible?: boolean;
  deleted?: boolean;
}

type TrainingPath = {
  id: string;
  name: string;
  audience?: string;
  objectives?: string;
  prerequisites?: string;
  items: TrainingItem[];
  visible?: boolean;
}

const STORAGE_KEY = 'training_paths_v1';

@Component({
  selector: 'app-formacion',
  templateUrl: './formacion.html',
  styleUrls: ['./formacion.css'],
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, FormsModule, BuscadorComponent, TranslateModule, DragDropModule],
})
export class FormacionComponent {
  title = '';

  paths: TrainingPath[] = [];
  filteredPaths: TrainingPath[] = [];
  filteredAllCourses: TrainingItem[] = [];
  lastSearch: string = '';

  // UI state
  selectedPath?: TrainingPath;
  showPathModal = false;
  editingPath: Partial<TrainingPath> & { readonly?: boolean } = {};

  showItemModal = false;
  editingItem: Partial<TrainingItem> & { tagsString?: string; readonly?: boolean } = {};
  // tabs: 'all' = all courses search, 'paths' = training paths UI
  activeTab: 'all' | 'paths' = 'all';

  // cached search list for all courses
  get allCourses(): TrainingItem[] {
    const list: TrainingItem[] = [];
    for (const p of this.paths) {
      if (p.items && p.items.length) list.push(...p.items.map(it => ({ ...it } as TrainingItem)));
    }
    return list;
  }

  isTab(tab: 'all'|'paths') { return this.activeTab === tab; }

  setTab(tab: 'all'|'paths'){
    this.activeTab = tab;
    // reapply last search when switching tabs
    this.filtrar(this.lastSearch || '');
  }

  constructor(private translate: TranslateService) {
    this.load();
    this.translate.get('TRAINING.TITLE').subscribe(t => this.title = t);
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.paths = JSON.parse(raw) as TrainingPath[];
    } catch (e) { this.paths = []; }
    this.filteredPaths = [...this.paths];
    if (!this.selectedPath && this.paths.length) this.selectedPath = this.paths[0];
    this.refreshAllCourses();
  }

  private save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.paths));
    this.filteredPaths = [...this.paths];
    this.refreshAllCourses();
  }

  refreshAllCourses(){
    this.filteredAllCourses = this.allCourses.map(i => ({...i}));
  }

  filtrar(valor: string) {
    this.lastSearch = valor || '';
    const v = (valor || '').toLowerCase();
    if (this.activeTab === 'all'){
      if (!v) { this.refreshAllCourses(); return; }
      this.filteredAllCourses = this.allCourses.filter(it =>
        (it.name || '').toLowerCase().includes(v) ||
        (it.description || '').toLowerCase().includes(v) ||
        ((it.tags || []).join(' ').toLowerCase().includes(v))
      );
    } else {
      if (!v) { this.filteredPaths = this.paths; return; }
      this.filteredPaths = this.paths.filter(p =>
        p.name.toLowerCase().includes(v) ||
        (p.audience && p.audience.toLowerCase().includes(v)) ||
        (p.objectives && p.objectives.toLowerCase().includes(v))
      );
    }
  }

  selectPath(p: TrainingPath) {
    this.selectedPath = p;
  }

  newPath() {
    this.editingPath = { name: '', audience: '', objectives: '', prerequisites: '', items: [], visible: true };
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
      p.id = Math.random().toString(36).slice(2,9);
      p.items = p.items || [];
      this.paths.push(p as TrainingPath);
    } else {
      const idx = this.paths.findIndex(x => x.id === p.id);
      if (idx !== -1) this.paths[idx] = p as TrainingPath;
    }
    this.save();
    this.refreshAllCourses();
    this.showPathModal = false;
    this.editingPath = {};
  }

  deletePath(id: string) {
    this.paths = this.paths.filter(p => p.id !== id);
    if (this.selectedPath?.id === id) this.selectedPath = this.paths[0];
    this.save();
    this.refreshAllCourses();
  }

  // confirmation modal state (reuse pattern from planning)
  showConfirm = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  confirmDeletePath(id: string, name?: string) {
    const question = this.translate.instant('TRAINING.DELETE_PATH_QUESTION', { name: name || '' });
    this.promptConfirm(question, () => this.deletePath(id));
  }

  // Items (formaciones) inside path
  addItem() {
    // Open course selector to choose among all available courses
    if (!this.selectedPath) return;
    this.openCourseSelector();
  }

  // Course selector modal state
  showCourseSelector = false;
  selectedCandidate?: TrainingItem;
  selectorCandidates: TrainingItem[] = [];
  selectorFilteredCandidates: TrainingItem[] = [];

  openCourseSelector() {
    // prepare local candidate list and filtered copy for the modal
    this.selectorCandidates = this.allCourses.map(i => ({...i}));
    this.selectorFilteredCandidates = [...this.selectorCandidates];
    this.selectedCandidate = undefined;
    this.showCourseSelector = true;
  }

  selectCourse(candidate: TrainingItem) {
    this.selectedCandidate = candidate;
  }

  filterSelector(query: string) {
    const v = (query || '').toLowerCase();
    if (!v) { this.selectorFilteredCandidates = [...this.selectorCandidates]; return; }
    this.selectorFilteredCandidates = this.selectorCandidates.filter(it =>
      (it.name || '').toLowerCase().includes(v) ||
      (it.description || '').toLowerCase().includes(v) ||
      ((it.tags || []).join(' ').toLowerCase().includes(v))
    );
  }

  confirmAddSelectedCourse() {
    if (!this.selectedPath || !this.selectedCandidate) return;
    // copy the item into the selected path
    const itemCopy: TrainingItem = { ...this.selectedCandidate, id: Math.random().toString(36).slice(2,9) };
    this.selectedPath.items.push(itemCopy);
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
    this.refreshAllCourses();
    this.showCourseSelector = false;
    this.selectedCandidate = undefined;
  }

  editItem(item: TrainingItem) {
    this.editingItem = { ...item, tagsString: (item.tags || []).join(',') };
    this.showItemModal = true;
  }

  saveItem() {
    if (!this.selectedPath) return;
    if ((this.editingItem as any).readonly) return; // no guardar en modo solo lectura
    const itPartial = this.editingItem as Partial<TrainingItem> & { tagsString?: string };
    const it: TrainingItem = {
      id: itPartial.id || '',
      name: itPartial.name || '',
      link: itPartial.link,
      description: itPartial.description,
      tags: itPartial.tags || [],
      location: itPartial.location,
      visible: itPartial.visible,
      deleted: itPartial.deleted
    };
    if (!it.name) return;
    // process tags string into array
    const tagsArr = (itPartial.tagsString || '').split(',').map((s:string)=>s.trim()).filter(Boolean);
    it.tags = tagsArr;
    if (!it.id) {
      it.id = Math.random().toString(36).slice(2,9);
      this.selectedPath.items.push(it);
    } else {
      const idx = this.selectedPath.items.findIndex(x => x.id === it.id);
      if (idx !== -1) this.selectedPath.items[idx] = it;
    }
    // persist
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
    this.refreshAllCourses();
    this.showItemModal = false;
    this.editingItem = {};
  }

  openCourseLink(it: TrainingItem) {
    if (!it || !it.link) return;
    try { window.open(it.link, '_blank'); } catch(e) { /* ignore */ }
  }

  /** Actions for All Courses tab */
  // Create a new course (not tied to a specific path) - will create in a new generic path if needed
  addCourseFromAll() {
    // If there is a selected path, add into it; otherwise create a default path
    if (!this.selectedPath) {
      // create a generic path to hold orphan courses
      const p: TrainingPath = { id: Math.random().toString(36).slice(2,9), name: this.translate.instant('TRAINING.ALL_COURSES'), items: [], visible: true } as TrainingPath;
      this.paths.push(p);
      this.selectedPath = p;
    }
    this.editingItem = { name: '', link: '', description: '', tags: [], location: '', visible: true, tagsString: '' };
    this.showItemModal = true;
  }

  viewCourse(it: TrainingItem) {
    // open readonly modal: reuse editing modal but disable save (simple approach)
    this.editingItem = { ...it, tagsString: (it.tags||[]).join(',') } as any;
    this.editingItem.readonly = true;
    this.showItemModal = true;
  }

  closeView() {
    // limpiar flag readonly y cerrar modal
    if (this.editingItem) this.editingItem.readonly = false;
    this.showItemModal = false;
    this.editingItem = {};
  }

  editCourse(it: TrainingItem) {
    // find the path that contains the item and select it
    const found = this.paths.find(p => p.items.some(i => i.id === it.id));
    if (found) this.selectedPath = found;
    this.editItem(it);
  }

  confirmDeleteCourse(id: string, name?: string) {
    const question = this.translate.instant('TRAINING.DELETE_ITEM_QUESTION', { name: name || '' });
    this.promptConfirm(question, () => this.deleteCourseById(id));
  }

  deleteCourseById(id: string) {
    // find and remove from any path
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
    if (!link.trim()) { this.showToast(this.translate.instant('TRAINING.NO_LINK'), ''); return; }
    const clipboardApi = navigator && (navigator as any).clipboard && (navigator as any).clipboard.writeText;
    if (clipboardApi) {
      (navigator as any).clipboard.writeText(link).then(() => {
        this.showToast(this.translate.instant('TRAINING.LINK_COPIED'), link);
      }).catch(() => {
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
        if (ok) this.showToast(this.translate.instant('TRAINING.LINK_COPIED'), link);
        else this.showToast(this.translate.instant('TRAINING.COPY_FAILED'), '');
      } catch(e) { this.showToast(this.translate.instant('TRAINING.COPY_FAILED'), ''); }
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
    setTimeout(() => { this.toastVisible = false; }, ms);
  }

  dropItem(event: CdkDragDrop<TrainingItem[]>) {
    if (!this.selectedPath) return;
    moveItemInArray(this.selectedPath.items, event.previousIndex, event.currentIndex);
    // persist order
    const idxPath = this.paths.findIndex(p => p.id === this.selectedPath!.id);
    if (idxPath !== -1) this.paths[idxPath] = this.selectedPath!;
    this.save();
  }

  exportPathToCsv() {
    if (!this.selectedPath) return;
    const rows: string[] = [];
    // header
    rows.push(['Index','Name','Link','Description','Tags','Location','Visible'].join(','));
    this.selectedPath.items.forEach((it, idx) => {
      const line = [
        (idx+1).toString(),
        '"' + (it.name||'').replace(/"/g,'""') + '"',
        '"' + (it.link||'') + '"',
        '"' + (it.description||'').replace(/"/g,'""') + '"',
        '"' + ((it.tags||[]).join(';')) + '"',
        '"' + (it.location||'') + '"',
        (it.visible ? '1' : '0')
      ].join(',');
      rows.push(line);
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const nameSafe = (this.selectedPath.name || 'training').replace(/[^a-z0-9\-]/gi, '_').toLowerCase();
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
    const question = this.translate.instant('TRAINING.DELETE_ITEM_QUESTION', { name: name || '' });
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
}
