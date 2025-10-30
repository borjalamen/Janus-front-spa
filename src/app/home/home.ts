import { Component } from '@angular/core';


@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent { 
  homeMsg = 'Bienvenido a JanusHUB.v0 ';
}