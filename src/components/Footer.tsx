import React from 'react';

type Filter = 'all' | 'active' | 'completed';
type Props = {
  activeCount: number;
  completedCount: number;
  filter: Filter;
  setFilter: (value: Filter) => void;
  handleClearCompleted: () => void;
};

const filters = [
  { label: 'All', value: 'all', href: '#/' },
  { label: 'Active', value: 'active', href: '#/active' },
  { label: 'Completed', value: 'completed', href: '#/completed' },
];

export const Footer: React.FC<Props> = ({
  activeCount,
  completedCount,
  filter,
  setFilter,
  handleClearCompleted,
}) => {
  return (
    <footer className="todoapp__footer" data-cy="Footer">
      <span className="todo-count">{activeCount} items left</span>

      <nav className="filter">
        {filters.map(f => (
          <a
            key={f.value}
            href={f.href}
            className={`filter__link ${filter === f.value ? 'selected' : ''}`}
            onClick={() => setFilter(filter)}
          >
            {f.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className="todoapp__clear-completed"
        disabled={completedCount === 0}
        onClick={handleClearCompleted}
      >
        Clear completed
      </button>
    </footer>
  );
};
