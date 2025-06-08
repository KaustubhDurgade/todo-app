import os
import pytest
from src.app import create_app
from src.database.db import Base, db_session, engine

@pytest.fixture(scope='session')
def app():
    """Create application for the tests."""
    _app = create_app()
    _app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///test.db'
    })
    
    # Setup test database
    Base.metadata.create_all(bind=engine)
    
    yield _app
    
    # Cleanup after tests
    Base.metadata.drop_all(bind=engine)
    os.remove('test.db') if os.path.exists('test.db') else None

@pytest.fixture(scope='function')
def client(app):
    """Create test client."""
    return app.test_client()

@pytest.fixture(scope='function')
def session():
    """Create fresh database session for a test."""
    connection = engine.connect()
    transaction = connection.begin()
    
    # Clear all tables before each test
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()
    
    yield db_session
    
    # Clean up after test
    db_session.rollback()
    transaction.rollback()
    connection.close()
    db_session.remove()