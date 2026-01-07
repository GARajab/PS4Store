
export type Platform = 'PS4' | 'PS5' | 'Both';

export interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  downloadUrl: string;
  platform: Platform;
  category: string;
  rating: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
