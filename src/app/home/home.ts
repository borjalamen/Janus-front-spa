import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
  imports: [MatIconModule],
})
export class HomeComponent { 
  homeMsg = 'Bienvenido a JanusHUB.v0 ';
  homeMsg2 = 'Quiénes somos';
  homeMsg3 = 'Qué hacemos';
  homeMsg4 = 'Nuestra misión';
  homeMsg5 = 'Contacto';
}