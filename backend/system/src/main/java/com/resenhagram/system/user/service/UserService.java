package com.resenhagram.system.user.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.resenhagram.system.user.dto.request.CreateUserRequest;
import com.resenhagram.system.user.dto.request.UpdateUserRequest;
import com.resenhagram.system.user.dto.response.UserResponse;
import com.resenhagram.system.user.entity.User;
import com.resenhagram.system.user.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder){
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponse create(CreateUserRequest request){
        String passwordHash = passwordEncoder.encode(request.password());

        User user = new User(request.username(), request.displayName(), passwordHash);

        User savedUser = userRepository.save(user);

        return toResponse(savedUser);
    }

    public UserResponse update(String userId, UpdateUserRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.updateDisplayName(request.displayName());

        User savedUser = userRepository.save(user);

        return toResponse(savedUser);
    }

    public UserResponse findByUsernameIgnoreCase(String username){
        User user = userRepository.findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return toResponse(user);
    }

    public void delete(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        user.changeStatus("INACTIVE");

        userRepository.save(user);
    }


    public UserResponse findById(String id){
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getUserId(),
                user.getUsername(),
                user.getDisplayName(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt(),
                user.getCreatedBy(),
                user.getLastLoginAt()
        );
    }


    @Transactional
    public User findOrCreateGoogleUser(
            String googleId,
            String email,
            String displayName,
            String avatarUrl
    ) {
        return userRepository.findByProviderAndProviderId("GOOGLE", googleId)
                .map(existingUser -> {
                    existingUser.updateGoogleProfile(displayName, avatarUrl);
                    existingUser.updateLastLogin();
                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    String username = generateUsernameFromEmail(email);

                    User newUser = User.createGoogleUser(
                            username,
                            displayName,
                            email,
                            avatarUrl,
                            googleId
                    );

                    newUser.updateLastLogin();

                    return userRepository.save(newUser);
                });
    }

    private String generateUsernameFromEmail(String email) {
        String baseUsername = email.substring(0, email.indexOf("@"))
                .toLowerCase()
                .replaceAll("[^a-z0-9._]", "");

        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsernameIgnoreCase(username)) {
            username = baseUsername + counter;
            counter++;
        }

        return username;
    }
}
