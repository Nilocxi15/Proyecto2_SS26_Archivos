FROM node:22-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias limpias
RUN npm ci --omit=dev || npm install --omit=dev

# Copiar el código fuente de la aplicación
COPY . .

# Exponer el puerto del servidor
EXPOSE 5000

# Variables de entorno por defecto
ENV PORT=5000 \
    NODE_ENV=production

# Comando de arranque del servidor
CMD ["node", "src/index.js"]
