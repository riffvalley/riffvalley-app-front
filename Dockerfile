# Etapa de construcción
FROM node:24.22.1 AS builder

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias desde el lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable \
    && corepack prepare pnpm@11.28.8 --activate \
    && pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir la aplicación
RUN pnpm run build

# Etapa de producción
FROM nginx:stable

# Copiar archivos compilados al servidor Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Ejecutar Nginx en modo foreground
CMD ["nginx", "-g", "daemon off;"]
