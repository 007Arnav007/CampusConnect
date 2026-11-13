package com.campusconnect.config;

import java.util.EnumSet;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.UserRepository;

// Must run before AcademicDemoBootstrap (order 100) so the bootstrap admin exists
// when the demo content looks for a staff/admin faculty owner on first boot.
@Component
@Order(50)
public class AdminBootstrap implements ApplicationRunner {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final String configuredEmail;
    private final String configuredPassword;
    private final String configuredDomains;

    public AdminBootstrap(
            UserRepository users,
            PasswordEncoder passwordEncoder,
            @Value("${security.admin.email:}") String configuredEmail,
            @Value("${security.admin.password:}") String configuredPassword,
            @Value("${security.institutional-email-domains}") String configuredDomains
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.configuredEmail = configuredEmail.trim().toLowerCase(Locale.ROOT);
        this.configuredPassword = configuredPassword;
        this.configuredDomains = configuredDomains;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (configuredEmail.isBlank() && configuredPassword.isBlank()) return;
        if (configuredEmail.isBlank() || configuredPassword.length() < 14 || !configuredEmail.contains("@")) {
            throw new IllegalStateException("Admin bootstrap configuration is incomplete or invalid.");
        }
        String domain = configuredEmail.substring(configuredEmail.lastIndexOf('@') + 1);
        boolean approvedDomain = java.util.Arrays.stream(configuredDomains.split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .anyMatch(domain::equals);
        if (!approvedDomain) {
            throw new IllegalStateException("Admin bootstrap email must use an approved institutional domain.");
        }

        var existing = users.findByEmailIgnoreCase(configuredEmail);
        if (existing.isPresent()) {
            if (!existing.get().getRoles().contains(Role.ADMIN)) {
                throw new IllegalStateException("Configured bootstrap account already exists without the ADMIN role.");
            }
            return;
        }

        String displayName = "CampusConnect Administrator";
        users.save(new User(
                displayName,
                configuredEmail,
                passwordEncoder.encode(configuredPassword),
                EnumSet.of(Role.ADMIN)
        ));
    }
}
