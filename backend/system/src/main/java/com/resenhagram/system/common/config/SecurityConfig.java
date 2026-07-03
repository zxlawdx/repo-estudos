package com.resenhagram.system.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> {})
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(
                                "/api/appscript-auth/**",
                                "/api/users/**",
                                "/api/files/**",
                                "/api/profile/**",
                                "/api/drive/**",
                                "/api/paths/**",
                                "/api/graph/**",
                                "/api/categories/**",
                                "/api/reader/**",
                                "/api/dashboard/**",
                                "/api/admin-proxy/**",
                                "/h2-console/**",
                                "/error"
                        ).permitAll()
                        .anyRequest().permitAll()
                )
                .headers(headers -> headers
                        .frameOptions(frame -> frame.disable())
                )
                .build();
    }
}
