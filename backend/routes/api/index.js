const express = require('express');
const router = express.Router();

router.use('/', require('./medicineRoutes'));
router.use('/', require('./inventoryRoutes'));
router.use('/', require('./dashboardRoutes'));
router.use('/', require('./orderRoutes'));
router.use('/', require('./supplierRoutes'));
router.use('/', require('./companyRoutes'));
router.use('/', require('./profileRoutes'));
router.use('/', require('./offerRoutes'));
router.use('/', require('./invoiceRoutes'));
router.use('/', require('./donationRoutes'));
router.use('/', require('./loyaltyRoutes'));

module.exports = router;
