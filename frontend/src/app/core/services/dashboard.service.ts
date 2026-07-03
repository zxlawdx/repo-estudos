import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}
  summary(): Observable<unknown> { return this.api.get<unknown>('/dashboard/summary'); }
}
