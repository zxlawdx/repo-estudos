package com.resenhagram.system.auth.repository;

import com.resenhagram.system.auth.entity.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    Optional<AuthSession> findByTokenHash(String hash);
}