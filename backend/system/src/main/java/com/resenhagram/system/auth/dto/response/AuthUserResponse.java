package com.resenhagram.system.auth.dto.response;

public record AuthUserResponse(
        String userId,
        String username,
        String displayName,
        String email,
        String avatarUrl,
        String role,
        String status,
        String provider
) {
}