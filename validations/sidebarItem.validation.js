"use strict";

const { check } = require("express-validator");

// =============================
// VALIDATION: CREATE ITEM
// =============================
const validateSidebarItem = [
  check("menuType")
    .isIn(["main", "personal", "admin"])
    .withMessage("Invalid menu type"),

  check("name").notEmpty().withMessage("Name is required"),

  check("icon").notEmpty().withMessage("Icon is required"),

  check("path").notEmpty().withMessage("Path is required"),

  check("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// =============================
// VALIDATION: UPDATE ITEM
// =============================
const validateSidebarItemUpdate = [
  check("menuType")
    .optional()
    .isIn(["main", "personal", "admin"])
    .withMessage("Invalid menu type"),

  check("name").optional().notEmpty().withMessage("Name cannot be empty"),

  check("icon").optional().notEmpty().withMessage("Icon cannot be empty"),

  check("path").optional().notEmpty().withMessage("Path cannot be empty"),

  check("order")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Order must be a non-negative integer"),

  check("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

// =============================
// VALIDATION: UPDATE BASIC FIELDS
// =============================
const validateBasicSidebarUpdate = [
  check("name")
    .optional()
    .isString()
    .withMessage("Name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty"),

  check("icon")
    .optional()
    .isString()
    .withMessage("Icon must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Icon cannot be empty"),
];

module.exports = {
  validateSidebarItem,
  validateSidebarItemUpdate,
  validateBasicSidebarUpdate,
};
