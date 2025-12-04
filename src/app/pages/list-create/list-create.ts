import { Component, inject, signal } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Album, Track,  } from '../../models/playlist.models';
import {CreatePlaylistRequest, PlaylistService} from '../../services/playlist.service';


interface SelectedAlbum extends Album {
  tracks: Track[];
  selectedTrackIds: Set<string>;
  loadingTracks: boolean;
  expanded: boolean;
}

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

  // Selected albums with tracks
  selected: SelectedAlbum[] = [];

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
   * Add album to selected list and load its tracks
   */
  addAlbum(album: Album): void {
    if (this.selected.some(a => a.id === album.id)) {
      this.error.set('Album already added');
      setTimeout(() => this.error.set(null), 3000);
      return;
    }

    const selectedAlbum: SelectedAlbum = {
      ...album,
      tracks: [],
      selectedTrackIds: new Set(),
      loadingTracks: true,
      expanded: true
    };

    this.selected = [...this.selected, selectedAlbum];
    this.clearSearch();

    // Load tracks for the album
    this.playlistService.getAlbumTracks(album.id).subscribe({
      next: (tracks) => {
        this.selected = this.selected.map(a =>
          a.id === album.id
            ? { ...a, tracks, loadingTracks: false, selectedTrackIds: new Set(tracks.map(t => t.id)) }
            : a
        );
      },
      error: (err) => {
        console.error('Error loading tracks:', err);
        this.selected = this.selected.filter(a => a.id !== album.id);
        this.error.set('Failed to load album tracks');
        setTimeout(() => this.error.set(null), 3000);
      }
    });
  }

  /**
   * Remove album from selected list
   */
  removeAlbum(album: SelectedAlbum): void {
    this.selected = this.selected.filter(a => a.id !== album.id);
  }

  /**
   * Toggle album expansion
   */
  toggleAlbum(album: SelectedAlbum): void {
    this.selected = this.selected.map(a =>
      a.id === album.id ? { ...a, expanded: !a.expanded } : a
    );
  }

  /**
   * Toggle track selection
   */
  toggleTrack(album: SelectedAlbum, trackId: string): void {
    this.selected = this.selected.map(a => {
      if (a.id === album.id) {
        const newSelectedTracks = new Set(a.selectedTrackIds);
        if (newSelectedTracks.has(trackId)) {
          newSelectedTracks.delete(trackId);
        } else {
          newSelectedTracks.add(trackId);
        }
        return { ...a, selectedTrackIds: newSelectedTracks };
      }
      return a;
    });
  }

  /**
   * Toggle all tracks for an album
   */
  toggleAllTracks(album: SelectedAlbum): void {
    this.selected = this.selected.map(a => {
      if (a.id === album.id) {
        const allSelected = a.selectedTrackIds.size === a.tracks.length;
        return {
          ...a,
          selectedTrackIds: allSelected ? new Set() : new Set(a.tracks.map(t => t.id))
        };
      }
      return a;
    });
  }

  /**
   * Check if track is selected
   */
  isTrackSelected(album: SelectedAlbum, trackId: string): boolean {
    return album.selectedTrackIds.has(trackId);
  }

  /**
   * Check if all tracks are selected
   */
  areAllTracksSelected(album: SelectedAlbum): boolean {
    return album.selectedTrackIds.size === album.tracks.length && album.tracks.length > 0;
  }

  /**
   * Get total selected track count
   */
  getSelectedTrackCount(): number {
    return this.selected.reduce((total, album) => total + album.selectedTrackIds.size, 0);
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
  drop(ev: CdkDragDrop<SelectedAlbum[]>): void {
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
    const trackIds: string[] = [];
    this.selected.forEach(album => {
      album.selectedTrackIds.forEach(trackId => trackIds.push(trackId));
    });

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
    this.albumSearch.setValue('');
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
}
