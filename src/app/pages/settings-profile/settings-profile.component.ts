import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SettingsAccountComponent } from "../settings-account/settings-account.component";
@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.component.html',
  styleUrls: ['./settings-profile.component.scss'],
  imports: [RouterLink, ReactiveFormsModule]
})
export class SettingsProfileComponent {
  firstName: string = 'First';
  lastName: string = 'Last';
  email: string = 'email@email.com';
  username: string = 'username';
  updateUserProfile() {
    // enter logic here
  }

  protected newFirstName = new FormControl<string>('', Validators.required);
  protected newLastName = new FormControl<string>('', Validators.required);
  protected newEmail = new FormControl<string>('', [Validators.required, Validators.email]);
  protected newUsername = new FormControl<string>('', Validators.required);
  protected oldPassword = new FormControl<string>('', Validators.required);
  protected newPassword = new FormControl<string>('', Validators.required);
  protected confirmNewPassword = new FormControl<string>('', Validators.required);
}

// @Component({
//   selector: 'app-form',
//   templateUrl: './form.component.html',
//   styleUrl: './form.component.scss',
//   standalone: true,
// })
// export class FormComponent {
// }
