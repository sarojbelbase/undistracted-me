import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { WidgetProps } from '../types';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const TodoWidget: React.FC<WidgetProps> = ({ settings, onSettingsChange }) => {
  const [todos, setTodos] = useState<Todo[]>(settings.todos || []);
  const [newTodo, setNewTodo] = useState('');

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
    };

    const updatedTodos = [...todos, todo];
    setTodos(updatedTodos);
    onSettingsChange({ ...settings, todos: updatedTodos });
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    onSettingsChange({ ...settings, todos: updatedTodos });
  };

  const removeTodo = (id: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodos);
    onSettingsChange({ ...settings, todos: updatedTodos });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full">
      <h2 className="text-lg font-semibold mb-4">{settings.title || 'Todo List'}</h2>
      
      <form onSubmit={handleAddTodo} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="Add a new todo..."
          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {todos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
              className="w-4 h-4"
            />
            <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
              {todo.text}
            </span>
            <button
              onClick={() => removeTodo(todo.id)}
              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TodoWidget;