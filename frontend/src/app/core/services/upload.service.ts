import { Injectable } from '@angular/core';
import { FilesService } from './files.service';

@Injectable({ providedIn: 'root' })
export class UploadService {
  constructor(private files: FilesService) {}
  upload(form: FormData) { return this.files.upload(form); }
  createLink(payload: Record<string, unknown>) { return this.files.createLink(payload); }
}
