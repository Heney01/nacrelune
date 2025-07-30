import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';

genkit({
  plugins: [firebase(), googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

import './flows/charm-placement-suggestions.ts';
