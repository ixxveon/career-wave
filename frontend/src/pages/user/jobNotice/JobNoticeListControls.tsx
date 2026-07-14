import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { createBannerStats, type BannerStat } from './jobNoticeStats';
import type { JobNoticeListStats } from '../../../types/user/jobNotice';
import {
  DEFAULT_FILTER_VALUE,
  getFilterOptionLabel,
  PERIODS,
  POPULAR_SEARCH_TAGS,
  SORT_OPTIONS,
  type FilterGroup,
  type FilterLabel,
  type Filters,
  type Period,
  type SortOption,
} from './jobNoticeListConfig';

function BannerSearch({ value, onSearch }: { value: string; onSearch: (searchText: string) => void }) {
  const [searchText, setSearchText] = useState(value);

  useEffect(() => {
    setSearchText(value);
  }, [value]);

  function applySearch(nextValue: string) {
    onSearch(nextValue.trim());
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch(searchText);
  }

  function selectPopularSearchTag(tag: string) {
    setSearchText(tag);
    applySearch(tag);
  }

  return (
    <div className="jn-banner__search">
      <form className="jn-hero-search" onSubmit={submitSearch}>
        <span className="sr-only">채용 공고 검색</span>
        <input
          type="search"
          value={searchText}
          aria-label="채용 공고 검색어"
          placeholder="회사명, 공고명, 기술 스택으로 검색해요"
          onChange={(event) => setSearchText(event.target.value)}
        />
        <button type="submit" aria-label="검색">
          <Search size={21} />
        </button>
      </form>

      <div className="jn-popular-tags" aria-label="인기 검색어">
        <span>인기 검색어</span>
        {POPULAR_SEARCH_TAGS.map((tag) => (
          <button type="button" key={tag} aria-label={`${tag} 인기 검색어로 검색`} onClick={() => selectPopularSearchTag(tag)}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ stat }: { stat: BannerStat }) {
  const { Icon } = stat;

  return (
    <article className="jn-stat-card">
      <span className={`jn-stat-card__icon ${stat.iconClassName}`}>
        <Icon size={20} />
      </span>
      <span className="jn-stat-card__label">{stat.label}</span>
      <strong className={stat.valueClassName}>{stat.value}</strong>
      <small>
        {stat.highlight && <b>{stat.highlight}</b>}
        {stat.highlight ? ` ${stat.description}` : stat.description}
      </small>
    </article>
  );
}

function BannerStats({ stats }: { stats: JobNoticeListStats }) {
  const bannerStats = createBannerStats(stats);

  return (
    <div className="jn-banner__stats" aria-label="채용 공고 통계">
      {bannerStats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
    </div>
  );
}

function FilterBlock({ group, value, onChange }: { group: FilterGroup; value: string; onChange: (label: FilterLabel, value: string) => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function selectOption(option: string) {
    onChange(group.label, option);
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details className="jn-filter-block" ref={detailsRef}>
      <summary aria-label={`${group.label} 필터 선택, 현재 값 ${value}`}>
        <span>{group.label}</span>
        {value !== DEFAULT_FILTER_VALUE && <em>{getFilterOptionLabel(value)}</em>}
        <strong>+</strong>
      </summary>
      <div>
        {group.options.map((option) => (
          <button
            type="button"
            key={option}
            className={value === option ? 'is-active' : ''}
            aria-label={`${group.label} 필터 ${getFilterOptionLabel(option)} 선택`}
            aria-pressed={value === option}
            onClick={() => selectOption(option)}
          >
            {getFilterOptionLabel(option)}
          </button>
        ))}
      </div>
    </details>
  );
}

function PeriodSelector({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  return (
    <div className="jn-periods">
      {PERIODS.map((item) => (
        <button
          key={item}
          type="button"
          className={period === item ? 'is-active' : ''}
          aria-label={`${item} 기간으로 필터링`}
          aria-pressed={period === item}
          onClick={() => onChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function SortDropdown({ selected, isOpen, onToggle, onSelect }: { selected: SortOption; isOpen: boolean; onToggle: () => void; onSelect: (option: SortOption) => void }) {
  return (
    <div className={`jn-sort${isOpen ? ' is-open' : ''}`}>
      <button type="button" aria-expanded={isOpen} aria-label={`정렬 기준: ${selected}`} onClick={onToggle}>
        {selected} <ChevronDown size={16} />
      </button>
      {isOpen && (
        <div className="jn-sort__menu">
          {SORT_OPTIONS.map((option) => (
            <button
              type="button"
              key={option}
              className={selected === option ? 'is-active' : ''}
              aria-label={`${option} 정렬 선택`}
              aria-pressed={selected === option}
              onClick={() => onSelect(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveFilterChips({ filters, onReset }: { filters: Filters; onReset: (label: FilterLabel) => void }) {
  const activeFilters = (Object.entries(filters) as Array<[FilterLabel, string]>).filter(([, value]) => value !== DEFAULT_FILTER_VALUE);

  if (activeFilters.length === 0) return null;

  return (
    <div className="jn-active-filters">
      {activeFilters.map(([label, value]) => (
        <button key={label} type="button" aria-label={`${label} 필터 해제`} onClick={() => onReset(label)}>
          {getFilterOptionLabel(value)} ×
        </button>
      ))}
    </div>
  );
}

export function JobNoticeBanner({ searchQuery, onSearch, stats }: { searchQuery: string; onSearch: (searchText: string) => void; stats: JobNoticeListStats }) {
  return (
    <section className="jn-banner">
      <BannerSearch value={searchQuery} onSearch={onSearch} />
      <BannerStats stats={stats} />
    </section>
  );
}

export function JobNoticeFilters({
  filters,
  filterGroups,
  onChange,
}: {
  filters: Filters;
  filterGroups: FilterGroup[];
  onChange: (label: FilterLabel, value: string) => void;
}) {
  return (
    <aside className="jn-filter-panel">
      {filterGroups.map((group) => (
        <FilterBlock key={group.label} group={group} value={filters[group.label]} onChange={onChange} />
      ))}
    </aside>
  );
}

export function JobNoticeResultToolbar(props: {
  resultTotalItems: number;
  filters: Filters;
  onReset: (label: FilterLabel) => void;
  period: Period;
  onPeriodChange: (period: Period) => void;
  sort: SortOption;
  sortOpen: boolean;
  onSortToggle: () => void;
  onSortSelect: (option: SortOption) => void;
}) {
  const { resultTotalItems, filters, onReset, period, onPeriodChange, sort, sortOpen, onSortToggle, onSortSelect } = props;

  return (
    <div className="jn-results__head">
      <div>
        <span>해당 공고 <b>{resultTotalItems.toLocaleString()}</b>개</span>
        <ActiveFilterChips filters={filters} onReset={onReset} />
      </div>
      <div className="jn-results__tools">
        <PeriodSelector period={period} onChange={onPeriodChange} />
        <SortDropdown selected={sort} isOpen={sortOpen} onToggle={onSortToggle} onSelect={onSortSelect} />
      </div>
    </div>
  );
}
