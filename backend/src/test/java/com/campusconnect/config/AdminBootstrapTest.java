package com.campusconnect.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapTest {
    @Mock
    private UserRepository users;
    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void doesNothingWhenAdminBootstrapIsNotConfigured() {
        new AdminBootstrap(users, passwordEncoder, "", "", "vit.edu,vit.ac.in").run(null);
        verify(users, never()).save(any(User.class));
    }

    @Test
    void createsAnAdminOnlyForAnApprovedDomainAndStoresAHash() {
        when(users.findByEmailIgnoreCase("admin@vit.edu")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("a-unique-bootstrap-password")).thenReturn("bcrypt-hash");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new AdminBootstrap(users, passwordEncoder, "admin@vit.edu", "a-unique-bootstrap-password", "vit.edu,vit.ac.in").run(null);

        ArgumentCaptor<User> savedUser = ArgumentCaptor.forClass(User.class);
        verify(users).save(savedUser.capture());
        assertEquals(EnumSet.of(Role.ADMIN), savedUser.getValue().getRoles());
        assertEquals("bcrypt-hash", savedUser.getValue().getPasswordHash());
    }

    @Test
    void refusesWeakOrUnapprovedBootstrapCredentials() {
        assertThrows(IllegalStateException.class,
                () -> new AdminBootstrap(users, passwordEncoder, "admin@vit.edu", "short", "vit.edu,vit.ac.in").run(null));
        assertThrows(IllegalStateException.class,
                () -> new AdminBootstrap(users, passwordEncoder, "admin@example.com", "a-unique-bootstrap-password", "vit.edu,vit.ac.in").run(null));
        verify(users, never()).save(any(User.class));
    }
}
