from flask import request, current_app
from flask_restx import Namespace, Resource, fields
import marshmallow
from ..database.db import db_session
from ..models.todo import Todo
from ..schemas.todo import TodoSchema

api = Namespace('todos', description='Todo operations', path='/todos')

# Define the model expected by Flask-RESTX
todo_model = api.model('Todo', {
    'id': fields.Integer(readonly=True, description='The task unique identifier'),
    'title': fields.String(required=True, description='The task title'),
    'description': fields.String(description='The task description'),
    'completed': fields.Boolean(default=False, description='The task completion status')
})

todo_schema = TodoSchema()
todos_schema = TodoSchema(many=True)

@api.route('/')
class TodoList(Resource):
    @api.doc('list_todos')
    @api.marshal_list_with(todo_model)
    def get(self):
        """List all todos"""
        current_app.logger.info('Retrieving all todos')
        todos = db_session.query(Todo).all()
        current_app.logger.debug(f'Found {len(todos)} todos')
        return todos_schema.dump(todos)

    @api.doc('create_todo')
    @api.expect(todo_model)
    @api.marshal_with(todo_model, code=201)
    def post(self):
        """Create a new todo"""
        current_app.logger.info('Creating new todo')
        json_data = request.get_json()
        try:
            todo = todo_schema.load(json_data)
            db_session.add(todo)
            db_session.commit()
            current_app.logger.info(f'Created todo with id {todo.id}')
            return todo, 201
        except marshmallow.exceptions.ValidationError as err:
            current_app.logger.error(f'Validation error while creating todo: {err.messages}')
            api.abort(400, message=str(err.messages))

@api.route('/<int:id>')
@api.param('id', 'The task identifier')
@api.response(404, 'Todo not found')
class TodoItem(Resource):
    @api.doc('get_todo')
    @api.marshal_with(todo_model)
    def get(self, id):
        """Fetch a todo given its identifier"""
        current_app.logger.info(f'Retrieving todo with id {id}')
        todo = db_session.get(Todo, id)
        if todo is None:
            current_app.logger.warning(f'Todo with id {id} not found')
            api.abort(404, f"Todo {id} doesn't exist")
        current_app.logger.debug(f'Found todo: {todo}')
        return todo

    @api.doc('update_todo')
    @api.expect(todo_model)
    @api.marshal_with(todo_model)
    def put(self, id):
        """Update a todo given its identifier"""
        current_app.logger.info(f'Updating todo with id {id}')
        todo = db_session.get(Todo, id)
        if todo is None:
            current_app.logger.warning(f'Todo with id {id} not found')
            api.abort(404, f"Todo {id} doesn't exist")
        
        # Get JSON data and validate/deserialize with schema
        json_data = request.get_json()
        try:
            update_data = todo_schema.load(json_data, partial=True)
        except marshmallow.exceptions.ValidationError as err:
            current_app.logger.error(f'Validation error while updating todo {id}: {err.messages}')
            api.abort(400, message=str(err.messages))
        
        # Update only the fields that were provided
        if 'title' in update_data:
            todo.title = update_data['title']
        if 'description' in update_data:
            todo.description = update_data['description']
        if 'completed' in update_data:
            todo.completed = update_data['completed']
        
        db_session.commit()
        current_app.logger.info(f'Successfully updated todo {id}')
        return todo

    @api.doc('delete_todo')
    @api.response(204, 'Todo deleted')
    def delete(self, id):
        """Delete a todo given its identifier"""
        current_app.logger.info(f'Deleting todo with id {id}')
        todo = db_session.get(Todo, id)
        if todo is None:
            current_app.logger.warning(f'Todo with id {id} not found')
            api.abort(404, f"Todo {id} doesn't exist")
            
        db_session.delete(todo)
        db_session.commit()
        current_app.logger.info(f'Successfully deleted todo {id}')
        return '', 204