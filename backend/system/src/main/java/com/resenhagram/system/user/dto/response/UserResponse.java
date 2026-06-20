package com.resenhagram.system.user.dto.response;

import java.time.LocalDateTime;

public record UserResponse(
        String userId,
        String username,
        String displayName,
        String role,
        String status,
        LocalDateTime createdAt,
        String createdBy,
        LocalDateTime lastLoginAt
) {
}