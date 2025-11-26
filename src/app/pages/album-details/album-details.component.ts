import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { AlbumReviewsService } from '../../services/album-reviews.service';

// Local types to avoid relying on external model files
type Reaction = 'like' | 'dislike' | null;

interface Reply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  userReaction: Reaction;
}

interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  likes: number;
  dislikes: number;
  userReaction: Reaction;
  replies: Reply[];
  rating?: number;
}

interface TrackItem {
  id: string;
  title: string;
  duration?: string; // mm:ss
}

interface CommentDto {
  id: string;
  author: unknown;
  text: string;
  // other fields are read via safe readers
}

@Component({
  selector: 'app-album-details',
  templateUrl: './album-details.component.html',
  styleUrl: './album-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
})
export class AlbumDetailsComponent {
  // Album header fields used by your HTML
  title = 'Album Name';
  year: number | null = null;
  private albumArtists = signal<string>('Artist Names');
  coverUrl = '';

  // Favorite toggle
  isFavorited = signal(false);

  // Current user placeholder (used by Edit visibility)
  username = 'username';

  // Tracklist and comments
  tracks = signal<TrackItem[]>([]);
  comments = signal<CommentItem[]>([]);
  commentCount = computed(() => this.comments().length);

  // Ratings (stars shown in header and in comments)
  stars = Array.from({ length: 5 });
  averageRating = computed(() => {
    const rated = this.comments().filter(c => typeof c.rating === 'number' && (c.rating ?? 0) > 0);
    if (!rated.length) return 0;
    const sum = rated.reduce((s, c) => s + (c.rating ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  // Forms/signals referenced by your HTML
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

  showCommentModal = signal(false);
  commentRating = signal<number>(0);
  hoverRating = signal<number>(0);
  confirmOverwrite = signal<boolean>(false);
  editingId = signal<string | null>(null);
  editTargetId = signal<string | null>(null);
  replyTargetId = signal<string | null>(null);
  userRating = signal<number>(0);
  editRating = signal<number>(0);

  userReviewIndex = computed(() => this.comments().findIndex(c => c.author === this.username));

  // Backend wiring (no private # fields to avoid TS target issues)
  private readonly api = inject(AlbumReviewsService);
  private readonly route = inject(ActivatedRoute);

  albumId = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.albumId.set(id);

    if (!id) {
      this.seedIfMock();
      return;
    }

    this.loadAlbum(id);
    this.loadComments(id);
    this.loadTracks(id); // also fetch songs
  }

  // ---------------- Album loading ----------------

  private loadAlbum(id: string): void {
    this.api.getAlbumById(id).pipe(take(1)).subscribe({
      next: (album) => {
        const a = album as Record<string, unknown>;

        // title
        const title = typeof a?.['title'] === 'string' && a['title'] ? (a['title'] as string) : 'Unknown Album';
        this.title = title;

        // artists
        const artistNames =
          typeof a?.['artistNames'] === 'string' && a['artistNames']
            ? (a['artistNames'] as string)
            : Array.isArray(a?.['artists'])
              ? (a['artists'] as unknown[])
                  .map(v => (typeof v === 'string'
                    ? v
                    : (v && typeof v === 'object' && typeof (v as { name?: string }).name === 'string')
                      ? (v as { name: string }).name
                      : ''))
                  .filter(Boolean)
                  .join(', ')
              : '';
        this.albumArtists.set(artistNames || 'Unknown Artist');

        // year
        const rawYear = a?.['year'];
        const parsedYear =
          typeof rawYear === 'number'
            ? rawYear
            : typeof rawYear === 'string'
              ? Number.parseInt(rawYear, 10)
              : null;
        this.year = Number.isFinite(parsedYear as number) ? (parsedYear as number) : null;

        // cover
        const cover =
          (typeof a?.['coverUrl'] === 'string' && a['coverUrl']) ||
          (typeof a?.['image'] === 'string' && a['image']) ||
          (typeof a?.['albumCover'] === 'string' && a['albumCover']) ||
          '';
        this.coverUrl = String(cover ?? '');

        // tracks embedded in album payload (optional)
        const mapped = this.mapTracksFromAlbumObject(a);
        if (mapped.length) this.tracks.set(mapped);
      },
      error: () => this.error.set('Failed to load album'),
    });
  }

  // ---------------- Tracks ----------------

  private loadTracks(id: string): void {
    // Call getAlbumTracks if the service provides it; otherwise skip (album payload mapping may suffice)
    const maybe = (this.api as unknown as Record<string, unknown>)['getAlbumTracks'];
    if (typeof maybe !== 'function') return;

    (maybe as (albumId: string) => unknown)(id as string);

    // Type-safe call with runtime guard
    try {
      (this.api.getAlbumTracks as (albumId: string) => { pipe: (op: unknown) => any })(id)
        .pipe(take(1))
        .subscribe({
          next: (res: unknown) => {
            const itemsUnknown = this.readUnknown(res, 'items');
            const list: unknown[] = Array.isArray(itemsUnknown)
              ? itemsUnknown
              : Array.isArray(res as unknown) ? (res as unknown as unknown[]) : [];
            const tracks = list.map((t, idx) => this.mapTrackDto(t, idx));
            if (tracks.length) this.tracks.set(tracks);
          },
          error: () => { /* non-fatal */ },
        });
    } catch {
      // ignore if method signature differs; album payload mapping still works
    }
  }

  private mapTracksFromAlbumObject(a: Record<string, unknown>): TrackItem[] {
    const raw =
      (Array.isArray(a['tracks']) && a['tracks']) ||
      (Array.isArray(a['tracklist']) && a['tracklist']) ||
      (Array.isArray(a['songs']) && a['songs']) ||
      [];
    if (!Array.isArray(raw)) return [];
    return raw.map((t, idx) => this.mapTrackDto(t, idx));
  }

  private mapTrackDto(raw: unknown, idx: number): TrackItem {
    const id =
      this.readString(raw, 'id') ||
      this.readString(raw, 'trackId') ||
      String(idx + 1);
    const title =
      this.readString(raw, 'title') ||
      this.readString(raw, 'name') ||
      `Track ${idx + 1}`;
    const durationSec = this.readNumber(raw, 'duration', NaN);
    const durationStr =
      Number.isFinite(durationSec) ? this.formatSeconds(durationSec) :
      this.readString(raw, 'durationText', '') ||
      this.readString(raw, 'length', '');
    return { id, title, duration: durationStr || undefined };
  }

  private formatSeconds(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ---------------- Comments loading/mapping ----------------

  private loadComments(id: string): void {
    this.loading.set(true);
    this.api.getComments(id, 1, 50).pipe(take(1)).subscribe({
      next: (res: unknown) => {
        const itemsUnknown = this.readUnknown(res, 'items');
        const list: unknown[] = Array.isArray(itemsUnknown)
          ? itemsUnknown
          : Array.isArray(res as unknown) ? (res as unknown as unknown[]) : [];
        const mapped = list.map(dto => this.mapCommentDtoToItem(dto as CommentDto));
        this.comments.set(mapped);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load comments');
        this.loading.set(false);
        this.seedIfMock();
      },
    });
  }

  private mapCommentDtoToItem(dto: CommentDto): CommentItem {
    const author =
      typeof dto.author === 'string'
        ? dto.author
        : (this.readString(dto.author, 'displayName') ||
           this.readString(dto.author, 'username') ||
           'username');

    const createdAt = this.readString(dto as unknown, 'createdAt', new Date().toISOString());
    const likes = this.readNumber(dto as unknown, 'likes', 0);
    const dislikes = this.readNumber(dto as unknown, 'dislikes', 0);
    const userReaction = this.readReaction(dto as unknown, 'userReaction');
    const replies = this.mapReplies(this.readUnknown(dto as unknown, 'replies'));
    const ratingVal = this.readNumber(dto as unknown, 'rating', NaN);

    return {
      id: dto.id,
      author,
      text: dto.text,
      createdAt,
      likes,
      dislikes,
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
          : (this.readString(authorRaw, 'displayName') ||
             this.readString(authorRaw, 'username') ||
             'username');
      return {
        id,
        author,
        text: this.readString(r, 'text'),
        createdAt: this.readString(r, 'createdAt', new Date().toISOString()),
        likes: this.readNumber(r, 'likes', 0),
        dislikes: this.readNumber(r, 'dislikes', 0),
        userReaction: this.readReaction(r, 'userReaction'),
      };
    });
  }

  // ---------------- Template helpers used by your HTML ----------------

  splitArtists(): string[] {
    return (this.albumArtists() || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

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

  toggleFavorite(): void {
    this.isFavorited.update(f => !f);
    const id = this.albumId();
    if (!id) return;
    this.api.toggleAlbumFavorite(id, this.isFavorited()).pipe(take(1)).subscribe({
      error: () => this.isFavorited.update(f => !f), // rollback on error
    });
  }

  // ---------------- Comment modal flows (used by HTML) ----------------

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
      this.commentRating.set(0);
      this.confirmOverwrite.set(false);
    }
    this.showCommentModal.set(true);
  }

  openEditModal(commentId: string): void {
    const comment = this.comments().find(c => c.id === commentId);
    if (!comment) return;
    this.editingId.set(commentId);
    this.commentForm.patchValue({ text: comment.text ?? '' });
    this.commentRating.set(comment.rating ?? 0);
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
    if (!this.canSubmit()) { this.commentForm.markAllAsTouched(); return; }
    const raw = this.commentForm.get('text')?.value ?? '';
    const text = String(raw).trim() || '';
    const ratingToAttach = this.commentRating() || undefined;

    // Local upsert
    this.comments.update(prev => {
      const editingIdNow = this.editingId();
      if (editingIdNow) {
        const cleared = prev.map(c => (c.author === this.username ? { ...c, rating: undefined } : c));
        return cleared.map(c => c.id === editingIdNow ? { ...c, text, rating: ratingToAttach, createdAt: new Date().toISOString() } : c);
      }
      const cleared = prev.map(c => (c.author === this.username ? { ...c, rating: undefined } : c));
      const existingIndex = cleared.findIndex(c => c.author === this.username);
      if (existingIndex !== -1) {
        const updated = cleared.slice();
        updated[existingIndex] = { ...updated[existingIndex], text, createdAt: new Date().toISOString(), rating: ratingToAttach };
        return updated;
      }
      return [...cleared, {
        id: this.cryptoId(),
        author: this.username,
        text,
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        userReaction: null,
        replies: [],
        rating: ratingToAttach,
      }];
    });

    // Persist create/update
    const id = this.albumId();
    const editingIdNow = this.editingId();
    if (id) {
      (editingIdNow
        ? this.api.updateComment(editingIdNow, { text, rating: ratingToAttach ?? null })
        : this.api.createComment(id, { text, rating: ratingToAttach ?? null })
      ).pipe(take(1)).subscribe({ error: () => this.error.set('Failed to save comment') });
    }

    // Reset modal
    this.commentForm.reset();
    this.commentRating.set(0);
    this.confirmOverwrite.set(false);
    this.editingId.set(null);
    this.showCommentModal.set(false);
    if (ratingToAttach) this.userRating.set(ratingToAttach);
  }

  // ---------------- Inline edit + replies (used by HTML) ----------------

  setEditRating(rating: number): void {
    this.editRating.set(rating);
  }

  cancelEdit(): void {
    this.editTargetId.set(null);
    this.editForm.reset();
    this.editRating.set(0);
  }

  submitEdit(commentId: string): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const raw = this.editForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    const ratingToAttach = this.editRating() || undefined;

    this.comments.update(prev =>
      prev.map(c =>
        c.id === commentId
          ? { ...c, text, rating: ratingToAttach ?? c.rating, createdAt: new Date().toISOString() }
          : c,
      ),
    );

    this.api.updateComment(commentId, { text, rating: ratingToAttach ?? null }).pipe(take(1)).subscribe({
      error: () => this.error.set('Failed to update comment'),
    });

    this.cancelEdit();
  }

  startEditReply(reply: Reply): void {
    if (reply.author !== this.username) return;
    this.editForm.patchValue({ text: reply.text ?? '' });
    this.editTargetId.set(reply.id);
  }

  submitEditReply(parentId: string, replyId: string): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const raw = this.editForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    this.comments.update(list =>
      list.map(c => {
        if (c.id === parentId && c.replies) {
          const replies = c.replies.map(r => r.id === replyId ? { ...r, text, createdAt: new Date().toISOString() } : r);
          return { ...c, replies };
        }
        return c;
      }),
    );

    // If you add a replies update API later, call it here
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
    this.comments.update(list =>
      list.map(c =>
        c.id === parentId
          ? {
              ...c,
              replies: [
                ...(c.replies ?? []),
                { id: tempId, author: this.username, text, createdAt: new Date().toISOString(), likes: 0, dislikes: 0, userReaction: null },
              ],
            }
          : c,
      ),
    );

    this.api.addReply(parentId, { text }).pipe(take(1)).subscribe({
      next: (serverReply: unknown) => {
        this.comments.update(list =>
          list.map(c => {
            if (c.id !== parentId || !c.replies) return c;
            const idx = c.replies.findIndex(r => r.id === tempId);
            if (idx === -1) return c;
            const next = c.replies.slice();
            const sr = serverReply as Record<string, unknown>;
            next[idx] = {
              id: String(sr['id'] ?? tempId),
              author: typeof sr['author'] === 'string'
                ? String(sr['author'])
                : (this.readString(sr['author'], 'displayName') || this.readString(sr['author'], 'username') || 'username'),
              text: String(sr['text'] ?? text),
              createdAt: String(sr['createdAt'] ?? new Date().toISOString()),
              likes: typeof sr['likes'] === 'number' ? (sr['likes'] as number) : 0,
              dislikes: typeof sr['dislikes'] === 'number' ? (sr['dislikes'] as number) : 0,
              userReaction: this.readReaction(serverReply as unknown, 'userReaction'),
            };
            return { ...c, replies: next };
          }),
        );
      },
      error: () => this.error.set('Failed to add reply'),
    });

    this.closeReply();
  }

  // ---------------- Reactions ----------------

  toggleLike(targetId: string): void {
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
    this.persistReaction(targetId, 'like');
  }

  toggleDislike(targetId: string): void {
    this.comments.update(list =>
      list.map(c => {
        if (c.id === targetId) return this.applyReaction(c, 'dislike');
        if (c.replies) {
          const replies = c.replies.map(r => (r.id === targetId ? this.applyReaction(r, 'dislike') : r));
          if (replies !== c.replies) return { ...c, replies };
        }
        return c;
      }),
    );
    this.persistReaction(targetId, 'dislike');
  }

  private persistReaction(targetId: string, reaction: Reaction): void {
    this.api.reactToComment(targetId, reaction).pipe(take(1)).subscribe({
      error: () => this.error.set('Failed to update reaction'),
    });
  }

  private applyReaction<T extends { likes: number; dislikes: number; userReaction: Reaction }>(
    item: T,
    action: 'like' | 'dislike',
  ): T {
    const current: Reaction = item.userReaction ?? null;
    let likes = item.likes ?? 0;
    let dislikes = item.dislikes ?? 0;
    let next: Reaction = current;

    if (action === 'like') {
      if (current === 'like') { likes = Math.max(0, likes - 1); next = null; }
      else if (current === 'dislike') { dislikes = Math.max(0, dislikes - 1); likes += 1; next = 'like'; }
      else { likes += 1; next = 'like'; }
    } else {
      if (current === 'dislike') { dislikes = Math.max(0, dislikes - 1); next = null; }
      else if (current === 'like') { likes = Math.max(0, likes - 1); dislikes += 1; next = 'dislike'; }
      else { dislikes += 1; next = 'dislike'; }
    }
    return { ...item, likes, dislikes, userReaction: next };
  }

  // ---------------- Utilities ----------------

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
    return v === 'like' || v === 'dislike' ? v : null;
  }
  private cryptoId(): string {
    // Use Web Crypto if available
    try {
      const arr = new Uint8Array(6);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
    } catch {
      return Math.random().toString(36).slice(2, 12);
    }
  }

