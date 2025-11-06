import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';

interface CommentItem {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  replies?: Reply[];
}
interface Reply { 
  id: string; 
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
      id: this.cryptoRandomId(),
      author: this.username,
      text: (text ?? '').trim(),
      createdAt: new Date().toISOString(),
    };

    this.comments.update(prev => [...prev, newComment]);
    this.closeCommentModal();
  }

  // which comment currently has the open reply form
  replyTargetId = signal<string | null>(null);

  // single form reused for replies
  replyForm = this.fb.group({
    text: ['', [Validators.required, Validators.maxLength(500)]]
  });


  openReply(commentId: string) {
    this.replyForm.reset();
    this.replyTargetId.set(commentId);
    // optional: focus logic can be added if needed
  }

  closeReply() {
    this.replyTargetId.set(null);
    this.replyForm.reset();
  }

  submitReply(parentId: string): void {
    if (this.replyForm.invalid) return;

    // safe access to the control value without indexing into `controls`
    const control = this.replyForm.get('text');
    const raw = control?.value ?? '';
    const text = String(raw).trim();
    if (!text) return;

    const newReply: Reply = {
      id: this.cryptoRandomId(),
      author: this.username,
      text,
      createdAt: new Date().toISOString(),
    };

    this.comments.update(list =>
      list.map(c => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newReply] } : c)
    );

    this.closeReply();
  }

  text: string = '';

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // reset height
    textarea.style.height = textarea.scrollHeight + 'px'; // set to scroll height
  }

  // small helper — replace with UUID util or server id
  private cryptoRandomId(): string {
    return Math.random().toString(36).slice(2, 9);
  }
}



