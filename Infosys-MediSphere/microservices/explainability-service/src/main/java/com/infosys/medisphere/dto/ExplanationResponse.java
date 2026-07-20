package com.infosys.medisphere.dto;

import com.infosys.medisphere.entity.Explanation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for explanation results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExplanationResponse {
    private String patientId;
    private String risk;
    private List<String> topFactors;
    private List<Explanation.FactorContribution> factors;
}
