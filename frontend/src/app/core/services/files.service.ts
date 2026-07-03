import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { StudyMaterial } from '../models/app.models';

@Injectable({ providedIn: 'root' })
export class FilesService {
  constructor(private api: ApiService) {}
  list(params?: Record<string, unknown>): Observable<unknown> { return this.api.get<unknown>('/files', params); }
  detail(id: string): Observable<StudyMaterial> { return this.api.get<StudyMaterial>(`/files/${encodeURIComponent(id)}`); }
  upload(form: FormData): Observable<unknown> { return this.api.postForm<unknown>('/files/upload', form); }
  createLink(payload: Record<string, unknown>): Observable<unknown> { return this.api.post<unknown>('/files/link', payload); }
}
