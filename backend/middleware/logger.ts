import { NextApiRequest, NextApiResponse } from 'next';

export const logger = (fn: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
  const start = Date.now();
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  await fn(req, res);

  const duration = Date.now() - start;
  console.log(`[RESPONSE] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
};
