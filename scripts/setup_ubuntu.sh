#!/bash
# Script de instalación para Ubuntu (Bare Metal)
# Este script prepara tu VM para el Repositorio de Objetos de Aprendizaje

echo "🚀 Iniciando preparación del sistema..."

# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 4. Configurar PostgreSQL (Crear DB y Usuario)
# Nota: Cambia 'password123' por algo seguro
sudo -u postgres psql -c "CREATE DATABASE roa_db;"
sudo -u postgres psql -c "CREATE USER roa_admin WITH PASSWORD 'password123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE roa_db TO roa_admin;"

# 5. Instalar Nginx y PM2
sudo apt install -y nginx
sudo npm install -g pm2

# 6. Configurar Firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow 22

echo "✅ Sistema listo. Ahora puedes clonar el repo y ejecutar npm install."
