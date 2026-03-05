# Cofounder Frontend (Public)

Static frontend hosted on GitHub Pages.

- Deploy root: `frontend/`
- Live URL: `https://tinycrops.github.io/cofounder-frontend-pages/`
- Backend: private FastAPI behind Tailscale Funnel

## Local preview

```bash
cd frontend
python3 -m http.server 8080
# open http://localhost:8080
```

## Configure backend URL

Edit `frontend/config.js`:

```js
window.CONFIG = {
  BACKEND_URL: "https://<machine>.tail<hash>.ts.net/cofounder-api",
};
```

If `BACKEND_URL` is empty, frontend stays functional with fallback behavior.
