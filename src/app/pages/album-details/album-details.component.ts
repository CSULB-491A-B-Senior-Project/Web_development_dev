import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

interface CommentItem {
  id: number;
  author: string;
  text: string;
  createdAt: string;
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

  // placeholder username (use real user data later)
  readonly username = 'username';

  private fb = inject(FormBuilder);

  // modal visibility
  showCommentModal = signal(false);

  // comments state
  comments = signal<CommentItem[]>([]);

  // derived count
  commentCount = computed(() => this.comments().length);

  // NOTE: author removed from the form; only comment text is editable
  commentForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  openCommentModal(): void {
    // reset only the text input
    this.commentForm.patchValue({ text: '' });
    this.showCommentModal.set(true);
  }

  closeCommentModal(): void {
    this.showCommentModal.set(false);
  }

  submitComment(): void {
    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      return;
    }

    const { text } = this.commentForm.value as { text: string };

    const newComment: CommentItem = {
      id: Date.now(),
      author: this.username, // use placeholder username for display
      text: (text ?? '').trim(),
      createdAt: new Date().toISOString(),
    };

    this.comments.update(prev => [...prev, newComment]);
    this.closeCommentModal();
  }
}
