import { defineConfig } from "vite"

export default defineConfig({
    plugins: [{
        name: "escape-content-script-noncharacters",
        generateBundle(_options, bundle) {
            for (const asset of Object.values(bundle)) {
                if (asset.type === "chunk") {
                    asset.code = asset.code.replace(/\uFFFF/g, "\\uFFFF")
                }
            }
        },
    }],
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
