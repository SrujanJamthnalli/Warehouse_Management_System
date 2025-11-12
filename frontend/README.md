# Warehouse Management Frontend (Vanilla JS)

## Run (simple)
Use a static server to avoid CORS/FS issues. Two easy options:

### Option A: VS Code Live Server
Open the `frontend` folder and click 'Go Live'.

### Option B: `npx serve`
```sh
npx serve -l 5500
```
Then open http://localhost:5500 in your browser.

> The frontend expects the backend at `http://localhost:4000`. You can change this by editing `script.js` (the `API` constant) and updating `CORS_ORIGIN` in backend `.env`.