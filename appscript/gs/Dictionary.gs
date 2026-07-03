// ============================================================
// Dictionary.gs — Normalização e classificação automática
// ============================================================

const JUNK_PATTERNS = [
  /\b(final|v\d+|versao|versão|copia|cópia|draft|download|temp|old|novo|new|rev|bkp|backup)\b/gi,
  /[-_]+/g,
  /\s{2,}/g,
  /\b\d{4,}\b(?!\s*[a-z])/gi, // números soltos (não anos)
];

const JUNK_WORDS = new Set([
  'final','versao','versão','copia','cópia','download','temp','old','novo','new',
  'rev','bkp','backup','draft','corrigido','atualizado','updated','copy','v1','v2',
  'v3','scan','digitalizado','ocr',
]);

/**
 * Normaliza um nome de arquivo
 * @param {string} rawName
 * @returns {{ name: string, reason: string, confidence: number }}
 */
function normalizeName(rawName) {
  if (!rawName) return { name: rawName, reason: 'Sem nome', confidence: 0 };

  // Remove extensão para trabalhar só no nome base
  const extMatch = rawName.match(/(\.[a-z0-9]{2,5})$/i);
  const ext      = extMatch ? extMatch[1].toLowerCase() : '';
  let   base     = extMatch ? rawName.slice(0, -ext.length) : rawName;

  // Substitui _ e - por espaço
  base = base.replace(/[_\-]+/g, ' ');

  // Remove palavras lixo
  const parts = base.split(' ').filter(w => {
    const lower = w.toLowerCase();
    return w.length > 0 && !JUNK_WORDS.has(lower) && !/^\d+$/.test(w);
  });

  base = parts.join(' ').trim();

  if (!base || base.length < 3) {
    return {
      name:       rawName,
      reason:     'Nome muito curto após normalização; revisão manual necessária.',
      confidence: 0.1,
    };
  }

  // Tenta correspondência com dicionário
  const dictMatch = _matchDictionary_(base);
  const finalName = dictMatch ? dictMatch.normalized_term : _toTitleCase_(base);
  const confidence = dictMatch ? Math.min(0.99, 0.60 + dictMatch.weight * 0.04) : 0.55;

  const reason = dictMatch
    ? 'Termo "' + dictMatch.raw_term + '" reconhecido no dicionário (peso ' + dictMatch.weight + ').'
    : 'Capitalização automática aplicada. Revisão recomendada.';

  return { name: finalName + ext, reason, confidence };
}

/**
 * Classifica arquivo por tipo/categoria usando dicionário + MIME
 */
function classifyFile(rawName, mimeType) {
  const result = {
    fileType:   _guessFileType_(rawName, mimeType),
    categoryId: null,
    subjectId:  null,
    cycleId:    null,
  };

  const dictMatch = _matchDictionary_(rawName);
  if (dictMatch) {
    if (dictMatch.file_type_hint) result.fileType = dictMatch.file_type_hint;

    // Busca category_id pelo nome
    if (dictMatch.category_hint) {
      const cats = supabaseQuery_('categories', 'select=id&name=ilike.' + encodeURIComponent(dictMatch.category_hint));
      if (cats && cats[0]) result.categoryId = cats[0].id;
    }
    if (dictMatch.subject_hint) {
      const subs = supabaseQuery_('subjects', 'select=id&name=ilike.' + encodeURIComponent(dictMatch.subject_hint));
      if (subs && subs[0]) result.subjectId = subs[0].id;
    }
  }

  return result;
}

// -------- Helpers --------

function _matchDictionary_(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const terms = supabaseQuery_('dictionary_terms', 'select=*&active=eq.true&order=weight.desc');
  if (!terms) return null;

  let best = null;
  for (const term of terms) {
    if (lower.includes(term.raw_term.toLowerCase())) {
      if (!best || term.weight > best.weight) best = term;
    }
  }
  return best;
}

function _guessFileType_(name, mime) {
  const n = (name || '').toLowerCase();
  const m = (mime || '').toLowerCase();

  if (m.includes('pdf'))                          return 'document';
  if (m.includes('presentation') || n.includes('slide') || n.includes('aula')) return 'slide';
  if (n.includes('prova') || n.includes('gabarito') || n.includes('teste'))    return 'test';
  if (n.includes('resumo') || n.includes('summary'))                           return 'summary';
  if (n.includes('apostila') || n.includes('notes'))                           return 'notes';
  if (n.includes('livro') || n.includes('book') || n.includes('manual'))       return 'book';
  if (n.includes('artigo') || n.includes('article') || n.includes('paper'))    return 'article';
  if (m.includes('csv') || m.includes('spreadsheet'))                          return 'dataset';
  return 'other';
}

function _toTitleCase_(str) {
  const minors = new Set([
    'de','da','do','das','dos','e','a','o','as','os','em','por','para','com',
    'um','uma','uns','umas','na','no','nas','nos','ao','à','the','of','and','in',
  ]);
  return str.toLowerCase()
    .split(' ')
    .map((w, i) => (i === 0 || !minors.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(' ');
}

/** Funções chamáveis pelo frontend */
function getDictionaryTerms() {
  const profile = getMyProfile();
  if (!profile) return { ok: false };
  const terms = supabaseQuery_('dictionary_terms', 'select=*&active=eq.true&order=weight.desc');
  return { ok: true, terms: terms || [] };
}

function saveDictionaryTerm(term) {
  const profile = getMyProfile();
  if (!profile || profile.role !== 'admin') return { ok: false, error: 'Sem permissão' };
  if (term.id) {
    supabaseUpdate_('dictionary_terms', 'id=eq.' + term.id, term);
  } else {
    supabaseInsert_('dictionary_terms', term, false);
  }
  return { ok: true };
}
