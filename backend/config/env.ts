export const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }

  return value;
};

export const getJwtSecret = () => getRequiredEnv('JWT_SECRET');
