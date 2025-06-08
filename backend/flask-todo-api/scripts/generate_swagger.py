#!/usr/bin/env python3
"""Generate Swagger documentation for the Todo API."""
from src.app import create_app
from flask import json
from src.routes.todos import api

def generate_swagger():
    """Generate Swagger documentation."""
    app = create_app()
    # Create a test client to trigger app initialization
    client = app.test_client()
    with app.app_context():
        # Get the main API instance from app
        api = app.extensions['flask-restx']['api']
        spec = api.__schema__
        with open('static/swagger/swagger.json', 'w') as f:
            json.dump(spec, f, indent=2)

if __name__ == '__main__':
    generate_swagger()
