import { Component } from '@angular/core';
import { HomeComponent } from './home/home';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [HomeComponent]
})
export class AppComponent {
  title = 'JanusHUB.v1';
}