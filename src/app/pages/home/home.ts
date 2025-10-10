import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [RouterLink, ReactiveFormsModule],
})
export class Home {

}
