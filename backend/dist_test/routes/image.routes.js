"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const image_service_1 = require("../services/image.service");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// All image routes require auth
router.use(auth_middleware_1.authMiddleware);
// GET /api/images/search?q=landscape+nature
router.get('/search', [(0, express_validator_1.query)('q').trim().notEmpty().withMessage('Query is required')], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ success: false, errors: errors.array() });
            return;
        }
        const q = req.query.q;
        const url = await (0, image_service_1.searchPhoto)(q);
        res.json({ success: true, url });
    }
    catch (error) {
        logger_1.logger.error('[Images] Search error:', error);
        res.status(500).json({ success: false, message: 'Ошибка поиска изображений' });
    }
});
exports.default = router;
//# sourceMappingURL=image.routes.js.map