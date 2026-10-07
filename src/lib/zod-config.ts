import { z } from 'zod';

// Must be the first import of every module that defines a zod schema: zod reads this flag when a schema is constructed.
z.config({ jitless: true });
