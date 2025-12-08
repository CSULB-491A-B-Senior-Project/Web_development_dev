import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  host: { class: 'sidebar-host' }
})
export class SidebarComponent {
  activeSection = input<'profile' | 'account'>('profile');
  showLogout = input<boolean>(true);
  logout = output<void>();
}