package com.resenhagram.system.auth.handler;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.resenhagram.system.user.entity.User;
import com.resenhagram.system.user.service.UserService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler{
    private final UserService userService;

    public OAuth2LoginSuccessHandler(UserService userService){
        this.userService = userService;
    }


    @Override
    public void onAuthenticationSuccess(
        HttpServletRequest request,
        HttpServletResponse response,
        Authentication authentication
    ) throws IOException, ServletException{
        
        OidcUser oidcUser = (OidcUser) authentication.getPrincipal();
        String googleId = oidcUser.getSubject();
        String email = oidcUser.getEmail();
        String name = oidcUser.getFullName();
        String picture = oidcUser.getPicture();

        User user = userService.findOrCreateGoogleUser(
                googleId,
                email,
                name,
                picture
        );

        response.sendRedirect("http://localhost:5173/oauth-success?userId=" + user.getUserId());
    }
}
