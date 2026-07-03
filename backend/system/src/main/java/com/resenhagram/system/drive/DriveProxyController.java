package com.resenhagram.system.drive;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/drive")
public class DriveProxyController {

    private final AppsScriptClient appsScriptClient;

    public DriveProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping("/health")
    public Object health() {
        return appsScriptClient.callForData("healthCheck", Map.of());
    }

    @PostMapping("/ensure-structure")
    public Object ensureStructure(@RequestBody(required = false) Map<String, Object> body) {
        return appsScriptClient.callForData("ensureDriveStructure", body == null ? Map.of() : body);
    }

    @GetMapping("/debug-structure")
    public Object debugStructure() {
        return appsScriptClient.callForData("debugDriveStructure", Map.of());
    }

    @PostMapping("/files/{fileId}/visibility")
    public Object setVisibility(@PathVariable String fileId, @RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("setDriveVisibility", Map.of("fileId", fileId, "isPublic", body.getOrDefault("isPublic", false)));
    }

    @DeleteMapping("/files/{fileId}")
    public Object delete(@PathVariable String fileId) {
        return appsScriptClient.callForData("deleteFromDrive", Map.of("fileId", fileId));
    }
}
