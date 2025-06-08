import json
import pytest
from src.models.todo import Todo

def test_get_todos_empty(client, session):
    """Test getting todos when the database is empty."""
    response = client.get('/todos/')
    assert response.status_code == 200
    assert response.json == []

def test_create_todo(client, session):
    """Test creating a new todo."""
    data = {
        'title': 'Test Todo',
        'description': 'Test Description',
        'completed': False
    }
    response = client.post('/todos/', 
                          data=json.dumps(data),
                          content_type='application/json')
    assert response.status_code == 201
    assert response.json['title'] == data['title']
    assert response.json['description'] == data['description']
    assert 'id' in response.json

def test_get_todo(client, session):
    """Test getting a specific todo."""
    # Create a todo first
    todo = Todo(title='Test Todo', description='Test Description')
    session.add(todo)
    session.commit()

    response = client.get(f'/todos/{todo.id}')
    assert response.status_code == 200
    assert response.json['title'] == 'Test Todo'
    assert response.json['description'] == 'Test Description'

def test_update_todo_full(client, session):
    """Test updating all fields of a todo."""
    # Create a todo first
    todo = Todo(title='Old Title', description='Old Description', completed=False)
    session.add(todo)
    session.commit()

    data = {
        'title': 'New Title',
        'description': 'New Description',
        'completed': True
    }
    response = client.put(f'/todos/{todo.id}', 
                         data=json.dumps(data),
                         content_type='application/json')
                         
    assert response.status_code == 200
    assert response.json['title'] == 'New Title'
    assert response.json['description'] == 'New Description'
    assert response.json['completed'] is True

def test_update_todo_partial(client, session):
    """Test partial update of a todo."""
    # Create a todo first
    todo = Todo(title='Original Title', description='Original Description', completed=False)
    session.add(todo)
    session.commit()

    # Update only the title
    response = client.put(f'/todos/{todo.id}', 
                         data=json.dumps({'title': 'Updated Title'}),
                         content_type='application/json')
                         
    assert response.status_code == 200
    assert response.json['title'] == 'Updated Title'
    assert response.json['description'] == 'Original Description'
    assert response.json['completed'] is False

    # Update only completed status
    response = client.put(f'/todos/{todo.id}', 
                         data=json.dumps({'completed': True}),
                         content_type='application/json')
                         
    assert response.status_code == 200
    assert response.json['title'] == 'Updated Title'  # Should remain from previous update
    assert response.json['completed'] is True

def test_update_todo_validation(client, session):
    """Test validation when updating a todo."""
    todo = Todo(title='Test Title', description='Test Description')
    session.add(todo)
    session.commit()

    # Test empty title
    response = client.put(f'/todos/{todo.id}', 
                         data=json.dumps({'title': ''}),
                         content_type='application/json')
    assert response.status_code == 400  # Bad request

    # Test with invalid data type
    response = client.put(f'/todos/{todo.id}', 
                         data=json.dumps({'completed': 'not-a-boolean'}),
                         content_type='application/json')
    assert response.status_code == 400  # Bad request

def test_update_nonexistent_todo(client, session):
    """Test updating a todo that doesn't exist."""
    response = client.put('/todos/99999', 
                         data=json.dumps({'title': 'New Title'}),
                         content_type='application/json')
    assert response.status_code == 404  # Not found

def test_delete_todo(client, session):
    """Test deleting a todo."""
    # Create a todo first
    todo = Todo(title='To Delete', description='Will be deleted')
    session.add(todo)
    session.commit()

    # Delete the todo
    response = client.delete(f'/todos/{todo.id}')
    assert response.status_code == 204

    # Verify it's deleted
    response = client.get(f'/todos/{todo.id}')
    assert response.status_code == 404

    # Try to delete again - should get 404 since it's already deleted
    response = client.delete(f'/todos/{todo.id}')
    assert response.status_code == 404

def test_get_nonexistent_todo(client):
    """Test getting a todo that doesn't exist."""
    response = client.get('/todos/999')
    assert response.status_code == 404

# Removed duplicate test_update_nonexistent_todo

def test_delete_nonexistent_todo(client):
    """Test deleting a todo that doesn't exist."""
    response = client.delete('/todos/999')
    assert response.status_code == 404

def test_swagger_doc(client):
    """Test swagger documentation endpoint."""
    response = client.get('/swagger/')
    assert response.status_code == 200