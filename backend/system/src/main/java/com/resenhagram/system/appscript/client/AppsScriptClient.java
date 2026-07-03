package com.resenhagram.system.appscript.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resenhagram.system.appscript.dto.AppsScriptRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class AppsScriptClient {

    @Value("${APPS_SCRIPT_API_URL:}")
    private String appsScriptApiUrl;

    @Value("${APPS_SCRIPT_API_SECRET:}")
    private String appsScriptApiSecret;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    public Map<String, Object> call(String action, Object payload) {
        try {
            if (appsScriptApiUrl == null || appsScriptApiUrl.isBlank()) {
                return error("APPS_SCRIPT_API_URL não configurada no backend.", 500);
            }

            if (appsScriptApiSecret == null || appsScriptApiSecret.isBlank()) {
                return error("APPS_SCRIPT_API_SECRET não configurada no backend.", 500);
            }

            AppsScriptRequest requestBody = new AppsScriptRequest(
                    appsScriptApiSecret,
                    action,
                    payload == null ? new LinkedHashMap<>() : payload
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpResponse<String> response = postThenFollowAsGet(appsScriptApiUrl, json);

            int status = response.statusCode();
            String body = response.body();

            if (status < 200 || status >= 300) {
                return error("Apps Script retornou HTTP " + status + ": " + preview(body), status);
            }

            if (body == null || body.isBlank()) {
                return error("Resposta vazia do Apps Script.", 502);
            }

            if (!body.trim().startsWith("{")) {
                return error("Apps Script retornou HTML/texto em vez de JSON: " + preview(body), 502);
            }

            return objectMapper.readValue(body, new TypeReference<Map<String, Object>>() {});

        } catch (Exception e) {
            return error("Falha ao comunicar com o Apps Script: " + e.getMessage(), 502);
        }
    }

    public Object callForData(String action, Object payload) {
        Map<String, Object> response = call(action, payload);

        if (Boolean.FALSE.equals(response.get("ok"))) {
            return response;
        }

        if (response.containsKey("data")) {
            return response.get("data");
        }

        Map<String, Object> copy = new LinkedHashMap<>(response);
        copy.remove("ok");
        return copy;
    }

    private HttpResponse<String> postThenFollowAsGet(String url, String json) throws Exception {
        URI uri = URI.create(url);

        HttpRequest postRequest = HttpRequest.newBuilder(uri)
                .timeout(Duration.ofSeconds(60))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();

        HttpResponse<String> response = httpClient.send(postRequest, HttpResponse.BodyHandlers.ofString());

        for (int i = 0; i < 5; i++) {
            int status = response.statusCode();

            if (!(status == 301 || status == 302 || status == 303 || status == 307 || status == 308)) {
                return response;
            }

            String location = response.headers().firstValue("Location").orElse(null);

            if (location == null || location.isBlank()) {
                return response;
            }

            uri = uri.resolve(location);

            HttpRequest getRequest = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(60))
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            response = httpClient.send(getRequest, HttpResponse.BodyHandlers.ofString());
        }

        throw new RuntimeException("Muitos redirecionamentos ao chamar Apps Script.");
    }

    private Map<String, Object> error(String message, int status) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("ok", false);
        map.put("message", message);
        map.put("error", message);
        map.put("status", status);
        return map;
    }

    private String preview(String body) {
        if (body == null) {
            return "";
        }

        String clean = body.replaceAll("\\s+", " ").trim();

        if (clean.length() > 300) {
            return clean.substring(0, 300) + "...";
        }

        return clean;
    }
}
