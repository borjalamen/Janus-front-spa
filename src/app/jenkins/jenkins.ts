import { Component } from '@angular/core';

@Component({
  selector: 'app-jenkins',
  imports: [],
  templateUrl: './jenkins.html',
  styleUrl: './jenkins.css',
})
export class Jenkins {
  onJenkinsSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];

  if (!file) return;

  console.log("Archivo Jenkins seleccionado:", file.name);
}

}


