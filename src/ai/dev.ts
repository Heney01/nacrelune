import {genkit} from 'genkit';
import {config} from 'dotenv';
config();

import {googleAI} from '@genkit-ai/googleai';

genkit({
  plugins: [googleAI()],
});

import './flows/charm-placement-suggestions.ts';
