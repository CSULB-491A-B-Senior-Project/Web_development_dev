export type Reaction = 'like' | 'dislike' | null;

export interface CommentDto {
  id: string;
  author: string | { id?: string; username?: string; displayName?: string; slug?: string };
  text: string;
  rating?: number | null;
  likes: number;
  dislikes: number;
  userReaction?: Reaction;
  createdAt: string;
  replies?: ReplyDto[];
}

export interface ReplyDto {
  id: string;
  author: string | { id?: string; username?: string; displayName?: string; slug?: string };
  text: string;
  likes: number;
  dislikes: number;
  userReaction?: Reaction;
  createdAt: string;
}

export interface PagedDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}