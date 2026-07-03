import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { GraphData } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class GraphService {
  constructor(private api: ApiService) {}
  global(params?: Record<string, unknown>): Observable<GraphData> { return this.api.get<GraphData>('/graph', params); }
  path(pathId: string): Observable<GraphData> { return this.api.get<GraphData>('/graph', { pathId }); }
  positions(scope = 'global', pathId = ''): Observable<unknown> { return this.api.get<unknown>('/graph/positions', { scope, pathId }); }
  savePositions(payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>('/graph/positions', payload); }
}
