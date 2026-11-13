package com.campusconnect.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.campusconnect.dto.CommunicationDtos;
import com.campusconnect.entity.User;
import com.campusconnect.service.CommunicationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1")
public class CommunicationController {
    private final CommunicationService communicationService;

    public CommunicationController(CommunicationService communicationService) {
        this.communicationService = communicationService;
    }

    @GetMapping("/tickets/{ticketId}/messages")
    public List<CommunicationDtos.MessageResponse> messages(Authentication authentication, @PathVariable UUID ticketId) {
        User user = currentUser(authentication);
        return communicationService.messages(user.getId(), ticketId, canManage(user));
    }

    @PostMapping("/tickets/{ticketId}/messages")
    public CommunicationDtos.MessageResponse addMessage(
            Authentication authentication,
            @PathVariable UUID ticketId,
            @Valid @RequestBody CommunicationDtos.MessageRequest request
    ) {
        User user = currentUser(authentication);
        return communicationService.addMessage(user.getId(), ticketId, request, canManage(user));
    }

    @GetMapping("/notifications")
    public List<CommunicationDtos.NotificationResponse> notifications(Authentication authentication) {
        return communicationService.notifications(currentUser(authentication).getId());
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public void markRead(Authentication authentication, @PathVariable UUID notificationId) {
        communicationService.markNotificationRead(currentUser(authentication).getId(), notificationId);
    }

    private User currentUser(Authentication authentication) {
        return (User) authentication.getPrincipal();
    }

    private boolean canManage(User user) {
        return user.getRoles().stream().anyMatch(role -> role.name().equals("STAFF") || role.name().equals("ADMIN"));
    }
}
