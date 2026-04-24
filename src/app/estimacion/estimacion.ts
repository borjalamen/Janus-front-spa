import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { LiveEstimationService, LiveSession, LiveParticipant, LiveAcceptedTask } from './live-estimation.service';
import { LocalStorageService } from '../local-storage.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstimacionRecord, EstimacionService } from './estimacion.service';

interface Task {
  id: string;
  title: string;
  estimates: number[]; // hours per week
}

interface EstimationComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface SavedEstimationRecord {
  id: string;
  estimationName?: string;
  projectCode?: string;
  projectName?: string;
  requester?: string;
  requesterEmail?: string;
  notes?: string;
  comments?: EstimationComment[];
  weeks?: string[];
  tasks?: Task[];
  createdAt?: string;
  visible?: boolean;
}

@Component({
  selector: 'app-estimacion',
  templateUrl: './estimacion.html',
  styleUrls: ['./estimacion.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatTabsModule,
    MatCardModule,
    MatListModule,
    TranslateModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
})
export class EstimacionComponent implements OnInit, OnDestroy {
  constructor(
    public liveService: LiveEstimationService,
    private snackBar: MatSnackBar,
    private translate: TranslateService,
    private storage: LocalStorageService,
    private estimacionService: EstimacionService
  ) {}

  weeks: string[] = ['1'];
  tasks: Task[] = [];
  newTaskTitle = '';

  // metadata
  estimationName = '';
  projectCode = '';
  projectName = '';
  requester = '';
  requesterEmail = '';
  notes = '';
  started = true; // enabled by default
  comments: EstimationComment[] = [];
  newCommentText = '';
  showCommentsPanel = false;

  // persistence
  private STORAGE_KEY_DRAFT = 'estimations_form_draft_v1';
  private readonly LEGACY_SAVED_STORAGE_KEYS = [
    'estimations_saved_v1',
    'estimaciones_saved_v1',
    'estimacion_saved_v1',
    'saved_estimaciones'
  ];
  savedEstimations: SavedEstimationRecord[] = [];
  searchQuery = '';
  selectedTab = 0; // 0: realizar, 1: listado
  saveButtonText = '';
  isSavingEstimation = false;
  private loadedEstimationNameIdentifier: string | null = null;
  private loadedFromSavedRecord = false;
  showDeleteConfirmPopup = false;
  deleteCandidateEstimation: SavedEstimationRecord | null = null;
  isDeletingEstimation = false;

  // clear controls
  clearMeta = false;
  clearEstimation = false;

  // --- Live estimation state ---
  liveSession: LiveSession | null = null;
  myId = 'u' + Math.random().toString(36).slice(2, 8);
  myName = 'Usuario';

  liveJoinId = '';          // session ID to join
  liveNextTask = '';        // owner: task description for next round
  liveFinalResult = '';     // owner: final accepted result (string for input binding)
  liveMyVoteInput = '';     // participant: vote (string for input binding)

  liveConnecting = false;
  liveConnected = false;
  liveError: string | null = null;
  liveSaving = false;

  liveTimerSeconds = 60;
  private liveTimerInterval: ReturnType<typeof setInterval> | null = null;

  // Popup para crear sesión
  showLiveCreateModal = false;
  liveModalMeta = {
    estimationName: '',
    projectCode: '',
    projectName: '',
    requester: '',
    requesterEmail: '',
    notes: '',
  };

  private liveSub: Subscription | null = null;
  private liveConnSub: Subscription | null = null;
  private liveErrSub: Subscription | null = null;

  // ===== Draft helpers =====

  private saveFormDraft(): void {
    const draft = {
      estimationName: this.estimationName,
      projectCode: this.projectCode,
      projectName: this.projectName,
      requester: this.requester,
      requesterEmail: this.requesterEmail,
      notes: this.notes,
      comments: this.comments,
      weeks: this.weeks,
      tasks: this.tasks,
      newTaskTitle: this.newTaskTitle
    };
    this.storage.setObject(this.STORAGE_KEY_DRAFT, draft);
  }

  onFormChange(): void {
    this.saveFormDraft();
  }

  private restoreFormDraft(): void {
    const draft = this.storage.getObject<{
      estimationName: string;
      projectCode: string;
      projectName: string;
      requester: string;
      requesterEmail: string;
      notes: string;
      comments: EstimationComment[];
      weeks: string[];
      tasks: Task[];
      newTaskTitle: string;
    }>(this.STORAGE_KEY_DRAFT);

    if (draft) {
      this.estimationName = draft.estimationName || '';
      this.projectCode = draft.projectCode || '';
      this.projectName = draft.projectName || '';
      this.requester = draft.requester || '';
      this.requesterEmail = draft.requesterEmail || '';
      this.notes = draft.notes || '';
      this.comments = Array.isArray(draft.comments) ? [...draft.comments] : [];
      this.weeks = draft.weeks && draft.weeks.length ? [...draft.weeks] : ['1'];
      this.tasks = draft.tasks ? JSON.parse(JSON.stringify(draft.tasks)) : [];
      this.newTaskTitle = draft.newTaskTitle || '';
      this.started = true;
    }
  }

  private clearFormDraft(): void {
    this.storage.remove(this.STORAGE_KEY_DRAFT);
  }

  // ===== Weeks & tasks =====

  addWeek() {
    const next = this.weeks.length + 1;
    this.weeks.push(String(next));
    this.tasks.forEach(t => t.estimates.push(0));
    this.saveFormDraft();
  }

  removeWeek(index: number) {
    if (this.weeks.length <= 1) return;
    this.weeks.splice(index, 1);
    this.tasks.forEach(t => t.estimates.splice(index, 1));
    this.saveFormDraft();
  }

  addTask() {
    if (!this.started) return;
    if (!this.newTaskTitle || !this.newTaskTitle.trim()) return;
    const t: Task = {
      id: Date.now().toString(36),
      title: this.newTaskTitle.trim(),
      estimates: this.weeks.map(() => 0),
    };
    this.tasks.push(t);
    this.newTaskTitle = '';
    this.saveFormDraft();
  }

  // Start estimation from metadata
  startFromMetadata() {
    this.started = true;
    if (!this.weeks || this.weeks.length === 0) this.weeks = ['1'];
    this.saveFormDraft();
  }

  // ===== Live estimation helpers =====

  /** Returns true when all required metadata fields are filled */
  liveMetaComplete(): boolean {
    return !!(this.estimationName?.trim()
      && this.projectCode?.trim()
      && this.projectName?.trim()
      && this.requester?.trim()
      && this.requesterEmail?.trim());
  }

  isLiveModalMetaComplete(): boolean {
    const m = this.liveModalMeta;
    return !!(m.estimationName?.trim() && m.projectCode?.trim()
      && m.projectName?.trim() && m.requester?.trim() && m.requesterEmail?.trim());
  }

  openCreateLiveModal() {
    // Pre-fill from existing form data if available
    this.liveModalMeta = {
      estimationName: this.estimationName || '',
      projectCode: this.projectCode || '',
      projectName: this.projectName || '',
      requester: this.requester || '',
      requesterEmail: this.requesterEmail || '',
      notes: this.notes || '',
    };
    this.showLiveCreateModal = true;
  }

  async confirmCreateLiveSession() {
    if (!this.isLiveModalMetaComplete()) return;
    if (!(await this.ensureConnected())) return;
    this.showLiveCreateModal = false;
    this.myName = this.resolveCurrentUserName();
    this.liveService.createSession({
      userId: this.myId,
      userName: this.myName,
      estimationName: this.liveModalMeta.estimationName,
      projectCode: this.liveModalMeta.projectCode,
      projectName: this.liveModalMeta.projectName,
      requester: this.liveModalMeta.requester,
      requesterEmail: this.liveModalMeta.requesterEmail,
      notes: this.liveModalMeta.notes,
    });
  }

  // ── Matrix helpers ────────────────────────────────────────────────

  /** All unique participants across all accepted tasks + current session participants */
  getLiveMatrixParticipants(): Array<{ id: string; name: string }> {
    const map = new Map<string, string>();
    // Current participants first (preserves order)
    this.liveSession?.participants.forEach(p => {
      if (!map.has(p.id)) map.set(p.id, p.name);
    });
    // Historical voters
    (this.liveSession?.acceptedTasks ?? []).forEach(t => {
      Object.entries(t.voterNames ?? {}).forEach(([id, name]) => {
        if (!map.has(id)) map.set(id, name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  getMinVote(task: LiveAcceptedTask): number | null {
    const vals = Object.values(task.votes ?? {}).filter(v => v !== null && v !== undefined);
    return vals.length ? Math.min(...vals) : null;
  }

  getMaxVote(task: LiveAcceptedTask): number | null {
    const vals = Object.values(task.votes ?? {}).filter(v => v !== null && v !== undefined);
    return vals.length ? Math.max(...vals) : null;
  }

  getCurrentRevealMin(): number | null {
    if (!this.liveSession) return null;
    const vals = this.liveSession.participants
      .map(p => p.vote).filter(v => v !== null && v !== undefined) as number[];
    return vals.length ? Math.min(...vals) : null;
  }

  getCurrentRevealMax(): number | null {
    if (!this.liveSession) return null;
    const vals = this.liveSession.participants
      .map(p => p.vote).filter(v => v !== null && v !== undefined) as number[];
    return vals.length ? Math.max(...vals) : null;
  }

  getParticipantTotal(userId: string): number {
    return (this.liveSession?.acceptedTasks ?? [])
      .reduce((sum, t) => sum + ((t.votes ?? {})[userId] ?? 0), 0);
  }

  isVoteMin(voteVal: number | undefined | null, task: LiveAcceptedTask): boolean {
    if (voteVal === null || voteVal === undefined) return false;
    const min = this.getMinVote(task);
    const max = this.getMaxVote(task);
    return min !== null && max !== null && min !== max && voteVal === min;
  }

  isVoteMax(voteVal: number | undefined | null, task: LiveAcceptedTask): boolean {
    if (voteVal === null || voteVal === undefined) return false;
    const min = this.getMinVote(task);
    const max = this.getMaxVote(task);
    return min !== null && max !== null && min !== max && voteVal === max;
  }

  isRevealMin(vote: number | null | undefined): boolean {
    if (vote === null || vote === undefined) return false;
    const min = this.getCurrentRevealMin();
    const max = this.getCurrentRevealMax();
    return min !== null && max !== null && min !== max && vote === min;
  }

  isRevealMax(vote: number | null | undefined): boolean {
    if (vote === null || vote === undefined) return false;
    const min = this.getCurrentRevealMin();
    const max = this.getCurrentRevealMax();
    return min !== null && max !== null && min !== max && vote === max;
  }

  get isOwner(): boolean {
    return this.liveSession?.ownerId === this.myId;
  }

  get myParticipant(): LiveParticipant | undefined {
    return this.liveSession?.participants.find(p => p.id === this.myId);
  }

  get liveTotal(): number {
    return (this.liveSession?.acceptedTasks ?? [])
      .reduce((acc, t) => acc + t.result, 0);
  }

  private async ensureConnected(): Promise<boolean> {
    if (this.liveConnected) return true;
    this.liveConnecting = true;
    try {
      await this.liveService.connect();
      this.liveConnected = true;
      return true;
    } catch (_) {
      this.liveError = this.translate.instant('ESTIMATION.LIVE.ERROR_CONNECT')
        || 'No se pudo conectar al servidor WebSocket';
      return false;
    } finally {
      this.liveConnecting = false;
    }
  }

  async startLiveSession() {
    // Delegate to the modal-based flow
    this.openCreateLiveModal();
  }

  async joinLiveSession() {
    const id = (this.liveJoinId || '').trim().toUpperCase();
    if (!id) return;
    if (!(await this.ensureConnected())) return;
    this.myName = this.resolveCurrentUserName();
    this.liveService.joinSession(id, this.myId, this.myName);
  }

  copySessionId() {
    if (!this.liveSession) return;
    navigator.clipboard.writeText(this.liveSession.id).then(() => {
      this.snackBar.open(
        this.translate.instant('ESTIMATION.LIVE.ID_COPIED') || 'Código copiado',
        undefined, { duration: 1800 });
    });
  }

  setLiveTask() {
    const s = this.liveSession;
    if (!s || !this.liveNextTask.trim()) return;
    this.liveService.setTask(s.id, this.myId, this.liveNextTask.trim());
    this.liveNextTask = '';
    this.liveMyVoteInput = '';
    this.liveFinalResult = '';
  }

  submitLiveVote() {
    const s = this.liveSession;
    if (!s) return;
    const v = parseFloat(this.liveMyVoteInput);
    if (isNaN(v) || v < 0) return;
    this.liveService.vote(s.id, this.myId, v);
    this.liveMyVoteInput = '';
  }

  revealLiveNow() {
    const s = this.liveSession;
    if (!s) return;
    this.liveService.reveal(s.id, this.myId);
  }

  acceptLiveResult() {
    const s = this.liveSession;
    if (!s) return;
    const r = parseFloat(this.liveFinalResult);
    if (isNaN(r) || r < 0) return;
    this.liveService.accept(s.id, this.myId, r);
    this.liveFinalResult = '';
    this.liveMyVoteInput = '';
  }

  finishLiveSession() {
    const s = this.liveSession;
    if (!s) return;
    this.liveService.finish(s.id, this.myId);
  }

  leaveLiveSession() {
    const s = this.liveSession;
    if (s) this.liveService.leave(s.id, this.myId);
    this.stopLiveTimer();
    this.liveConnected = false;
    this.liveJoinId = '';
    this.liveNextTask = '';
    this.liveFinalResult = '';
    this.liveMyVoteInput = '';
  }

  saveLiveEstimation() {
    const s = this.liveSession;
    if (!s || s.acceptedTasks.length === 0) return;
    this.liveSaving = true;

    const tasks: Array<{ id: string; title: string; estimates: number[] }> =
      s.acceptedTasks.map((t, i) => ({
        id: 'live-' + i,
        title: t.task,
        estimates: [t.result],
      }));

    const payload: EstimacionRecord = {
      estimationName: s.estimationName,
      projectCode: s.projectCode,
      projectName: s.projectName,
      requester: s.requester,
      requesterEmail: s.requesterEmail,
      notes: s.notes,
      comments: [],
      weeks: ['1'],
      tasks,
      createdAt: new Date().toISOString(),
      visible: true,
    };

    this.estimacionService.create(payload).subscribe({
      next: () => {
        this.liveSaving = false;
        this.loadSavedEstimations();
        this.snackBar.open(
          this.translate.instant('ESTIMATION.LIVE.SAVED_OK') || 'Estimación guardada',
          undefined, { duration: 2500 });
        this.liveService.disconnect();
        this.liveConnected = false;
      },
      error: () => {
        this.liveSaving = false;
        this.snackBar.open(
          this.translate.instant('ESTIMATION.ERROR_SAVE') || 'No se pudo guardar',
          undefined, { duration: 3000 });
      },
    });
  }

  private startLiveTimer(votingStart: number) {
    this.stopLiveTimer();
    const update = () => {
      const elapsed = Math.floor((Date.now() - votingStart) / 1000);
      this.liveTimerSeconds = Math.max(0, 60 - elapsed);
    };
    update();
    this.liveTimerInterval = setInterval(update, 500);
  }

  private stopLiveTimer() {
    if (this.liveTimerInterval !== null) {
      clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }
    this.liveTimerSeconds = 60;
  }

  // ===== Persistence of saved estimations =====

  private isPersistedBackendRecord(record: any): record is SavedEstimationRecord {
    const id = (record?.id || '').toString().trim();
    return !!id && record?.visible !== false;
  }

  private clearLegacySavedEstimationsStorage(): void {
    this.LEGACY_SAVED_STORAGE_KEYS.forEach((key) => this.storage.remove(key));
  }

  private refreshSaveButtonText(): void {
    this.saveButtonText = this.translate.instant('ESTIMATION.SAVE') || 'Desar estimacio';
  }

  private normalizeEstimationNameForIdentifier(value: string): string {
    return (value || '').trim().toLowerCase();
  }

  private getEstimationNameIdentifier(value: string | undefined | null): string {
    return (value || '').toString().trim();
  }

  private findSavedEstimationByName(estimationName: string): SavedEstimationRecord | null {
    const normalizedEstimationName = this.normalizeEstimationNameForIdentifier(estimationName);
    if (!normalizedEstimationName) return null;

    return this.savedEstimations.find((record) => {
      const recordEstimationName = this.getEstimationNameIdentifier(record.estimationName);
      return this.normalizeEstimationNameForIdentifier(recordEstimationName) === normalizedEstimationName;
    }) || null;
  }

  loadSavedEstimations() {
    this.estimacionService.getAll().subscribe({
      next: (data) => {
        const backendRecords = Array.isArray(data) ? data : [];
        this.savedEstimations = backendRecords.filter((record) => this.isPersistedBackendRecord(record));
      },
      error: (err) => {
        console.error('Error loading estimaciones from backend:', err);
        this.savedEstimations = [];
      }
    });
  }

  saveCurrentEstimation() {
    const estimationNameIdentifier = this.getEstimationNameIdentifier(this.estimationName);
    if (!estimationNameIdentifier) {
      this.snackBar.open('Debes indicar nombre de estimación para guardar.', undefined, { duration: 3000 });
      return;
    }

    const normalizedCurrentName = this.normalizeEstimationNameForIdentifier(estimationNameIdentifier);
    const normalizedLoadedName = this.normalizeEstimationNameForIdentifier(this.loadedEstimationNameIdentifier || '');
    const estimationNameChangedFromLoaded = this.loadedFromSavedRecord
      && !!normalizedLoadedName
      && normalizedCurrentName !== normalizedLoadedName;

    const existingRecord = this.findSavedEstimationByName(estimationNameIdentifier);
    const existingRecordId = (existingRecord?.id || '').toString().trim();
    const existingCreatedAt = (existingRecord?.createdAt || '').toString().trim();

    const shouldForceCreate = estimationNameChangedFromLoaded;
    const isUpdating = !shouldForceCreate && !!existingRecordId;

    const payload: EstimacionRecord = {
      estimationName: this.estimationName,
      projectCode: this.projectCode,
      projectName: this.projectName,
      requester: this.requester,
      requesterEmail: this.requesterEmail,
      notes: this.notes,
      comments: JSON.parse(JSON.stringify(this.comments)),
      weeks: [...this.weeks],
      tasks: JSON.parse(JSON.stringify(this.tasks)),
      createdAt: isUpdating ? (existingCreatedAt || new Date().toISOString()) : new Date().toISOString(),
      visible: true
    };

    const request$ = isUpdating
      ? this.estimacionService.update(existingRecordId, payload)
      : this.estimacionService.create(payload);

    this.isSavingEstimation = true;

    request$.subscribe({
      next: () => {
        this.isSavingEstimation = false;
        this.loadSavedEstimations();

        this.loadedEstimationNameIdentifier = estimationNameIdentifier;
        this.loadedFromSavedRecord = true;

        const savedMsg = isUpdating
          ? (this.translate.instant('ESTIMATION.UPDATED') || 'Estimacio actualitzada')
          : (this.translate.instant('ESTIMATION.SAVED') || 'Estimacio desada');
        this.snackBar.open(savedMsg, undefined, { duration: 2500 });

        this.saveButtonText = savedMsg;
        setTimeout(() => { this.refreshSaveButtonText(); }, 2000);
      },
      error: (err) => {
        this.isSavingEstimation = false;
        console.error('Error saving estimacion in backend:', err);
        const msg = isUpdating
          ? (this.translate.instant('ESTIMATION.ERROR_UPDATE') || 'No s ha pogut actualitzar l estimacio')
          : (this.translate.instant('ESTIMATION.ERROR_SAVE') || 'No s ha pogut desar l estimacio');
        this.snackBar.open(msg, undefined, { duration: 3000 });
      }
    });
  }

  ngOnInit(): void {
    this.myName = this.resolveCurrentUserName();
    this.clearLegacySavedEstimationsStorage();
    this.loadSavedEstimations();
    this.restoreFormDraft();

    this.liveSub = this.liveService.session$.subscribe(s => {
      const prev = this.liveSession;
      this.liveSession = s;
      if (s?.phase === 'VOTING' && s.votingStart) {
        this.startLiveTimer(s.votingStart);
      } else if (prev?.phase === 'VOTING' && s?.phase !== 'VOTING') {
        this.stopLiveTimer();
      }
    });
    this.liveConnSub = this.liveService.connected$.subscribe(c => {
      this.liveConnected = c;
    });
    this.liveErrSub = this.liveService.error$.subscribe(e => {
      if (e) {
        const knownPrefix = 'SESSION_NOT_FOUND:';
        if (e.startsWith(knownPrefix)) {
          const id = e.slice(knownPrefix.length);
          this.liveError = (this.translate.instant('ESTIMATION.LIVE.ERROR_NOT_FOUND') || 'Sesión no encontrada') + ': ' + id;
        } else {
          this.liveError = e;
        }
      } else {
        this.liveError = null;
      }
    });

    this.refreshSaveButtonText();
  }

  private resolveCurrentUserName(): string {
    const fromUserObj = this.storage.getObject<{ fullName?: string; username?: string }>('user');
    const fullName = (fromUserObj?.fullName || '').trim();
    if (fullName) return fullName;

    const username = (fromUserObj?.username || '').trim();
    if (username) return username;

    const fromKey = String(this.storage.get('username') || '').trim();
    if (fromKey) return fromKey;

    return 'Usuario';
  }

  private applySavedEstimationToForm(source: SavedEstimationRecord): void {
    this.estimationName = source.estimationName || '';
    this.projectCode = source.projectCode || '';
    this.projectName = source.projectName || '';
    this.requester = source.requester || '';
    this.requesterEmail = source.requesterEmail || '';
    this.notes = source.notes || '';
    this.comments = Array.isArray(source.comments) ? JSON.parse(JSON.stringify(source.comments)) : [];
    this.weeks = source.weeks && source.weeks.length ? [...source.weeks] : ['1'];
    this.tasks = Array.isArray(source.tasks) ? JSON.parse(JSON.stringify(source.tasks)) : [];
    this.loadedEstimationNameIdentifier = this.getEstimationNameIdentifier(source.estimationName);
    this.loadedFromSavedRecord = true;
    this.started = true;

    this.selectedTab = 0;
    this.saveFormDraft();
    this.refreshSaveButtonText();
  }

  clearSelected() {
    const cleared: string[] = [];
    if (this.clearMeta) {
      this.estimationName = '';
      this.projectCode = '';
      this.projectName = '';
      this.requester = '';
      this.requesterEmail = '';
      this.notes = '';
      cleared.push(this.translate.instant('ESTIMATION.CLEAR_META') || 'metadata');
    }
    if (this.clearEstimation) {
      this.tasks = [];
      this.weeks = ['1'];
      this.newTaskTitle = '';
      this.loadedEstimationNameIdentifier = null;
      this.loadedFromSavedRecord = false;
      cleared.push(this.translate.instant('ESTIMATION.CLEAR_ESTIMATION') || 'estimation');
    }
    if (cleared.length === 0) {
      const msg = this.translate.instant('ESTIMATION.CLEAR_NONE') || 'No hay nada seleccionado para limpiar.';
      this.snackBar.open(msg, undefined, { duration: 2000 });
      return;
    }
    this.clearMeta = false;
    this.clearEstimation = false;
    this.saveFormDraft();
    const cfg = { duration: 2200 };
    const msg = this.translate.instant('ESTIMATION.CLEARED') || 'Limpieza realizada';
    this.snackBar.open(msg, undefined, cfg);
  }

  ngOnDestroy(): void {
    if (this.liveSub) this.liveSub.unsubscribe();
    if (this.liveConnSub) this.liveConnSub.unsubscribe();
    if (this.liveErrSub) this.liveErrSub.unsubscribe();
    this.stopLiveTimer();
  }

  get filteredSavedEstimations() {
    const q = (this.searchQuery || '').toString().toLowerCase().trim();
    if (!q) return this.savedEstimations;
    return this.savedEstimations.filter(s => {
      return (s.estimationName || '').toString().toLowerCase().includes(q)
        || (s.projectCode || '').toString().toLowerCase().includes(q)
        || (s.projectName || '').toString().toLowerCase().includes(q)
        || (s.requester || '').toString().toLowerCase().includes(q)
        || (s.requesterEmail || '').toString().toLowerCase().includes(q)
        || (s.notes || '').toString().toLowerCase().includes(q);
    });
  }

  private deleteSavedEstimation(id: string) {
    this.estimacionService.delete(id).subscribe({
      next: () => {
        this.savedEstimations = this.savedEstimations.filter(s => s.id !== id);

        this.isDeletingEstimation = false;
        this.showDeleteConfirmPopup = false;
        this.deleteCandidateEstimation = null;

        const msg = this.translate.instant('ESTIMATION.DELETED') || 'Estimacio eliminada';
        this.snackBar.open(msg, undefined, { duration: 2200 });
      },
      error: (err) => {
        console.error('Error deleting estimacion from backend:', err);
        this.isDeletingEstimation = false;
        const msg = this.translate.instant('ESTIMATION.ERROR_DELETE') || 'No s ha pogut eliminar l estimacio';
        this.snackBar.open(msg, undefined, { duration: 3000 });
      }
    });
  }

  openDeleteSavedEstimation(estimation: SavedEstimationRecord) {
    this.deleteCandidateEstimation = estimation;
    this.showDeleteConfirmPopup = true;
  }

  cancelDeleteSavedEstimation() {
    if (this.isDeletingEstimation) return;
    this.showDeleteConfirmPopup = false;
    this.deleteCandidateEstimation = null;
  }

  confirmDeleteSavedEstimation() {
    const id = (this.deleteCandidateEstimation?.id || '').trim();
    if (!id) {
      this.cancelDeleteSavedEstimation();
      return;
    }

    this.isDeletingEstimation = true;
    this.deleteSavedEstimation(id);
  }

  private normalizeSavedEstimationForUpdate(source: any): SavedEstimationRecord {
    const clone: SavedEstimationRecord = JSON.parse(JSON.stringify(source || {}));
    clone.comments = Array.isArray(clone.comments) ? clone.comments : [];
    clone.weeks = Array.isArray(clone.weeks) ? clone.weeks : [];
    clone.tasks = Array.isArray(clone.tasks) ? clone.tasks : [];
    clone.visible = clone.visible === undefined || clone.visible === null ? true : !!clone.visible;
    clone.createdAt = clone.createdAt || new Date().toISOString();
    return clone;
  }

  loadSavedIntoCurrent(id: string) {
    const selected = this.savedEstimations.find(x => x.id === id);
    if (!selected) return;

    const normalized = this.normalizeSavedEstimationForUpdate(selected);
    this.applySavedEstimationToForm(normalized);
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveFormDraft();
  }

  setEstimate(task: Task, weekIndex: number, value: string) {
    const v = parseFloat(value.replace(',', '.')) || 0;
    task.estimates[weekIndex] = v;
    this.saveFormDraft();
  }

  totalForTask(task: Task) {
    return task.estimates.reduce((a, b) => a + b, 0);
  }

  totalForWeek(weekIndex: number) {
    return this.tasks.reduce((sum, t) => sum + (t.estimates[weekIndex] || 0), 0);
  }

  grandTotal() {
    return this.tasks.reduce((s, t) => s + this.totalForTask(t), 0);
  }

  addComment() {
    const text = (this.newCommentText || '').trim();
    if (!text) return;

    const authorName = this.resolveCurrentUserName();
    this.myName = authorName;

    const comment: EstimationComment = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      author: authorName,
      text,
      createdAt: new Date().toISOString()
    };

    this.comments = [comment, ...this.comments];
    this.newCommentText = '';
    this.saveFormDraft();
  }

  getCommentAuthorDisplay(author: string | undefined | null): string {
    const raw = (author || '').trim();
    if (!raw) return this.resolveCurrentUserName();

    const looksLikeGeneratedId = /^(user|usuario)-[a-z0-9]+$/i.test(raw);
    if (looksLikeGeneratedId) {
      return this.resolveCurrentUserName();
    }

    return raw;
  }

  toggleCommentsPanel() {
    this.showCommentsPanel = !this.showCommentsPanel;
  }

  deleteComment(commentId: string) {
    this.comments = this.comments.filter(c => c.id !== commentId);
    this.saveFormDraft();
  }

  formatCommentDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  exportCsv() {
    const rows: string[] = [];
    rows.push(`"${this.escapeCsv('Estimation Name')}","${this.escapeCsv(this.estimationName)}"`);
    rows.push(`"${this.escapeCsv('Project Code')}","${this.escapeCsv(this.projectCode)}"`);
    rows.push(`"${this.escapeCsv('Project Name')}","${this.escapeCsv(this.projectName)}"`);
    rows.push(`"${this.escapeCsv('Requester')}","${this.escapeCsv(this.requester)}"`);
    rows.push(`"${this.escapeCsv('Requester Email')}","${this.escapeCsv(this.requesterEmail)}"`);
    rows.push(`"${this.escapeCsv('Notes')}","${this.escapeCsv(this.notes)}"`);
    rows.push('');

    const header = ['Tarea', ...this.weeks.map(w => `Semana ${w}`), 'Total'];
    rows.push(header.map(h => `"${this.escapeCsv(h)}"`).join(','));

    this.tasks.forEach(t => {
      const r = [this.escapeCsv(t.title), ...t.estimates.map(e => String(e)), String(this.totalForTask(t))];
      rows.push(r.map(c => `"${this.escapeCsv(c)}"`).join(','));
    });

    const totals = ['Total', ...this.weeks.map((_, i) => String(this.totalForWeek(i))), String(this.grandTotal())];
    rows.push(totals.map(c => `"${this.escapeCsv(c)}"`).join(','));

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (this.estimationName && this.estimationName.trim())
      ? this.estimationName.replace(/[^a-z0-9\-_.]/gi, '_') + '.csv'
      : 'estimation.csv';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeCsv(v: string) {
    return (v ?? '').toString().replace(/"/g, '""');
  }

  exportPdf() {
    this.createPdfBlob().then(blob => {
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank');
      if (!w) {
        const html = this.buildPrintableHtml();
        const newWin = window.open('', '_blank', 'width=900,height=700');
        if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
        newWin.document.open();
        newWin.document.write(html);
        newWin.document.close();
        setTimeout(() => { newWin.print(); }, 300);
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }).catch(_ => {
      const html = this.buildPrintableHtml();
      const newWin = window.open('', '_blank', 'width=900,height=700');
      if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
      setTimeout(() => { newWin.print(); }, 300);
    });
  }

  buildPrintableHtml() {
    const style = `
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff}
        table{border-collapse:collapse;width:100%;}
        th,td{border:1px solid #999;padding:6px;text-align:left}
        th{background:#163f6b;color:#fff}
      </style>
    `;
    let html = '<html><head><title>Estimation</title>' + style + '</head><body>';
    html += `<h2>${this.escapeHtml(this.estimationName || 'Estimation')}</h2>`;
    html += `<p><strong>Project:</strong> ${this.escapeHtml(this.projectCode)} - ${this.escapeHtml(this.projectName)}<br/>`;
    html += `<strong>Requester:</strong> ${this.escapeHtml(this.requester)} (${this.escapeHtml(this.requesterEmail)})</p>`;
    if (this.notes) html += `<p><strong>Notes:</strong><br/>${this.escapeHtml(this.notes).replace(/\n/g,'<br/>')}</p>`;
    html += '<table><thead><tr>';
    html += `<th>Task</th>`;
    this.weeks.forEach(w => html += `<th>Week ${w}</th>`);
    html += `<th>Total</th></tr></thead><tbody>`;
    this.tasks.forEach(t => {
      html += `<tr><td>${this.escapeHtml(t.title)}</td>`;
      t.estimates.forEach(e => html += `<td>${e}</td>`);
      html += `<td>${this.totalForTask(t)}</td></tr>`;
    });
    html += `</tbody><tfoot><tr><td><strong>Total</strong></td>`;
    this.weeks.forEach((_, i) => html += `<td><strong>${this.totalForWeek(i)}</strong></td>`);
    html += `<td><strong>${this.grandTotal()}</strong></td></tr></tfoot></table>`;
    html += '</body></html>';
    return html;
  }

  private async loadImageDataUrl(url: string): Promise<string> {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('Network response was not ok');
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Could not load image for PDF header:', e);
      return '';
    }
  }

  async createPdfBlob(): Promise<Blob> {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 40;
    const lineHeight = 14;

    // load image from assets (falls back silently if not available)
    const imagePath = '/assets/images/7dRimV7.png';
    const imageDataUrl = await this.loadImageDataUrl(imagePath);

    doc.setFontSize(16);
    doc.text(this.estimationName || 'Estimation', margin, y);
    y += 24;

    doc.setFontSize(11);
    doc.text(`Project: ${this.projectCode} - ${this.projectName}`, margin, y);
    y += lineHeight;
    doc.text(`Requester: ${this.requester} (${this.requesterEmail})`, margin, y);
    y += lineHeight + 6;

    if (this.notes) {
      doc.text('Notes:', margin, y);
      y += lineHeight;
      const split = doc.splitTextToSize(this.notes, 520);
      doc.text(split, margin, y);
      y += split.length * lineHeight + 6;
    }

    const colWidths = [220, ...this.weeks.map(() => 60), 60];
    let x = margin;
    doc.setFillColor(22, 63, 107);
    doc.setTextColor(255, 255, 255);
    doc.rect(x, y, colWidths.reduce((a,b)=>a+b,0), 18, 'F');
    doc.setFontSize(11);
    let cx = x + 6;
    doc.text('Task', cx, y + 13);
    cx += colWidths[0];
    this.weeks.forEach((w, i) => { doc.text(`W${w}`, cx + 6, y + 13); cx += colWidths[i+1]; });
    doc.text('Total', cx + 6, y + 13);
    y += 22;
    doc.setTextColor(0,0,0);

    this.tasks.forEach(t => {
      if (y > 760) { doc.addPage(); y = 40; }
      let cx2 = x + 6;
      doc.text(t.title, cx2, y + 12);
      cx2 += colWidths[0];
      t.estimates.forEach((e, idx) => { doc.text(String(e), cx2 + 4, y + 12); cx2 += colWidths[idx+1]; });
      doc.text(String(this.totalForTask(t)), cx2 + 4, y + 12);
      y += 18;
    });

    y += 8;
    if (y > 760) { doc.addPage(); y = 40; }
    doc.setFontSize(11);
    doc.text('Total', x + 6, y + 12);
    let cx3 = x + colWidths[0];
    this.weeks.forEach((_, i) => { doc.text(String(this.totalForWeek(i)), cx3 + 6, y + 12); cx3 += colWidths[i+1]; });
    doc.text(String(this.grandTotal()), cx3 + 6, y + 12);

    // Add branding image and footer on every page
    const pageCount = doc.getNumberOfPages();
    const footerText = `Estimación realizada por el equipo de Janus a fecha: ${new Date().toLocaleDateString('es-ES')}`;
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      if (imageDataUrl) {
        const imgW = 60;
        const imgH = 60;
        try {
          // place top-right
          doc.addImage(imageDataUrl, 'PNG', pw - margin - imgW, 20, imgW, imgH);
        } catch (e) {
          // ignore image errors
          console.warn('addImage failed', e);
        }
      }
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(footerText, margin, ph - 30);
    }

    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  async exportPdfAndMail() {
    try {
      const pdfBlob = await this.createPdfBlob();
      const fileName = (this.estimationName && this.estimationName.trim())
        ? this.estimationName.replace(/[^a-z0-9\-_.]/gi, '_') + '.pdf'
        : 'estimation.pdf';
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      // @ts-ignore
      if (navigator && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        try {
          // @ts-ignore
          await (navigator as any).share({ files: [file], title: this.estimationName || 'Estimation', text: '' });
          return;
        } catch (err) {
          // continue to fallback
        }
      }

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      const subject = encodeURIComponent((this.estimationName || 'Estimation') + ' - Estimation');
      const bodyLines = [];
      bodyLines.push('Hi ' + (this.requester || 'Requester') + ',');
      bodyLines.push('');
      bodyLines.push('I have attached the estimation. If your mail client does not auto-attach the file, please attach the downloaded PDF: ' + fileName);
      bodyLines.push('');
      bodyLines.push('Regards,');
      const body = encodeURIComponent(bodyLines.join('\n'));
      const mailto = `mailto:${encodeURIComponent(this.requesterEmail || '')}?subject=${subject}&body=${body}`;
      window.location.href = mailto;
    } catch (e) {
      const html = this.buildPrintableHtml();
      const newWin = window.open('', '_blank', 'width=900,height=700');
      if (!newWin) { this.snackBar.open('No se ha podido abrir la ventana de impresión.', '✕', { duration: 3500 }); return; }
      newWin.document.open();
      newWin.document.write(html);
      newWin.document.close();
      setTimeout(() => { newWin.print(); }, 300);
    }
  }

  async onPdfSelected(event: Event) {
    const inp = event.target as HTMLInputElement;
    if (!inp || !inp.files || inp.files.length === 0) return;
    const file = inp.files[0];
    try {
      await this.parsePdf(file);
      inp.value = '';
    } catch (e) {
      console.error('PDF import error', e);
      this.snackBar.open('Error importando PDF: ' + (e && (e as any).message ? (e as any).message : e), '✕', { duration: 3500 });
    }
  }

  private async parsePdf(file: File) {
    const data = await file.arrayBuffer();

    let workerBlobUrl: string | null = null;
    try {
      const resp = await fetch('/assets/pdf.worker.min.js');
      if (resp.ok) {
        const b = await resp.blob();
        workerBlobUrl = URL.createObjectURL(b);
      }
    } catch (e) {
      console.warn('Could not fetch local pdf.worker.min.js', e);
    }

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
    try { (pdfjs as any).GlobalWorkerOptions = (pdfjs as any).GlobalWorkerOptions || {}; } catch (e) {}
    if (workerBlobUrl) {
      // @ts-ignore
      (pdfjs as any).GlobalWorkerOptions.workerSrc = workerBlobUrl;
    }

    const loading = (pdfjs as any).getDocument({ data, disableWorker: true } as any);
    const doc = await loading.promise;

    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items: Array<{ str: string; x: number; y: number }> = (content.items || []).map((it: any) => {
        const tr = it.transform || [];
        const x = (tr[4] !== undefined && !isNaN(tr[4])) ? tr[4] : (it.x || 0);
        const y = (tr[5] !== undefined && !isNaN(tr[5])) ? tr[5] : (it.y || 0);
        return { str: it.str || '', x: Number(x), y: Number(y) };
      });

      items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
      const linesMap = new Map<number, string[]>();
      for (const it of items) {
        const key = Math.round(it.y * 10);
        const arr = linesMap.get(key) || [];
        arr.push(it.str);
        linesMap.set(key, arr);
      }

      const pageLines: string[] = [];
      Array.from(linesMap.keys()).sort((a, b) => b - a).forEach(k => {
        const parts = linesMap.get(k) || [];
        pageLines.push(parts.join(' ').replace(/\s+/g, ' ').trim());
      });

      fullText += '\n' + pageLines.join('\n');
    }

    const projectMatch = fullText.match(/Project:\s*([^\n]+)/i);
    if (projectMatch) {
      const pv = projectMatch[1].trim();
      const parts = pv.split(/\s*-\s*/);
      if (parts.length >= 2) {
        this.projectCode = parts[0].trim();
        this.projectName = parts.slice(1).join(' - ').trim();
      } else {
        this.projectName = pv;
      }
    }
    const requesterMatch = fullText.match(/Requester:\s*([^\n(]+)\s*\(?([^\)\n]+)?\)?/i);
    if (requesterMatch) {
      this.requester = (requesterMatch[1] || '').trim();
      const maybeEmail = (requesterMatch[2] || '').trim();
      if (maybeEmail && maybeEmail.indexOf('@') !== -1) this.requesterEmail = maybeEmail;
    }

    const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/Task/i.test(l) && /W\d+/i.test(l) && /Total/i.test(l)) { headerIndex = i; break; }
    }
    if (headerIndex === -1) headerIndex = lines.findIndex(l => /Task/i.test(l) || (/W1/i.test(l) && /Total/i.test(l)));

    let weeksCount = 1;
    if (headerIndex >= 0) {
      const headerParts = lines[headerIndex].split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p);
      const wparts = headerParts.filter(p => /W\d+/i.test(p));
      weeksCount = Math.max(1, wparts.length);
    }

    const parsedTasks: Task[] = [];
    for (let i = Math.max(0, headerIndex + 1); i < lines.length; i++) {
      const line = lines[i];
      if (/^Total\b/i.test(line)) break;
      const nums = line.match(/(\d+[\.,]?\d*)/g) || [];
      if (nums.length === 0) continue;
      const estimates = nums.map(n => parseFloat(n.replace(',', '.')) || 0);
      const title = line.replace(/(\s*\d+[\.,]?\d*)+\s*$/,'').trim();
      const estAligned = new Array(weeksCount).fill(0).map((_, idx) => estimates[idx] !== undefined ? estimates[idx] : 0);
      parsedTasks.push({
        id: Date.now().toString(36) + '_' + parsedTasks.length,
        title: title || 'Task',
        estimates: estAligned
      });
    }

    if (parsedTasks.length > 0) {
      this.tasks = parsedTasks;
      this.weeks = new Array(weeksCount).fill(0).map((_, i) => String(i+1));
      this.started = true;
      this.estimationName = this.estimationName || file.name.replace(/\.pdf$/i,'');
      this.saveFormDraft();
    } else {
      throw new Error('No se han encontrado filas de tareas en el PDF.');
    }
  }

  escapeHtml(s: string) {
    return (s ?? '').toString()
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
}
