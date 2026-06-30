import { config } from '../backend/config.js';

export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(
    JSON.stringify({
      status: 'ok',
      service: 'trimble-mezzoteam-proxy',
      mockMezzoteam: config.useMockMezzoteam,
      mockTrimble: config.useMockTrimble,
      mezzoteamApiVersion: config.mezzoteamApiVersion,
    }),
  );
}
