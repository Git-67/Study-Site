// Apply the saved theme before paint to avoid a flash of the wrong colors.
try {
  const savedTheme = localStorage.getItem("hello-world-theme");
  document.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark";
} catch {
  document.documentElement.dataset.theme = "dark";
}
