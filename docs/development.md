# Development

Requires [Bun](https://bun.sh). [prek](https://prek.j178.dev/) comes in as a dev dependency.

```bash
bun install   # also installs the git hooks
bun dev
```

| Command               | What it does                                    |
| --------------------- | ----------------------------------------------- |
| `bun run check`       | Type check                                      |
| `bun run lint`        | Lint with Biome                                 |
| `bun run lint:fix`    | Lint and apply fixes                            |
| `bun run format`      | Format TypeScript, Svelte and Markdown          |
| `bun run test`        | Run the test suite                              |
| `bun run screenshots` | Regenerate the screenshots in `docs/images/`    |
| `bun x prek run -a`   | Run every git hook against the whole repository |

The hooks format, lint, type check and test on commit, scan for secrets and typos, and require
[Conventional Commits](https://www.conventionalcommits.org/) messages.

## Screenshots

`bun run screenshots` builds the app, starts it on a blank database and drives it with Playwright:
it restores a backup of common homelab apps, connects Umami, then captures the dashboard, the
search palette, Settings and the appearance options in light and dark. A local stand-in answers the link checks and the
Umami API, so nothing outside your machine is needed besides the weather and the icons. Run
`bunx playwright install chromium` once first.

It then runs `bun run graphics`, which frames `dashboard-dark.webp` in a browser window next to a
tagline and writes `feature.webp`: the README hero and the project image on orochibraru.com. Run it
alone to re-lay the hero without retaking the shots.

CI reruns both after every release and commits the result to `main`, so images changed in a pull
request get overwritten by the next release.

## Stack

SvelteKit 3 (prerelease) on Bun with [remote functions](https://svelte.dev/docs/kit/remote-functions), SQLite with Drizzle ORM, Tailwind CSS and
[shadcn-svelte](https://shadcn-svelte.com/) components.
