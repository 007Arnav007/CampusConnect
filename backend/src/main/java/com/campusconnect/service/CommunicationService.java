package com.campusconnect.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.campusconnect.dto.CommunicationDtos;
import com.campusconnect.entity.Notification;
import com.campusconnect.entity.Ticket;
import com.campusconnect.entity.TicketMessage;
import com.campusconnect.repository.NotificationRepository;
import com.campusconnect.repository.TicketMessageRepository;
import com.campusconnect.repository.TicketRepository;

@Service
public class CommunicationService {
    private final TicketRepository tickets;
    private final TicketMessageRepository messages;
    private final NotificationRepository notifications;

    public CommunicationService(
            TicketRepository tickets,
            TicketMessageRepository messages,
            NotificationRepository notifications
    ) {
        this.tickets = tickets;
        this.messages = messages;
        this.notifications = notifications;
    }

    public List<CommunicationDtos.MessageResponse> messages(UUID userId, UUID ticketId, boolean canViewAll) {
        var ticket = verifyTicketAccess(userId, ticketId, canViewAll);
        return messages.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(message -> mapMessage(message, userId, ticket.getCreatedBy()))
                .toList();
    }

    @Transactional
    public CommunicationDtos.MessageResponse addMessage(UUID userId, UUID ticketId, CommunicationDtos.MessageRequest request, boolean canViewAll) {
        var ticket = verifyTicketAccess(userId, ticketId, canViewAll);
        TicketMessage message = messages.save(new TicketMessage(ticketId, userId, request.body().trim()));
        if (!userId.equals(ticket.getCreatedBy())) {
            notifications.save(new Notification(
                    ticket.getCreatedBy(),
                    "TICKET_MESSAGE",
                    "New ticket reply",
                    "There is a new reply on ticket " + ticket.getTicketNumber() + ".",
                    "TICKET",
                    ticket.getId()
            ));
        }
        return mapMessage(message, userId, ticket.getCreatedBy());
    }

    public List<CommunicationDtos.NotificationResponse> notifications(UUID userId) {
        return notifications.findByUserIdOrderByCreatedAtDesc(userId).stream().map(notification ->
                new CommunicationDtos.NotificationResponse(
                        notification.getId(), notification.getUserId(), notification.getType(), notification.getTitle(), notification.getBody(),
                        notification.getResourceType(), notification.getResourceId(), notification.getReadAt(),
                        notification.getReadAt() != null, notification.getCreatedAt()
                )).toList();
    }

    @Transactional
    public void markNotificationRead(UUID userId, UUID notificationId) {
        Notification notification = notifications.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!notification.getUserId().equals(userId)) throw new SecurityException("You cannot update this notification");
        notification.markRead();
        notifications.save(notification);
    }

    private Ticket verifyTicketAccess(UUID userId, UUID ticketId, boolean canViewAll) {
        var ticket = tickets.findById(ticketId).orElseThrow(() -> new IllegalArgumentException("Ticket not found"));
        if (!canViewAll && !ticket.getCreatedBy().equals(userId)) {
            throw new SecurityException("You cannot access this ticket");
        }
        return ticket;
    }

    private CommunicationDtos.MessageResponse mapMessage(TicketMessage message, UUID currentUserId, UUID ticketOwnerId) {
        String senderRole = message.getSenderId().equals(ticketOwnerId) ? "STUDENT" : "SUPPORT";
        return new CommunicationDtos.MessageResponse(
                message.getId(),
                message.getTicketId(),
                message.getSenderId(),
                message.getSenderId().equals(currentUserId) ? "You" : senderRole.equals("STUDENT") ? "Student" : "Support",
                senderRole,
                message.getBody(),
                message.getCreatedAt()
        );
    }
}
