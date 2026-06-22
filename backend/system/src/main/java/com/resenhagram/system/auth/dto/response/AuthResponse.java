package com.resenhagram.system.auth.dto.response;



public record AuthResponse(
        String accessToken,
        String tokenType,
        Long expiresIn,
        AuthUserResponse user
) {
    
}