  private seedIfMock(): void {
    // Seed album
    this.api.getAlbumById('demo').pipe(take(1)).subscribe(a => {
      const album = a as Record<string, unknown>;
      this.title = String(album['title'] ?? 'Demo Album');
      this.albumArtists.set(String(album['artistNames'] ?? 'Demo Artist'));
      const y = typeof album['year'] === 'number' ? (album['year'] as number) : Number.parseInt(String(album['year'] ?? ''), 10);
      this.year = Number.isFinite(y) ? y : null;
      this.coverUrl = String(album['coverUrl'] ?? this.coverUrl);

      // seed tracks from album mock if present
      const mapped = this.mapTracksFromAlbumObject(album);
      if (mapped.length) this.tracks.set(mapped);
    });

    // Seed comments
    this.api.getComments('demo', 1, 10).pipe(take(1)).subscribe(r => {
      const itemsUnknown = this.readUnknown(r, 'items');
      const list: unknown[] = Array.isArray(itemsUnknown) ? itemsUnknown : [];
      this.comments.set(list.map(i => this.mapCommentDtoToItem(i as CommentDto)));
    });

    // Fallback seed tracks if still empty
    if (!this.tracks().length) {
      this.tracks.set([
        { id: 't1', title: 'Song 1', duration: '3:42' },
        { id: 't2', title: 'Song 2', duration: '4:05' },
        { id: 't3', title: 'Song 3', duration: '2:58' },
        { id: 't4', title: 'Song 4', duration: '3:13' },
        { id: 't5', title: 'Song 5', duration: '5:01' },
        { id: 't6', title: 'Song 6', duration: '3:27' },
      ]);
    }
  }
}