# TinyCrops Research Microsite

Static GitHub Pages site for an exploratory hypothesis:

`Fontemon + llama.ttf + parameter-golf -> domain-specific superintelligence artifacts`

- Deploy root: `frontend/`
- Live URL: `https://tinycrops.github.io/cofounder-frontend-pages/`
- Publish mode: GitHub Actions Pages deploy via `.github/workflows/pages.yml`

## Local preview

```bash
cd frontend
python3 -m http.server 8080
# open http://localhost:8080
```

## Deployment

Push to `main` over the SSH remote:

```bash
git push origin main
```

GitHub Actions uploads `frontend/` as the Pages artifact and deploys it.
