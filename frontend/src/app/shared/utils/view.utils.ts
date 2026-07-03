export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

export function pickString(source: unknown, keys: string[], fallback = ''): string {
  const obj = asRecord(source);
  for (const key of keys) {
    let value: unknown = obj[key];
    if (value === undefined && key.includes('.')) {
      value = key.split('.').reduce<unknown>((acc, part) => asRecord(acc)[part], obj);
    }
    if (value && typeof value === 'object') {
      const nested = asRecord(value);
      value = nested['name'] ?? nested['title'] ?? nested['label'] ?? '';
    }
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
  }
  return fallback;
}

export function pickNumber(source: unknown, keys: string[], fallback = 0): number {
  const obj = asRecord(source);
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  }
  return fallback;
}

export function firstArray<T = UnknownRecord>(value: unknown, keys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  const obj = asRecord(value);
  for (const key of keys) {
    const maybe = obj[key];
    if (Array.isArray(maybe)) return maybe as T[];
  }
  const data = obj['data'];
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    return firstArray<T>(data, keys);
  }
  return [];
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function fileTitle(item: unknown): string {
  return pickString(item, ['title', 'final_name', 'suggested_name', 'name', 'original_name', 'file_name'], 'Material sem título');
}

export function fileTypeLabel(type: unknown): string {
  const value = String(type || '').toLowerCase();
  const map: Record<string, string> = {
    book: 'Livro', article: 'Artigo', slide: 'Slide', slides: 'Slides', pdf: 'PDF',
    video: 'Vídeo', playlist: 'Playlist', external_link: 'Link', link: 'Link', test: 'Prova', summary: 'Resumo'
  };
  return map[value] || (value ? value : 'Material');
}

export function statusLabel(status: unknown): string {
  const value = String(status || '').toLowerCase();
  const map: Record<string, string> = {
    pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado', archived: 'Arquivado',
    active: 'Ativo', inactive: 'Inativo', reading: 'Lendo', completed: 'Concluído', not_started: 'Não iniciado'
  };
  return map[value] || (value ? value : 'Sem status');
}

export function isAdminLike(role: unknown): boolean {
  const value = String(role || '').toLowerCase();
  return ['admin', 'administrator', 'editor', 'gerente'].includes(value);
}
