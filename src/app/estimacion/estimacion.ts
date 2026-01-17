import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
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
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatIconModule, MatFormFieldModule, TranslateModule],
})
export class EstimacionComponent {
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
  started = false; // whether the estimation table is active

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
    if (!this.started) return;
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

  exportCsv() {
    const rows: string[] = [];
    // metadata
    rows.push(`"${this.escapeCsv('Estimation Name')}","${this.escapeCsv(this.estimationName)}"`);
    rows.push(`"${this.escapeCsv('Project Code')}","${this.escapeCsv(this.projectCode)}"`);
    rows.push(`"${this.escapeCsv('Project Name')}","${this.escapeCsv(this.projectName)}"`);
    rows.push(`"${this.escapeCsv('Requester')}","${this.escapeCsv(this.requester)}"`);
    rows.push(`"${this.escapeCsv('Requester Email')}","${this.escapeCsv(this.requesterEmail)}"`);
    rows.push(`"${this.escapeCsv('Notes')}","${this.escapeCsv(this.notes)}"`);
    rows.push('');

    // header
    const header = ['Tarea', ...this.weeks.map(w => `Semana ${w}`), 'Total'];
    rows.push(header.map(h => `"${this.escapeCsv(h)}"`).join(','));

    // rows
    this.tasks.forEach(t => {
      const r = [this.escapeCsv(t.title), ...t.estimates.map(e => String(e)), String(this.totalForTask(t))];
      rows.push(r.map(c => `"${this.escapeCsv(c)}"`).join(','));
    });

    // footer totals
    const totals = ['Total', ...this.weeks.map((_, i) => String(this.totalForWeek(i))), String(this.grandTotal())];
    rows.push(totals.map(c => `"${this.escapeCsv(c)}"`).join(','));

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (this.estimationName && this.estimationName.trim()) ? this.estimationName.replace(/[^a-z0-9\-_.]/gi, '_') + '.csv' : 'estimation.csv';
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  escapeCsv(v: string) {
    return (v ?? '').toString().replace(/"/g, '""');
  }

  exportPdf() {
    // Build a printable HTML
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

    const newWin = window.open('', '_blank', 'width=900,height=700');
    if (!newWin) { alert('No se ha podido abrir la ventana de impresión.'); return; }
    newWin.document.open();
    newWin.document.write(html);
    newWin.document.close();
    // Give browser a moment then print
    setTimeout(() => { newWin.print(); }, 300);
  }

  escapeHtml(s: string) {
    return (s ?? '').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
}
