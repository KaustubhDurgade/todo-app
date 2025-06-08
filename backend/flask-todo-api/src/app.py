import os
import logging
from logging.handlers import RotatingFileHandler
from flask import Flask
from flask_restx import Api
from src.routes.todos import api as todos_ns
from src.database.db import db_session, init_db

def setup_logging(app):
    """Configure application logging"""
    log_dir = 'logs'
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    file_handler = RotatingFileHandler(
        'logs/todo_api.log',
        maxBytes=10240,
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Todo API startup')

def create_app():
    app = Flask(__name__)
    setup_logging(app)  # Initialize logging
    
    api = Api(
        app,
        version='1.0',
        title='Todo API',
        description='A simple Todo API',
        doc='/swagger/'
    )
    
    # Register namespaces
    api.add_namespace(todos_ns)
    
    # Initialize database
    init_db()
    
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)