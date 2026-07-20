package com.infosys.medisphere.mapper;

import com.infosys.medisphere.dto.PatientDTO;
import com.infosys.medisphere.entity.Patient;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PatientMapper {
    PatientDTO toDto(Patient patient);
    Patient toEntity(PatientDTO patientDTO);
}
