import { useState } from "react";
import { ChevronLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCreateCommunityBoard } from "@/hooks/user/community";
import "@/styles/user/community/PostCreatePage.css";

const CATEGORIES = ["질문", "면접 후기", "이력서 팁", "합격 후기", "자유"];

export default function PostCreatePage() {
  const navigate = useNavigate();
  const createBoardMutation = useCreateCommunityBoard();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const canSubmit =
    Boolean(category && title.trim() && content.trim()) &&
    !createBoardMutation.isPending;

  function handleSubmit() {
    if (!canSubmit) return;

    createBoardMutation.mutate(
      {
        category,
        title: title.trim(),
        content: content.trim(),
      },
      {
        onSuccess: (createdBoard) => {
          navigate(`/community/posts/${createdBoard.boardId}`);
        },
        onError: () => {
          window.alert(
            "게시글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
          );
        },
      },
    );
  }

  return (
    <div className="pc-page">
      <div className="pc-wrap">
        <button
          className="pc-back"
          type="button"
          onClick={() => navigate("/community")}
        >
          <ChevronLeft size={14} /> 커뮤니티로
        </button>

        <div className="pc-header">
          <span className="pc-eyebrow">COMMUNITY</span>
          <h1 className="pc-header__title">글 작성하기</h1>
          <p className="pc-header__desc">
            카테고리를 선택하고 취업 준비 경험과 노하우를 공유해 주세요.
          </p>
        </div>

        <div className="pc-card">
          <div className="pc-field">
            <label className="pc-field__label">
              카테고리 <span>*</span>
            </label>
            <div className="pc-cats">
              {CATEGORIES.map((item) => (
                <button
                  key={item}
                  className={`pc-cat${category === item ? " pc-cat--on" : ""}`}
                  type="button"
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="pc-field">
            <label className="pc-field__label">
              제목 <span>*</span>
            </label>
            <input
              className="pc-input"
              placeholder="제목을 입력하세요"
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <span className="pc-field__count">{title.length} / 100</span>
          </div>

          <div className="pc-field">
            <label className="pc-field__label">
              내용 <span>*</span>
            </label>
            <textarea
              className="pc-textarea"
              placeholder="내용을 작성하세요. 경험과 노하우를 구체적으로 공유해 주세요."
              rows={14}
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          </div>

          <div className="pc-actions">
            <button
              className="pc-btn pc-btn--outline"
              type="button"
              onClick={() => navigate("/community")}
            >
              취소
            </button>
            <button
              className="pc-btn pc-btn--primary"
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <Send size={14} />
              {createBoardMutation.isPending ? "등록 중..." : "게시하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
