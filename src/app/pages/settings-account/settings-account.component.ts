import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-account',
  templateUrl: './settings-account.component.html',
  styleUrls: ['./settings-account.component.css']
})
export class SettingsAccountComponent {
  firstName: string = 'First';
  lastName: string = 'Last';
  email: string = 'email@email.com';
  username: string = 'username';

  updateUserProfile() {
    // enter logic here
  }
}
