/**
 * PAYMENT ROUTES - LemonSqueezy Only
 *
 * POST /api/payments/create-checkout    - Checkout session
 * POST /api/payments/webhook            - Webhook from LemonSqueezy
 * POST /api/payments/verify             - Verify subscription status
 * POST /api/payments/cancel             - Cancel subscription
 * POST /api/payments/resume             - Resume subscription
 * POST /api/payments/change-plan        - Change plan
 * GET  /api/payments/status             - Current user subscription status
 */
declare const router: import("express-serve-static-core").Router;
export default router;
//# sourceMappingURL=payment.routes.d.ts.map