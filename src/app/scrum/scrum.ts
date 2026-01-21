import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

type ScrumTask = {
  id: string;
  title: string;
  estimate?: string;
  priority?: 'Low'|'Medium'|'High';
  status: 'todo'|'doing'|'done';
};

@Component({
  selector: 'app-scrum',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './scrum.html',
  styleUrls: ['./scrum.css']
})
export class ScrumComponent {
  tasks: ScrumTask[] = [];
  newTitle = '';
  newEstimate = '';
  newPriority: 'Low'|'Medium'|'High' = 'Medium';

  getPriorityKey(p?: 'Low'|'Medium'|'High') {
    if (!p) return '';
    return `SCRUM.PRI_${p.toUpperCase()}`;
  }

  constructor() {
    try {
      const raw = localStorage.getItem('janus_scrum_tasks');
      if (raw) this.tasks = JSON.parse(raw) as ScrumTask[];
    } catch (e) { this.tasks = []; }
  }

  saveStore() {
    try { localStorage.setItem('janus_scrum_tasks', JSON.stringify(this.tasks)); } catch(e) {}
  }

  addTask() {
    if (!this.newTitle || !this.newTitle.trim()) return;
    const t: ScrumTask = { id: String(Date.now()) + Math.random().toString(36).slice(2,6), title: this.newTitle.trim(), estimate: this.newEstimate || '', priority: this.newPriority, status: 'todo' };
    this.tasks.push(t);
    this.newTitle = '';
    this.newEstimate = '';
    this.newPriority = 'Medium';
    this.saveStore();
  }

  moveTask(id: string, to: ScrumTask['status']) {
    const t = this.tasks.find(x => x.id === id);
    if (!t) return;
    t.status = to;
    this.saveStore();
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(x => x.id !== id);
    this.saveStore();
  }

  tasksBy(status: ScrumTask['status']) {
    return this.tasks.filter(t => t.status === status);
  }
}
