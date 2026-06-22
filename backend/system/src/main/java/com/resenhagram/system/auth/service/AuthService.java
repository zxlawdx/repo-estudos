package com.resenhagram.system.auth.service;

import com.resenhagram.system.auth.dto.request.LoginRequest;
import com.resenhagram.system.auth.dto.response.AuthResponse;
import com.resenhagram.system.auth.dto.response.AuthUserResponse;
import com.resenhagram.system.user.entity.User;
import com.resenhagram.system.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    public AuthService(
            PasswordEncoder passwordEncoder,
            UserRepository userRepository
    ) {
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameIgnoreCase(request.usernameOremail())
                .or(() -> userRepository.findByEmailIgnoreCase(request.usernameOremail()))
                .orElseThrow(() -> new RuntimeException("Usuário ou e-mail não encontrado"));

        if (user.getPasswordHash() == null) {
            throw new RuntimeException("Este usuário não possui senha local");
        }

        boolean passwordMatches = passwordEncoder.matches(
                request.senha(),
                user.getPasswordHash()
        );

        if (!passwordMatches) {
            throw new RuntimeException("Senha incorreta");
        }

        user.updateLastLogin();
        userRepository.save(user);

        String accessToken = "token-fake-por-enquanto";

        return new AuthResponse(
                accessToken,
                "Bearer",
                900L,
                toAuthUserResponse(user)
        );
    }

    private AuthUserResponse toAuthUserResponse(User user) {
        return new AuthUserResponse(
                user.getUserId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getStatus(),
                user.getProvider()
        );
    }
}