from marshmallow import Schema, fields, validate, post_load, EXCLUDE
from ..models.todo import Todo

class TodoSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True, validate=validate.Length(min=1))
    description = fields.Str(required=False, validate=validate.Length(max=500))
    completed = fields.Boolean(load_default=False)
    position_x = fields.Float(required=False, allow_none=True)
    position_y = fields.Float(required=False, allow_none=True)

    class Meta:
        ordered = True
        unknown = EXCLUDE

    @post_load
    def make_todo(self, data, **kwargs):
        """Create a new Todo instance"""
        if kwargs.get('partial', False):
            return data  # Return dict for partial updates
        return Todo(**data)  # Return Todo instance for creation