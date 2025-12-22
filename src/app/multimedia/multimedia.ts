import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-multimedia',
  standalone: true,
  imports: [CommonModule, FormsModule, BuscadorComponent, TranslateModule],
  templateUrl: './multimedia.html',
  styleUrls: ['./multimedia.css']
})
export class MultimediaComponent {
  // simple demo state
  query = '';
  results: Array<{title:string, url?:string}> = [];

  search(q?: string) {
    const term = ((q ?? this.query) || '').trim();
    if (!term) { this.results = []; return; }
    // demo: generate fake results based on query
    this.results = Array.from({length:3}).map((_,i) => ({ title: `${term} - Video ${i+1}`, url: '' }));
  }

  play(item: {title:string, url?:string}){
    alert('Play: ' + item.title);
  }
}
