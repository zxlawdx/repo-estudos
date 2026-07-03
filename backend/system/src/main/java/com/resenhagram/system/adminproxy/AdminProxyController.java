package com.resenhagram.system.adminproxy;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin-proxy")
public class AdminProxyController {

    private final AppsScriptClient appsScriptClient;

    public AdminProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping("/users")
    public Object listUsers(@RequestParam Map<String, String> filters, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new java.util.LinkedHashMap<>(filters);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("getAdminUsers", payload);
    }

    @PutMapping("/users/{profileId}")
    public Object updateUser(@PathVariable String profileId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("profileId", profileId);
        return appsScriptClient.callForData("updateManagedUser", payload);
    }

    @GetMapping("/users/{profileId}")
    public Object userDetail(@PathVariable String profileId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("profileId", profileId);
        return appsScriptClient.callForData("getAdminUserDetail", payload);
    }
}
