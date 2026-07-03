import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

interface ApiEnvelope<T> {
  ok?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    return this.http.get<unknown>(this.url(path), { params: this.params(params) }).pipe(
      map((response) => this.unwrap<T>(response)),
      catchError((error) => this.toFriendlyError(error))
    );
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<unknown>(this.url(path), body).pipe(
      map((response) => this.unwrap<T>(response)),
      catchError((error) => this.toFriendlyError(error))
    );
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<unknown>(this.url(path), body).pipe(
      map((response) => this.unwrap<T>(response)),
      catchError((error) => this.toFriendlyError(error))
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<unknown>(this.url(path)).pipe(
      map((response) => this.unwrap<T>(response)),
      catchError((error) => this.toFriendlyError(error))
    );
  }

  postForm<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<unknown>(this.url(path), formData).pipe(
      map((response) => this.unwrap<T>(response)),
      catchError((error) => this.toFriendlyError(error))
    );
  }

  unwrap<T>(response: unknown): T {
    const envelope = response as ApiEnvelope<T> | null;
    if (envelope && typeof envelope === 'object' && envelope.ok === false) {
      throw new Error(envelope.message || envelope.error || 'A API retornou uma falha.');
    }
    if (envelope && typeof envelope === 'object' && 'data' in envelope) {
      return envelope.data as T;
    }
    return response as T;
  }

  friendlyMessage(error: unknown): string {
    if (error instanceof Error && error.message) return this.cleanMessage(error.message);
    if (error instanceof HttpErrorResponse) {
      const body = error.error as { message?: string; error?: string } | string | null;
      if (typeof body === 'string' && body.trim()) return this.cleanMessage(body);
      if (body && typeof body === 'object') return this.cleanMessage(body.message || body.error || error.message);
      return this.cleanMessage(error.message);
    }
    return 'Não foi possível conectar ao servidor.';
  }

  private url(path: string): string {
    const cleanBase = this.baseUrl.replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanBase}${cleanPath}`;
  }

  private params(params?: Record<string, unknown>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;
    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') httpParams = httpParams.set(key, String(value));
    });
    return httpParams;
  }

  private toFriendlyError(error: unknown): Observable<never> {
    return throwError(() => new Error(this.friendlyMessage(error)));
  }

  private cleanMessage(message: string): string {
    if (/invalid cors request/i.test(message)) return 'Não foi possível acessar a API pelo navegador. Verifique o proxy /api do Nginx e o CORS no backend.';
    if (/unknown error|http failure response/i.test(message)) return 'Não foi possível conectar ao servidor. Confira se backend e proxy /api estão ativos.';
    return message || 'Não foi possível concluir a operação.';
  }
}
