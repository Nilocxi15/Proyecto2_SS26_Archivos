FROM node:22-alpine

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias del proyecto
RUN npm ci

# Copiar el código fuente y configuraciones
COPY . .

# Exponer el puerto predeterminado de Angular
EXPOSE 4200

# Arrancar el servicio de Angular CLI directamente
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--port", "4200", "--proxy-config", "proxy.conf.json"]
