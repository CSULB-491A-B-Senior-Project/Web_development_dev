import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.component.html',
  styleUrls: ['./settings-profile.component.scss'],
  imports: [RouterLink, ReactiveFormsModule, FormsModule]
})
export class SettingsProfileComponent {
  editableText = new FormControl('');

  text: string = '';

  // auto resizing the box to fit the text
  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // reset height
    textarea.style.height = textarea.scrollHeight + 'px'; // set to scroll height
  }

  onSubmit() {
    const submittedText = this.editableText.value;
    this.editableText.setValue(submittedText); // reassigns the value (optional here)
  }

}
