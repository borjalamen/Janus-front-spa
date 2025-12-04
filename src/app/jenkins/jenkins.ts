import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-jenkins',
  imports: [FormsModule, CommonModule],
  templateUrl: './jenkins.html',
  styleUrls: ['./jenkins.css'],


})
export class Jenkins {

  
  popupOpen = false;

  newName = "";
  newUrl = "";

  customJenkins: { name: string; url: string }[] = [];

constructor() {
  const saved = localStorage.getItem("customJenkins");
  this.customJenkins = saved ? JSON.parse(saved) : [];
}

openPopup() {
  this.popupOpen = true;
}

closePopup() {
  this.popupOpen = false;
  this.newName = "";
  this.newUrl = "";
}

savePopup() {
  this.customJenkins.push({
    name: this.newName,
    url: this.newUrl
  });

  localStorage.setItem("customJenkins", JSON.stringify(this.customJenkins));

  this.closePopup();
}

  onJenkinsSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    console.log("Fitxer seleccionat:", file);
    
  }
}

}


