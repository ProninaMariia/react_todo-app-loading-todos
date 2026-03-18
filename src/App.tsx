/* eslint-disable @typescript-eslint/indent */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */

import React, { useEffect, useState, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID, getTodos } from './api/todos';
import { Todo } from './types/Todo';
import { client } from './utils/fetchClient';

import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';

type TodoWithState = Todo & {
  loading?: boolean;
  editing?: boolean;
};

export const App: React.FC = () => {
  const [todos, setTodos] = useState<TodoWithState[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    setError(null);
    getTodos()
      .then(setTodos)
      .catch(() => setError('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const visibleTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.filter(todo => todo.completed).length;

  // ✅ ADD TODO
  const handleAddTodo = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();

    if (!title) {
      setError('Title should not be empty');
      inputRef.current?.focus();

      return;
    }

    const tempTodo: TodoWithState = {
      id: +new Date(),
      userId: USER_ID,
      title,
      completed: false,
      loading: true,
    };

    setTodos(prev => [...prev, tempTodo]);
    setNewTitle('');
    setError(null);

    try {
      const created = await client.post<Todo>('/todos', {
        userId: USER_ID,
        title,
        completed: false,
      });

      setTodos(prev => prev.map(t => (t.id === tempTodo.id ? created : t)));
    } catch {
      setError('Unable to add a todo');
      setTodos(prev => prev.filter(t => t.id !== tempTodo.id));
      setNewTitle(title);
    } finally {
      inputRef.current?.focus();
    }
  };

  // ✅ DELETE
  const handleDeleteTodo = async (todoId: number) => {
    setTodos(prev =>
      prev.map(t => (t.id === todoId ? { ...t, loading: true } : t)),
    );

    setError(null);

    try {
      await client.delete(`/todos/${todoId}`);
      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {
      setError('Unable to delete a todo');
      setTodos(prev =>
        prev.map(t => (t.id === todoId ? { ...t, loading: false } : t)),
      );
    } finally {
      inputRef.current?.focus();
    }
  };

  // ✅ TOGGLE
  const handleToggleTodo = async (todo: Todo) => {
    setTodos(prev =>
      prev.map(t => (t.id === todo.id ? { ...t, loading: true } : t)),
    );

    setError(null);

    try {
      const updated = await client.patch<Todo>(`/todos/${todo.id}`, {
        completed: !todo.completed,
      });

      setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));
    } catch {
      setError('Unable to update a todo');
      setTodos(prev =>
        prev.map(t => (t.id === todo.id ? { ...t, loading: false } : t)),
      );
    }
  };

  // ✅ RENAME
  const handleRenameTodo = async (todoId: number, titleValue: string) => {
    const title = titleValue.trim();

    if (!title) {
      return handleDeleteTodo(todoId);
    }

    setTodos(prev =>
      prev.map(t => (t.id === todoId ? { ...t, loading: true } : t)),
    );

    setError(null);

    try {
      const updated = await client.patch<Todo>(`/todos/${todoId}`, { title });

      setTodos(prev => prev.map(t => (t.id === todoId ? updated : t)));
    } catch {
      setError('Unable to update a todo');
      setTodos(prev =>
        prev.map(t => (t.id === todoId ? { ...t, loading: false } : t)),
      );
    }
  };

  // ✅ EXTRA FUNCTIONS (review fixes)

  const handleToggleAll = () => {
    todos.forEach(todo => {
      if (!todo.completed) {
        handleToggleTodo(todo);
      }
    });
  };

  const handleClearCompleted = () => {
    todos.forEach(todo => {
      if (todo.completed) {
        handleDeleteTodo(todo.id);
      }
    });
  };

  const handleStartEditing = (todoId: number) => {
    setTodos(prev =>
      prev.map(t => (t.id === todoId ? { ...t, editing: true } : t)),
    );
  };

  const handleStopEditing = (todoId: number) => {
    setTodos(prev =>
      prev.map(t => (t.id === todoId ? { ...t, editing: false } : t)),
    );
  };

  const handleSubmitRename = (
    e: React.FormEvent<HTMLFormElement>,
    todoId: number,
  ) => {
    e.preventDefault();
    const value = (e.target as HTMLFormElement).title;

    handleRenameTodo(todoId, value);
    handleStopEditing(todoId);
  };

  const handleBlurRename = (
    e: React.FocusEvent<HTMLInputElement>,
    todoId: number,
  ) => {
    handleRenameTodo(todoId, e.target.value);
    handleStopEditing(todoId);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    todoId: number,
  ) => {
    if (e.key === 'Escape') {
      handleStopEditing(todoId);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          todos={todos}
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          handleAddTodo={handleAddTodo}
          handleToggleAll={handleToggleAll}
          inputRef={inputRef}
        />

        <TodoList
          todos={visibleTodos}
          handleToggleTodo={handleToggleTodo}
          handleDeleteTodo={handleDeleteTodo}
          handleStartEditing={handleStartEditing}
          handleSubmitRename={handleSubmitRename}
          handleBlurRename={handleBlurRename}
          handleKeyDown={handleKeyDown}
        />

        {todos.length > 0 && (
          <Footer
            activeCount={activeCount}
            completedCount={completedCount}
            filter={filter}
            setFilter={setFilter}
            handleClearCompleted={handleClearCompleted}
          />
        )}
      </div>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger is-light has-text-weight-normal ${
          error ? '' : 'hidden'
        }`}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError(null)}
        />
        {error}
      </div>
    </div>
  );
};
