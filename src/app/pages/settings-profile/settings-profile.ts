import { ChangeDetectionStrategy, Component, ElementRef, AfterViewInit, inject, signal, viewChild, computed, DestroyRef } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError, map, finalize } from 'rxjs/operators';
import { of, from, forkJoin, Subject, EMPTY } from 'rxjs';
import { take } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ProfileService } from '../../services/profile.service';
import { MusicSearchService } from '../../services/music-search.service';
import { SearchService, SearchItem } from '../../services/search.service';
import { ArtistService } from '../../services/artist.service';
import { AlbumReviewsService } from '../../services/album-reviews.service';
import { Artist, Album, Song } from '../../models/music.models';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../api.service';
import { environment } from '../../../environments/environment';
import { SidebarComponent } from '../../ui/sidebar/sidebar';
import { ProfilePictureStore } from '../../ui/navbar/profile-picture.store';
import { FollowService } from '../../services/follow.service';

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgOptimizedImage,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    SidebarComponent
  ],
})
export class SettingsProfile implements AfterViewInit {
  #nfb = inject(NonNullableFormBuilder);
  #profileService = inject(ProfileService);
  #searchService = inject(SearchService);
  #musicSearchService = inject(MusicSearchService);
  #artistService = inject(ArtistService);
  #albumReviews = inject(AlbumReviewsService);
  #http = inject(HttpClient);
  #apiService = inject(ApiService);

  private apiBase = (environment.apiBaseUrl ?? '').replace(/\/$/, '');

  readonly placeholderArtist = '/assets/default-profile.png';
  readonly placeholderAlbum = '/assets/placeholder.png';

