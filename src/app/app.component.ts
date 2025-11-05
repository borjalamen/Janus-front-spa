import { Component } from '@angular/core';
import {RouterModule} from "@angular/router";
import{Router} from "@angular/router";
import {MatSidenavModule} from "@angular/material/sidenav";
import {MatListModule} from "@angular/material/list";
import {MatToolbarModule} from "@angular/material/toolbar";
import {MatButtonModule} from "@angular/material/button"; 
import {MatIconModule} from "@angular/material/icon";
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import { LoginDialogComponent } from './login-dialog/login-dialog';


@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [RouterModule, MatSidenavModule, MatListModule, MatToolbarModule, MatButtonModule, MatIconModule, MatDialogModule,LoginDialogComponent]
})
export class AppComponent {
  title = 'JanusHUB.v1';

  constructor(public dialog: MatDialog,private router:Router) {}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '400px',
      maxHeight:'none',
      panelClass: 'login-model'
    }).afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/usuari']);
      }
    });
  }
}