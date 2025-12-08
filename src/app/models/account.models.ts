export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;

  bio: string | null;

  profileImageUrl: string | null;
  backgroundImageUrl: string | null;

  favoriteSongId: string | null;
}
