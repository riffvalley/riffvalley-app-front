export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 50;
const PASSWORD_POLICY_PATTERN = /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

export function getPasswordValidationError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH)
    return "La contraseña debe tener al menos 6 caracteres.";
  if (password.length > PASSWORD_MAX_LENGTH)
    return "La contraseña no puede superar los 50 caracteres.";
  return PASSWORD_POLICY_PATTERN.test(password)
    ? null
    : "La contraseña debe incluir mayúscula, minúscula y un número o símbolo.";
}
