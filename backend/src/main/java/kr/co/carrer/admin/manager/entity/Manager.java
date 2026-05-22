package kr.co.carrer.admin.manager.entity;

import kr.co.carrer.admin.manager.type.ManagerRole;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "managers")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Manager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ManagerRole role;
}
