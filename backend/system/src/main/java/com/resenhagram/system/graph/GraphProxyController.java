package com.resenhagram.system.graph;

import com.resenhagram.system.appscript.client.AppsScriptClient;
import com.resenhagram.system.common.util.BearerTokenUtils;
import com.resenhagram.system.common.util.PayloadUtils;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/graph")
public class GraphProxyController {

    private final AppsScriptClient appsScriptClient;

    public GraphProxyController(AppsScriptClient appsScriptClient) {
        this.appsScriptClient = appsScriptClient;
    }

    @GetMapping
    public Object getGraph(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("getGraphData", filters);
    }

    @GetMapping("/search")
    public Object search(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("searchGraphEntities", filters);
    }

    @PostMapping("/topics")
    public Object createTopic(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("createGraphTopic", body);
    }

    @PostMapping("/edges")
    public Object saveEdge(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("saveGraphEdge", body);
    }

    @DeleteMapping("/edges/{edgeId}")
    public Object deleteEdge(@PathVariable String edgeId, HttpServletRequest request) {
        String token = BearerTokenUtils.extract(request);
        Map<String, Object> payload = PayloadUtils.tokenOnly(token);
        payload.put("edgeId", edgeId);
        return appsScriptClient.callForData("deleteGraphEdge", payload);
    }

    @GetMapping("/edges")
    public Object listEdges(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("listGraphEdges", filters);
    }

    @GetMapping("/positions")
    public Object getPositions(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("getGraphNodePositions", filters);
    }

    @PostMapping("/positions")
    public Object savePositions(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("saveGraphNodePositions", body);
    }

    @PostMapping("/positions/one")
    public Object savePosition(@RequestBody Map<String, Object> body) {
        return appsScriptClient.callForData("saveGraphNodePosition", body);
    }

    @DeleteMapping("/positions")
    public Object clearPositions(@RequestParam Map<String, String> filters) {
        return appsScriptClient.callForData("clearGraphNodePositions", filters);
    }
}
