import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const DEFAULT_LENGTH = 8;
const DEFAULT_EXPIRATION_HOURS = 72;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const generateCode = (length: number) => {
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    const idx = bytes[i] % CHARSET.length;
    result += CHARSET[idx];
  }
  return result;
};

export interface ActivationCodeOptions {
  length?: number;
  expiresInHours?: number;
}

export const createActivationCode = async (options?: ActivationCodeOptions) => {
  const length = options?.length ?? DEFAULT_LENGTH;
  const expiresInHours = options?.expiresInHours ?? DEFAULT_EXPIRATION_HOURS;

  const code = generateCode(length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  return { code, codeHash, expiresAt };
};

export const buildActivationLink = (code: string, email?: string | null) => {
  const base = `${APP_BASE_URL.replace(/\/$/, '')}/activate`;
  const params = new URLSearchParams({ code });
  if (email) {
    params.append('email', email);
  }
  return `${base}?${params.toString()}`;
};
