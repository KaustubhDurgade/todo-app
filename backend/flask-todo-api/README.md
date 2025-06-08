# Flask Todo API

A full-featured RESTful API for managing todos built with Flask, featuring Swagger documentation, SQLite database, and comprehensive testing.

## Features

- **RESTful Endpoints**:
  - `GET /todos`: Retrieve all tasks
  - `GET /todos/{id}`: Retrieve a specific task
  - `POST /todos`: Create a new task
  - `PUT /todos/{id}`: Update a task
  - `DELETE /todos/{id}`: Delete a task
  - Swagger documentation at `/swagger/`

- **Database**: 
  - SQLite database for data persistence
  - SQLAlchemy ORM for database operations
  - Clean database migrations and initialization

- **API Documentation**: 
  - Interactive Swagger UI
  - Detailed API specifications
  - Request/Response examples

- **Development Features**:
  - Comprehensive test suite
  - Code quality checks (flake8, mypy)
  - Automated logging system
  - Convenient Makefile commands

- **Logging**: Appropriate logging is implemented for better traceability.

## Requirements

- Python 3.9+
- Conda (recommended) or virtualenv

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd flask-todo-api
   ```

2. Set up the conda environment:
   ```bash
   make setup-env
   ```

3. Initialize the database:
   ```bash
   make init-db
   ```

## Running the Application

Start the application:
```bash
make run
```

The API will be available at:
- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger/`

## Development

### Available Make Commands

```bash
make help      # Show all available commands
make test      # Run the test suite
make lint      # Run code quality checks
make clean     # Clean up cache files
make check     # Run all checks (tests, lint, typing)
make logs      # View application logs
```

### API Endpoints

All endpoints accept and return JSON data.

#### Todos
- `GET /todos`
  - List all todos
  - Query parameters: none
  - Returns: Array of todo objects

- `GET /todos/{id}`
  - Get a specific todo
  - Parameters: todo ID
  - Returns: Todo object or 404

- `POST /todos`
  - Create a new todo
  - Body: `{"title": "string", "description": "string", "completed": boolean}`
  - Returns: Created todo object

- `PUT /todos/{id}`
  - Update a todo
  - Parameters: todo ID
  - Body: `{"title": "string", "description": "string", "completed": boolean}`
  - Returns: Updated todo object

- `DELETE /todos/{id}`
  - Delete a todo
  - Parameters: todo ID
  - Returns: 204 No Content

### Project Structure

```
flask-todo-api/
├── src/                    # Application source code
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── schemas/           # Marshmallow schemas
│   └── database/          # Database configuration
├── tests/                 # Test suite
├── logs/                  # Application logs
└── Makefile              # Build and management commands
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.