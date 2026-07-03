package com.resenhagram.system.reviews;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
public class ReviewsProxyController {

    private final AppsScriptClient appsScriptClient;

    public ReviewsProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object list(@RequestParam Map<String, String> filters, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(filters);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("listReviews", payload);
    }

    @GetMapping("/filters")
    public Object filters(@RequestParam Map<String, String> params, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(params);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("listReviewFilters", payload);
    }

    @GetMapping("/materials")
    public Object materials(@RequestParam Map<String, String> params, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = new LinkedHashMap<>(params);
        if (token != null) payload.put("accessToken", token);
        return appsScriptClient.callForData("listReviewMaterials", payload);
    }

    @PostMapping
    public Object create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        return appsScriptClient.callForData("createReviewPost", payload);
    }

    @GetMapping("/{postId}")
    public Object detail(@PathVariable String postId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("postId", postId);
        return appsScriptClient.callForData("getReviewDetail", payload);
    }

    @PutMapping("/{postId}")
    public Object update(@PathVariable String postId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("postId", postId);
        return appsScriptClient.callForData("updateReviewPost", payload);
    }

    @DeleteMapping("/{postId}")
    public Object delete(@PathVariable String postId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("postId", postId);
        return appsScriptClient.callForData("deleteReviewPost", payload);
    }

    @PostMapping("/{postId}/comments")
    public Object comment(@PathVariable String postId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body, token);
        payload.put("postId", postId);
        return appsScriptClient.callForData("createReviewComment", payload);
    }

    @PostMapping("/{postId}/reaction")
    public Object reaction(@PathVariable String postId, @RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.withToken(body == null ? Map.of() : body, token);
        payload.put("targetType", "post");
        payload.put("targetId", postId);
        return appsScriptClient.callForData("toggleReviewReaction", payload);
    }

    @PostMapping("/{postId}/save")
    public Object save(@PathVariable String postId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("postId", postId);
        return appsScriptClient.callForData("toggleReviewSave", payload);
    }
}
