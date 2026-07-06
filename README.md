# Caitlin Chavis Portfolio

Static single-page portfolio for Caitlin Chavis, designed for GitHub Pages and a custom Squarespace-managed domain.

## Preview locally

```bash
node scripts/serve.mjs
```

Then open `http://localhost:4173`.

## Regenerate portfolio images

```bash
NODE_PATH=/Users/jounyzedan/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules node scripts/generate-assets.mjs
```

The script reads the organized folders in `Portfolio/`, creates optimized `.webp` images in `public/assets/projects/`, and writes `src/project-data.js`.

## GitHub Pages

1. Create a GitHub repository.
2. Push this folder to the repository.
3. In GitHub, open `Settings` → `Pages`.
4. Under `Build and deployment`, choose `Deploy from a branch`.
5. Select the `main` branch and `/ (root)`, then save.
6. After GitHub publishes the site, add your custom domain in the Pages settings.

## Squarespace domain DNS

In Squarespace DNS settings, add these GitHub Pages records:

```text
A     @     185.199.108.153
A     @     185.199.109.153
A     @     185.199.110.153
A     @     185.199.111.153
CNAME www   your-github-username.github.io
```

Replace `your-github-username` with the GitHub account name. If using an apex domain like `example.com`, GitHub will create or expect a `CNAME` file containing the custom domain.