  profilePictureUrl = signal<string>('/assets/default-profile.png');
  profilePicFileName = signal<string>('');
  private localBlobUrl = signal<string | null>(null);

  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);
  artistRanks = signal<{ artistId: string; rank: number }[]>([]);

  unheartedAlbumIds = signal<Set<string>>(new Set());
  backgroundImageUrl = signal<string | null>(null);

  isAlbumUnhearted(album: Album): boolean {
    return this.unheartedAlbumIds().has(album.id);
  }

  private resolveImageUrl(raw?: unknown): string {
    const placeholder = '/assets/default-profile.png';
    const v = (raw ?? '').toString().trim();
    if (!v) return placeholder;
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('blob:') || v.startsWith('data:')) return v;
    const base = this.apiBase || window.location.origin;
    if (v.startsWith('/')) return `${base}${v}`;
    return `${base}/${v}`;
  }

  private deriveFileNameFromUrl(url: string | null | undefined): string {
    if (!url) return '';
    try {
      const u = new URL(url, window.location.origin);
      const last = u.pathname.split('/').filter(Boolean).pop() || '';
      return decodeURIComponent(last);
    } catch {
      const clean = (url || '').split(/[?#]/)[0];
      const last = clean.split('/').filter(Boolean).pop() || '';
      try { return decodeURIComponent(last); } catch { return last; }
    }
  }

  private extractBackgroundUrl(p: Record<string, unknown> | null | undefined): string | null {
    const src = p ?? {};
    const raw =
      src['backgroundImageUrl'] ??
      src['backgroundUrl'] ??
      src['bannerImageUrl'] ??
      src['bannerUrl'] ??
      src['coverImageUrl'] ??
      src['background'] ??
      src['bgImageUrl'] ??
      src['bgImage'] ??
      '';
    const v = (raw ?? '').toString().trim();
    return v ? this.resolveImageUrl(v) : null;
  }

  private normalizeAlbumFromApi(a: unknown): Album {
    const src = a as Record<string, unknown>;
    const id = (src['albumId'] as string) ?? (src['id'] as string) ?? '';
    const name = (src['albumName'] as string) ?? (src['title'] as string) ?? (src['name'] as string) ?? '';

    const artistName =
      (typeof src['artistName'] === 'string' ? (src['artistName'] as string) : undefined) ??
      (typeof src['username'] === 'string' ? (src['username'] as string) : undefined) ??
      '';

    const coverRaw = src['albumImageUrl'] ?? src['imageUrl'] ?? src['coverArt'] ?? src['albumCover'] ?? '';
    const albumCover = this.resolveImageUrl(coverRaw);
    // console.log('Album raw:', artistName);

    const releaseDate = src['releaseDate'] ?? src['year'] ?? src['releaseYear'] ?? src['dateLabel'];
    const year =
      typeof releaseDate === 'number'
        ? releaseDate
        : typeof releaseDate === 'string'
          ? (Number.isNaN(new Date(releaseDate).getTime())
              ? Number.parseInt(releaseDate, 10) || undefined
              : new Date(releaseDate).getFullYear())
          : undefined;

    return { id, name, albumCover: albumCover || this.placeholderAlbum, artist: { artistName }, releaseYear: year } as Album;
  }

  private normalizeTrackFromApi(raw: any): Song {
  return {
    id: raw.id,
    name: raw.name,
    artistName: raw.artistName ?? raw.artistNames ?? 'Unknown Artist',
    albumCoverUrl: raw.albumCoverUrl ?? raw.albumCover ?? this.placeholderAlbum,
    durationMs: typeof raw.duration === 'number' ? raw.duration * 1000 : undefined,
    trackNumber: raw.trackNumber,
    previewUrl: raw.previewUrl,
    raw
  };
}

  private msToMinSec(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  songResults = signal<Song[]>([]);
  private _artistResultsRaw = signal<Artist[]>([]);
  private _albumResultsRaw = signal<Album[]>([]);

  artistResults = computed(() => {
    const favoriteIds = new Set(this.favoriteArtists().map(a => a.id));
    return this._artistResultsRaw().filter(a => !favoriteIds.has(a.id));
  });

  albumResults = computed(() => {
    const favoriteIds = new Set(this.favoriteAlbums().map(a => a.id));
    return this._albumResultsRaw().filter(a => !favoriteIds.has(a.id));
  });

  trackSearchForm = this.#nfb.group({ query: '' as string });
  trackSearchQuery = signal('');
  private _trackResultsRaw = signal<Song[]>([]);
  trackResults = computed(() => this._trackResultsRaw());

  songSearchQuery = signal('');
  artistSearchQuery = signal('');
  albumSearchQuery = signal('');

  followedArtistSearchQuery = signal('');
  followedArtistSearchForm = this.#nfb.group({ query: '' });
  followedArtistResults = signal<Artist[]>([]);
  loadingFollowedArtistSearch = signal(false);
  followedArtistSearchError = signal<string | null>(null);
  showFollowedArtistResults = signal(false);

  #followService = inject(FollowService);

  bioForm = this.#nfb.group({
    bio: ['', [Validators.maxLength(150)]]
  });
  songSearchForm = this.#nfb.group({ query: '' });
  artistSearchForm = this.#nfb.group({ query: '' });
  albumSearchForm = this.#nfb.group({ query: '' });

  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  loadingSongSearch = signal(false);
  loadingAlbumSearch = signal(false);
  songSearchError = signal<string | null>(null);
  albumSearchError = signal<string | null>(null);

  private destroyRef = inject(DestroyRef);

  private toYear(raw: unknown): number | undefined {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const s = raw.trim();
      const m = s.match(/\b(19|20)\d{2}\b/);
      if (m) return Number.parseInt(m[0], 10);

      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.getUTCFullYear();
      const n = Number.parseInt(s, 10);
      return Number.isNaN(n) ? undefined : n;
    }
    if (raw instanceof Date) return raw.getUTCFullYear();
    return undefined;
  }

  private enrichFavoriteAlbumsViaDetails(albums: Album[]): void {
    const ids = albums.map(a => a.id).filter(Boolean);
    if (!ids.length) return;

    const requests = ids.map(id =>
      this.#albumReviews.getAlbumById(id).pipe(catchError(() => of(null)))
    );

    forkJoin(requests).pipe(take(1)).subscribe(detailsList => {
      const byId = new Map<string, any>();
      detailsList.forEach((d: any) => {
        const did = d?.id ?? d?.albumId ?? d?.spotifyAlbumId;
        if (did) byId.set(did, d);
      });

      const merged = albums.map(a => {
        const d = byId.get(a.id);
        const match = d ?? detailsList.find((x: any) =>
          (x?.albumName ?? x?.name)?.toString().toLowerCase() === (a.name ?? '').toLowerCase() &&
          (x?.artistName ?? x?.artist?.artistName ?? '').toString().toLowerCase() === (a.artist?.artistName ?? '').toLowerCase()
        );

        if (!match) return a;

        const rawYear = match.releaseYear ?? match.year ?? match.releaseDate ?? match.dateLabel;
        const year = this.toYear(rawYear);

        const cover = this.resolveImageUrl(
          match.albumImageUrl ?? match.imageUrl ?? match.coverArt ?? match.albumCover
        );
        const name = match.albumName ?? match.title ?? match.name ?? a.name;

        return {
          ...a,
          name,
          releaseYear: a.releaseYear ?? year,
          albumCover: a.albumCover || cover
        };
      });

      this.favoriteAlbums.set(merged);
    });
  }

  private currentUserKey = 'me';

  constructor(private router: Router, private pictureStore: ProfilePictureStore) {
    // Load profile
    this.#profileService.getProfile().pipe(take(1)).subscribe({
      next: (p: any) => {
        console.log('[SettingsProfile] Loaded profile payload:', p);

        // FIX: normalize favorite artists with artistId / artistImageUrl / rank
        interface RawFavoriteArtist {
          artistId?: string;
          id?: string;
          artistName?: string;
          name?: string;
          artistImageUrl?: string;
          artistImage?: string;
          imageUrl?: string;
          rank?: number;
        }

        // FIX: keep normalized favorites once
        interface RawFavoriteArtist {
          artistId?: string;
          id?: string;
          artistName?: string;
          name?: string;
          artistImageUrl?: string;
          artistImage?: string;
          imageUrl?: string;
          rank?: number;
        }

        interface RawFavoriteArtist {
          artistId?: string;
          id?: string;
          artistName?: string;
          name?: string;
          artistImageUrl?: string;
          artistImage?: string;
          imageUrl?: string;
          rank?: number;
        }

        const artistsFromProfile: Artist[] = ((p.favoriteArtists ?? []) as RawFavoriteArtist[]).map((a: RawFavoriteArtist): Artist => ({
          id: a.artistId ?? a.id ?? '',
          artistName: a.artistName ?? a.name ?? '',
          artistImage: a.artistImageUrl ?? a.artistImage ?? a.imageUrl ?? this.placeholderArtist,
          rank: typeof a.rank === 'number' ? a.rank : undefined
        } as Artist)).filter((a: Artist): boolean => !!a.id);

        if (artistsFromProfile.length) {
          this.favoriteArtists.set(artistsFromProfile);
          this.artistRanks.set(
            artistsFromProfile
              .filter(a => typeof a.rank === 'number')
              .map(a => ({ artistId: a.id, rank: a.rank as number }))
          );
        }

        const bio = p.bio ?? '';
        this.bioForm.patchValue({ bio }, { emitEvent: false });
        this.bioForm.markAsPristine();

        const url = this.resolveImageUrl(
          p.profilePictureUrl ?? p.profileImageUrl ?? p.avatarUrl ?? p.picture ?? p.imageUrl ?? p.profilePicture
        );
        this.profilePictureUrl.set(url);
        this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
        this.pictureStore.profilePictureUrl.set(url);

        const bgUrl = this.extractBackgroundUrl(p);
        this.backgroundImageUrl.set(bgUrl);
        this.selectedFileName.set(this.deriveFileNameFromUrl(bgUrl));

        // Hydrate favorite song from favoriteSongId if present
        const favSongId = (p.favoriteSongId ?? p.favoriteSong?.id) as string | undefined;
        if (favSongId) {
          this.#musicSearchService.getSongById(favSongId).pipe(take(1)).subscribe({
            next: (song: Song | null) => {
              // Safely extract albumId from song.raw
              const albumId =
                song && song.raw && typeof song.raw === 'object' && song.raw !== null && 'albumId' in song.raw
                  ? (song.raw as { albumId?: string }).albumId
                  : undefined;

              if (song && albumId) {
                this.#albumReviews.getAlbumById(albumId).pipe(take(1)).subscribe(albumRaw => {
                  const album = this.normalizeAlbumFromApi(albumRaw);
                  this.favoriteSong.set({
                    id: song.id,
                    name: song.name,
                    artistName: album.artist?.artistName ?? '',
                    albumCoverUrl: album.albumCover ?? this.placeholderAlbum,
                    trackNumber: song.trackNumber,
                    durationMs: song.durationMs,
                    previewUrl: song.previewUrl,
                    raw: song.raw
                  });
                });
              } else if (song) {
                // Fallback if no albumId
                this.favoriteSong.set({
                  ...song,
                  artistName: song.artistName ?? '',
                  albumCoverUrl: song.albumCoverUrl ?? this.placeholderAlbum
                });
              } else {
                // Fallback if song not found
                this.favoriteSong.set({
                  id: favSongId,
                  name: 'Favorite song',
                  artistName: '',
                  albumCoverUrl: this.placeholderAlbum,
                  trackNumber: 0,
                  raw: { id: favSongId }
                });
              }
            },
            error: () => {
              this.favoriteSong.set({
                id: favSongId,
                name: 'Favorite song',
                artistName: '',
                albumCoverUrl: this.placeholderAlbum,
                trackNumber: 0,
                raw: { id: favSongId }
              });
            }
          });
        } else {
          this.favoriteSong.set(p.favoriteSong ?? null);
        }

        // const artists = (p.favoriteArtists ?? []).map((a: any) => ({
        //   id: a.id,
        //   artistName: a.artistName ?? a.name ?? '',
        //   artistImage: a.artistImage ?? a.imageUrl ?? this.placeholderArtist
        // } as Artist));
        // this.favoriteArtists.set(artists);

        const albums = (p.favoriteAlbums ?? []).map((al: any) => this.normalizeAlbumFromApi(al));
        this.favoriteAlbums.set(albums);

        // Store the real user id if present
        const uid = (p?.id ?? p?.userId)?.toString();
        if (uid) this.currentUserKey = uid;
      },
      error: (err) => console.error('Failed to load profile', err)
    });

    // Load favorites via dedicated endpoint, but avoid overwriting with empty
    this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe({
      next: (artists) => {
        console.log('[SettingsProfile] Favorite Artists endpoint payload:', artists);

        const normalized = (artists ?? []).map((x: unknown) => {
          const src = x as Record<string, unknown>;
          const id = (src['artistId'] as string) ?? (src['id'] as string) ?? '';
          return {
            id,
            artistName: (src['artistName'] as string) ?? (src['name'] as string) ?? '',
            artistImage: (src['artistImageUrl'] as string) ?? (src['artistImage'] as string) ?? (src['imageUrl'] as string) ?? this.placeholderArtist,
            rank: typeof src['rank'] === 'number' ? (src['rank'] as number) : undefined
          } as Artist;
        }).filter(a => !!a.id);

        if (normalized.length) {
          this.favoriteArtists.set(normalized);
          this.artistRanks.set(
            normalized
              .filter(a => typeof a.rank === 'number')
              .map(a => ({ artistId: a.id, rank: a.rank as number }))
          );
        } else {
          console.log('[SettingsProfile] Endpoint returned empty favorites; keeping existing state.');
        }
      },
      error: (err) => console.error('Failed to load favorite artists', err)
    });

    this.#profileService.getFavoriteAlbums().pipe(take(1)).subscribe({
      next: (albums) => {
        if(albums && albums.length) {
          const normalized = (albums ?? []).map((al: unknown) => this.normalizeAlbumFromApi(al));
          this.favoriteAlbums.set(normalized);
          this.enrichFavoriteAlbumsViaDetails(normalized);
        }
      },
      error: (err) => console.error('Failed to load favorite albums', err)
    });

    // ------------------------------
