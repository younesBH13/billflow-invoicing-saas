export class JwtConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtConfigurationError';
  }
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    throw new JwtConfigurationError('JWT_SECRET environment variable is not configured.');
  }

  if (secret.length < 32) {
    throw new JwtConfigurationError('JWT_SECRET must be at least 32 characters long.');
  }

  return secret;
};

export const getJwtExpiration = (): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN?.trim();
  return expiresIn && expiresIn.length > 0 ? expiresIn : '24h';
};
