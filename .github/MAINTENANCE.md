This document explains how to perform the project's maintenance tasks.

### Creating a new release

Anyone with write access to the repository can request a new release. To do so,
follow these steps:

1. Make sure `main` is up to date and `pnpm ready` passes locally.
2. Run `pnpm release` to choose the next version interactively.
   - To skip the prompt, pass a version or release type through to `bumpp`, for
     example `pnpm release -- --release patch` or
     `pnpm release -- --release 0.0.2`.
   - This bumps the private root `package.json` together with the packages under
     `packages/*`, but skips the apps under `apps/*`, then creates the release
     commit and tag.
3. Push the commit and tag by running `git push origin main --follow-tags`.
4. GitHub Actions runs `.github/workflows/publish.yml` on the tag and publishes
   the packages under `packages/*` with npm trusted publishing.
5. After the workflow succeeds, create a GitHub release for the same tag and
   summarize the notable changes.
