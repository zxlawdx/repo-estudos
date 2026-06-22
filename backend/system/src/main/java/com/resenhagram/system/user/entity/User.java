package com.resenhagram.system.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @Column(name = "user_id", length = 80, nullable = false)
    private String userId;

    @Column(name = "username", length = 50, nullable = false, unique = true)
    private String username;

    @Column(name = "display_name", length = 100, nullable = false)
    private String displayName;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "email", length = 150, unique = true)
    private String email;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "provider", length = 30, nullable = false)
    private String provider;

    @Column(name = "provider_id", length = 150)
    private String providerId;


    @Column(name = "role", length = 30, nullable = false)
    private String role;

    @Column(name = "status", length = 30, nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", length = 80)
    private String createdBy;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    protected User() {
    }

    public User(String username, String displayName, String passwordHash) {
        this.username = username;
        this.displayName = displayName;
        this.passwordHash = passwordHash;
        this.role = "USER";
        this.status = "ACTIVE";
        this.provider = "LOCAL";
    }


    public static User createGoogleUser(
                String username,
                String displayName,
                String email,
                String avatarUrl,
                String providerId
    ) {
        User user = new User();

        user.username = username;
        user.displayName = displayName;
        user.email = email;
        user.avatarUrl = avatarUrl;
        user.passwordHash = null;
        user.provider = "GOOGLE";
        user.providerId = providerId;
        user.role = "USER";
        user.status = "ACTIVE";

        return user;
    }

    @PrePersist
    public void prePersist() {
        if (this.userId == null) {
            this.userId = UUID.randomUUID().toString();
        }

        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public String getUserId() {
        return userId;
    }

    public String getUsername() {
        return username;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void updateDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public void changeStatus(String status) {
        this.status = status;
    }

    public void updateLastLogin() {
        this.lastLoginAt = LocalDateTime.now();
    }

    public void updateGoogleProfile(String displayName, String avatarUrl) {
        this.displayName = displayName;
        this.avatarUrl = avatarUrl;
    }

    public String getEmail() {
        return email;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderId() {
        return providerId;
    }
    
}