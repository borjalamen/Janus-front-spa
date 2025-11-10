import { Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatSidenavModule, MatListModule, MatIconModule, TranslateModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['../app.component.css'] // 🔸 Reutilizamos tu estilo general
})
export class SidebarComponent {}
