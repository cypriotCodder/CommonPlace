export const conceptId = 'database-indexing';
export const challengeId = 'index-query-choice';
export const cards = [
  { id: 'index-purpose', q: 'What does a database index help a query do?', a: 'It helps the database locate matching rows without necessarily scanning every row in the table.' },
  { id: 'index-vs-scan', q: 'Why might a database choose a table scan even when an index exists?', a: 'If a query needs a large share of the table, following the index and fetching many rows can cost more than scanning the table.' },
  { id: 'index-cost', q: 'What is one cost of adding an index?', a: 'Indexes use storage and need maintenance when indexed rows are inserted, updated, or deleted, adding work to writes.' },
] as const;
