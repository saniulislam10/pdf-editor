export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  provider: 'email' | 'google';
  created_at: number;
}

export type AuthModalTab = 'login' | 'register' | 'forgot';
