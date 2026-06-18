import { setupWorker } from 'msw/browser';
import { memberHandlers } from './user/memberHandlers';
import { subscriptionHandlers } from './user/subscriptionHandlers';
import { resumeHandlers } from './user/resumeHandlers';
import { jobNoticeHandlers } from './user/jobNoticeHandlers';
import { adminHandlers } from './admin/handlers';

export const worker = setupWorker(
  ...memberHandlers,
  ...subscriptionHandlers,
  ...resumeHandlers,
  ...jobNoticeHandlers,
  ...adminHandlers,
);
