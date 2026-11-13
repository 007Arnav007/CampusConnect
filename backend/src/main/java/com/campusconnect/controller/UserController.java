package com.campusconnect.controller;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusconnect.dto.UserDtos;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.UserRepository;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    @GetMapping
    public List<UserDtos.UserResponse> list(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        boolean canViewUsers = currentUser.getRoles().contains(Role.STAFF)
                || currentUser.getRoles().contains(Role.ADMIN);
        if (!canViewUsers) {
            throw new AccessDeniedException("User administration is restricted to staff and administrators");
        }

        return users.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(user -> new UserDtos.UserResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRoles().stream().map(Enum::name).sorted().collect(Collectors.joining(",")),
                        user.getCreatedAt()
                ))
                .toList();
    }

    @GetMapping("/me")
    public UserDtos.UserResponse currentProfile(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        return toResponse(currentUser);
    }

    @PatchMapping("/me")
    @Transactional
    public UserDtos.UserResponse updateProfile(
            Authentication authentication,
            @Valid @RequestBody UserDtos.UpdateProfileRequest request
    ) {
        UUID userId = ((User) authentication.getPrincipal()).getId();
        User currentUser = users.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Account no longer exists"));
        currentUser.updateName(request.name().trim());
        return toResponse(currentUser);
    }

    private UserDtos.UserResponse toResponse(User user) {
        return new UserDtos.UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRoles().stream().map(Enum::name).sorted().collect(Collectors.joining(",")),
                user.getCreatedAt()
        );
    }
}
