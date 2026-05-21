package kr.co.carrer.domain.jobnotice.entity;

import kr.co.carrer.domain.company.entity.Company;
import kr.co.carrer.domain.jobnotice.type.JobNoticeSource;
import kr.co.carrer.domain.jobnotice.type.JobNoticeStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "job_notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JobNotice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @Column(nullable = false, length = 200)
    private String title;

    @Lob
    private String content;

    @Column(length = 100)
    private String position;

    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobNoticeStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JobNoticeSource source;
}

