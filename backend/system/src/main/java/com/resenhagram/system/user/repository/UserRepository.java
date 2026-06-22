package com.resenhagram.system.user.repository;

import com.resenhagram.system.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsernameIgnoreCase(String username);

    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    boolean existsByUsernameIgnoreCase(String username);
}