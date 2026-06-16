package kr.co.carrer.user.interview.entity;

import kr.co.carrer.user.interview.type.InterviewType;
import kr.co.carrer.user.interview.type.SessionStatus;
import kr.co.carrer.user.interview.type.SessionType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.ZonedDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InterviewSessionTest {

    @Nested
    @DisplayName("세션 생성 - create()")
    class Create {

        @Test
        @DisplayName("create() 호출 시 세션 상태는 IN_PROGRESS, startedAt이 설정된다")
        void create_shouldSetInProgressAndStartedAt() {
            UUID memberId = UUID.randomUUID();

            InterviewSession session = InterviewSession.create(
                    memberId, null, SessionType.TEXT, InterviewType.TECHNICAL, "카카오"
            );

            assertThat(session.getSessionStatus()).isEqualTo(SessionStatus.IN_PROGRESS);
            assertThat(session.getStartedAt()).isNotNull();
            assertThat(session.getMemberId()).isEqualTo(memberId);
            assertThat(session.getSessionType()).isEqualTo(SessionType.TEXT);
            assertThat(session.getInterviewType()).isEqualTo(InterviewType.TECHNICAL);
            assertThat(session.getTargetCompany()).isEqualTo("카카오");
        }

        @Test
        @DisplayName("documentId 없이 생성 시 documentId는 null이다")
        void create_withoutDocumentId_shouldHaveNullDocumentId() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.VOICE, null, null
            );

            assertThat(session.getDocumentId()).isNull();
            assertThat(session.getInterviewType()).isNull();
            assertThat(session.getTargetCompany()).isNull();
        }
    }

    @Nested
    @DisplayName("세션 종료 - complete()")
    class Complete {

        @Test
        @DisplayName("complete() 호출 시 세션 상태가 COMPLETED로 변경되고 endedAt이 설정된다")
        void complete_shouldSetCompletedAndEndedAt() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );
            ZonedDateTime endedAt = ZonedDateTime.now();

            session.complete(endedAt);

            assertThat(session.getSessionStatus()).isEqualTo(SessionStatus.COMPLETED);
            assertThat(session.getEndedAt()).isEqualTo(endedAt);
        }

        @Test
        @DisplayName("complete() 후 isCompleted()는 true, isInProgress()는 false를 반환한다")
        void complete_shouldUpdateStateFlags() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );

            session.complete(ZonedDateTime.now());

            assertThat(session.isCompleted()).isTrue();
            assertThat(session.isInProgress()).isFalse();
            assertThat(session.isEnded()).isTrue();
        }
    }

    @Nested
    @DisplayName("세션 실패 - fail()")
    class Fail {

        @Test
        @DisplayName("fail() 호출 시 세션 상태가 FAILED로 변경되고 endedAt이 기록된다")
        void fail_shouldSetFailedStatusAndEndedAt() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.VOICE, null, null
            );
            ZonedDateTime failedAt = ZonedDateTime.now();

            session.fail(failedAt);

            assertThat(session.getSessionStatus()).isEqualTo(SessionStatus.FAILED);
            assertThat(session.getEndedAt()).isEqualTo(failedAt);
            assertThat(session.isEnded()).isTrue();
            assertThat(session.isInProgress()).isFalse();
        }
    }

    @Nested
    @DisplayName("점수 업데이트 - updateTotalScore()")
    class UpdateTotalScore {

        @Test
        @DisplayName("updateTotalScore() 호출 시 totalScore가 업데이트된다")
        void updateTotalScore_shouldUpdateScore() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );

            session.updateTotalScore(85);

            assertThat(session.getTotalScore()).isEqualTo(85);
        }
    }

    @Nested
    @DisplayName("종료 여부 확인 - isEnded()")
    class IsEnded {

        @Test
        @DisplayName("IN_PROGRESS 상태에서 isEnded()는 false를 반환한다")
        void isEnded_whenInProgress_returnsFalse() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );

            assertThat(session.isEnded()).isFalse();
        }

        @Test
        @DisplayName("COMPLETED 상태에서 isEnded()는 true를 반환한다")
        void isEnded_whenCompleted_returnsTrue() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );
            session.complete(ZonedDateTime.now());

            assertThat(session.isEnded()).isTrue();
        }

        @Test
        @DisplayName("FAILED 상태에서 isEnded()는 true를 반환한다")
        void isEnded_whenFailed_returnsTrue() {
            InterviewSession session = InterviewSession.create(
                    UUID.randomUUID(), null, SessionType.TEXT, null, null
            );
            session.fail(ZonedDateTime.now());

            assertThat(session.isEnded()).isTrue();
        }
    }
}
