import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-peticion',
  standalone: true,
  templateUrl: './peticion.html',
  styleUrls: ['./peticion.css'],
  imports: [MatIconModule, TranslateModule]
})
export class PeticionComponent { }
