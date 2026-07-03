import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class PathsService {
  constructor(private api: ApiService) {}
  list(): Observable<unknown> { return this.api.get<unknown>('/paths'); }
  detail(id: string): Observable<unknown> { return this.api.get<unknown>(`/paths/${encodeURIComponent(id)}`); }
  progress(itemId: string, status: string, notes = ''): Observable<unknown> {
    return this.api.post<unknown>(`/paths/items/${encodeURIComponent(itemId)}/progress`, { status, notes });
  }
}
