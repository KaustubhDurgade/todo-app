from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.orm import declarative_base
import os
import logging

logger = logging.getLogger(__name__)

database_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'todos.db')

# Optimized engine configuration
engine = create_engine(
    f'sqlite:///{database_file}',
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections every hour
    connect_args={
        'check_same_thread': False,
        'timeout': 30,
        # SQLite optimization pragmas
        'isolation_level': None  # Enable autocommit mode
    },
    echo=False  # Disable SQL logging for performance
)

db_session = scoped_session(
    sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
        expire_on_commit=False  # Keep objects accessible after commit
    )
)

Base = declarative_base()
Base.query = db_session.query_property()

# Import SQLAlchemy event system
from sqlalchemy import event

def setup_session_events():
    """Set up database session event listeners for logging"""
    event.listen(db_session, 'after_commit', lambda session: logger.debug('Database transaction committed'))
    event.listen(db_session, 'after_rollback', lambda session: logger.warning('Database transaction rolled back'))

def init_db():
    """Initialize the database schema"""
    logger.info('Initializing database schema')
    import src.models.todo
    Base.metadata.create_all(bind=engine)
    setup_session_events()
    logger.info('Database schema created successfully')

def get_logger():
    """Get the database logger"""
    return logger