package com.resenhagram.system.categories;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/categories")
public class CategoryProxyController {

    private final AppsScriptClient appsScriptClient;

    public CategoryProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list() {
        return appsScriptClient.callForData("listCategories", Map.of());
    }

    @GetMapping("/tree")
    public Object tree() {
        return appsScriptClient.callForData("getCategoryTree", Map.of());
    }

    @GetMapping("/{categoryId}/subjects")
    public Object subjects(@PathVariable String categoryId) {
        return appsScriptClient.callForData("listSubjects", Map.of("categoryId", categoryId));
    }

    @GetMapping("/subjects/{subjectId}/cycles")
    public Object cycles(@PathVariable String subjectId) {
        return appsScriptClient.callForData("listCycles", Map.of("subjectId", subjectId));
    }

    @GetMapping("/tags")
    public Object tags() {
        return appsScriptClient.callForData("listTags", Map.of());
    }

    @PostMapping
    public Object create(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("createCategory", body);
    }

    @PutMapping("/{id}")
    public Object update(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("updateCategory", Map.of("id", id, "data", body));
    }

    @DeleteMapping("/{id}")
    public Object delete(@PathVariable String id) {
        return appsScriptClient.callForData("deleteCategory", Map.of("id", id));
    }
}
