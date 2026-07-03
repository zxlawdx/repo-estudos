import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class RelationsService {
  constructor(private api: ApiService) {}
  list(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/relations', params); }
  create(payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>('/relations', payload); }
  delete(id: string): Observable<unknown> { return this.api.delete<unknown>(`/relations/${encodeURIComponent(id)}`); }
}
