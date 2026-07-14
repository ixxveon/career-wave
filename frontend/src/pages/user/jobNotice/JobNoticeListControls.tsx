import { type FormEvent, useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { createBannerStats, type BannerStat } from './jobNoticeStats';
import type { JobNoticeListStats } from '../../../types/user/jobNotice';
import {
  createInitialFilters,
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

function FilterBlock({ group, values, onChange, forceOpen = false }: { group: FilterGroup; values: string[]; onChange: (label: FilterLabel, value: string) => void; forceOpen?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function selectOption(option: string) {
    onChange(group.label, option);
  }

  function renderOption(option: string) {
    return (
      <button
        type="button"
        key={option}
        className={values.includes(option) ? 'is-active' : ''}
        aria-label={`${group.label} 필터 ${getFilterOptionLabel(option)} 선택`}
        aria-pressed={values.includes(option)}
        onClick={() => selectOption(option)}
      >
        {getFilterOptionLabel(option)}
      </button>
    );
  }

  return (
    <details className="jn-filter-block" ref={detailsRef} open={forceOpen || undefined}>
      <summary aria-label={`${group.label} 필터 선택, 현재 ${values.length}개 선택`}>
        <span>{group.label}</span>
        {values.length > 0 && <em>{values.length}개 선택</em>}
        <strong>+</strong>
      </summary>
      <div>
        {group.optionGroups
          ? group.optionGroups.map((optionGroup) => (
            <section className="jn-filter-option-group" key={optionGroup.label}>
              <strong>{optionGroup.label}</strong>
              <div>{optionGroup.options.map(renderOption)}</div>
            </section>
          ))
          : group.options.map(renderOption)}
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

function ActiveFilterChips({ filters, onReset }: { filters: Filters; onReset: (label: FilterLabel, value: string) => void }) {
  const activeFilters = (Object.entries(filters) as Array<[FilterLabel, string[]]>).flatMap(([label, values]) =>
    values.map((value) => [label, value] as const)
  );

  if (activeFilters.length === 0) return null;

  return (
    <div className="jn-active-filters">
      {activeFilters.map(([label, value]) => (
        <button key={`${label}-${value}`} type="button" aria-label={`${label} 필터 해제`} onClick={() => onReset(label, value)}>
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
  onApply,
  className,
  onApplied,
}: {
  filters: Filters;
  filterGroups: FilterGroup[];
  onApply: (filters: Filters) => void;
  className?: string;
  onApplied?: () => void;
}) {
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [activeLabel, setActiveLabel] = useState<FilterLabel>(() => filterGroups[0]?.label ?? '직무');

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!filterGroups.some((group) => group.label === activeLabel) && filterGroups[0]) {
      setActiveLabel(filterGroups[0].label);
    }
  }, [activeLabel, filterGroups]);

  function toggleFilter(label: FilterLabel, value: string) {
    setDraftFilters((current) => {
      const selectedValues = current[label];
      const nextValues = selectedValues.includes(value)
        ? selectedValues.filter((selectedValue) => selectedValue !== value)
        : [...selectedValues, value];
      return { ...current, [label]: nextValues };
    });
  }

  return (
    <aside className={`jn-filter-panel${className ? ` ${className}` : ''}`}>
      {className?.includes('dialog') ? (
        <div className="jn-filter-dialog__body">
          <nav className="jn-filter-dialog__menu" aria-label="필터 항목">
            {filterGroups.map((group) => (
              <button
                type="button"
                key={group.label}
                className={activeLabel === group.label ? 'is-active' : ''}
                onClick={() => setActiveLabel(group.label)}
              >
                <span>{group.label}</span>
                {draftFilters[group.label].length > 0 && <em>{draftFilters[group.label].length}</em>}
              </button>
            ))}
          </nav>
          <div className="jn-filter-dialog__options">
            {filterGroups
              .filter((group) => group.label === activeLabel)
              .map((group) => (
                <FilterBlock key={group.label} group={group} values={draftFilters[group.label]} onChange={toggleFilter} forceOpen />
              ))}
          </div>
        </div>
      ) : (
        filterGroups.map((group) => (
          <FilterBlock key={group.label} group={group} values={draftFilters[group.label]} onChange={toggleFilter} />
        ))
      )}
      <div className="jn-filter-actions">
        <button type="button" onClick={() => setDraftFilters(createInitialFilters())}>초기화</button>
        <button type="button" onClick={() => {
          onApply(draftFilters);
          onApplied?.();
        }}>필터 적용</button>
      </div>
    </aside>
  );
}

export function JobNoticeResultToolbar(props: {
  resultTotalItems: number;
  filters: Filters;
  onReset: (label: FilterLabel, value: string) => void;
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
