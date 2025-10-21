import { body, ValidationChain } from 'express-validator';

export const registerValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name is required'),
  body('lastName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name is required'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number required'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Valid date of birth required'),
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
    .withMessage('Invalid gender value')
];

export const loginValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required')
];

export const activationValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('activationCode')
    .isLength({ min: 6 })
    .withMessage('Activation code is required')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Activation code must be alphanumeric'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

export const activationCodeRequestValidation: ValidationChain[] = [
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

export const updateProfileValidation: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Last name cannot be empty'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number required')
];

export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];

export const userPreferencesValidation: ValidationChain[] = [
  body('therapy')
    .optional()
    .isBoolean()
    .withMessage('Therapy preference must be boolean')
    .toBoolean(),
  body('consulting')
    .optional()
    .isBoolean()
    .withMessage('Consulting preference must be boolean')
    .toBoolean(),
  body('supportGroups')
    .optional()
    .isBoolean()
    .withMessage('Support group preference must be boolean')
    .toBoolean(),
  body('clinicalTrials')
    .optional()
    .isBoolean()
    .withMessage('Clinical trial preference must be boolean')
    .toBoolean(),
  body('digitalTools')
    .optional()
    .isBoolean()
    .withMessage('Digital tools preference must be boolean')
    .toBoolean(),
  body('emailUpdates')
    .optional()
    .isBoolean()
    .withMessage('Email updates preference must be boolean')
    .toBoolean()
];

const conditionCategories = ['GOOD_HEARING', 'HEARING_LOSS', 'TINNITUS', 'MISOPHONIA', 'HYPERACUSIS'];
const conditionSeverities = ['NONE', 'MILD', 'MODERATE', 'SEVERE', 'CRITICAL'];

export const evaluationCreateValidation: ValidationChain[] = [
  body('evaluationDate')
    .isISO8601()
    .withMessage('Valid evaluation date is required'),
  body('evaluatorName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Evaluator name is required'),
  body('evaluationType')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Evaluation type is required'),
  body('conditionCategory')
    .optional({ nullable: true })
    .isIn(conditionCategories)
    .withMessage('Invalid condition category'),
  body('conditionSeverity')
    .optional({ nullable: true })
    .isIn(conditionSeverities)
    .withMessage('Invalid condition severity')
];

export const audiogramSummaryGenerateValidation: ValidationChain[] = [
  body('prompt')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Prompt must be between 10 and 5000 characters if provided'),
  body('model')
    .optional({ checkFalsy: true })
    .isString()
    .withMessage('Model must be a string'),
  body('temperature')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Temperature must be between 0 and 1')
    .toFloat(),
  body('maxTokens')
    .optional()
    .isInt({ min: 50, max: 2000 })
    .withMessage('maxTokens must be between 50 and 2000')
    .toInt()
];

export const audiogramSummaryUpdateValidation: ValidationChain[] = [
  body('summary')
    .isString()
    .isLength({ min: 10 })
    .withMessage('Summary must be at least 10 characters'),
  body('prompt')
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage('Prompt cannot exceed 5000 characters')
];

export const evaluationUpdateValidation: ValidationChain[] = [
  body('evaluationDate')
    .optional()
    .isISO8601()
    .withMessage('Evaluation date must be ISO8601'),
  body('conditionCategory')
    .optional({ nullable: true })
    .isIn(conditionCategories)
    .withMessage('Invalid condition category'),
  body('conditionSeverity')
    .optional({ nullable: true })
    .isIn(conditionSeverities)
    .withMessage('Invalid condition severity')
];

export const forgotPasswordValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
];

export const resetPasswordValidation: ValidationChain[] = [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
];
