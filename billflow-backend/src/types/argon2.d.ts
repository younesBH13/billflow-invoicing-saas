declare module 'argon2' {
  export function verify(hash: string, plain: string): Promise<boolean>;
}
