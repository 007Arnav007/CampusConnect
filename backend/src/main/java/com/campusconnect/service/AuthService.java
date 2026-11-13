package com.campusconnect.service;

import java.util.EnumSet;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.AuthDtos;
import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.UserRepository;
import com.campusconnect.security.JwtService;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Set<String> allowedDomains;

    public AuthService(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${security.institutional-email-domains}") String configuredDomains
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.allowedDomains = Arrays.stream(configuredDomains.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(domain -> !domain.isBlank())
                .collect(Collectors.toSet());
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        String domain = email.substring(email.lastIndexOf('@') + 1);
        if (!allowedDomains.contains(domain)) {
            throw new IllegalArgumentException("Use an approved institutional email address");
        }
        if (users.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists");
        }
        User user = users.save(new User(
                request.name().trim(),
                email,
                passwordEncoder.encode(request.password()),
                EnumSet.of(Role.STUDENT)
        ));
        return response(user);
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        User user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid email or password");
        }
        return response(user);
    }

    private AuthDtos.AuthResponse response(User user) {
        return new AuthDtos.AuthResponse(
                jwtService.createToken(user),
                user.getId().toString(),
                user.getName(),
                user.getEmail(),
                user.getRoles().stream().map(Enum::name).toArray(String[]::new)
        );
    }
}
