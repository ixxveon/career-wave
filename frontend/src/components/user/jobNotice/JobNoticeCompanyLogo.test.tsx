// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import JobNoticeCompanyLogo from './JobNoticeCompanyLogo';

describe('JobNoticeCompanyLogo', () => {
  it('renders the company initial when no logo URL is available', () => {
    render(<JobNoticeCompanyLogo className="logo" companyName="커리어웨이브" />);

    expect(screen.getByText('커')).not.toBeNull();
  });

  it('falls back to the company initial when the external image fails to load', () => {
    const { container } = render(
      <JobNoticeCompanyLogo
        className="logo"
        companyName="Career Wave"
        companyLogoUrl="https://cdn.example.com/company-logo.png"
      />,
    );

    fireEvent.error(container.querySelector('img')!);

    expect(screen.getByText('C')).not.toBeNull();
  });
});
