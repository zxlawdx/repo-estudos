package com.resenhagram.system.common.util;

import jakarta.servlet.http.HttpServletRequest;

public final class BearerTokenUtils {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private BearerTokenUtils() {
    }

    /**
     * Extrai o accessToken do header "Authorization: Bearer ACCESS_TOKEN".
     * Retorna null se o header não existir ou não estiver no formato esperado.
     */
    public static String extract(HttpServletRequest request) {
        if (request == null) return null;
        String header = request.getHeader(HEADER);
        if (header == null || header.isBlank()) return null;
        if (!header.startsWith(PREFIX)) return null;
        String token = header.substring(PREFIX.length()).trim();
        return token.isBlank() ? null : token;
    }
}
