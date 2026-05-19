import { ref } from "vue";

const isDark = ref(false);

const applyTheme = (dark: boolean) => {
  isDark.value = dark;

  if (dark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
};

const initTheme = () => {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    applyTheme(true);
    return;
  }

  applyTheme(false);
};

const toggleTheme = () => {
  applyTheme(!isDark.value);
};

export function useTheme() {
  return {
    isDark,
    initTheme,
    toggleTheme,
  };
}