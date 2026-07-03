import { Injectable } from '@angular/core';

const TOKEN_KEY = 'repo_estudos_access_token';

@Injectable({ providedIn: 'root' })
export class TokenService {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }
}
