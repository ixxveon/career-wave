package kr.co.carrer.user.resume.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "cover_letter_contents",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_clc_document_order",
        columnNames = {"document_id", "order_num"}
    )
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoverLetterContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "content_id")
    private Long contentId;

    @Column(name = "document_id", nullable = false, columnDefinition = "UUID")
    private UUID documentId;

    @Column(name = "order_num", nullable = false)
    private int orderNum;

    @Column(name = "question", nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(name = "answer", nullable = false, columnDefinition = "TEXT")
    private String answer;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    public static CoverLetterContent of(UUID documentId, int orderNum, String question, String answer) {
        CoverLetterContent content = new CoverLetterContent();
        content.documentId = documentId;
        content.orderNum = orderNum;
        content.question = question;
        content.answer = answer;
        content.createdAt = ZonedDateTime.now();
        return content;
    }
}
