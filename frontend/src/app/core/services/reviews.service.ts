import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  constructor(private api: ApiService) {}
  list(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/reviews', params); }
  create(payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>('/reviews', payload); }
}
