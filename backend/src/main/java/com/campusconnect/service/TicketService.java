package com.campusconnect.service;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.TicketDtos;
import com.campusconnect.entity.Ticket;
import com.campusconnect.entity.Notification;
import com.campusconnect.repository.TicketRepository;
import com.campusconnect.repository.NotificationRepository;

@Service
public class TicketService {
    private static final Set<String> CATEGORIES = Set.of("IT_NETWORK", "ACADEMIC", "HOSTEL", "FINANCE", "FACILITIES", "OTHER");
    private static final Set<String> PRIORITIES = Set.of("LOW", "MEDIUM", "HIGH", "CRITICAL");
    private static final Set<String> STATUSES = Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED", "CLOSED");
    private final TicketRepository tickets;
    private final NotificationRepository notifications;
    private final OutboxService outbox;
    private final IncidentService incidents;

    public TicketService(
            TicketRepository tickets,
            NotificationRepository notifications,
            OutboxService outbox,
            IncidentService incidents
    ) {
        this.tickets = tickets;
        this.notifications = notifications;
        this.outbox = outbox;
        this.incidents = incidents;
    }

    @Transactional
    public TicketDtos.TicketResponse create(UUID userId, TicketDtos.CreateTicketRequest request) {
        String category = request.category().trim().toUpperCase(Locale.ROOT);
        String priority = request.priority() == null || request.priority().isBlank()
                ? "MEDIUM" : request.priority().trim().toUpperCase(Locale.ROOT);
        if (!CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Choose a valid ticket category");
        }
        if (!PRIORITIES.contains(priority)) {
            throw new IllegalArgumentException("Choose a valid ticket priority");
        }
        // IncidentService inserts ticket linkage with JdbcTemplate in this same
        // transaction, so flush the JPA insert before the SQL foreign-key write.
        Ticket saved = tickets.saveAndFlush(new Ticket(
                request.title().trim(),
                request.description().trim(),
                category,
                priority,
                request.location() == null ? null : request.location().trim(),
                userId
        ));
        notifications.save(new Notification(
                userId,
                "TICKET_CREATED",
                "Ticket created",
                "Your request " + saved.getTicketNumber() + " has been created.",
                "TICKET",
                saved.getId()
        ));
        outbox.enqueueTicketCreated(saved.getId(), saved.getTicketNumber());
        incidents.correlateTicket(saved);
        return map(saved);
    }

    public List<TicketDtos.TicketResponse> list(UUID userId, boolean canViewAll) {
        return (canViewAll ? tickets.findAllByOrderByCreatedAtDesc() : tickets.findByCreatedByOrderByCreatedAtDesc(userId))
                .stream().map(this::map).toList();
    }

    public TicketDtos.TicketResponse get(UUID userId, UUID ticketId, boolean canViewAll) {
        Ticket ticket = tickets.findById(ticketId).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        verifyAccess(userId, ticket, canViewAll);
        return map(ticket);
    }

    @Transactional
    public TicketDtos.TicketResponse update(UUID userId, UUID ticketId, TicketDtos.UpdateTicketRequest request, boolean canManage) {
        Ticket ticket = tickets.findById(ticketId).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        verifyAccess(userId, ticket, canManage);
        String status = request.status().trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(status)) {
            throw new IllegalArgumentException("Choose a valid ticket status");
        }
        if (!canManage && !status.equals("RESOLVED")) {
            throw new SecurityException("You may only mark your own ticket as resolved");
        }
        ticket.setStatus(status);
        return map(tickets.save(ticket));
    }

    private void verifyAccess(UUID userId, Ticket ticket, boolean canViewAll) {
        if (!canViewAll && !ticket.getCreatedBy().equals(userId)) {
            throw new SecurityException("You cannot access this ticket");
        }
    }

    private TicketDtos.TicketResponse map(Ticket ticket) {
        return new TicketDtos.TicketResponse(
                ticket.getId(), ticket.getTicketNumber(), ticket.getTitle(), ticket.getDescription(),
                ticket.getCategory(), ticket.getPriority(), ticket.getStatus(), ticket.getLocation(),
                ticket.getCreatedBy(), ticket.getCreatedAt(), ticket.getUpdatedAt()
        );
    }
}
