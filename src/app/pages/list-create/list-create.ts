import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PlaylistService, Album, CreatePlaylistRequest } from './playlist.service';

@Component({
  selector: 'app-list-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor, RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  templateUrl: './list-create.html',
  styleUrls: ['./list-create.scss']
})
export class ListCreateComponent {
  private fb = inject(FormBuilder);
  private playlistService = inject(PlaylistService);

  // Overlay state
  isOpen = signal(false);
  
  // Form state
  form: FormGroup = this.fb.group({
    listName: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
  });

  // Search state
  albumSearch = new FormControl<string>('', { nonNullable: true });
  showResults = false;
  results: Album[] = [];
  searching = signal(false);
  private searchSubject = new Subject<string>();

  // Selected albums
  selected: Album[] = [];

  // Submission state
  submitting = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.setupSearchSubscription();
  }

  /**
   * Setup search subscription with debounce
   */
  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length === 0) {
          this.showResults = false;
          this.results = [];
          this.searching.set(false);
          return of(null);
        }

        this.searching.set(true);
        return this.playlistService.searchAlbums(query, 1, 12).pipe(
          catchError(err => {
            console.error('Search error:', err);
            this.searching.set(false);
            return of(null);
          })
        );
      })
    ).subscribe(response => {
      this.searching.set(false);
      if (response) {
        this.results = response.data;
        this.showResults = this.results.length > 0;
      }
    });
  }

  /**
   * Open the overlay
   */
  open(): void {
    this.isOpen.set(true);
    this.resetForm();
  }

  /**
   * Close the overlay
   */
  close(): void {
    this.isOpen.set(false);
    this.resetForm();
  }

  /**
   * Reset form and state
   */
  private resetForm(): void {
    this.form.reset({
      listName: '',
      description: ''
    });
    this.albumSearch.setValue('');
    this.results = [];
    this.showResults = false;
    this.selected = [];
    this.error.set(null);
    this.submitting.set(false);
  }

  /**
   * Handle search input
   */
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  /**
   * Add album to selected list
   */
  addAlbum(album: Album): void {
    if (!this.selected.some(a => a.id === album.id)) {
      this.selected = [...this.selected, album];
    }
    this.clearSearch();
  }

  /**
   * Remove album from selected list
   */
  removeAlbum(album: Album): void {
    this.selected = this.selected.filter(a => a.id !== album.id);
  }

  /**
   * Handle drag and drop reordering
   */
  drop(ev: CdkDragDrop<Album[]>): void {
    moveItemInArray(this.selected, ev.previousIndex, ev.currentIndex);
    this.selected = [...this.selected];
  }

  /**
   * Submit the form and create playlist
   */
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const request: CreatePlaylistRequest = {
      name: this.form.value.listName.trim(),
      description: this.form.value.description?.trim() || undefined
    };

    this.playlistService.createPlaylist(request).subscribe({
      next: (response) => {
        console.log('Playlist created:', response);
        this.submitting.set(false);
        this.close();
        // TODO: Navigate to playlist page or show success message
      },
      error: (err) => {
        console.error('Error creating playlist:', err);
        this.error.set(err.error?.message || 'Failed to create playlist');
        this.submitting.set(false);
      }
    });
  }

  /**
   * Clear search input and results
   */
  clearSearch(): void {
    this.albumSearch.setValue('');
    this.results = [];
    this.showResults = false;
  }
}
