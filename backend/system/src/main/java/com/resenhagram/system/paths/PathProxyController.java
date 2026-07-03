package com.resenhagram.system.paths;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/paths")
public class PathProxyController {

    private final AppsScriptClient appsScriptClient;

    public PathProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("getLearningPaths", filters);
    }

    @PostMapping
    public Object create(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("createLearningPath", body);
    }

    @GetMapping("/{pathId}")
    public Object detail(@PathVariable String pathId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("pathId", pathId);
        return appsScriptClient.callForData("getPathDetail", payload);
    }

    @PostMapping("/items")
    public Object addItem(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("addMaterialToPath", body);
    }

    @DeleteMapping("/items/{itemId}")
    public Object removeItem(@PathVariable String itemId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("itemId", itemId);
        return appsScriptClient.callForData("removeMaterialFromPath", payload);
    }

    @PutMapping("/items/{itemId}")
    public Object updateItem(@PathVariable String itemId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("accessToken", token);
        payload.put("itemId", itemId);
        payload.put("updates", body);
        return appsScriptClient.callForData("updatePathItem", payload);
    }

    @PostMapping("/items/{itemId}/move")
    public Object moveItem(@PathVariable String itemId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("itemId", itemId);
        return appsScriptClient.callForData("movePathItem", payload);
    }

    @GetMapping("/picker/materials")
    public Object picker(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("listMaterialsForPathPicker", filters);
    }

    @PostMapping("/items/{itemId}/progress")
    public Object itemProgress(@PathVariable String itemId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("itemId", itemId);
        return appsScriptClient.callForData("setPathItemProgress", payload);
    }

    @PostMapping("/dependencies")
    public Object addDependency(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        return appsScriptClient.callForData("addDependency", PayloadUtils.withToken(body, token));
    }

    @DeleteMapping("/dependencies/{depId}")
    public Object removeDependency(@PathVariable String depId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("depId", depId);
        return appsScriptClient.callForData("removeDependency", payload);
    }
}
