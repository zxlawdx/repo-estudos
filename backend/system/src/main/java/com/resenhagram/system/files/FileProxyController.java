package com.resenhagram.system.files;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FileProxyController {

    private static final long MAX_UPLOAD_BYTES = 50L * 1024 * 1024;

    private final AppsScriptClient appsScriptClient;

    public FileProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list(@RequestParam Map<String, String> filters, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(filters);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("getFiles", payload);
    }

    @GetMapping("/{id}")
    public Object detail(@PathVariable String id, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("fileId", id);
        return appsScriptClient.callForData("getFileDetail", payload);
    }

    @PostMapping(value = "/upload", consumes = "multipart/form-data")
    public ResponseEntity<?> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String finalName,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String categoryId,
            @RequestParam(required = false) String subjectId,
            @RequestParam(required = false) String cycleId,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String fileType,
            HttpServletRequest request
    ) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", "Arquivo ausente."));
        }
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("ok", false, "error", "Arquivo excede o limite de 50 MB."));
        }

        String base64;
        try {
            base64 = Base64.getEncoder().encodeToString(file.getBytes());
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("ok", false, "error", "Falha ao ler arquivo: " + e.getMessage()));
        }

        String token = BearerTokenUtils.extract(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("accessToken", token);
        payload.put("base64", base64);
        payload.put("fileName", file.getOriginalFilename());
        payload.put("mimeType", file.getContentType());
        payload.put("size", file.getSize());
        payload.put("finalName", finalName);
        payload.put("title", title);
        payload.put("categoryId", categoryId);
        payload.put("subjectId", subjectId);
        payload.put("cycleId", cycleId);
        payload.put("author", author);
        payload.put("year", year);
        payload.put("note", note);
        payload.put("visibility", visibility);
        payload.put("status", status);
        payload.put("fileType", fileType);

        return ResponseEntity.ok(appsScriptClient.callForData("uploadFile", payload));
    }

    @PostMapping("/link")
    public Object createFromLink(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("createMaterialFromLink", PayloadUtils.withToken(body, token));
    }

    @PutMapping("/{id}")
    public Object update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("fileId", id);
        payload.put("updates", body);
        return appsScriptClient.callForData("updateFile", payload);
    }

    @PostMapping("/{id}/tags")
    public Object setTags(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("fileId", id);
        return appsScriptClient.callForData("setFileTags", payload);
    }

    @PostMapping("/{id}/progress")
    public Object progress(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("fileId", id);
        return appsScriptClient.callForData("updateProgress", payload);
    }

    @PostMapping("/{id}/approve")
    public Object approve(@PathVariable String id, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("fileId", id);
        return appsScriptClient.callForData("approveMaterial", payload);
    }

    @PostMapping("/{id}/reject")
    public Object reject(@PathVariable String id, @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body == null ? Map.of() : body, token);
        payload.put("fileId", id);
        return appsScriptClient.callForData("rejectMaterial", payload);
    }

    @GetMapping("/review/pending")
    public Object pendingReview(HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("getPendingReviewMaterials", PayloadUtils.tokenOnly(token));
    }

    @GetMapping("/suggestions/pending")
    public Object pendingSuggestions(HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("getPendingSuggestions", PayloadUtils.tokenOnly(token));
    }

    @PostMapping("/suggestions/{suggestionId}/approve")
    public Object approveSuggestion(@PathVariable String suggestionId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("suggestionId", suggestionId);
        return appsScriptClient.callForData("approveSuggestion", payload);
    }

    @PostMapping("/suggestions/{suggestionId}/reject")
    public Object rejectSuggestion(@PathVariable String suggestionId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("suggestionId", suggestionId);
        return appsScriptClient.callForData("rejectSuggestion", payload);
    }
}
