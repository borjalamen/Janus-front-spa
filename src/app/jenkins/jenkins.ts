import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface JenkinsItem {
  name: string;
  url: string;
  selected: boolean;
}

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

   customJenkins: JenkinsItem[] = [];

  deletePopupOpen = false;
  jenkinsToDelete: { name: string; url: string } | null = null;
  deleteMode = false;

constructor() {
  const saved = localStorage.getItem("customJenkins");
  const parsed: { name: string; url: string }[] = saved ? JSON.parse(saved) : [];
  this.customJenkins = parsed.map(jk => ({
    name: jk.name,
    url: jk.url,
    selected: false   
  }));
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
 const newJenkins: { name: string; url: string; selected: boolean } = {
    name: this.newName,
    url: this.newUrl,
    selected: false
  };
  this.customJenkins.push(newJenkins);

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
    toggleDeleteMode() {
    this.deleteMode = !this.deleteMode;

    if (!this.deleteMode) {
      this.customJenkins.forEach(jk => jk.selected = false);
    }
  }

  toggleSelect(jk: { selected?: boolean }) {
    if (this.deleteMode) {
      jk.selected = !jk.selected;
    }
  }
  confirmDelete(jk?: JenkinsItem) {
    this.jenkinsToDelete = jk || null;
    this.deletePopupOpen = true;
  }

  cancelDelete() {
    this.deletePopupOpen = false;
    this.jenkinsToDelete = null;
  }

  deleteJenkins() {
    if (this.jenkinsToDelete) {
      this.customJenkins = this.customJenkins.filter(j => j !== this.jenkinsToDelete);
        
      } else {
      this.customJenkins = this.customJenkins.filter(jk => !jk.selected);
    }

     localStorage.setItem("customJenkins", JSON.stringify(this.customJenkins));
    this.deletePopupOpen = false;
    this.jenkinsToDelete = null;
    this.deleteMode = false;

}
  openJenkins(jk: JenkinsItem, event: Event) {
     if (!this.deleteMode) {
      window.open(jk.url, "_blank");
    } else {
      this.toggleSelect(jk);
      event.preventDefault();


}
  }
}



