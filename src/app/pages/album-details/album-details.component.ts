import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { AlbumReviewsService } from '../../services/album-reviews.service';
import { AccountService } from '../../services/account.service';
import { UserAccount } from '../../models/account.models';
import { ProfileService } from '../../services/profile.service';
import { Artist } from '../../models/playlist.models';
import { SpotifyPlayerService, PlayerState } from '../../services/spotify-player.service';

// Local types
type Reaction = 'like' | null;

interface Reply {
  id: string;
  author: string;
  userId: string;
  text: string;
  createdAt: string;
  likes: number;
  userReaction: Reaction;
}

interface CommentItem {
  id: string;
  author: string;
  userId: string;
  text: string;
  createdAt: string;
  likes: number;
  userReaction: Reaction;
  replies: Reply[];
  rating?: number;
  userRating?: number;
}

interface TrackItem {
  id: string;
  title: string;
  duration?: string;
  spotifyUri?: string;
}

@Component({
  selector: 'app-album-details',
  templateUrl: './album-details.component.html',
  styleUrl: './album-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
})
export class AlbumDetailsComponent {
  // Album header fields
  title = 'Album Name';
  year: number | null = null;
  coverUrl = '';
  albumArtists = signal<Artist[]>([]);

  // Favorite toggle
  isFavorited = signal(false);

  // Profile service for favorites
  private readonly profileService = inject(ProfileService);

  // Current user from account service
  private readonly accountService = inject(AccountService);
  username = signal<string>('');

  // Tracklist and comments
  tracks = signal<TrackItem[]>([]);
  comments = signal<CommentItem[]>([]);
  commentCount = computed(() => this.comments().length);

  // Ratings
  stars = Array.from({ length: 5 });
  albumRatingsData = signal<{ averageRating: number; totalRatings: number }>({
    averageRating: 0,
    totalRatings: 0
  });
  averageRating = computed(() => {
    const rating = this.albumRatingsData().averageRating;
    return rating ? Math.round(rating * 10) / 10 : 0;
  });

  // Forms
  private readonly fb = inject(FormBuilder);

