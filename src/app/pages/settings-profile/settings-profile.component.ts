import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.component.html',
  styleUrls: ['./settings-profile.component.scss'],
  imports: [RouterLink, ReactiveFormsModule]
})
export class SettingsProfileComponent {
  editableText = new FormControl(''); // initial empty or default value

  onSubmit() {
    const submittedText = this.editableText.value;
    this.editableText.setValue(submittedText); // reassigns the value (optional here)
    // console.log('Submitted:', submittedText);
  }

}
