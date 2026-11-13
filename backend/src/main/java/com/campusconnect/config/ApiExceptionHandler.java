package com.campusconnect.config;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = exception.getBindingResult().getFieldErrors().stream()
                .collect(java.util.stream.Collectors.toMap(
                        error -> error.getField(),
                        error -> error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage(),
                        (first, ignored) -> first
                ));
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "VALIDATION_ERROR", "message", "Please correct the highlighted fields.", "fieldErrors", fieldErrors)
        ));
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<?> credentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "error", Map.of("code", "INVALID_CREDENTIALS", "message", "Invalid email or password")
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<?> accessDenied() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", Map.of("code", "FORBIDDEN", "message", "You do not have permission to perform this action")
        ));
    }

    @ExceptionHandler(SecurityException.class)
    ResponseEntity<?> forbidden(SecurityException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "error", Map.of("code", "FORBIDDEN", "message", exception.getMessage())
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", Map.of("code", "BAD_REQUEST", "message", exception.getMessage())
        ));
    }

    /** Business-state conflicts such as "Section is full" are 409, not 500. */
    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<?> conflict(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "error", Map.of("code", "CONFLICT", "message", exception.getMessage())
        ));
    }
}
