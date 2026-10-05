import bcrypt from 'bcryptjs';

let argon2Module: typeof import('argon2') | null | undefined;

const loadArgon2 = async (): Promise<typeof import('argon2') | null> => {
  if (argon2Module !== undefined) {
    return argon2Module;
  }

  try {
    const module = await import('argon2');
    argon2Module = module;
  } catch (error) {
    console.error('Argon2 module is not available. Argon2-hashed passwords will not validate.', error);
    argon2Module = null;
  }

  return argon2Module;
};

export interface PasswordValidationResult {
  valid: boolean;
  hint?: string;
}

export const verifyPasswordHash = async (
  password: string,
  passwordHash: string | null
): Promise<PasswordValidationResult> => {
  console.log(`[verifyPasswordHash] Starting verification for hash type: ${passwordHash?.substring(0, 10)}...`);
  if (!passwordHash) {
    return { valid: false, hint: 'No password hash stored for user' };
  }

  if (passwordHash.startsWith('$argon2')) {
    console.log('[verifyPasswordHash] Detected Argon2 hash');
    const argon2 = await loadArgon2();

    if (!argon2) {
      console.error('[verifyPasswordHash] Argon2 module missing on server');
      return {
        valid: false,
        hint: 'Argon2 hashes detected but argon2 package is not installed on the server'
      };
    }

    try {
      const isValid = await argon2.verify(passwordHash, password);
      console.log(`[verifyPasswordHash] Argon2 result: ${isValid}`);
      return { valid: isValid, hint: isValid ? undefined : 'Invalid Argon2 credentials' };
    } catch (error) {
      console.error('[verifyPasswordHash] Argon2 verification failed', error);
      return { valid: false, hint: 'Argon2 verification failed' };
    }
  }

  try {
    console.log('[verifyPasswordHash] Using bcrypt verification');
    // Using compareSync to avoid potential async issues in the event loop on Windows
    const isValid = bcrypt.compareSync(password, passwordHash);
    console.log(`[verifyPasswordHash] Bcrypt result: ${isValid}`);
    return { valid: isValid, hint: isValid ? undefined : 'Invalid credentials' };
  } catch (error) {
    console.error('[verifyPasswordHash] Bcrypt verification failed', error);
    return { valid: false, hint: 'Bcrypt verification failed' };
  }
};
