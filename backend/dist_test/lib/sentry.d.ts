/**
 * 🔍 Sentry Configuration for Backend
 * Error tracking and performance monitoring
 */
import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction, Application } from 'express';
export declare function initSentry(_app: Application): void;
export declare function sentryRequestHandler(): (_req: Request, _res: Response, next: NextFunction) => void;
export declare function sentryErrorHandler(): (err: Error, req: Request, res: Response, next: NextFunction) => void;
export { Sentry };
export declare function captureError(error: Error, context?: Record<string, unknown>): void;
export declare function addBreadcrumb(message: string, category: string, level?: Sentry.SeverityLevel): void;
export declare function setUserContext(userId: string, email?: string): void;
export declare function startTransaction(name: string, op: string): Sentry.Span;
//# sourceMappingURL=sentry.d.ts.map