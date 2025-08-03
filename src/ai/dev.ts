
import 'dotenv/config';
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

genkit({ plugins: [googleAI()] });

import './flows/charm-placement-suggestions.ts';
import './flows/charm-analysis-suggestions.ts';
import './flows/charm-design-critique.ts';
import './flows/share-content-generation.ts';


