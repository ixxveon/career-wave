import { Bookmark, BookmarkCheck, Eye } from 'lucide-react';
import JobNoticeCompanyLogo from '../../../components/user/jobNotice/JobNoticeCompanyLogo';
import { formatJobNoticeDeadlineBadge, type JobNotice } from '../../../types/user/jobNotice';

interface JobNoticeCardProps {
  job: JobNotice;
  bookmarked: boolean;
  onBookmark: (id: number) => void;
  onClick: () => void;
}

export default function JobNoticeCard({ job, bookmarked, onBookmark, onClick }: JobNoticeCardProps) {
  return (
    <article className={`jn-card${job.recommended ? ' jn-card--featured' : ''}`}>
      <div className="jn-card__top">
        <JobNoticeCompanyLogo
          className="jn-card__logo"
          companyName={job.company}
          companyLogoUrl={job.companyLogoUrl}
        />
        <div className="jn-card__company">
          <strong>{job.company}</strong>
          <span>{job.exp} · {job.employment} · {job.location}</span>
        </div>
        <button
          className={`jn-bookmark${bookmarked ? ' jn-bookmark--active' : ''}`}
          type="button"
          aria-label={`${job.title} ${bookmarked ? '북마크 해제' : '북마크'}`}
          aria-pressed={bookmarked}
          onClick={(event) => {
            event.stopPropagation();
            onBookmark(job.id);
          }}
        >
          {bookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      <h3>
        <button
          type="button"
          className="jn-card__detail-button"
          aria-label={`${job.company} ${job.title} 상세 보기`}
          onClick={onClick}
        >
          {job.title}
        </button>
      </h3>

      <div className="jn-card__tags">
        {job.tags.map((tag) => <span key={tag}>#{tag}</span>)}
      </div>

      <div className="jn-card__footer">
        {job.recommended && <span className="jn-badge jn-badge--recommend">추천</span>}
        <span className="jn-badge jn-badge--deadline">{formatJobNoticeDeadlineBadge(job.deadline)}</span>
        <span className="jn-badge jn-badge--source">{job.source}</span>
        <span className="jn-views"><Eye size={14} /> {job.views.toLocaleString()}</span>
      </div>
    </article>
  );
}
