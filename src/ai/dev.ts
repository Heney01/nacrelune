import { configureGenkit } from 'genkit';
import { config } from 'dotenv';
config();

import { googleAI } from '@genkit-ai/googleai';

configureGenkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

import './flows/charm-placement-suggestions.ts';
