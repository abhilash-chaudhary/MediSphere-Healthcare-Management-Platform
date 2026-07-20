package com.infosys.medisphere.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "providers")
public class Provider {
    @Id
    private String id;
    private String name;
    private String type; // DOCTOR, HOSPITAL, CLINIC
    private String specialty;
    private String department;
    private List<String> schedule; // e.g. ["Mon 9-5", "Wed 9-5"]
    private String location;
    private String email;
    private String phone;
}
