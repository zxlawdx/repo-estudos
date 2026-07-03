package com.resenhagram.system.appscript;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/appscript-auth")
public class AppScriptAuthController {

    private final AppsScriptClient appsScriptClient;

    public AppScriptAuthController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @PostMapping("/login")
    public Object login(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("loginUser", body);
    }

    @PostMapping("/signup")
    public Object signup(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("signUpUser", body);
    }

    @PostMapping("/refresh")
    public Object refresh(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("refreshSupabaseSession", body);
    }

    @GetMapping("/me")
    public Object me(HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("getMyProfile", PayloadUtils.tokenOnly(token));
    }
}
