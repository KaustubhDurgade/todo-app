from ..database.db import Base
from sqlalchemy import Column, Integer, String, Boolean

class Todo(Base):
    __tablename__ = 'todo'

    id = Column(Integer, primary_key=True)
    title = Column(String(100), nullable=False)
    description = Column(String(200))
    completed = Column(Boolean, default=False)

    def __repr__(self):
        return f'<Todo {self.title}>'