package kr.co.carrer.user.community.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "boards")
public class Board {

    private static final ZoneId SEOUL_ZONE = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "board_id")
    private Long boardId;

    @Column(name = "member_id", columnDefinition = "uuid", nullable = false)
    private UUID memberId;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @Column(name = "is_blind", nullable = false)
    private Boolean blind = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private ZonedDateTime updatedAt;

    protected Board() {
    }

    public Board(UUID memberId, String category, String title, String content) {
        this.memberId = memberId;
        this.category = category;
        this.title = title;
        this.content = content;
        this.viewCount = 0;
        this.blind = false;
    }

    @PrePersist
    protected void onCreate() {
        ZonedDateTime now = ZonedDateTime.now(SEOUL_ZONE);
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = ZonedDateTime.now(SEOUL_ZONE);
    }

    public void update(String category, String title, String content) {
        this.category = category;
        this.title = title;
        this.content = content;
    }

    public void blind() {
        this.blind = true;
    }

    public Long getBoardId() {
        return boardId;
    }

    public UUID getMemberId() {
        return memberId;
    }

    public String getCategory() {
        return category;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public Boolean getBlind() {
        return blind;
    }

    public ZonedDateTime getCreatedAt() {
        return createdAt;
    }

    public ZonedDateTime getUpdatedAt() {
        return updatedAt;
    }
}