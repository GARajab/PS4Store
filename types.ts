
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
  download_count: number;
}

export interface GameReport {
  id: string;
  game_id: string;
  game_title?: string;
  user_id: string;
  status: 'pending' | 'resolved';
  created_at: string;
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
