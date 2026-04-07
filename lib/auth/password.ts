import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash a plain-text password using bcrypt.
 * Uses 12 salt rounds for a good balance of security and performance.
 */
export async function hashPassword(plain: string): Promise<string> {
  if (!plain || plain.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  return bcrypt.hash(plain, SALT_ROUNDS)
}

/**
 * Compare a plain-text password against a bcrypt hash.
 * Returns true if they match, false otherwise.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!plain || !hash) return false
  return bcrypt.compare(plain, hash)
}

/**
 * Validate password strength.
 * Returns an array of validation error messages (empty if valid).
 */
export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return errors
}
