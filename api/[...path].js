import serverless from 'serverless-http';
import app from '../backend/app.js';

const handler = serverless(app, { binary: true });

export default async function vercelHandler(req, res) {
  return handler(req, res);
}
