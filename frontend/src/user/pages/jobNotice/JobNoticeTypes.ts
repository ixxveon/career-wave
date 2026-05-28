export interface JobNotice {
  id: number;
  company: string;
  title: string;
  jobType: string;
  exp: string;
  employment: string;
  location: string;
  companySize: string;
  salary: string;
  deadline: string;
  postedAt?: string;
  tags: string[];
  source: string;
  recommended: boolean;
  recommendScore: number;
  views: number;
  bookmarked: boolean;
  industry?: string;
  originalUrl?: string;
  stacks?: string[];
}
