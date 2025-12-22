import { Component, OnInit } from '@angular/core';
import { CommonModule, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

interface MediaItem {
  id: string;
  title: string;
  description?: string;
  file: string;
  thumbnail?: string;
  duration?: string;
}

@Component({
  selector: 'app-multimedia',
  templateUrl: './multimedia.html',
  styleUrls: ['./multimedia.css'],
  standalone: true,
  imports: [CommonModule, NgForOf, NgIf, FormsModule, TranslateModule, MatFormFieldModule, MatIconModule, MatButtonModule, MatInputModule]
})
export class MultimediaComponent implements OnInit {
  query = '';
  all: MediaItem[] = [];
  results: MediaItem[] = [];

  // player modal state
  playing?: MediaItem;
  playerReady = false;

  ngOnInit(): void {
    this.loadManifest();
  }

  async loadManifest() {
    try {
      const resp = await fetch('assets/multimedia/manifest.json');
      if (!resp.ok) return;
      const data = await resp.json();
      this.all = (data || []) as MediaItem[];
      this.results = [...this.all];
    } catch (e) {
      console.error('Error loading multimedia manifest', e);
    }
  }

  search(q?: string) {
    const term = ((q ?? this.query) || '').trim().toLowerCase();
    this.query = term;
    if (!term) {
      this.results = [...this.all];
      return;
    }
    this.results = this.all.filter(it =>
      (it.title && it.title.toLowerCase().includes(term)) ||
      (it.description && it.description.toLowerCase().includes(term))
    );
  }

  openPlayer(item: MediaItem) {
    this.playing = item;
    this.playerReady = false;
    // small timeout to let modal render
    setTimeout(() => this.playerReady = true, 50);
  }

  closePlayer() {
    this.playing = undefined;
    this.playerReady = false;
  }

  download(item: MediaItem) {
    const a = document.createElement('a');
    a.href = item.file;
    a.download = item.file.split('/').pop() || item.id;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
