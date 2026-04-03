import { db } from './lib/db.js';
import { docs } from './db/schema.js';
import { inArray } from 'drizzle-orm';

const result = await db.select().from(docs).where(inArray(docs.id, [10, 13, 15]));
for (const d of result) {
  console.log(`=== ID: ${d.id} TITLE: ${d.title} ===`);
  console.log(d.content);
  console.log('\n---END---\n');
}
