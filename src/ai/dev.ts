
import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

genkit({ plugins: [googleAI()] });

import './flows/charm-placement-suggestions.ts';

