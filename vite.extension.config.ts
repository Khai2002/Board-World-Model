import { defineConfig } from "vite"

export default defineConfig({
    build: {
        lib: {
            entry: "src/extensionModel.ts",
            name: "BoardWorldModel",
            formats: ["iife"],
            fileName: () => "assets/board-world-model.js",
        },
        outDir: "dist",
    },
})
