package com.resenhagram.system.user.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.resenhagram.system.user.dto.request.CreateUserRequest;
import com.resenhagram.system.user.dto.request.UpdateUserRequest;
import com.resenhagram.system.user.dto.response.UserResponse;
import com.resenhagram.system.user.service.UserService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;



@RestController
@RequestMapping("api/users")
public class UserController {
    private final UserService userService;
    
    public UserController(UserService userService){
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@RequestBody @Valid CreateUserRequest request) {
       try {
            UserResponse response = userService.create(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
       } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                .build();
       }
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserResponse> findById(@PathVariable String userId) {
        try { 
            UserResponse response = userService.findById(userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound()
                .build();
        }
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<UserResponse> findByUserName(@PathVariable String username) {
        try{
            UserResponse response = userService.findByUsernameIgnoreCase(username);
            return ResponseEntity.ok(response);
        }catch (RuntimeException e) {
           return ResponseEntity.notFound()
            .build();
        }
       
    }
    

    @PutMapping("/{userId}")
    public ResponseEntity<UserResponse> update(
            @PathVariable String userId,
            @RequestBody @Valid UpdateUserRequest request
    ) {
        try {
            UserResponse response = userService.update(userId, request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                .build();
        }
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> delete(@PathVariable String userId) {
        try {
            userService.delete(userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.internalServerError()
                .build();
        }
    }
    
}
