<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1d3c1f26-407f-45de-a475-9e4fcfffdaf4

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production Build

1. Build the frontend:
   `npm run build`
2. Run in production mode:
   `set NODE_ENV=production && npx tsx server.ts`

### Variáveis de Ambiente (Opcional)

- `THUMBSYNC_SOURCE`: Caminho para os arquivos .webp de origem.
- `THUMBSYNC_DEST`: Caminho para a pasta de destino no Google Drive.
- `THUMBSYNC_DRIVE_LIST`: Caminho para o lista.txt do Drive.
- `THUMBSYNC_ADOBE_LIST`: Caminho para o lista.txt local.
- `THUMBSYNC_PSD`: Caminho para a pasta de projetos PSD.
