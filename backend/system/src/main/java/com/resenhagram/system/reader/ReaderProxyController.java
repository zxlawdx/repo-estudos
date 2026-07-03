package com.resenhagram.system.reader;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/reader")
public class ReaderProxyController {

    private final AppsScriptClient appsScriptClient;

    public ReaderProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping("/materials/{materialId}")
    public Object materialData(@PathVariable String materialId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("materialId", materialId);
        return appsScriptClient.callForData("getMaterialReaderData", payload);
    }

    @PostMapping("/progress")
    public Object saveProgress(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("saveReadingProgress", PayloadUtils.withToken(body, token));
    }

    @PostMapping("/video-progress")
    public Object saveVideoProgress(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("saveVideoProgress", PayloadUtils.withToken(body, token));
    }
}
