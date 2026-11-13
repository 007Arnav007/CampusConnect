package com.campusconnect.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import com.campusconnect.entity.Role;
import com.campusconnect.entity.User;
import com.campusconnect.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {
    @Mock
    private UserRepository users;

    @Test
    void staffCanListUsersWithoutExposingPasswordHashes() {
        User staff = new User("Support Staff", "staff@vit.edu", "staff-hash", EnumSet.of(Role.STAFF));
        User student = new User("Student", "student@vit.edu", "student-hash", EnumSet.of(Role.STUDENT));
        when(users.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))).thenReturn(List.of(student));
        var authentication = UsernamePasswordAuthenticationToken.authenticated(staff, null, List.of());

        var response = new UserController(users).list(authentication);

        assertEquals(1, response.size());
        assertEquals(student.getId(), response.getFirst().id());
        assertEquals("STUDENT", response.getFirst().roles());
        verify(users).findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    @Test
    void studentsCannotListUsers() {
        User student = new User("Student", "student@vit.edu", "student-hash", EnumSet.of(Role.STUDENT));
        var authentication = UsernamePasswordAuthenticationToken.authenticated(student, null, List.of());

        assertThrows(AccessDeniedException.class, () -> new UserController(users).list(authentication));
    }

    @Test
    void userCanUpdateOnlyTheirOwnDisplayName() {
        User student = new User("Student", "student@vit.edu", "student-hash", EnumSet.of(Role.STUDENT));
        when(users.findById(student.getId())).thenReturn(Optional.of(student));
        var authentication = UsernamePasswordAuthenticationToken.authenticated(student, null, List.of());

        var response = new UserController(users).updateProfile(
                authentication,
                new com.campusconnect.dto.UserDtos.UpdateProfileRequest(" Updated Student ")
        );

        assertEquals("Updated Student", response.name());
        assertEquals(student.getEmail(), response.email());
    }
}
