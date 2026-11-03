import { z } from 'zod';
import { materialSchema } from '../../lib/ai/contracts';

export const sourceText = 'An index keeps a separate, ordered view of selected values and the locations of their rows. This can reduce the work of finding a small subset of a table, but the index must also be maintained when rows change. An index is a tradeoff: faster reads in exchange for additional storage and write work.\n\nA composite index orders entries by its first column, then by subsequent columns within equal first-column values. The order of its columns should follow the queries it needs to serve. An index on (customer_id, created_at) can help find one customer’s orders within a date range. It is not equally suited to finding all customers’ orders by date alone.\n\nA query plan describes how the database intends to retrieve a result. Inspect the chosen access path and estimated row counts, then compare with measured execution on representative data. A plan is evidence to investigate, not proof that a query will be fast for every workload.';

export const discoverySchema = z.object({
  id: z.string().min(1).max(80), title: z.string().min(1).max(180),
  reason: z.string().min(1).max(1000), quote: z.string().min(20).max(4000),
  priority: z.enum(['Essential', 'Useful']), material: materialSchema,
}).strict();
export const previewImportSchema = z.object({
  version: z.literal(1), bookId: z.literal('database-notes'),
  discoveries: z.array(discoverySchema).max(12),
}).strict();
export type Discovery = z.infer<typeof discoverySchema>;
export const discoveries: Discovery[] = [
  { id: 'index-tradeoff', title: 'The cost of a faster read', priority: 'Essential',
    reason: 'Recognize when an index earns its maintenance cost. This tradeoff helps you choose indexes for the workload you actually have.',
    quote: 'An index is a tradeoff: faster reads in exchange for additional storage and write work.',
    material: { title: 'The cost of a faster read', question: 'Why can adding an index make writes slower?', answer: 'A changed row may also require an update to the index. The database does additional work to keep the separate lookup structure consistent.',
      prompt: 'An events table receives thousands of inserts each minute. A dashboard occasionally reads recent events. A teammate suggests indexing every column to make all future queries faster. What would you do first?',
      choices: [{ id: 'a', text: 'Index every column so any query can use an index.' }, { id: 'b', text: 'Identify the dashboard’s access pattern and measure a targeted index against its write cost.' }, { id: 'c', text: 'Remove all indexes because inserts are more frequent than reads.' }],
      correctChoice: 'b', explanation: 'Start with the actual query and measure the tradeoff. Every additional index can add storage and maintenance work. Indexing everything adds costs without demonstrating a benefit; removing every index ignores the value of the dashboard’s reads.' } },
  { id: 'column-order', title: 'Column order changes the question', priority: 'Essential',
    reason: 'Understand why the same two columns can produce different access paths. Use the query’s filters to reason about index order.',
    quote: 'A composite index orders entries by its first column, then by subsequent columns within equal first-column values.',
    material: { title: 'Column order changes the question', question: 'What does an index on (customer_id, created_at) organize first?', answer: 'It groups entries by customer_id first, then orders entries within each customer by created_at.',
      prompt: 'Your application usually fetches a single customer’s orders from the last month. Which index order most directly follows that access pattern?',
      choices: [{ id: 'a', text: '(customer_id, created_at)' }, { id: 'b', text: '(created_at, customer_id) is always equivalent.' }, { id: 'c', text: 'Column order never affects a composite index.' }], correctChoice: 'a',
      explanation: 'Organizing by customer first keeps that customer’s entries together, with time ordering inside the group. Swapping columns changes the ordering and can change how efficiently the index serves the query.' } },
  { id: 'query-plan', title: 'Read the plan, then measure', priority: 'Useful',
    reason: 'Turn a performance hunch into a test. Compare the intended access path with observations from representative data.',
    quote: 'A plan is evidence to investigate, not proof that a query will be fast for every workload.',
    material: { title: 'Read the plan, then measure', question: 'Why should you measure execution after inspecting a query plan?', answer: 'The plan describes an intended access path and estimates. Representative measurements help establish how the query performs under the workload you care about.',
      prompt: 'A query plan shows an index scan. Your teammate declares the query optimized. What is the most useful next step?',
      choices: [{ id: 'a', text: 'Assume any index scan is fast enough.' }, { id: 'b', text: 'Add more indexes without running the query.' }, { id: 'c', text: 'Measure execution on representative data and compare with the plan’s estimates.' }], correctChoice: 'c',
      explanation: 'An index scan alone does not establish acceptable performance. Use representative measurements to investigate the access path and row estimates.' } },
];

export const books = [
  { id: 'database-notes', title: 'Database field notes', author: 'Commonplace · Sample text', format: 'EPUB', status: 'Ready to study', subject: 'Databases', color: 'green', initials: 'DB', description: 'Indexes, access paths, and the decisions behind a faster query.', detail: '3 source-verified sample ideas', stage: 'Study material ready' },
  { id: 'systems-notes', title: 'Reliable systems', author: 'Commonplace · Sample text', format: 'PDF', status: 'Discovery incomplete', subject: 'Systems', color: 'ochre', initials: 'RS', description: 'A sample of the library’s partial-discovery state.', detail: 'AI reported on 4 of 8 source groups', stage: 'Remaining text to prepare' },
  { id: 'software-notes', title: 'Software, thoughtfully', author: 'Commonplace · Sample text', format: 'EPUB', status: 'Ready to export', subject: 'Engineering', color: 'blue', initials: 'ST', description: 'A sample of a newly extracted book, ready for whole-book discovery.', detail: 'Text extraction complete', stage: 'Discovery not started' },
  { id: 'scanned-notes', title: 'Algorithms notebook', author: 'Commonplace · Sample file', format: 'PDF', status: 'Needs attention', subject: 'Algorithms', color: 'clay', initials: 'AN', description: 'This sample represents an image-only PDF with no extractable text.', detail: 'No readable text found', stage: 'A text-based file is needed' },
] as const;

export function downloadText(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
