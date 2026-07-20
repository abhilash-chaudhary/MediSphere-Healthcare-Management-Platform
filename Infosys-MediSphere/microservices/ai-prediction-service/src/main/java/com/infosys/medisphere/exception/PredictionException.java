package com.infosys.medisphere.exception;

/**
 * Custom exception for prediction-related errors.
 */
public class PredictionException extends RuntimeException {
    public PredictionException(String message) {
        super(message);
    }

    public PredictionException(String message, Throwable cause) {
        super(message, cause);
    }
}
