
import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import * as firebase from '@genkit-ai/firebase/plugin';

genkit({
  plugins: [firebase.plugin(), googleAI()],
  enableTracingAndMetrics: true,
});

import './flows/charm-placement-suggestions.ts';

