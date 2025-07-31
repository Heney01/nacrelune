
import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase/plugin';

genkit({
  plugins: [firebase(), googleAI()],
  enableTracingAndMetrics: true,
});

import './flows/charm-placement-suggestions.ts';
import './flows/photorealistic-preview.ts';
