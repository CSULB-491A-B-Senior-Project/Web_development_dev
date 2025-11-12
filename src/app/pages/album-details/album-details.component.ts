import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

type Reaction = 'like' | 'dislike' | null;

interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  replies?: Reply[];

  likes: number;
  dislikes: number;
  userReaction: Reaction;

  // optional numeric rating (1-5) for the comment
  rating?: number;
}
interface Reply {
  id: string;
  author: string;
  text: string;
  createdAt: string;

  likes: number;
  dislikes: number;
  userReaction: Reaction;

  rating?: number;
}

@Component({
  selector: 'app-album-details',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, NgOptimizedImage],
  templateUrl: './album-details.component.html',
  styleUrls: ['./album-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlbumDetailsComponent {
  readonly title = 'Album Name';
  readonly artist = 'Artist Names';

  // favorite state
  isFavorited = signal(false);

  // placeholder username (use real user data later)
  readonly username = 'username';

  private fb = inject(FormBuilder);

  // modal visibility
  showCommentModal = signal(false);

  // comments state
  comments = signal<CommentItem[]>([]);

  // derived count
  commentCount = computed(() => this.comments().length);

  // Comment form: text is optional (user may submit rating-only)
  commentForm = this.fb.group({
    text: ['', [Validators.maxLength(1000)]], // not required
  });

  // five-star placeholders
  stars = Array.from({ length: 5 });

  // comment-level rating the user selects before submitting a comment (0 = not rated)
  commentRating = signal<number>(0);

  // hover state for star preview while hovering (0 = none)
  hoverRating = signal<number>(0);

  // confirmation checkbox when overwriting existing review (only for add/overwrite flow)
  confirmOverwrite = signal<boolean>(false);

  // editing via modal: id of comment being edited (null when creating or overwriting)
  editingId = signal<string | null>(null);

  // inline editor state (kept for quick edit if needed)
  editTargetId = signal<string | null>(null);
  editForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(1000)]],
  });
  editRating = signal<number>(0);

  // user rating signal (0 = not rated) -- kept for album-level user rating if needed
  userRating = signal<number>(0);

  // computed average rating for the album (one decimal)
  averageRating = computed(() => {
    const list = this.comments();
    const rated = list.filter(c => typeof c.rating === 'number' && (c.rating ?? 0) > 0);
    if (!rated.length) return 0;
    const sum = rated.reduce((s, c) => s + (c.rating ?? 0), 0);
    return Math.round((sum / rated.length) * 10) / 10;
  });

  // computed index of the current user's review (or -1)
  userReviewIndex = computed(() => this.comments().findIndex(c => c.author === this.username));

  // helper: find index of the comment authored by current user (or -1)
  private findUserCommentIndex(list: readonly CommentItem[]): number {
    return list.findIndex(c => c.author === this.username);
  }

  // Set rating from the modal's star control. This only affects the modal's state.
  setCommentRating(value: number): void {
    this.commentRating.set(value);
  }

  // keyboard support for comment rating control
  onCommentStarKeydown(event: KeyboardEvent, value: number): void {
    const key = event.key;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.setCommentRating(value);
      return;
    }

    if (key === 'ArrowRight' || key === 'ArrowUp') {
      event.preventDefault();
      const next = Math.min(5, (this.commentRating() || 0) + 1);
      this.setCommentRating(next);
      return;
    }

    if (key === 'ArrowLeft' || key === 'ArrowDown') {
      event.preventDefault();
      const prevVal = Math.max(1, (this.commentRating() || 1) - 1);
      this.setCommentRating(prevVal);
      return;
    }
  }

  toggleFavorite(): void {
    this.isFavorited.update(fav => !fav);
    // TODO: persist to API
    console.log('Favorite status:', this.isFavorited());
  }

  // --- Modal open flows ---

  // Open modal for creating a new review (or overwrite flow if user already has a review).
  openCommentModal(): void {
    // not editing a specific comment by id
    this.editingId.set(null);

    const idx = this.userReviewIndex();
    if (idx !== -1) {
      // prefill with existing review so user can choose to overwrite or adjust; require explicit consent to overwrite
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

  // Open modal specifically for editing a particular comment (Edit button on a comment)
  openEditModal(commentId: string): void {
    const comment = this.comments().find(c => c.id === commentId);
    if (!comment) return;
    // editing a specific comment: prefill modal and mark editingId
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

  // helper used by template to determine if submit should be enabled
  canSubmit(): boolean {
    const raw = this.commentForm.get('text')?.value ?? '';
    const hasText = String(raw).trim().length > 0;
    const hasRating = !!this.commentRating();
    const hasExisting = this.userReviewIndex() !== -1;

    // need either text or rating
    if (!(hasText || hasRating)) return false;

    // if we're editing a specific existing comment, no overwrite confirmation needed
    if (this.editingId()) return true;

    // if overwriting an existing review via "Add" flow, require explicit confirmation
    if (hasExisting) return this.confirmOverwrite();

    return true;
  }

  // Upsert / edit behavior:
  // - If editingId is set, update that specific comment.
  // - Else: if user already has a review, require confirmOverwrite and replace their single review.
  submitComment(): void {
    if (!this.canSubmit()) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const raw = this.commentForm.get('text')?.value ?? '';
    const text = String(raw).trim() || ''; // allow empty string for rating-only
    const ratingToAttach = this.commentRating() || undefined;

    this.comments.update(prev => {
      // If editing a specific comment, update that comment in-place and clear ratings on other comments by this user.
      const editingId = this.editingId();
      if (editingId) {
        const cleared = prev.map(c => c.author === this.username ? ({ ...c, rating: undefined }) : c);
        return cleared.map(c => c.id === editingId ? { ...c, text, rating: ratingToAttach, createdAt: new Date().toISOString() } : c);
      }

      // Not editing by id: handle upsert-by-username (single review per user)
      const cleared = prev.map(c => c.author === this.username ? ({ ...c, rating: undefined }) : c);
      const existingIndex = cleared.findIndex(c => c.author === this.username);

      if (existingIndex !== -1) {
        // overwrite existing comment
        const updated = cleared.slice();
        updated[existingIndex] = {
          ...updated[existingIndex],
          text,
          createdAt: new Date().toISOString(),
          rating: ratingToAttach,
        };
        return updated;
      }

      // append new comment
      const newComment: CommentItem = {
        id: this.cryptoRandomId(),
        author: this.username,
        text,
        createdAt: new Date().toISOString(),
        likes: 0,
        dislikes: 0,
        userReaction: null,
        replies: [],
        rating: ratingToAttach,
      };

      return [...cleared, newComment];
    });

    // reset modal state
    this.commentForm.reset();
    this.commentRating.set(0);
    this.confirmOverwrite.set(false);
    this.editingId.set(null);
    this.showCommentModal.set(false);

    if (ratingToAttach) this.userRating.set(ratingToAttach);

    // TODO: persist to API: albumCommentService.upsert({...}).subscribe(...)
    console.log('submitComment (upsert/edit)', { text, rating: ratingToAttach, editingId: this.editingId() });
  }

  // --- Inline edit support kept (optional) ---
  startEditInline(comment: CommentItem): void {
    if (comment.author !== this.username) return;
    this.editForm.patchValue({ text: comment.text ?? '' });
    this.editRating.set(comment.rating ?? 0);
    this.editTargetId.set(comment.id);
  }

  setEditRating(rating: number): void {
    this.editRating.set(rating);
  }

  cancelEdit(): void {
    this.editTargetId.set(null);
    this.editForm.reset();
    this.editRating.set(0);
  }

  // submit edited comment from inline editor (keeps unique rating rule)
  submitEdit(commentId: string): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.get('text')?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    const ratingToAttach = this.editRating() || undefined;

    this.comments.update(prev => {
      const cleared = prev.map(c => c.author === this.username ? ({ ...c, rating: undefined }) : c);
      return cleared.map(c => c.id === commentId ? ({ ...c, text, rating: ratingToAttach, createdAt: new Date().toISOString() }) : c);
    });

    this.cancelEdit();
    if (ratingToAttach) this.userRating.set(ratingToAttach);
  }

  // remaining code (replies, likes, helpers) unchanged...
  // which comment currently has the open reply form
  replyTargetId = signal<string | null>(null);

  // single form reused for replies
  replyForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(500)]]
  });

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

    const control = this.replyForm.get('text');
    const raw = control?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    const newReply: Reply = {
      id: this.cryptoRandomId(),
      author: this.username,
      text,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      userReaction: null,
    };

    this.comments.update(list =>
      list.map(c => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newReply] } : c)
    );

    this.closeReply();
  }

  // Toggle handlers for likes/dislikes (works for comments and replies)
  toggleLike(targetId: string): void {
    this.comments.update(list => list.map(c => {
      if (c.id === targetId) return this.applyReaction(c, 'like');
      if (c.replies) {
        const newReplies = c.replies.map(r => r.id === targetId ? this.applyReaction(r, 'like') : r);
        if (newReplies !== c.replies) return { ...c, replies: newReplies };
      }
      return c;
    }));
  }

  toggleDislike(targetId: string): void {
    this.comments.update(list => list.map(c => {
      if (c.id === targetId) return this.applyReaction(c, 'dislike');
      if (c.replies) {
        const newReplies = c.replies.map(r => r.id === targetId ? this.applyReaction(r, 'dislike') : r);
        if (newReplies !== c.replies) return { ...c, replies: newReplies };
      }
      return c;
    }));
  }

  private applyReaction<T extends { likes: number; dislikes: number; userReaction: Reaction }>(item: T, action: 'like' | 'dislike'): T {
    const current: Reaction = item.userReaction ?? null;
    let likes = item.likes ?? 0;
    let dislikes = item.dislikes ?? 0;
    let nextReaction: Reaction = current;

    if (action === 'like') {
      if (current === 'like') {
        likes = Math.max(0, likes - 1);
        nextReaction = null;
      } else if (current === 'dislike') {
        dislikes = Math.max(0, dislikes - 1);
        likes = likes + 1;
        nextReaction = 'like';
      } else {
        likes = likes + 1;
        nextReaction = 'like';
      }
    } else { // dislike
      if (current === 'dislike') {
        dislikes = Math.max(0, dislikes - 1);
        nextReaction = null;
      } else if (current === 'like') {
        likes = Math.max(0, likes - 1);
        dislikes = dislikes + 1;
        nextReaction = 'dislike';
      } else {
        dislikes = dislikes + 1;
        nextReaction = 'dislike';
      }
    }

    return { ...item, likes, dislikes, userReaction: nextReaction };
  }

  text = '';

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  private cryptoRandomId(): string {
    return Math.random().toString(36).slice(2, 9);
  }
}