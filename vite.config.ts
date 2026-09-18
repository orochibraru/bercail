import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import adapter from "@orochibraru/svelte-smol";

export default defineConfig({
    plugins: [tailwindcss(), sveltekit({
        compilerOptions: {
            // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
            runes: ({ filename }) =>
                filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
            experimental: {
                // Required by remote functions in SvelteKit 3.
                async: true,
            },
        },

        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter({ precompress: true }),

        experimental: {
            remoteFunctions: true,
        },
    }),]
});
