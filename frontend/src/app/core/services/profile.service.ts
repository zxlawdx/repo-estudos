import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { UserProfile } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private api: ApiService) {}
  me(): Observable<UserProfile> { return this.api.get<UserProfile>('/profile/me'); }
  stats(): Observable<unknown> { return this.api.get<unknown>('/profile/stats'); }
  update(payload: Record<string, unknown>): Observable<UserProfile> { return this.api.put<UserProfile>('/profile/me', payload); }
  uploadPhoto(form: FormData): Observable<unknown> { return this.api.postForm<unknown>('/profile/photo', form); }
}
