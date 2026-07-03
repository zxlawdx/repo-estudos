import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class HistoryService {
  constructor(private api: ApiService) {}
  list(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/history', params); }
}
