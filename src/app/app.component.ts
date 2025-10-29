import { Component } from '@angular/core';
import {RouterModule} from "@angular/router";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatButtonModule} from "@angular/material/button"; 
import {MatIconModule} from "@angular/material/icon";

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterModule, MatSidenavModule, MatListModule, MatToolbarModule, MatButtonModule, MatIconModule]
})
export class AppComponent {
  title = 'JanusHUB.v1';
}