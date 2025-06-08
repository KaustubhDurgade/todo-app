.PHONY: help setup-env clean test lint run doc init-db migrate logs check

CONDA_ENV_NAME := todo-api
PYTHON_VERSION := 3.9
FLASK_APP := src/app.py
PYTHON_FILES := $(shell find . -name "*.py")
LOG_DIR := logs

help:  ## Show this help menu
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

setup-env:  ## Create and setup conda environment with dependencies
	@echo "Creating conda environment $(CONDA_ENV_NAME)..."
	@conda create -n $(CONDA_ENV_NAME) python=$(PYTHON_VERSION) -y
	@echo "Activating conda environment..."
	@eval "$$(conda shell.bash hook)" && \
	conda activate $(CONDA_ENV_NAME) && \
	pip install -r requirements.txt
	@echo "Conda environment $(CONDA_ENV_NAME) is ready!"

clean:  ## Remove Python compiled files and cache
	find . -type f -name "*.py[co]" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf .tox

test:  ## Run tests with pytest
	pytest tests/ -v --cov=src

lint:  ## Run code linting and type checking
	flake8 src/ tests/
	mypy src/ tests/
	black --check src/ tests/

format:  ## Format code with black
	black src/ tests/

doc:  ## View API documentation
	@echo "Starting server with Swagger documentation..."
	@make run

run:  ## Run the Flask application
	@echo "Starting Flask application..."
	@PYTHONPATH=$(PWD) \
	FLASK_APP=$(FLASK_APP) \
	FLASK_ENV=development \
	flask run --debugger

coverage:  ## Run tests and generate coverage report
	pytest --cov=src tests/ --cov-report=html
	@echo "Coverage report generated in htmlcov/index.html"

init-db:  ## Initialize the database
	@echo "Initializing database..."
	FLASK_APP=$(FLASK_APP) flask shell -c "from src.database.db import init_db; init_db()"
	@echo "Database initialized!"

migrate:  ## Run database migrations (placeholder for future migrations)
	@echo "No migrations to run yet"

logs:  ## View application logs
	@mkdir -p $(LOG_DIR)
	@if [ -f "$(LOG_DIR)/todo.log" ]; then \
		tail -f $(LOG_DIR)/todo.log; \
	else \
		echo "No logs found"; \
	fi

check:  ## Run all checks (tests, lint, type checking)
	@make lint
	@make test
	@make coverage