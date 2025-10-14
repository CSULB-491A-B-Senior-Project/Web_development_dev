import { Component, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-settings-account',
  templateUrl: './settings-account.component.html',
  styleUrls: ['./settings-account.component.scss'],
  imports: [RouterLink, ReactiveFormsModule]
})
export class SettingsAccountComponent implements OnInit {
  accountForm!: FormGroup;
  
  firstName: string = 'First';
  lastName: string = 'Last';
  email: string = 'email@email.com';
  username: string = 'username';

  // atLeastOneFieldRequired(form: FormGroup) {
  //   const { firstName, lastName, email, username } = form.value;
  //   return firstName || lastName || email || username
  //   ? null
  //   : { atLeastOneRequired: true };
  // }
  
  atLeastOneFieldRequired = (group: AbstractControl): ValidationErrors | null => {
    const fg = group as FormGroup;
    const { newFirstName, newLastName, newEmail, newUsername } = fg.value;

    if (
      (newFirstName && newFirstName.trim()) ||
      (newLastName && newLastName.trim()) ||
      (newEmail && newEmail.trim()) ||
      (newUsername && newUsername.trim())
    ) {
      return null; // ✅ valid
    }
    return { atLeastOneRequired: true }; // ❌ invalid
  };

  get atLeastOneRequiredError(): boolean {
    return !!this.accountForm?.errors?.['atLeastOneRequired']
    && (this.accountForm.dirty || this.accountForm.touched);
    }

  updateUserProfile() { // FIX
    if (this.accountForm.valid) {
      console.log('User profile updated:', this.accountForm.value);
      // Perform the actual update logic here
    } else {
      console.log('Form is invalid!');
    }
  };

  ngOnInit(): void {
    this.accountForm = new FormGroup({
      newFirstName: new FormControl('', []),
      newLastName: new FormControl('', []),
      newEmail: new FormControl('', [Validators.email]),
      newUsername: new FormControl('', [])
    },
    [this.atLeastOneFieldRequired]  // Custom form level validator
    );
  }
}

  // protected newFirstName = new FormControl<string>('', Validators.required);
  // protected newLastName = new FormControl<string>('', Validators.required);
  // protected newEmail = new FormControl<string>('', [Validators.required, Validators.email]);
  // protected newUsername = new FormControl<string>('', Validators.required);
  // protected oldPassword = new FormControl<string>('', Validators.required);
  // protected newPassword = new FormControl<string>('', Validators.required);
  // protected confirmNewPassword = new FormControl<string>('', Validators.required);

// @Component({
//   selector: 'app-form',
//   templateUrl: './form.component.html',
//   styleUrl: './form.component.scss',
//   standalone: true,
// })
// export class FormComponent {
// }
