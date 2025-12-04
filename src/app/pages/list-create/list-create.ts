import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Track } from '../../models/playlist.models';
import { CreatePlaylistRequest, PlaylistService } from '../../services/playlist.service';

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
  trackSearch = new FormControl<string>('', { nonNullable: true });
  showResults = false;
  results: Track[] = [];
  searching = signal(false);
  private searchSubject = new Subject<string>();

  // Selected tracks
  selected: Track[] = [];

  // Submission state
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

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
        return this.playlistService.searchTracks(query, 1, 20).pipe(
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
    this.trackSearch.setValue('');
    this.results = [];
    this.showResults = false;
    this.selected = [];
    this.error.set(null);
    this.success.set(null);
    this.submitting.set(false);
  }

  /**
   * Handle search input
   */
  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  /**
   * Add track to selected list
   */
  addTrack(track: Track): void {
    if (this.selected.some(t => t.id === track.id)) {
      this.error.set('Track already added');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    this.selected = [...this.selected, track];
    this.clearSearch();
  }

  /**
   * Remove track from selected list
   */
  removeTrack(track: Track): void {
    this.selected = this.selected.filter(t => t.id !== track.id);
  }

  /**
   * Get total selected track count
   */
  getSelectedTrackCount(): number {
    return this.selected.length;
  }

  /**
   * Check if form can be submitted
   */
  canSubmit(): boolean {
    return (
      this.form.valid &&
      this.getSelectedTrackCount() > 0 &&
      !this.submitting()
    );
  }

  /**
   * Handle drag and drop reordering
   */
  drop(ev: CdkDragDrop<Track[]>): void {
    moveItemInArray(this.selected, ev.previousIndex, ev.currentIndex);
    this.selected = [...this.selected];
  }

  /**
   * Submit the form and create playlist with tracks
   */
  submit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.success.set(null);

    const request: CreatePlaylistRequest = {
      name: this.form.value.listName.trim(),
      description: this.form.value.description?.trim() || undefined
    };

    // Collect all selected track IDs
    const trackIds: string[] = this.selected.map(t => t.id);

    // Create playlist first
    this.playlistService.createPlaylist(request).subscribe({
      next: (playlist) => {
        // Then add tracks in bulk
        this.playlistService.addTracksToPlaylist(playlist.id, trackIds).subscribe({
          next: () => {
            this.success.set('Playlist created successfully!');
            setTimeout(() => {
              this.close();
            }, 1500);
          },
          error: (err) => {
            console.error('Error adding tracks:', err);
            this.error.set('Playlist created but failed to add tracks');
            this.submitting.set(false);
          }
        });
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
    this.trackSearch.setValue('');
    this.results = [];
    this.showResults = false;
  }

  /**
   * Format track duration (seconds to mm:ss)
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  trackById = (_: number, it: Track) => it.id;
}
