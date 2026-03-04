"use strict";
/**
 * 🔄 PROXY ROUTES
 * Backend proxy for external URL fetching (replaces allorigins.win)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Allowed domains whitelist (security measure)
const BLOCKED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '10.',
    '172.16.',
    '192.168.',
];
function isBlockedUrl(url) {
    try {
        const parsed = new URL(url);
        return BLOCKED_DOMAINS.some(blocked => parsed.hostname.startsWith(blocked));
    }
    catch {
        return true;
    }
}
/**
 * GET /api/proxy/fetch-url?url=...
 * Fetches content from an external URL and returns it
 * Replaces the insecure allorigins.win CORS proxy
 */
router.get('/fetch-url', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }
        // Validate URL
        try {
            new URL(url);
        }
        catch {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        // Block internal/private network URLs (SSRF protection)
        if (isBlockedUrl(url)) {
            return res.status(403).json({ error: 'Access to internal URLs is not allowed' });
        }
        // Fetch with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ScienceAI/1.0)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        });
        clearTimeout(timeout);
        if (!response.ok) {
            return res.status(response.status).json({
                error: `Failed to fetch URL: ${response.statusText}`
            });
        }
        const contents = await response.text();
        // Limit response size (5MB max)
        if (contents.length > 5 * 1024 * 1024) {
            return res.status(413).json({ error: 'Response too large' });
        }
        return res.json({ contents, status: response.status });
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return res.status(504).json({ error: 'Request timeout' });
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger_1.logger.error('Proxy fetch error:', { error: message });
        return res.status(500).json({ error: 'Failed to fetch URL' });
    }
});
exports.default = router;
//# sourceMappingURL=proxy.routes.js.map