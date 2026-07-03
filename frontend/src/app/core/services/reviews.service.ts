import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  constructor(private api: ApiService) {}
  list(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/reviews', params); }
  materials(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/reviews/materials', params); }
  filters(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/reviews/filters', params); }
  create(payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>('/reviews', payload); }
  detail(id: string): Observable<unknown> { return this.api.get<unknown>(`/reviews/${encodeURIComponent(id)}`); }
  comment(postId: string, payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>(`/reviews/${encodeURIComponent(postId)}/comments`, payload); }
  reaction(postId: string, payload: Record<string, unknown> = {}): Observable<unknown> { return this.api.post<unknown>(`/reviews/${encodeURIComponent(postId)}/reaction`, payload); }
  save(postId: string): Observable<unknown> { return this.api.post<unknown>(`/reviews/${encodeURIComponent(postId)}/save`, {}); }
}
