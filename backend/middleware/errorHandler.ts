import { NextApiRequest, NextApiResponse } from 'next';

export const errorHandler = (fn: Function) => async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    await fn(req, res);
  } catch (err: any) {
    console.error('[ERROR HANDLER]', err);

    res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Error interno del servidor',
    });
  }
};
