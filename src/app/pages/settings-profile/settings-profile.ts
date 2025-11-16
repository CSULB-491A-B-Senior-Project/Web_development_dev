import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, CdkDragDrop, CdkDragHandle, CdkDragPreview, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

// Import your services and models
import { ProfileService } from '../../services/profile.service';
import { MusicSearchService } from '../../services/music-search.service';
import { Artist, Album, Song } from '../../models/music.models'; // Corrected path

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
    CdkDragPlaceholder,
    NgOptimizedImage,
  ],
})
export class SettingsProfile implements AfterViewInit {
  #fb = inject(FormBuilder);
  #profileService = inject(ProfileService);
  #musicSearchService = inject(MusicSearchService);

  // Signals for state management
  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);
  songResults = signal<Song[]>([]);
  artistResults = signal<Artist[]>([]);
  albumResults = signal<Album[]>([]);
  showSongResults = signal(false);
  showArtistResults = signal(false);
  showAlbumResults = signal(false);

  // Forms
  bioForm = this.#fb.group({
    bio: ['', [Validators.maxLength(150)]],
  });
  songSearch = new FormControl('');
  artistSearch = new FormControl('');
  albumSearch = new FormControl('');

  // View Children
  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  constructor() {
    this.loadInitialData();

    // Search logic now calls the service
    this.songSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showSongResults.set(!!value)),
      switchMap(term => this.#musicSearchService.searchSongs(term ?? ''))
    ).subscribe(songs => this.songResults.set(songs));

    this.artistSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showArtistResults.set(!!value)),
      switchMap(term => this.#musicSearchService.searchArtists(term ?? ''))
    ).subscribe(artists => this.artistResults.set(artists));

    this.albumSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showAlbumResults.set(!!value)),
      switchMap(term => this.#musicSearchService.searchAlbums(term ?? ''))
    ).subscribe(albums => this.albumResults.set(albums));
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.autoResizeBio(), 0);
  }

  autoResizeBio(): void {
    const textarea = this.bioTextarea()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  loadInitialData() {
    this.#profileService.getProfile().pipe(take(1)).subscribe(profile => {
      this.bioForm.patchValue({ bio: profile.bio });
      this.favoriteSong.set(profile.favoriteSong);
      this.favoriteArtists.set(profile.favoriteArtists);
      this.favoriteAlbums.set(profile.favoriteAlbums);
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.selectedFileName.set(file.name);
      this.#profileService.uploadBackgroundImage(file).pipe(take(1)).subscribe(response => {
        console.log('Image uploaded successfully:', response.url);
      });
    }
  }

  onBioSubmit(): void {
    if (this.bioForm.valid) {
      const bio = this.bioForm.value.bio ?? '';
      this.#profileService.updateBio(bio).pipe(take(1)).subscribe(() => {
        console.log('Bio updated successfully');
      });
    }
  }

  selectSong(song: Song): void {
    this.favoriteSong.set(song);
    this.songSearch.setValue('');
  }

  clearFavoriteSong(): void {
    this.favoriteSong.set(null);
  }

  saveFavoriteSong(): void {
    this.#profileService.updateFavoriteSong(this.favoriteSong()).pipe(take(1)).subscribe(() => {
      console.log('Favorite song saved successfully');
    });
  }

  addArtist(artist: Artist): void {
    if (!this.favoriteArtists().some(a => a.id === artist.id)) {
      this.favoriteArtists.update(artists => [...artists, artist]);
    }
    this.artistSearch.setValue('');
  }

  removeArtist(artistToRemove: Artist): void {
    this.favoriteArtists.update(artists => artists.filter(artist => artist.id !== artistToRemove.id));
  }

  addAlbum(album: Album): void {
    if (!this.favoriteAlbums().some(a => a.id === album.id)) {
      this.favoriteAlbums.update(albums => [...albums, album]);
    }
    this.albumSearch.setValue('');
  }

  removeAlbum(albumToRemove: Album): void {
    this.favoriteAlbums.update(albums => albums.filter(album => album.id !== albumToRemove.id));
  }

  dropArtist(event: CdkDragDrop<Artist[]>): void {
    this.favoriteArtists.update(artists => {
        const newArray = [...artists];
        moveItemInArray(newArray, event.previousIndex, event.currentIndex);
        return newArray;
    });
  }

  dropAlbum(event: CdkDragDrop<Album[]>): void {
     this.favoriteAlbums.update(albums => {
        const newArray = [...albums];
        moveItemInArray(newArray, event.previousIndex, event.currentIndex);
        return newArray;
    });
  }

  saveFavoriteArtists(): void {
    this.#profileService.updateFavoriteArtists(this.favoriteArtists()).pipe(take(1)).subscribe(() => {
      console.log('Favorite artists saved successfully');
    });
  }

  saveFavoriteAlbums(): void {
    this.#profileService.updateFavoriteAlbums(this.favoriteAlbums()).pipe(take(1)).subscribe(() => {
      console.log('Favorite albums saved successfully');
    });
  }
}