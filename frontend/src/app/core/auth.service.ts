import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

export interface UserProfile {
  id?: string;
  display_name?: string;
  email?: string;
  role?: string;
  avatar_url?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly profile = signal<UserProfile | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  constructor(
    private api: ApiService,
    private token: TokenService,
    private router: Router
  ) {
    this.isAuthenticated.set(this.token.hasToken());
  }

  login(email: string, password: string) {
    return this.api.post<any>('/appscript-auth/login', { email, password });
  }

  signup(email: string, password: string, displayName: string) {
    return this.api.post<any>('/appscript-auth/signup', { email, password, displayName });
  }

  onLoginSuccess(accessToken: string, profile: UserProfile | null) {
    this.token.setToken(accessToken);
    this.isAuthenticated.set(true);
    this.profile.set(profile);
  }

  fetchMe() {
    return this.api.get<UserProfile>('/appscript-auth/me');
  }

  logout() {
    this.token.clear();
    this.isAuthenticated.set(false);
    this.profile.set(null);
    this.router.navigate(['/login']);
  }
}
