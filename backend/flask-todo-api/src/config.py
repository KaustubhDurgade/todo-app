import os

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///todos.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SWAGGER_URL = '/swagger'
    API_URL = '/static/swagger.json'
    
    # Logging Configuration
    LOG_DIR = 'logs'
    LOG_FILE = 'todo_api.log'
    LOG_LEVEL = 'INFO'
    LOG_FORMAT = '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
    LOG_MAX_BYTES = 10240  # 10KB
    LOG_BACKUP_COUNT = 10