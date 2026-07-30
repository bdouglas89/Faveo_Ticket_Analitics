# Manual de Despliegue a Producción (GitHub + Proxmox LXC + Docker)

Este documento detalla el procedimiento completo paso a paso para exportar este sistema y desplegarlo en un entorno de producción sobre una máquina virtual o contenedor LXC en **Proxmox VE** usando **Docker** y **Docker Compose**.

---

## 1. Credenciales y Estado Inicial de la Base de Datos

La base de datos SQLite (`tickets.db`) se ha preparado totalmente **limpia de tickets** y con los **3 usuarios por defecto** requeridos:

| Rol | Usuario | Contraseña | Permisos |
|---|---|---|---|
| **Administrador** | `admin` | `Faveo2026*` | Acceso total (Gestión de usuarios, limpia BD, importación/exportación y visor de **Log de Errores**). |
| **Gestor** | `gestor` | `Gestor2026` | Carga de reportes Excel, filtrado por mes/año y consulta de tickets. |
| **Visor** | `visor` | `Visor2026` | Solo lectura y consulta del Dashboard y listados de tickets. |

*El usuario anterior `bdouglas` ha sido eliminado.*

---

## 2. Exportación e Integración con GitHub

### Paso 2.1: Exportar el proyecto o clonarlo
Si descargas el proyecto desde el menú **Settings -> Export ZIP** o mediante **Export to GitHub** de AI Studio:

1. Si utilizas Git localmente, inicia el repositorio si no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "feat: Preparar sistema para producción con usuarios por defecto y Docker"
   ```

2. Sube el código a tu repositorio privado o público en GitHub:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITY.git
   git branch -M main
   git push -u origin main
   ```

---

## 3. Preparación del Contenedor en Proxmox VE

### Paso 3.1: Crear el Contenedor LXC en Proxmox
1. Entra a tu panel web de **Proxmox VE**.
2. Haz clic en **Create CT** (Crear Contenedor LXC).
3. Selecciona una plantilla Linux recomendada (ej. **Ubuntu 22.04 LTS** o **Debian 12**).
4. Configura los recursos mínimos sugeridos:
   - **Cores**: 2 CPU cores.
   - **RAM**: 2048 MB (2 GB).
   - **Disk**: 10–20 GB.
   - **Network**: Asigna IP estática o DHCP.
5. **IMPORTANTE (Opciones de Docker en LXC)**:
   - En las opciones del contenedor recién creado en Proxmox (`Options` -> `Features`), marca **Keyctl** y **Nesting**.
   - Esto permite que Docker se ejecute dentro del contenedor LXC de Proxmox.

---

## 4. Instalación de Docker y Docker Compose en el LXC

Accede por SSH o mediante la consola web de Proxmox al contenedor LXC e instala Docker:

```bash
# Actualizar el sistema
apt update && apt upgrade -y

# Incrementar límites de observadores de archivos (requerido para aplicaciones Node/Vite)
echo "fs.inotify.max_user_watches=524288" >> /etc/sysctl.conf
sysctl -p

# Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Verificar instalación
docker --version
docker compose version
```

---

## 5. Despliegue de la Aplicación

### Paso 5.1: Clonar el repositorio
En la consola del contenedor LXC:

```bash
cd /opt/faveo-tickets
git clone https://github.com/bdouglas89/Faveo_Ticket_Analitics.git
cd Faveo_Ticket_Analitics
```

### Paso 5.2: Iniciar con Docker Compose
Asegúrate de estar **dentro de la carpeta del proyecto** (`/opt/faveo-tickets/Faveo_Ticket_Analitics`) donde se encuentra el archivo `docker-compose.yml`, y ejecuta:

```bash
docker compose up -d --build
```

El archivo `docker-compose.yml` ya está preconfigurado para:
- Mapear la aplicación web en el puerto **3000** (`http://IP_SERVIDOR:3000`).
- Mapear el cliente visor web de SQLite en el puerto **8080** (`http://IP_SERVIDOR:8080`).
- Montar y persistir la base de datos SQLite (`./tickets.db`).
- Montar y guardar en disco los logs de errores mensuales (`./logs`).

---

## 6. Verificación y Acceso

1. **Aplicación Web Principal**:
   - URL: `http://IP_DE_TU_PROXMOX_LXC:3000`
   - **Usuario**: `admin`
   - **Contraseña**: `Faveo2026*`

2. **Visor de Base de Datos SQLite (SQLite Web Client)**:
   - URL: `http://IP_DE_TU_PROXMOX_LXC:8080`
   - Permite explorar tablas (`tickets`, `users`), ejecutar consultas SQL personalizadas, exportar datos y verificar el estado interno de la base de datos en tiempo real.

---

## 7. Mantenimiento y Comandos Útiles

- **Ver logs en tiempo real de los contenedores:**
  ```bash
  docker compose logs -f
  ```

- **Reiniciar la aplicación y el cliente SQLite:**
  ```bash
  docker compose restart
  ```

- **Actualizar a la última versión publicada en GitHub:**
  ```bash
  git pull
  docker compose up -d --build
  ```

- **Ubicación de los archivos persistentes:**
  - Base de datos SQLite: `/opt/faveo-tickets/Faveo_Ticket_Analitics/tickets.db`
  - Logs de errores mensuales: `/opt/faveo-tickets/Faveo_Ticket_Analitics/logs/error-YYYY-MM.log`
