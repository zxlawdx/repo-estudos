package com.resenhagram.system.common.util;

import java.util.LinkedHashMap;
import java.util.Map;

public final class PayloadUtils {

    private PayloadUtils() {
    }

    public static Map<String, Object> of() {
        return new LinkedHashMap<>();
    }

    public static Map<String, Object> withToken(Map<String, Object> payload, String accessToken) {
        Map<String, Object> merged = new LinkedHashMap<>(payload == null ? Map.of() : payload);
        if (accessToken != null) {
            merged.put("accessToken", accessToken);
        }
        return merged;
    }

    public static Map<String, Object> tokenOnly(String accessToken) {
        Map<String, Object> map = new LinkedHashMap<>();
        if (accessToken != null) map.put("accessToken", accessToken);
        return map;
    }
}
