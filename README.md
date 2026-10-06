# Sistema de Gestión Documental (MEAN Stack)

Guía oficial de despliegue, ejecución y administración de contenedores con **Docker** y **Docker Compose** para el proyecto Sistema de Gestión Documental.

---

## Arquitectura de Servicios y Puertos

El proyecto está compuesto por 4 servicios orquestados a través de `docker-compose.yml`:

| Servicio | Nombre del Contenedor | Puerto Local | Tecnología / Base | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | `frontend-gestion-documental` | [`http://localhost:4200`](http://localhost:4200) | Angular 21 LTS (Node 22) | Aplicación cliente servida con `ng serve` y soporte de recarga en vivo |
| **Backend** | `backend-gestion-documental` | [`http://localhost:5000`](http://localhost:5000) | Node.js 22 + Express | API REST conectada a MongoDB |
| **Base de Datos** | `mongo-gestion-documental` | `localhost:27017` | MongoDB 7.0 | Base de datos NoSQL con volumen persistente (`mongo_data`) |
| **Mongo-Express** | `mongo-express-gestion-documental` | [`http://localhost:8081`](http://localhost:8081) | Mongo-Express Web UI | Panel web gráfico para administrar y consultar colecciones de MongoDB |

---

## Requisitos Previos

* **Docker Desktop** (o Docker Engine en Linux) con Docker Compose v2+ instalado y en ejecución.
* Terminal de comandos (PowerShell, Bash, Zsh, CMD).

---

## 1. Construcción de Imágenes (*Build*)

### Construir todas las imágenes del proyecto:
```bash
docker compose build
```

### Construir sin usar la caché (si se agregan nuevas dependencias en `package.json`):
```bash
docker compose build --no-cache
```

### Construir únicamente un servicio específico (ejemplo: Frontend o Backend):
```bash
docker compose build frontend
docker compose build backend
```

---

## 2. Encender y Levantar el Proyecto (*Up / Start*)

### Levantar todos los servicios en segundo plano (*Detached mode - Recomendado*):
```bash
docker compose up -d
```

### Levantar y forzar la reconstrucción automática de imágenes:
```bash
docker compose up -d --build
```

### Levantar en primer plano (para ver la salida de todos los contenedores en consola):
```bash
docker compose up
```

### Iniciar contenedores que ya existían y estaban detenidos:
```bash
docker compose start
```

---

## 3. Apagar y Detener Servicios (*Down / Stop*)

### Detener los servicios sin eliminar contenedores ni redes:
```bash
docker compose stop
```

### Apagar y remover los contenedores y redes virtuales del proyecto (*Recomendado al terminar de trabajar*):
```bash
docker compose down
```

### Apagar y ELIMINAR también los volúmenes de datos (¡Precaución! Borra la información de MongoDB):
```bash
docker compose down -v
```

---

## 4. Reinicio de Contenedores (*Restart*)

### Reiniciar todos los servicios:
```bash
docker compose restart
```

### Reiniciar un servicio puntual (ejemplo: reiniciar solo el backend tras cambios en código):
```bash
docker compose restart backend
# O reiniciar solo el frontend:
docker compose restart frontend
```

---

## 5. Acceso al Gestor Visual de MongoDB (Mongo-Express)

Para visualizar colecciones, documentos y registros directamente desde el navegador:

1. Abrir el navegador web en: **[`http://localhost:8081`](http://localhost:8081)**
2. El navegador solicitará autenticación básica HTTP. Ingresa las siguientes credenciales predeterminadas:
   * **Usuario:** `admin`
   * **Contraseña:** `admin`
3. En la interfaz se podrá explorar la base de datos `gestion_documental`, ver colecciones creadas, ejecutar consultas JSON y manipular documentos.

---

## 6. Monitoreo, Registros (*Logs*) y Diagnóstico

### Ver el estado y salud de todos los contenedores:
```bash
docker compose ps
```

### Ver los registros en tiempo real de todos los servicios:
```bash
docker compose logs -f
```

### Ver los registros en tiempo real de un servicio específico:
```bash
# Registros del Backend:
docker compose logs -f backend

# Registros del Frontend:
docker compose logs -f frontend

# Registros de MongoDB:
docker compose logs -f database
```

### Ver las últimas 50 líneas de log de un servicio:
```bash
docker compose logs --tail=50 backend
```

---

## 7. Comandos de Consola Avanzados

### Ingresar a la terminal interactiva dentro del contenedor:
* **Terminal del Backend:**
  ```bash
  docker exec -it backend-gestion-documental sh
  ```
* **Terminal del Frontend:**
  ```bash
  docker exec -it frontend-gestion-documental sh
  ```
* **Consola interactiva de MongoDB (`mongosh`):**
  ```bash
  docker exec -it mongo-gestion-documental mongosh -u admin -p password123 --authenticationDatabase admin
  ```

### Ver el consumo de CPU y memoria en tiempo real:
```bash
docker stats
```

### Limpiar imágenes huérfanas o no utilizadas de Docker:
```bash
docker image prune -f
```

---

## 8. Variables de Entorno

El archivo `.env.example` en la raíz contiene las variables parametrizables. Puedes crear un archivo `.env` para sobreescribir valores si es necesario:

```env
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=password123
MONGO_DATABASE=gestion_documental
PORT=5000
NODE_ENV=production
FRONTEND_PORT=4200
```
