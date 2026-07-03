package com.resenhagram.system.appscript.client;

import com.resenhagram.system.appscript.AppsScriptException;
import com.resenhagram.system.appscript.dto.AppsScriptRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Único ponto de comunicação com a API privada do Apps Script.
 *
 * Angular -> Spring Boot -> Apps Script API -> Drive/Supabase/Upstash
 *
 * O Spring é o único chamador desta API; o segredo nunca é exposto
 * ao frontend.
 */
@Component
public class AppsScriptClient {

    @Value("${APPS_SCRIPT_API_URL:}")
    private String appsScriptApiUrl;

    @Value("${APPS_SCRIPT_API_SECRET:}")
    private String appsScriptApiSecret;

    private final RestClient restClient = RestClient.create();

    /**
     * Executa uma action no Apps Script e retorna o mapa cru da resposta
     * (incluindo eventuais campos extras retornados pelas funções legadas,
     * como file, fileId, accessToken, etc.).
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> call(String action, Object payload) {
        if (appsScriptApiUrl == null || appsScriptApiUrl.isBlank()) {
            throw new AppsScriptException("APPS_SCRIPT_API_URL não configurada no backend.");
        }
        if (appsScriptApiSecret == null || appsScriptApiSecret.isBlank()) {
            throw new AppsScriptException("APPS_SCRIPT_API_SECRET não configurada no backend.");
        }

        AppsScriptRequest request = new AppsScriptRequest(appsScriptApiSecret, action, payload == null ? new LinkedHashMap<>() : payload);

        Map<String, Object> response;
        try {
            response = restClient.post()
                    .uri(appsScriptApiUrl)
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception ex) {
            throw new AppsScriptException("Falha ao comunicar com o Apps Script (action=" + action + "): " + ex.getMessage(), ex);
        }

        if (response == null) {
            throw new AppsScriptException("Resposta vazia do Apps Script (action=" + action + ").");
        }

        Object okField = response.get("ok");
        boolean ok = okField == null || Boolean.TRUE.equals(okField);
        if (!ok) {
            Object error = response.get("error");
            throw new AppsScriptException(error != null ? error.toString() : "Erro desconhecido no Apps Script (action=" + action + ").");
        }

        return response;
    }

    /**
     * Atalho para quando a action retorna o payload útil dentro de "data".
     * Caso a resposta legada não tenha "data" (campos soltos na raiz),
     * retorna a resposta inteira menos o campo "ok".
     */
    public Object callForData(String action, Object payload) {
        Map<String, Object> response = call(action, payload);
        if (response.containsKey("data")) {
            return response.get("data");
        }
        Map<String, Object> copy = new LinkedHashMap<>(response);
        copy.remove("ok");
        return copy;
    }
}
