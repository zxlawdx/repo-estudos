package com.resenhagram.system.relations;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/relations")
public class RelationsProxyController {

    private final AppsScriptClient appsScriptClient;

    public RelationsProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list(@RequestParam Map<String, String> filters, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(filters);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("listGraphEdges", payload);
    }

    @PostMapping
    public Object create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        return appsScriptClient.callForData("saveGraphEdge", payload);
    }

    @DeleteMapping("/{edgeId}")
    public Object delete(@PathVariable String edgeId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("edgeId", edgeId);
        return appsScriptClient.callForData("deleteGraphEdge", payload);
    }
}
