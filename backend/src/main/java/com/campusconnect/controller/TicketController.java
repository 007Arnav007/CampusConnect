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

import com.campusconnect.dto.TicketDtos;
import com.campusconnect.entity.User;
import com.campusconnect.service.TicketService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/tickets")
public class TicketController {
    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public TicketDtos.TicketResponse create(
            Authentication authentication,
            @Valid @RequestBody TicketDtos.CreateTicketRequest request
    ) {
        return ticketService.create(currentUser(authentication), request);
    }

    @GetMapping
    public List<TicketDtos.TicketResponse> list(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        boolean canViewAll = user.getRoles().stream().anyMatch(role -> role.name().equals("STAFF") || role.name().equals("ADMIN"));
        return ticketService.list(user.getId(), canViewAll);
    }

    @GetMapping("/{ticketId}")
    public TicketDtos.TicketResponse get(Authentication authentication, @PathVariable UUID ticketId) {
        User user = (User) authentication.getPrincipal();
        boolean canViewAll = user.getRoles().stream().anyMatch(role -> role.name().equals("STAFF") || role.name().equals("ADMIN"));
        return ticketService.get(user.getId(), ticketId, canViewAll);
    }

    @PatchMapping("/{ticketId}")
    public TicketDtos.TicketResponse update(
            Authentication authentication,
            @PathVariable UUID ticketId,
            @Valid @RequestBody TicketDtos.UpdateTicketRequest request
    ) {
        User user = (User) authentication.getPrincipal();
        boolean canManage = user.getRoles().stream().anyMatch(role -> role.name().equals("STAFF") || role.name().equals("ADMIN"));
        return ticketService.update(user.getId(), ticketId, request, canManage);
    }

    private UUID currentUser(Authentication authentication) {
        return ((User) authentication.getPrincipal()).getId();
    }
}
