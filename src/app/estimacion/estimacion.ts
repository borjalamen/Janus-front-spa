import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

interface Task {
  id: string;
  title: string;
  estimates: number[]; // hours per week
}

@Component({
  selector: 'app-estimacion',
  templateUrl: './estimacion.html',
  styleUrls: ['./estimacion.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatIconModule, TranslateModule],
})
export class EstimacionComponent {
  weeks: string[] = ['1'];
  tasks: Task[] = [];
  newTaskTitle = '';

  addWeek() {
    const next = this.weeks.length + 1;
    this.weeks.push(String(next));
    // add 0 to each task estimates
    this.tasks.forEach(t => t.estimates.push(0));
  }

  removeWeek(index: number) {
    if (this.weeks.length <= 1) return;
    this.weeks.splice(index, 1);
    this.tasks.forEach(t => t.estimates.splice(index, 1));
  }

  addTask() {
    if (!this.newTaskTitle || !this.newTaskTitle.trim()) return;
    const t: Task = {
      id: Date.now().toString(36),
      title: this.newTaskTitle.trim(),
      estimates: this.weeks.map(() => 0),
    };
    this.tasks.push(t);
    this.newTaskTitle = '';
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  }

  setEstimate(task: Task, weekIndex: number, value: string) {
    const v = parseFloat(value.replace(',', '.')) || 0;
    task.estimates[weekIndex] = v;
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
}
