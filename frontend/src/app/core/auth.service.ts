import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AuthLoginResponse, UserProfile } from './models/app.models';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly profile = signal<UserProfile | null>(null);
  readonly isAuthenticated = signal<boolean>(false);

  constructor(private api: ApiService, private token: TokenService, private router: Router) {
    this.profile.set(this.token.getProfile());
    this.isAuthenticated.set(this.token.hasToken());
  }

  login(email: string, password: string): Observable<AuthLoginResponse> {
    return this.api.post<AuthLoginResponse>('/appscript-auth/login', { email, password }).pipe(
      tap((res) => this.acceptLoginResponse(res))
    );
  }

  signup(email: string, password: string, displayName: string): Observable<AuthLoginResponse> {
    return this.api.post<AuthLoginResponse>('/appscript-auth/signup', { email, password, displayName });
  }

  restoreSession(): void {
    if (!this.token.hasToken()) return;
    this.isAuthenticated.set(true);
    this.profile.set(this.token.getProfile());
    this.fetchMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.token.setProfile(profile);
      },
      error: () => undefined
    });
  }

  fetchMe(): Observable<UserProfile> {
    return this.api.get<UserProfile>('/appscript-auth/me');
  }

  onLoginSuccess(accessToken: string, profile: UserProfile | null, user: UserProfile | null = null): void {
    this.token.setSession(accessToken, user, profile);
    this.isAuthenticated.set(true);
    this.profile.set(profile || user);
  }

  logout(): void {
    this.token.clear();
    this.isAuthenticated.set(false);
    this.profile.set(null);
    this.router.navigate(['/login']);
  }

  isAdmin(): boolean {
    const role = String(this.profile()?.role || '').toLowerCase();
    return role === 'admin' || role === 'administrator';
  }

  private acceptLoginResponse(res: AuthLoginResponse): void {
    const accessToken = res.accessToken || '';
    if (!accessToken) throw new Error('Login retornou sem accessToken.');
    this.onLoginSuccess(accessToken, res.profile || res.user || null, res.user || null);
  }
}
