package com.resenhagram.system.profile;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileProxyController {

    private final AppsScriptClient appsScriptClient;

    public ProfileProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping("/me")
    public Object me(HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("getMyProfile", PayloadUtils.tokenOnly(token));
    }

    @PutMapping("/me")
    public Object updateMe(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("updateMyProfile", PayloadUtils.withToken(body, token));
    }

    @PostMapping(value = "/photo", consumes = "multipart/form-data")
    public Object uploadPhoto(@RequestParam("file") MultipartFile file, HttpServletRequest request) throws IOException {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("accessToken", token);
        payload.put("base64", Base64.getEncoder().encodeToString(file.getBytes()));
        payload.put("fileName", file.getOriginalFilename());
        payload.put("mimeType", file.getContentType());
        return appsScriptClient.callForData("uploadProfilePhoto", payload);
    }

    @GetMapping("/stats")
    public Object stats(HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("getMyStats", PayloadUtils.tokenOnly(token));
    }
}
