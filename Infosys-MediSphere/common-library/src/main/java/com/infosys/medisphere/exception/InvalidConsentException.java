package com.infosys.medisphere.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.FORBIDDEN)
public class InvalidConsentException extends RuntimeException {
    public InvalidConsentException(String message) {
        super(message);
    }
}
