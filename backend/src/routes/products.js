'use strict';
const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(protect);

router.get ('/',           ctrl.getProducts);
router.get ('/categories', ctrl.getCategories);
router.get ('/:id',        ctrl.getProduct);
router.post('/', authorize('admin','manager'), [
  body('name').trim().notEmpty().withMessage('Product name is required.'),
  body('category').trim().notEmpty().withMessage('Category is required.'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price must be a positive number.'),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be a positive number.'),
], validate, ctrl.createProduct);
router.put ('/:id', authorize('admin','manager'), ctrl.updateProduct);
router.delete('/:id', authorize('admin'), ctrl.deleteProduct);

module.exports = router;
