import { setupWorker } from 'msw/browser';
import { resumeHandlers } from './resume/handlers';

export const worker = setupWorker(...resumeHandlers);
