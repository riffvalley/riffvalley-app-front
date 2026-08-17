import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../model/auth.store';

export function useLogin() {
  const username = ref('');
  const password = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  const auth = useAuthStore();
  const router = useRouter();

  async function submit(): Promise<void> {
    error.value = null;
    loading.value = true;
    try {
      await auth.login({ username: username.value, password: password.value });
      await router.push({ name: 'Home' });
    } catch {
      error.value = 'Acceso fallido. Revisa tus credenciales.';
    } finally {
      loading.value = false;
    }
  }

  return { username, password, loading, error, submit };
}
