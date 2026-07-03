package com.resenhagram.system.history;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/history")
public class HistoryProxyController {

    private final AppsScriptClient appsScriptClient;

    public HistoryProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list(@RequestParam Map<String, String> filters, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(filters);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("getHistoryFull", payload);
    }

    @GetMapping("/recent")
    public Object recent(@RequestParam(required = false, defaultValue = "10") Integer limit, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("limit", limit);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("getRecentActivity", payload);
    }
}
