# 1. Imagen base oficial de Node.js
FROM node:22-alpine AS builder

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar el resto del código fuente de la aplicación
COPY . .

# Compilar la aplicación (Vite para el frontend y esbuild para el servidor)
RUN npm run build

# Prunar dependencias de desarrollo para reducir el tamaño final de la imagen
RUN npm prune --production

# 2. Etapa de Producción
FROM node:22-alpine AS runner

WORKDIR /app

# Configurar variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Copiar archivos compilados y dependencias necesarias desde la etapa builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Copiar directorio de plantillas de ejemplo o directorio assets si existen
COPY --from=builder /app/example ./example

# Puerto expuesto
EXPOSE 3000

# Comando para iniciar la aplicación en producción
CMD ["node", "dist/server.cjs"]
