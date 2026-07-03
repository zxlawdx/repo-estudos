import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  constructor(private api: ApiService) {}
  tree(): Observable<unknown> { return this.api.get<unknown>('/categories/tree'); }
  tags(): Observable<unknown> { return this.api.get<unknown>('/categories/tags'); }
}
