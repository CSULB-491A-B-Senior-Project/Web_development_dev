import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProfilePictureStore {
  private apiBaseUrl = environment.apiBaseUrl?.replace(/\/$/, '') ?? '';
  profilePictureUrl = signal<string | null>(null);

  private log(prefix: string, value: unknown) {
    console.log(`[ProfilePictureStore] ${prefix}`, {
      at: new Date().toISOString(),
      incoming: value,
      current: this.profilePictureUrl(),
    });
  }

  // Normalize common server response shapes into a single URL
  private extractAvatar(raw: unknown): string | null {
    const r = raw as {
      profilePictureUrl?: unknown;
      profileImageUrl?: unknown;
      avatarUrl?: unknown;
      avatar?: unknown;
      pictureUrl?: unknown;
      data?: Record<string, unknown>;
      user?: Record<string, unknown>;
    };

    const candidates: unknown[] = [
      r?.profilePictureUrl,
      r?.profileImageUrl,
      r?.avatarUrl,
      r?.avatar,
      r?.pictureUrl,
      r?.data?.['profilePictureUrl'],
      r?.data?.['profileImageUrl'],
      r?.data?.['avatarUrl'],
      r?.data?.['avatar'],
      r?.user?.['profilePictureUrl'],
      r?.user?.['profileImageUrl'],
      r?.user?.['avatarUrl'],
      r?.user?.['avatar'],
    ];

    const first = candidates.find(v => typeof v === 'string' && (v as string).trim().length > 0) as string | undefined;
    return first ? first.trim() : null;
  }

  // Public: accept raw profile and set once
  setFromProfileOnce(rawProfile: unknown) {
    this.log('setFromProfileOnce() called', rawProfile);
    const url = this.extractAvatar(rawProfile);
    this.setOnce(url);
  }

  // Public: accept raw profile and set (allows overwrite)
  setFromProfile(rawProfile: unknown) {
    this.log('setFromProfile() called', rawProfile);
    const url = this.extractAvatar(rawProfile);
    this.set(url);
  }

  set(url: string | null | undefined) {
    this.log('set() called', url);
    const cleaned = (url ?? '').trim();

    if (!cleaned) {
      if (this.profilePictureUrl() === null) {
        console.log('[ProfilePictureStore] set(null) allowed (store currently null)');
        this.profilePictureUrl.set(null);
      } else {
        console.log('[ProfilePictureStore] set(null) ignored (store already has a real URL)');
      }
      return;
    }

    // If it’s a signed URL (GCS/AWS), DO NOT change it (no base, no slash collapse, no cache-buster)
    if (this.isSignedUrl(cleaned)) {
      console.log('[ProfilePictureStore] signed URL detected; using as-is');
      this.profilePictureUrl.set(cleaned);
      return;
    }

    // For non‑signed URLs, normalize and optionally cache-bust
    let normalized = this.resolveImageUrl(cleaned);
    normalized = this.collapsePathSlashes(normalized);

    const hasQuery = normalized.includes('?');
    const sep = hasQuery ? '&' : '?';
    const finalUrl = `${normalized}${sep}t=${Date.now()}`;

    console.log('[ProfilePictureStore] setting real URL', { cleaned, normalized, finalUrl });
    this.profilePictureUrl.set(finalUrl);
  }

  setOnce(url: string | null | undefined) {
    this.log('setOnce() called', url);
    if (this.profilePictureUrl() !== null) {
      console.log('[ProfilePictureStore] setOnce() ignored (already set)');
      return;
    }
    this.set(url);
  }

  private resolveImageUrl(raw?: unknown): string {
    const v = (raw ?? '').toString().trim();
    if (!v) return '';
    if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('blob:') || v.startsWith('data:')) return v;
    const base = this.apiBaseUrl || window.location.origin;
    if (v.startsWith('/')) return `${base}${v}`;
    return `${base}/${v}`;
  }

  private collapsePathSlashes(u: string): string {
    try {
      const parsed = new URL(u);
      // Replace multiple slashes in pathname with single slash
      parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');
      return parsed.toString();
    } catch {
      // If not a valid URL, fallback to simple replacement
      return u.replace(/\/{2,}/g, '/');
    }
  }

  private isSignedUrl(u: string): boolean {
    // Detect common signed URL params
    const hasGoog = u.includes('X-Goog-Algorithm') || u.includes('X-Goog-Signature');
    const hasAmz = u.includes('X-Amz-Signature') || u.includes('X-Amz-Credential');
    return hasGoog || hasAmz;
  }
}