import { beforeEach, describe, expect, it, vi } from "vitest";

const { login, push } = vi.hoisted(() => ({
  login: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/modules/identity/auth/stores/auth", () => ({
  useAuthStore: () => ({ login }),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

import { SessionAuthError } from "@/modules/identity/auth/api/sessionAuth";
import { useLoginForm } from "./useLoginForm";

describe("useLoginForm", () => {
  beforeEach(() => {
    login.mockReset();
    push.mockReset();
  });

  it("submits credentials and navigates home after successful login", async () => {
    login.mockResolvedValue(undefined);
    const form = useLoginForm();
    form.username.value = "Mara";
    form.password.value = "secret";

    await form.handleLogin();

    expect(login).toHaveBeenCalledWith({ username: "Mara", password: "secret" });
    expect(push).toHaveBeenCalledWith({ name: "Home" });
    expect(form.error.value).toBeNull();
    expect(form.loading.value).toBe(false);
  });

  it.each([
    ["unauthenticated", "Usuario o contraseña incorrectos."],
    [
      "forbidden",
      "No se pudo validar la solicitud de acceso. Recarga la página e inténtalo de nuevo.",
    ],
    ["rate-limited", "Demasiados intentos. Espera un momento antes de volver a intentarlo."],
    ["unavailable", "El servicio de acceso no está disponible temporalmente. Inténtalo más tarde."],
    [
      "network-error",
      "El servicio de acceso no está disponible temporalmente. Inténtalo más tarde.",
    ],
    ["conflict", "No se pudo completar el acceso. Inténtalo de nuevo."],
    ["bad-request", "No se pudo completar el acceso. Inténtalo de nuevo."],
    ["http-error", "No se pudo completar el acceso. Inténtalo de nuevo."],
    ["protocol-error", "No se pudo completar el acceso. Inténtalo de nuevo."],
  ] as const)("maps %s to the existing message", async (category, expectedMessage) => {
    login.mockRejectedValue(new SessionAuthError("Auth failed", category, null));
    const form = useLoginForm();

    await form.handleLogin();

    expect(form.error.value).toBe(expectedMessage);
    expect(form.loading.value).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the fallback message for unexpected rejections", async () => {
    login.mockRejectedValue(new Error("Unexpected failure"));
    const form = useLoginForm();

    await form.handleLogin();

    expect(form.error.value).toBe("No se pudo completar el acceso. Inténtalo de nuevo.");
    expect(form.loading.value).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it("clears a previous error and exposes loading until login settles", async () => {
    let resolveLogin!: () => void;
    login.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLogin = resolve;
        })
    );
    const form = useLoginForm();
    form.error.value = "error anterior";

    const pendingLogin = form.handleLogin();

    expect(form.error.value).toBeNull();
    expect(form.loading.value).toBe(true);
    resolveLogin();
    await pendingLogin;
    expect(form.loading.value).toBe(false);
  });
});
