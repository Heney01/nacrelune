import {genkit, configureGenkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

configureGenkit({
  plugins: [googleAI()],
  // model: 'googleai/gemini-2.0-flash', // Removed default model to specify in each call
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export { };

