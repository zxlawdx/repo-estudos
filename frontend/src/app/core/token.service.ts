import { Injectable } from '@angular/core';
import { UserProfile } from './models/app.models';

const TOKEN_KEY = 'repo_estudos_access_token';
const USER_KEY = 'repo_estudos_user';
const PROFILE_KEY = 'repo_estudos_profile';

@Injectable({ providedIn: 'root' })
export class TokenService {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  setSession(accessToken: string, user: UserProfile | null, profile: UserProfile | null): void {
    this.setToken(accessToken);
    if (user) sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    if (profile) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  getUser(): UserProfile | null {
    return this.parse(USER_KEY);
  }

  getProfile(): UserProfile | null {
    return this.parse(PROFILE_KEY);
  }

  setProfile(profile: UserProfile | null): void {
    if (profile) sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }

  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  private parse(key: string): UserProfile | null {
    try {
      const value = sessionStorage.getItem(key);
      return value ? (JSON.parse(value) as UserProfile) : null;
    } catch {
      return null;
    }
  }
}
