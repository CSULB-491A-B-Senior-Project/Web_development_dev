import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
    standalone: true,
    selector: 'main-page',
    templateUrl: './main-page.component.html',
    styleUrl: './main-page.component.scss',
    imports: [RouterLink, ReactiveFormsModule]
})
export class MainPageComponent {

}
