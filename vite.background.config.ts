import { defineConfig } from "vite"

export default defineConfig({
    build: {
        emptyOutDir: false,
        lib: {
            entry: "src/background.ts",
            formats: ["iife"],
            name: "BoardWorldBackground",
            fileName: () => "background.js",
        },
        outDir: "dist",
    },
})