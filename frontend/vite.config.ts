import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/CampusConnect/",
  plugins: [react(), tailwindcss()],
  envDir: "../",
  server: { port: 5173 }
});
