import { defineConfig } from "vite"

export default defineConfig({
    publicDir: false,
    build: {
        emptyOutDir: false,
        lib: {
            entry: "src/extensionModel.ts",
            name: "BoardWorldModel",
            formats: ["iife"],
            fileName: () => "board-world-model.js",
        },
        outDir: "dist/assets",
    },
})
