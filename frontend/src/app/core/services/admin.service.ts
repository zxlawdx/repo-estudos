import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private api: ApiService) {}
  users(): Observable<unknown> { return this.api.get<unknown>('/admin-proxy/users'); }
  updateUser(id: string, payload: Record<string, unknown>): Observable<unknown> { return this.api.put<unknown>(`/admin-proxy/users/${encodeURIComponent(id)}`, payload); }
}
