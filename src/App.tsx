/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { USER_ID, getTodos } from './api/todos';
import { Todo } from './types/Todo';
import { client } from './utils/fetchClient';

export const App: React.FC = () => {
  const [todos, setTodos] = useState <
  (Todo & { loading?: boolean; editing?: boolean })[]
  )
  > ([]);
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

  const handleAddTodo = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();

    if (!title) {
      setError('Title should not be empty');
      inputRef.current?.focus();

      return;
    }

    const tempTodo: Todo & { loading?: boolean } = {
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

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${
              todos.length > 0 && todos.every(todo => todo.completed)
                ? 'active'
                : ''
            }`}
            data-cy="ToggleAllButton"
            disabled={todos.length === 0}
            onClick={() =>
              todos.forEach(todo => {
                if (!todo.completed) {
                  handleToggleTodo(todo);
                }
              })
            }
          />

          <form onSubmit={handleAddTodo}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
            />
          </form>
        </header>

        <section className="todoapp__main" data-cy="TodoList">
          {visibleTodos.map(todo => (
            <div
              key={todo.id}
              data-cy="Todo"
              className={`todo ${todo.completed ? 'completed' : ''}`}
            >
              <label className="todo__status-label">
                <input
                  data-cy="TodoStatus"
                  type="checkbox"
                  className="todo__status"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo)}
                />
              </label>

              {todo.editing ? (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const value = (e.target as HTMLFormElement).title.value;

                    handleRenameTodo(todo.id, value);
                    setTodos(prev =>
                      prev.map(t =>
                        t.id === todo.id ? { ...t, editing: false } : t,
                      ),
                    );
                  }}
                >
                  <input
                    name="title"
                    data-cy="TodoTitleField"
                    type="text"
                    className="todo__title-field"
                    defaultValue={todo.title}
                    autoFocus
                    onBlur={e => {
                      handleRenameTodo(todo.id, e.target.value);
                      setTodos(prev =>
                        prev.map(t =>
                          t.id === todo.id ? { ...t, editing: false } : t,
                        ),
                      );
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setTodos(prev =>
                          prev.map(t =>
                            t.id === todo.id ? { ...t, editing: false } : t,
                          ),
                        );
                      }
                    }}
                  />
                </form>
              ) : (
                <>
                  <span
                    data-cy="TodoTitle"
                    className="todo__title"
                    onDoubleClick={() =>
                      setTodos(prev =>
                        prev.map(t =>
                          t.id === todo.id ? { ...t, editing: true } : t,
                        ),
                      )
                    }
                  >
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => handleDeleteTodo(todo.id)}
                  >
                    ×
                  </button>
                </>
              )}

              <div
                data-cy="TodoLoader"
                className={`modal overlay ${todo.loading ? 'is-active' : ''}`}
              >
                <div className="modal-background has-background-white-ter" />
                <div className="loader" />
              </div>
            </div>
          ))}
        </section>

        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {activeCount} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>
              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={completedCount === 0}
              onClick={() =>
                todos.forEach(todo => {
                  if (todo.completed) {
                    handleDeleteTodo(todo.id);
                  }
                })
              }
            >
              Clear completed
            </button>
          </footer>
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