// FAVORITE SONG SEARCH
// ------------------------------
const songSub = this.songSearchForm.controls.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),

  tap(raw => {
  if (typeof raw === 'string') {
    this.songSearchQuery.set(raw.trim());
  }
}),

  switchMap(raw => {
    const term = (raw ?? '').toString().trim();
    if (!term) {
      this.songResults.set([]); // clear list
      return of<Song[]>([]);
    }

    // ⭐ This MUST call MusicSearchService
    return this.#musicSearchService.searchSongs(term).pipe(
      take(1),
      catchError(err => {
        console.error("Favorite Song Search Failed:", err);
        this.songSearchError.set("Search failed");
        return of<Song[]>([]);
      })
    );
  })
).subscribe({
  next: songs => {
    // ⭐⭐ THIS IS THE LINE THAT MAKES THE UI ACTUALLY UPDATE ⭐⭐
    // this.songResults.set(songs);

    // this.loadingSongSearch.set(false);
   
    const normalized = songs.map(s => this.normalizeTrackFromApi(s));
    this.songResults.set(normalized);
    this.loadingSongSearch.set(false);
    console.log("QUERY:", this.songSearchQuery());
    console.log("RESULTS:", this.songResults());
    console.log("VISIBLE:", this.songSearchQuery() && this.songResults().length > 0);
    console.log("WHAT SETTINGS-PROFILE RECEIVED:", songs, Array.isArray(songs));

  },
  error: err => {
    console.error("Unhandled Favorite Song Search error:", err);
    this.loadingSongSearch.set(false);
  }
});

    // ALBUM SEARCH, ARTIST SEARCH, TRACK SEARCH
    const albumSub = this.albumSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.albumSearchQuery.set(v ?? ''); this.loadingAlbumSearch.set(!!(v ?? '').toString().trim()); this.albumSearchError.set(null); }),
      switchMap(raw => {
        const term = (raw ?? '').toString().trim();
        return term
          ? this.#searchService.search({ query: term, tab: 'albums', page: 1, pageSize: 20 }).pipe(take(1))
          : of<{ items: SearchItem[]; total: number }>({ items: [], total: 0 });
      })
    ).subscribe({
      next: (res: { items: SearchItem[]; total: number }) => {
        const albums = (res.items || [])
          .filter(it => it.type === 'album')
          .map(it => this.normalizeAlbumFromApi({
            id: it.id,
            albumName: it.title,
            albumImageUrl: it.imageUrl,
            artistName: it.username,
            releaseDate: it.dateLabel
          }));
        this._albumResultsRaw.set(albums);
        this.loadingAlbumSearch.set(false);
      },
      error: () => {
        this._albumResultsRaw.set([]);
        this.albumSearchError.set('Search failed');
        this.loadingAlbumSearch.set(false);
      }
    });

    const artistSub = this.artistSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(v => { this.artistSearchQuery.set(v ?? ''); }),
      switchMap(raw => {
        const term = (raw ?? '').toString().trim();
        return term
          ? this.#searchService.search({ query: term, tab: 'artists', page: 1, pageSize: 20 }).pipe(take(1))
          : of<{ items: any[]; total: number }>({ items: [], total: 0 });
      })
    ).subscribe({
      next: res => {
        const artists = (res.items || []).filter((it: SearchItem) => it.type === 'artist').map((it: SearchItem) => ({
          id: it.id,
          artistName: it.title || it.username,
          artistImage: it.imageUrl || this.placeholderArtist
        } as Artist));
        this._artistResultsRaw.set(artists);
      },
      error: () => {
        this._artistResultsRaw.set([]);
      }
    });

    const trackSub = this.trackSearchForm.controls.query.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),

  tap(raw => {
    this.trackSearchQuery.set((raw ?? '').toString().trim());
  }),

  switchMap(raw => {
    const term = (raw ?? '').toString().trim();
    if (!term) return of<Song[]>([]);

    // ⭐ THE FIX — call the RIGHT service
    return this.#musicSearchService.searchSongs(term);
  })
).subscribe({
  next: songs => this._trackResultsRaw.set(songs),
  error: err => console.error("Track search error:", err)
});


      // Followed artist search
    const followedArtistSub = this.followedArtistSearchForm.controls.query.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(query => {
        this.followedArtistSearchQuery.set(query ?? '');
        if (!query?.trim()) {
          this.followedArtistResults.set([]);
          this.loadingFollowedArtistSearch.set(false);
        }
      }),
      switchMap(raw => {
        const term = (raw ?? '').toString().trim();
        if (!term) return of<Artist[]>([]);
        
        this.loadingFollowedArtistSearch.set(true);
        this.followedArtistSearchError.set(null);
        
        // Get the user's actual followed artists first
        return this.#followService.getUserArtistFollowList(this.currentUserKey).pipe(
          map(followedList => {
            // Filter the followed artists by the search term
            const searchTerm = term.toLowerCase();
            return followedList
              .filter((artistData: any) => {
                const artistName = (artistData.artistName ?? artistData.name ?? '').toLowerCase();
                return artistName.includes(searchTerm);
              })
              .map((artistData: any) => ({
                id: artistData.id ?? artistData.artistId,
                artistName: artistData.artistName ?? artistData.name ?? 'Unknown Artist',
                artistImage: artistData.artistImage ?? artistData.imageUrl ?? this.placeholderArtist
              } as Artist))
              // Filter out artists already in favorites
              .filter(artist => !this.favoriteArtists().some(fav => fav.id === artist.id));
          }),
          catchError(err => {
            console.error('Failed to load followed artists', err);
            this.followedArtistSearchError.set('Failed to load followed artists.');
            return of<Artist[]>([]);
          })
        );
      })
    ).subscribe({
      next: results => {
        this.loadingFollowedArtistSearch.set(false);
        this.followedArtistResults.set(results);
      },
      error: () => {
        this.loadingFollowedArtistSearch.set(false);
      }
    });

    this.destroyRef.onDestroy(() => {
      songSub.unsubscribe();
      albumSub.unsubscribe();
      artistSub.unsubscribe();
      trackSub.unsubscribe();
      followedArtistSub.unsubscribe();
    });
    }

    ngAfterViewInit(): void {
      setTimeout(() => this.autoResizeBio(), 0);

      // Serialize and debounce rank saves
      this.rankSaves$
        .pipe(
          debounceTime(250),
          map(p => JSON.stringify(p)),         // dedupe identical payloads
          distinctUntilChanged(),
          switchMap(json => {
            const payload = JSON.parse(json) as { artistId: string; rank: number }[];
            return this.#profileService.updateFavoriteArtistRanks(payload).pipe(
              catchError(err => {
                console.error('[SettingsProfile] Rank save failed:', err?.status ?? 0, err?.error ?? err);
                return EMPTY;
              })
            );
          })
        )
        .subscribe();
    }

  onLogout(): void {
    this.#apiService.logout?.();
    this.router.navigate(['/login']);
  }

  autoResizeBio(): void {
    const el = this.bioTextarea()?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  private requestSignedUrl(fileName: string, contentType: string, type: 'profile' | 'bg') {
    const url = `${this.apiBase}/v1/Bucket/signed-url`;
    const payload = { fileName, contentType, type };
    return this.#http.post<{ signedUrl?: string; filePath?: string }>(url, payload).pipe(
      take(1),
      catchError(err => {
        console.error('Failed to request signed URL', err);
        return of({ signedUrl: undefined, filePath: undefined });
      })
    );
  }

  private uploadToSignedUrlUsingFetch(signedUrl: string, file: File) {
    return from(fetch(signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file
    }).then(res => {
      if (!res.ok) throw new Error(`Upload failed with status ${res.status}`);
      return true;
    }));
  }

  onProfilePictureSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      this.profilePicFileName.set('');
      return;
    }

    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 3 * 1024 * 1024;
    this.profilePicFileName.set(file.name);

    if (!validType || !validSize) {
      input.value = '';
      return;
    }

    const blobUrl = URL.createObjectURL(file);
    const prevBlob = this.localBlobUrl();
    if (prevBlob) URL.revokeObjectURL(prevBlob);
    this.localBlobUrl.set(blobUrl);
    this.profilePictureUrl.set(blobUrl);

    this.requestSignedUrl(file.name, file.type || 'application/octet-stream', 'profile').pipe(
      switchMap(res => {
        const signedUrl = res?.signedUrl;
        const filePath = res?.filePath;
        if (!signedUrl || !filePath) {
          throw new Error('Signed URL or filePath not returned by server');
        }
        return this.uploadToSignedUrlUsingFetch(signedUrl, file).pipe(map(uploadOk => ({ uploadOk, filePath })));
      }),
      switchMap(({ uploadOk, filePath }) => {
        if (!uploadOk) throw new Error('Upload to storage failed');
        return this.#profileService.confirmUpload(filePath, 'profile');
      }),
      take(1)
    ).subscribe({
      next: () => {
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const pAny = p as any;
          const url = this.resolveImageUrl(
            pAny.profilePictureUrl ?? pAny.profileImageUrl ?? pAny.avatarUrl ?? pAny.picture ?? pAny.imageUrl ?? pAny.profilePicture
          );
          const busted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
          this.profilePictureUrl.set(busted);
          this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
          this.pictureStore.profilePictureUrl.set(busted);
        });
      },
      error: (err) => {
        console.error('Profile upload/confirm failed', err);
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const pAny = p as any;
          const url = this.resolveImageUrl(
            pAny.profilePictureUrl ?? pAny.profileImageUrl ?? pAny.avatarUrl ?? pAny.picture ?? pAny.imageUrl ?? pAny.profilePicture
          );
          this.profilePictureUrl.set(url);
          this.profilePicFileName.set(this.deriveFileNameFromUrl(url));
          this.pictureStore.profilePictureUrl.set(url);
        });
      }
    });

    input.value = '';
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedFileName.set(file.name);

    const validType = /^image\/(png|jpe?g|webp)$/i.test(file.type);
    const validSize = file.size <= 5 * 1024 * 1024;
    if (!validType || !validSize) return;

    this.requestSignedUrl(file.name, file.type || 'application/octet-stream', 'bg').pipe(
      switchMap(res => {
        const signedUrl = res?.signedUrl;
        const filePath = res?.filePath;
        if (!signedUrl || !filePath) {
          throw new Error('Signed URL or filePath not returned by server');
        }
        return this.uploadToSignedUrlUsingFetch(signedUrl, file).pipe(map(uploadOk => ({ uploadOk, filePath })));
      }),
      switchMap(({ uploadOk, filePath }) => {
        if (!uploadOk) throw new Error('Upload to storage failed');
        return this.#profileService.confirmUpload(filePath, 'bg');
      }),
      take(1)
    ).subscribe({
      next: () => {
        this.#profileService.getProfile().pipe(take(1)).subscribe(p => {
          const bgUrl = this.extractBackgroundUrl(p as any);
          this.backgroundImageUrl.set(bgUrl);
          this.selectedFileName.set(this.deriveFileNameFromUrl(bgUrl));
        });
      },
      error: (err) => console.error('Background upload failed', err)
    });
  }

  viewBackground(): void {
    const url = this.backgroundImageUrl();
    if (!url) return;
    window.open(url, '_blank');
  }

  onBioSubmit(): void {
    if (this.bioForm.invalid) return;
    const bio = this.bioForm.value.bio ?? '';
    this.#profileService.updateBio(bio).pipe(take(1)).subscribe({
      next: () => this.bioForm.markAsPristine(),
      error: (err) => console.error('Failed to update bio', err)
    });
  }

  onSearchListClick(e: MouseEvent): void {
    console.log('[SettingsProfile] list clicked', e.target);
  }

  selectSong(song: Song): void {
  if (!song?.id) return;
  console.log('[SettingsProfile] selectSong triggered:', song);

  const prev = this.favoriteSong();

  this.#profileService.updateFavoriteSong(song.id).pipe(take(1)).subscribe({
    next: () => {
      const normalized = this.normalizeTrackFromApi(song.raw ?? song);
      this.favoriteSong.set(normalized);
      this.songSearchForm.controls.query.setValue('');
      this.songResults.set([]);
      console.log('favoriteSong after set:', this.favoriteSong());
    },
    error: (err) => {
      console.error('Failed to update favorite song', err);
      this.favoriteSong.set(prev);
    }
  });
}


  isArtistFavorited(artistId: string): boolean {
    return this.favoriteArtists().some(fav => fav.id === artistId);
  }

  clearFavoriteSong(): void {
    const prev = this.favoriteSong();
    this.favoriteSong.set(null);

    // Send null to clear (only id/null is needed)
    this.#profileService.updateFavoriteSong(null).pipe(take(1)).subscribe({
      next: () => {},
      error: () => this.favoriteSong.set(prev)
    });
  }

  // addArtistToFavorites(artist: Artist): void {
  //   if (!artist?.id) return;
  //   if (this.favoriteArtists().some(a => a.id === artist.id)) return;

  //   const prev = this.favoriteArtists();

  //   // Append to the bottom (end of the list)
  //   const updated = [...prev, artist];

  //   // Recompute top 10 ranks from the updated list
  //   const top10 = updated.slice(0, 10);
  //   const ranked = top10
  //     .map((a, idx) => ({
  //       artistId: (a as unknown as { artistId?: string }).artistId ?? a.id,
  //       rank: idx + 1
  //     }))
  //     .filter(r => !!r.artistId);

  //   console.log('[SettingsProfile] Ranked favorite artists payload (PUT):', ranked);

  //   // Optimistic UI
  //   this.favoriteArtists.set(updated);
  //   this.artistRanks.set(ranked);

  //   if (ranked.length === 0) {
  //     console.warn('[SettingsProfile] Skipping PUT (no valid artistId values).');
  //     return;
  //   }

  //   this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
  //     next: () => {},
  //     error: (err) => {
  //       console.error('Update favorite artist ranks failed:', err?.status ?? 0, err?.error ?? err);
  //       this.favoriteArtists.set(prev);
  //       this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => {
  //         const normalized = (a ?? []).map((x: any) => ({
  //           id: x.artistId ?? x.id,
  //           artistName: x.artistName ?? x.name ?? '',
  //           artistImage: x.artistImageUrl ?? x.artistImage ?? x.imageUrl ?? this.placeholderArtist,
  //           rank: x.rank
  //         })).filter((z: Artist) => !!z.id);
  //         this.favoriteArtists.set(normalized);
  //         this.artistRanks.set(
  //           normalized
  //             .filter(z => typeof z.rank === 'number')
  //             .map(z => ({ artistId: z.id, rank: z.rank as number }))
  //         );
  //       });
  //     }
  //   });
  // }

  // removeArtistFromFavorites(artist: Artist): void {
  //   const updated = this.favoriteArtists().filter(a => a.id !== artist.id);
  //   this.favoriteArtists.set(updated);
  //   const ranked = updated.slice(0, 10).map((a, idx) => ({ artistId: a.id, rank: idx + 1 }));
  //   this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
  //     error: () => this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(a ?? []))
  //   });
  // }

  addAlbumToFavorites(album: Album): void {
    const updated = [album, ...this.favoriteAlbums().filter(a => a.id !== album.id)];
    this.favoriteAlbums.set(updated);
    this.unheartedAlbumIds.update(prev => {
      const next = new Set(prev);
      next.delete(album.id);
      return next;
    });

    this.#profileService.addFavoriteAlbum(album.id).pipe(take(1)).subscribe({
      error: () => this.favoriteAlbums.set(this.favoriteAlbums().filter(a => a.id !== album.id))
    });
  }

  removeAlbumFromFavorites(album: Album): void {
    this.unheartedAlbumIds.update(prev => {
      const next = new Set(prev);
      next.add(album.id);
      return next;
    });

    this.#profileService.removeFavoriteAlbum(album.id).pipe(take(1)).subscribe({
      next: () => {
        const serverUpdated = this.favoriteAlbums().filter(a => a.id !== album.id);
        this.favoriteAlbums.set(serverUpdated);
      },
      error: () => {
        this.unheartedAlbumIds.update(prev => {
          const next = new Set(prev);
          next.delete(album.id);
          return next;
        });
      }
    });
  }

  get topTenFavoriteArtistsListArr(): Artist[] {
    return this.favoriteArtists().slice(0, 10);
  }

  trackByArtist(index: number, artist: Artist | null) {
    return artist?.id ?? index;
  }
  trackByAlbum(index: number, album: Album | null) {
    return album?.id ?? index;
  }
  trackBySong(index: number, song: Song | null) {
    return song?.id ?? index;
  }

  // dropFavoriteArtist(event: CdkDragDrop<Artist[]>) {
  //   const current = this.favoriteArtists();
  //   if (!current.length) return;

  //   const top = [...current.slice(0, 10)];
  //   moveItemInArray(top, event.previousIndex, event.currentIndex);
  //   const updated = [...top, ...current.slice(10)];
  //   this.favoriteArtists.set(updated);

  //   // Build ranked payload safely
  //   const ranked = updated.slice(0, 10)
  //     .map((a, idx) => ({
  //       artistId: (a as any).artistId ?? a.id,
  //       rank: idx + 1
  //     }))
  //     .filter(r => !!r.artistId);

  //   console.log('[SettingsProfile] DnD ranked payload:', ranked);

  //   if (ranked.length === 0) {
  //     console.warn('[SettingsProfile] Skipping PUT after DnD (no valid artistId).');
  //     return;
  //   }

  //   this.artistRanks.set(ranked);
  //   this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
  //     error: (err) => {
  //       console.error('DnD update failed:', err?.status, err?.error);
  //       // Reload from server to restore consistent state
  //       this.#profileService.getFavoriteArtists().pipe(take(1)).subscribe(a => this.favoriteArtists.set(
  //         (a ?? []).map((x: any) => ({
  //           id: x.artistId ?? x.id,
  //           artistName: x.artistName ?? x.name ?? '',
  //           artistImage: x.artistImageUrl ?? x.artistImage ?? x.imageUrl ?? this.placeholderArtist,
  //           rank: x.rank
  //         })).filter((z: Artist) => !!z.id)
  //       ));
  //     }
  //   });
  // }

  // selectTrack(t: Song): void {
  //   if (!t?.id) return;

  //   const prev = this.favoriteSong();
  //   this.favoriteSong.set(t);

  //   this.#profileService.updateFavoriteSong(t.id).pipe(take(1)).subscribe({
  //     next: () => {},
  //     error: () => this.favoriteSong.set(prev)
  //   });

  //   this.trackSearchForm.controls.query.setValue('');
  //   this._trackResultsRaw.set([]);
  // }

  getArtistRank(artistId: string, fallback: number): number {
    const rank = this.artistRanks().find(r => r.artistId === artistId)?.rank;
    return rank ?? fallback;
  }

  ngOnDestroy() {
    const prev = this.localBlobUrl();
    if (prev) URL.revokeObjectURL(prev);
  }

  handleFollowedArtistSearchFocusOut(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const currentTarget = event.currentTarget as HTMLElement | null;
    if (currentTarget && !currentTarget.contains(relatedTarget)) {
      setTimeout(() => this.showFollowedArtistResults.set(false), 150);
    }
  }

  heartFollowedArtist(artist: Artist): void {
    if (!artist?.id) return;
    
    this.addArtistToFavorites(artist);
    
    // Clear the search after hearting
    this.followedArtistSearchForm.controls.query.setValue('');
    this.followedArtistResults.set([]);
    this.followedArtistSearchQuery.set('');
    this.showFollowedArtistResults.set(false);
  }

  removeArtistFromFavorites(artist: Artist): void {
    const id = (artist as unknown as { artistId?: string }).artistId ?? artist.id;
    if (!id) return;

    const current = this.favoriteArtists();
    const next = current.filter(a => ((a as unknown as { artistId?: string }).artistId ?? a.id) !== id);

    // Update local UI
    this.favoriteArtists.set(next);

    // Recompute ranks (top 10) and persist
    const ranked = next.slice(0, 10)
      .map((a, i) => ({
        artistId: (a as unknown as { artistId?: string }).artistId ?? a.id,
        rank: i + 1
      }))
      .filter(r => typeof r.artistId === 'string' && r.artistId.length > 0);

    // Keep artistRanks signal in sync if present
    this.artistRanks?.set(ranked);

    if (ranked.length === 0) {
      // No favorites left; avoid PUT if backend rejects empty
      console.warn('[SettingsProfile] Skipping PUT favorite-artists: empty after removal.');
      return;
    }

    this.#profileService.updateFavoriteArtistRanks(ranked).pipe(take(1)).subscribe({
      error: (err) => console.error('[SettingsProfile] Remove favorite artist save failed:', err?.status ?? 0, err?.error ?? err)
    });
  }

  // Queue rank saves to avoid overlapping PUTs
  private readonly rankSaves$ = new Subject<{ artistId: string; rank: number }[]>();

  private buildTop10Ranks(list: Artist[]): { artistId: string; rank: number }[] {
    return list.slice(0, 10)
      .map((a, idx) => ({
        artistId: (a as unknown as { artistId?: string }).artistId ?? a.id,
        rank: idx + 1
      }))
      .filter(r => !!r.artistId);
  }

  private enqueueSaveRanks(): void {
    const ranked = this.buildTop10Ranks(this.favoriteArtists());
    if (!ranked.length) return;
    this.artistRanks.set(ranked);
    this.rankSaves$.next(ranked);
  }

  addArtistToFavorites(artist: Artist): void {
    if (!artist?.id) return;
    if (this.favoriteArtists().some(a => a.id === artist.id)) return;

    const prev = this.favoriteArtists();
    const updated = [...prev, artist]; // append to bottom
    this.favoriteArtists.set(updated);

    this.enqueueSaveRanks();
  }

  dropFavoriteArtist(event: CdkDragDrop<Artist[]>) {
    const current = this.favoriteArtists();
    if (!current.length) return;

    const top = [...current.slice(0, 10)];
    moveItemInArray(top, event.previousIndex, event.currentIndex);
    const updated = [...top, ...current.slice(10)];
    this.favoriteArtists.set(updated);

    this.enqueueSaveRanks();
  }
}

