import app from './app.js';
import { config } from './config.js';

const PORT = process.env.PORT ?? 3001;

app.listen(PORT, () => {
  const mezzo = config.useMockMezzoteam ? 'MOCK' : 'LIVE';
  const trimble = config.useMockTrimble ? 'MOCK' : 'LIVE';
  console.log(
    `[backend] Proxy démarré sur http://localhost:${PORT} — Mezzoteam[${mezzo}] TrimbleConnect[${trimble}]`,
  );
});