  commentForm = this.fb.group({
    text: ['', [Validators.maxLength(1000)]],
  });
  editForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  replyForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(500)]],
  });

  // Modal and UI state
  showCommentModal = signal(false);
  commentRating = signal<number>(0);
  hoverRating = signal<number>(0);
  confirmOverwrite = signal<boolean>(false);
  editingId = signal<string | null>(null);
  editTargetId = signal<string | null>(null);
  replyTargetId = signal<string | null>(null);
  userRating = signal<number>(0);
  editRating = signal<number>(0);

  userReviewIndex = computed(() => this.comments().findIndex(c => c.author === this.username()));

  // Backend wiring
  private readonly api = inject(AlbumReviewsService);
  private readonly route = inject(ActivatedRoute);

  // Spotify Player Service
  readonly spotifyPlayer = inject(SpotifyPlayerService);
  readonly playerState$ = this.spotifyPlayer.playerState$;

  // Track current player state for checking if a track is playing
  private currentPlayerState = signal<PlayerState | null>(null);
  private currentTrackUri = signal<string | null>(null);

  albumId = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  userId = signal<string>('');
  userAlbumRating = signal<number>(0);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.albumId.set(id);

    if (!id) {
      console.warn('No album ID provided');
      return;
    }

    // Subscribe to player state changes to track current playing track
    this.spotifyPlayer.playerState$.subscribe(state => {
      this.currentPlayerState.set(state);
      // Store the current track URI for comparison (we'll need to derive this from the track)
      if (state) {
        // The PlayerState doesn't have trackUri, so we need to store it when we play
        // This will be updated in playTrack method
      }
    });

    // Load current user
    this.accountService.getAccount().subscribe({
      next: (account: UserAccount) => {
        this.username.set(account.username);
        this.userId.set(account.id);
        this.loadUserRating(id, account.id);
      },
      error: (err) => {
        console.error('Failed to load account:', err);
      }
    });

    this.loadAlbum(id);
    this.loadComments(id);
    this.loadAlbumRatings(id);
    this.checkIfFavorited(id);
  }

  // ================ Spotify Playback Methods ================

  playTrack(track: TrackItem): void {
    if (!track.spotifyUri) {
      console.warn("No Spotify URI for track:", track.title);
      return;
    }
    console.log("Playing track:", track.title, track.spotifyUri);
    this.currentTrackUri.set(track.spotifyUri);
    this.spotifyPlayer.play(track.spotifyUri);
  }

  isTrackPlaying(track: TrackItem): boolean {
    if (!track.spotifyUri) return false;
    const state = this.currentPlayerState();
    if (!state) return false;
    // Check if this track's URI matches the currently playing track URI
    // and that playback is active
    return this.currentTrackUri() === track.spotifyUri && state.isPlaying;
  }

  // ================ Album Loading ================

  private checkIfFavorited(albumId: string): void {
    this.profileService.getFavoriteAlbums().pipe(take(1)).subscribe({
      next: (albums) => {
        const isFav = albums.some((album: any) => {
          const aid = album.albumId;
          return aid === albumId;
        });
        this.isFavorited.set(isFav);
      },
      error: (err) => {
        console.error('Failed to check if album is favorited:', err);
        this.isFavorited.set(false);
      }
    });
  }

  toggleFavorite(): void {
    const albumId = this.albumId();
    if (!albumId) return;

    const wasFavorited = this.isFavorited();
    this.isFavorited.set(!wasFavorited);

    if (wasFavorited) {
      this.profileService.removeFavoriteAlbum(albumId).pipe(take(1)).subscribe({
        next: () => { },
        error: (err) => {
          console.error('Failed to remove from favorites:', err);
          this.isFavorited.set(wasFavorited);
        }
      });
    } else {
      this.profileService.addFavoriteAlbum(albumId).pipe(take(1)).subscribe({
        next: () => { },
        error: (err) => {
          console.error('Failed to add to favorites:', err);
          this.isFavorited.set(wasFavorited);
        }
      });
    }
  }

  private loadAlbum(id: string): void {
    this.api.getAlbumById(id).pipe(take(1)).subscribe({
      next: (album) => {
        const a = album as Record<string, unknown>;
        console.log('Loaded album data:', a);

        this.title = this.readString(a, 'title') || 'Unknown Album';

        const rawArtists = this.readUnknown(a, 'artists');
        if (Array.isArray(rawArtists)) {
          const artists = rawArtists
            .map(art => {
              if (art && typeof art === 'object') {
                const obj = art as Record<string, unknown>;
                return {
                  id: this.readString(obj, 'id'),
                  artistName: this.readString(obj, 'name') || this.readString(obj, 'artistName'),
                } as Artist;
              }
              return null;
            })
            .filter((x): x is Artist => !!x);
          this.albumArtists.set(artists);
        }

        const releaseDateStr = this.readString(a, 'releaseDate');
        if (releaseDateStr) {
          const yearMatch = releaseDateStr.match(/^(\d{4})/);
          if (yearMatch) {
            this.year = parseInt(yearMatch[1], 10);
          }
        }

        const cover = this.readString(a, 'coverArt');
        this.coverUrl = cover;

        const mapped = this.mapTracksFromAlbumObject(a);
        if (mapped.length) this.tracks.set(mapped);
      },
      error: (err) => {
        console.error('Failed to load album:', err);
        this.error.set('Failed to load album');
      },
    });
  }

  // ================ Tracks ================

  /*private loadTracks(id: string): void {
    if (typeof this.api.getAlbumTracks !== 'function') {
      return;
    }

    this.api.getAlbumTracks(id).pipe(take(1)).subscribe({
      next: (res: unknown) => {
        const list: unknown[] = Array.isArray(res) ? res : [];
        const tracks = list.map((t, idx) => this.mapTrackDto(t, idx));
        if (tracks.length) this.tracks.set(tracks);
      },
      error: (err) => {
        console.warn('Failed to load tracks (non-fatal):', err);
      },
    });
  }*/

  private mapTracksFromAlbumObject(a: Record<string, unknown>): TrackItem[] {
    const raw = (Array.isArray(a['tracks']) && a['tracks']);
    if (!Array.isArray(raw)) return [];
    return raw.map((t, idx) => this.mapTrackDto(t, idx));
  }

  private mapTrackDto(raw: unknown, idx: number): TrackItem {
    const id = this.readString(raw, 'id') || String(idx + 1);
    const title =
      this.readString(raw, 'name') ||
      this.readString(raw, 'title') ||
      `Track ${idx + 1}`;
    const durationSec = this.readNumber(raw, 'duration', NaN);
    const durationStr =
      Number.isFinite(durationSec) ? this.formatSeconds(durationSec) :
        this.readString(raw, 'durationText', '') ||
        this.readString(raw, 'length', '');
    const spotifyUrl = this.readString(raw, 'spotifyUrl') || this.readString(raw, 'spotifyUri') || this.readString(raw, 'uri');
    let spotifyUri: string | undefined = undefined;

    if (spotifyUrl) {
      if (spotifyUrl.startsWith('spotify:')) {
        // Already in URI format
        spotifyUri = spotifyUrl;
      } else if (spotifyUrl.includes('open.spotify.com/track/')) {
        // Convert URL to URI
        const trackId = spotifyUrl.split('/track/')[1]?.split('?')[0];
        if (trackId) {
          spotifyUri = `spotify:track:${trackId}`;
        }
      }
    }

    console.log(`Track: ${title}, URL: ${spotifyUrl}, URI: ${spotifyUri}`);

    return { id, title, duration: durationStr || undefined, spotifyUri };
  }

  private formatSeconds(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ================ Comments Loading ================

  private loadComments(id: string): void {
    this.loading.set(true);
    this.api.getComments(id, 1, 50).pipe(take(1)).subscribe({
      next: (res: unknown) => {
        const itemsUnknown = this.readUnknown(res, 'items');
        const list: unknown[] = Array.isArray(itemsUnknown)
          ? itemsUnknown
          : Array.isArray(res) ? (res as unknown[]) : [];

        const mapped = list.map(dto => this.mapCommentDtoToItem(dto));
        this.comments.set(mapped);

        mapped.forEach(c => {
          this.loadCommentLikeCount(c.id);
          c.replies.forEach(r => this.loadCommentLikeCount(r.id));
        });
        this.loadRatingsForComments(id);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Failed to load comments:', err);
        this.error.set('Failed to load comments');
        this.loading.set(false);
      },
    });
  }

  private loadCommentLikeCount(targetId: string): void {
    this.api.getCommentLikeCount(targetId).pipe(take(1)).subscribe({
      next: (countData: any) => {
        const likeCount: number = Number(countData.likeCount ?? 0);
        this.api.getCommentLikeStatus(targetId).pipe(take(1)).subscribe({
          next: (statusData: any) => {
            const userHasLiked = !!statusData.hasLiked;
            this.comments.update(list =>
              list.map(c => {
                if (c.id === targetId) {
                  return {
                    ...c,
                    likes: likeCount,
                    userReaction: userHasLiked ? 'like' as Reaction : null,
                  };
                }
                if (c.replies?.length) {
                  const replies = c.replies.map(r =>
                    r.id === targetId
                      ? {
                        ...r,
                        likes: likeCount,
                        userReaction: userHasLiked ? 'like' as Reaction : null,
                      }
                      : r
                  );
                  if (replies !== c.replies) {
                    return { ...c, replies };
                  }
                }
                return c;
              })
            );
          },
          error: (err) => {
            console.warn('Failed to load like status for', targetId, err);
          }
        });
      },
      error: (err) => {
        console.warn('Failed to load like count for', targetId, err);
      }
    });
  }

  private loadRatingsForComments(albumId: string): void {
    this.api.getAlbumRatings(albumId).pipe(take(1)).subscribe({
      next: (ratings: any[]) => {
        const ratingsMap = new Map<string, number>();
        ratings.forEach(r => {
          if (r.userId && r.ratingValue) {
            ratingsMap.set(r.userId, r.ratingValue);
          }
        });
        this.comments.update(list =>
          list.map(c => {
            const rating = ratingsMap.get(c.userId);
            return {
              ...c,
              userRating: rating || undefined
            };
          })
        );
      },
      error: (err) => {
        console.warn('Failed to load ratings for comments:', err);
      }
    });
  }

  private loadAlbumRatings(albumId: string): void {
    this.api.getAlbumRatings(albumId).pipe(take(1)).subscribe({
      next: (ratings: any[]) => {
        if (Array.isArray(ratings) && ratings.length > 0) {
          const ratingValues = ratings
            .map(r => r.ratingValue)
            .filter(v => typeof v === 'number' && v > 0);

          if (ratingValues.length > 0) {
            const sum = ratingValues.reduce((acc, val) => acc + val, 0);
            const average = sum / ratingValues.length;
            this.albumRatingsData.set({
              averageRating: average,
              totalRatings: ratingValues.length
            });
          } else {
            this.albumRatingsData.set({ averageRating: 0, totalRatings: 0 });
          }
        } else {
          console.log('No ratings found');
          this.albumRatingsData.set({ averageRating: 0, totalRatings: 0 });
        }
      },
      error: (err) => {
        console.warn('Failed to load album ratings:', err);
        this.albumRatingsData.set({ averageRating: 0, totalRatings: 0 });
      }
    });
  }

  private loadUserRating(albumId: string, userId: string): void {
    this.api.getUserRating(albumId, userId).pipe(take(1)).subscribe({
      next: (rating) => {
        this.userAlbumRating.set(rating.ratingValue);
        this.commentRating.set(rating.ratingValue);
      },
      error: (err) => {
        this.userAlbumRating.set(0);
      }
    });
  }

  private mapCommentDtoToItem(dto: unknown): CommentItem {
    const id = this.readString(dto, 'id') || this.cryptoId();
    const authorRaw = this.readUnknown(dto, 'author');
    const author =
      typeof authorRaw === 'string'
        ? authorRaw
        : (this.readString(authorRaw, 'username') || 'username');
    const userId =
      this.readString(dto, 'userId') ||
      this.readString(dto, 'user_id') ||
      this.readString(dto, 'authorId') ||
      this.readString(dto, 'author_id') ||
      '';

    const text = this.readString(dto, 'text');
    const createdAt = this.readString(dto, 'createdAt', new Date().toISOString());
    const likes = this.readNumber(dto, 'likes', 0);
    const userReaction = this.readReaction(dto, 'userReaction');
    const replies = this.mapReplies(this.readUnknown(dto, 'replies'));
    const ratingVal = this.readNumber(dto, 'rating', NaN);

    return {
      id,
      author,
      userId,
      text,
      createdAt,
      likes,
      userReaction,
      replies,
      rating: Number.isFinite(ratingVal) ? ratingVal : undefined,
    };
  }

  private mapReplies(raw: unknown): Reply[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((r: unknown) => {
      const id = this.readString(r, 'id', this.cryptoId());
      const authorRaw = this.readUnknown(r, 'author');
      const author =
        typeof authorRaw === 'string'
          ? authorRaw
          : (this.readString(authorRaw, 'username') || 'username');
      const userId =
        this.readString(r, 'userId') ||
        this.readString(r, 'user_id') ||
        this.readString(r, 'authorId') ||
        this.readString(r, 'author_id') ||
        '';
      return {
        id,
        author,
        userId,
        text: this.readString(r, 'text'),
        createdAt: this.readString(r, 'createdAt', new Date().toISOString()),
        likes: this.readNumber(r, 'likes', 0),
        userReaction: this.readReaction(r, 'userReaction'),
      };
    });
  }

  // ================ Template Helpers ================

  slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  userLink(user: unknown): string[] {
    const base = '/users';
    if (typeof user === 'string') return [base, this.slugify(user)];
    if (user && typeof user === 'object') {
      const u = user as Record<string, unknown>;
      const id = u['id'] ?? u['_id'] ?? u['userId'];
      if (typeof id === 'string' && id) return [base, id];
      const slug = u['slug'] ?? u['handle'];
      if (typeof slug === 'string' && slug) return [base, slug];
      const username = u['username'] ?? u['displayName'] ?? u['name'];
      if (typeof username === 'string' && username) return [base, this.slugify(username)];
    }
    return [base, ''];
  }

  // ================ Comment Modal ================

  openCommentModal(): void {
    this.editingId.set(null);
    const idx = this.userReviewIndex();
    if (idx !== -1) {
      const existing = this.comments()[idx];
      this.commentForm.patchValue({ text: existing.text ?? '' });
      this.commentRating.set(existing.rating ?? 0);
      this.confirmOverwrite.set(false);
    } else {
      this.commentForm.patchValue({ text: '' });
      this.commentRating.set(this.userAlbumRating());
      this.confirmOverwrite.set(false);
    }
    this.showCommentModal.set(true);
  }

  openEditModal(commentId: string): void {
    const comment = this.comments().find(c => c.id === commentId);
    if (!comment) return;
    this.editingId.set(commentId);
    this.commentForm.patchValue({ text: comment.text ?? '' });
    this.commentRating.set(comment.rating ?? this.userAlbumRating());
    this.confirmOverwrite.set(false);
    this.showCommentModal.set(true);
  }

  closeCommentModal(): void {
    this.showCommentModal.set(false);
    this.commentForm.reset();
    this.commentRating.set(0);
    this.confirmOverwrite.set(false);
    this.editingId.set(null);
  }

  setCommentRating(value: number): void {
    this.commentRating.set(value);
  }

  canSubmit(): boolean {
    const raw = this.commentForm.get('text')?.value ?? '';
    const hasText = String(raw).trim().length > 0;
    const hasRating = !!this.commentRating();
    const hasExisting = this.userReviewIndex() !== -1;
    if (!(hasText || hasRating)) return false;
    if (this.editingId()) return true;
    if (hasExisting) return this.confirmOverwrite();
    return true;
  }

  submitComment(): void {
    if (!this.canSubmit()) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const raw = this.commentForm.get('text')?.value ?? '';
    const text = String(raw).trim() || '';
    const ratingToSubmit = this.commentRating() || undefined;

    if (ratingToSubmit) {
      this.api.createOrUpdateRating(this.albumId(), ratingToSubmit)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.userAlbumRating.set(ratingToSubmit);
            this.loadAlbumRatings(this.albumId());
            this.loadComments(this.albumId());
          },
          error: (err) => {
            console.error('Failed to save rating:', err);
            this.error.set('Failed to save rating');
          }
        });
    }

    if (!text && !this.editingId()) {
      this.closeCommentModal();
      return;
    }

    const id = this.albumId();
    const editingIdNow = this.editingId();
    if (id && text) {
      (editingIdNow
        ? this.api.updateComment(editingIdNow, { text })
        : this.api.createComment(id, { text })
      ).pipe(take(1)).subscribe({
        next: () => {
          this.loadComments(id);
        },
        error: (err) => {
          console.error('Failed to save comment:', err);
          this.error.set('Failed to save comment');
        }
      });
    }

    this.commentForm.reset();
    this.commentRating.set(0);
    this.confirmOverwrite.set(false);
    this.editingId.set(null);
    this.showCommentModal.set(false);
  }

  // ================ Inline Edit + Replies ================

  setEditRating(rating: number): void {
    this.editRating.set(rating);
  }

  cancelEdit(): void {
    this.editTargetId.set(null);
    this.editForm.reset();
    this.editRating.set(0);
  }

  submitEdit(commentId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const raw = this.editForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    this.api.updateComment(commentId, { text }).pipe(take(1)).subscribe({
      next: () => {
        this.loadComments(this.albumId());
      },
      error: (err) => {
        console.error('Failed to update comment:', err);
        this.error.set('Failed to update comment');
      },
    });

    this.cancelEdit();
  }

  startEditReply(reply: Reply): void {
    if (reply.author !== this.username()) return;
    this.editForm.patchValue({ text: reply.text ?? '' });
    this.editTargetId.set(reply.id);
  }

  submitEditReply(parentId: string, replyId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const raw = this.editForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    this.comments.update(list =>
      list.map(c => {
        if (c.id === parentId && c.replies) {
          const replies = c.replies.map(r =>
            r.id === replyId
              ? { ...r, text, createdAt: new Date().toISOString() }
              : r
          );
          return { ...c, replies };
        }
        return c;
      }),
    );

    this.cancelEdit();
  }

  openReply(commentId: string): void {
    this.replyForm.reset();
    this.replyTargetId.set(commentId);
  }

  closeReply(): void {
    this.replyTargetId.set(null);
    this.replyForm.reset();
  }

  submitReply(parentId: string): void {
    if (this.replyForm.invalid) return;
    const raw = this.replyForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    const tempId = this.cryptoId();
    const currentUsername = this.username();
    const currentUserId = this.userId();
    this.comments.update(list =>
      list.map(c =>
        c.id === parentId
          ? {
            ...c,
            replies: [
              ...(c.replies ?? []),
              {
                id: tempId,
                author: currentUsername,
                userId: currentUserId,
                text,
                createdAt: new Date().toISOString(),
                likes: 0,
                userReaction: null
              },
            ],
          }
          : c,
      ),
    );

    this.api.addReply(parentId, { text, albumId: this.albumId() }).pipe(take(1)).subscribe({
      next: (serverReply: unknown) => {
        this.comments.update(list =>
          list.map(c => {
            if (c.id !== parentId || !c.replies) return c;
            const idx = c.replies.findIndex(r => r.id === tempId);
            if (idx === -1) return c;
            const next = c.replies.slice();
            next[idx] = {
              id: this.readString(serverReply, 'id', tempId),
              author: typeof this.readUnknown(serverReply, 'author') === 'string'
                ? String(this.readUnknown(serverReply, 'author'))
                : (this.readString(this.readUnknown(serverReply, 'author'), 'displayName') ||
                  this.readString(this.readUnknown(serverReply, 'author'), 'username') ||
                  'username'),
              userId: this.readString(serverReply, 'userId', currentUserId),
              text: this.readString(serverReply, 'text', text),
              createdAt: this.readString(serverReply, 'createdAt', new Date().toISOString()),
              likes: this.readNumber(serverReply, 'likes', 0),
              userReaction: this.readReaction(serverReply, 'userReaction'),
            };
            return { ...c, replies: next };
          }),
        );
      },
      error: (err) => {
        console.error('Failed to add reply:', err);
        this.error.set('Failed to add reply');
      },
    });

    this.closeReply();
  }

  // ================ Reactions ================

  toggleLike(targetId: string): void {
    let currentReaction: Reaction = null;
    this.comments().forEach(c => {
      if (c.id === targetId) currentReaction = c.userReaction;
      c.replies?.forEach(r => {
        if (r.id === targetId) currentReaction = r.userReaction;
      });
    });

    this.comments.update(list =>
      list.map(c => {
        if (c.id === targetId) return this.applyReaction(c, 'like');
        if (c.replies) {
          const replies = c.replies.map(r => (r.id === targetId ? this.applyReaction(r, 'like') : r));
          if (replies !== c.replies) return { ...c, replies };
        }
        return c;
      }),
    );

    const newReaction: Reaction = currentReaction === 'like' ? null : 'like';

    const apiCall = newReaction === 'like'
      ? this.api.likeComment(targetId)
      : this.api.unlikeComment(targetId);

    apiCall.pipe(take(1)).subscribe({
      next: () => {
        this.loadCommentLikeCount(targetId);
      },
      error: (err) => {
        console.error('Failed to update like:', err);
        this.error.set('Failed to update like');
        this.comments.update(list =>
          list.map(c => {
            if (c.id === targetId) {
              return { ...c, userReaction: currentReaction };
            }
            if (c.replies) {
              const replies = c.replies.map(r =>
                r.id === targetId ? { ...r, userReaction: currentReaction } : r
              );
              if (replies !== c.replies) return { ...c, replies };
            }
            return c;
          })
        );
      },
    });
  }

  private applyReaction<T extends { likes: number; userReaction: Reaction }>(
    item: T,
    action: 'like',
  ): T {
    const current: Reaction = item.userReaction ?? null;
    let likes = item.likes ?? 0;
    let next: Reaction = current;

    if (action === 'like') {
      if (current === 'like') {
        likes = Math.max(0, likes - 1);
        next = null;
      } else {
        likes += 1;
        next = 'like';
      }
    }

    return { ...item, likes, userReaction: next };
  }

  // ================ Utilities ================

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  private readUnknown(obj: unknown, key: string): unknown {
    if (!obj || typeof obj !== 'object') return undefined;
    return (obj as Record<string, unknown>)[key];
  }

  private readString(obj: unknown, key: string, fallback = ''): string {
    const v = this.readUnknown(obj, key);
    return typeof v === 'string' ? v : fallback;
  }

  private readNumber(obj: unknown, key: string, fallback = 0): number {
    const v = this.readUnknown(obj, key);
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  }

  private readReaction(obj: unknown, key: string): Reaction {
    const v = this.readUnknown(obj, key);
    return v === 'like' ? v : null;
  }

  private cryptoId(): string {
    try {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
    } catch {
      return Math.random().toString(36).slice(2, 12);
    }
  }
}
