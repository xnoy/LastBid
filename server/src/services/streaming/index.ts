import { env } from '../../config/env';
import { MockStreamProvider } from './mock.provider';
import type { StreamProvider } from './types';

export * from './types';

/**
 * To connect a real provider:
 *   1. add `class MuxStreamProvider implements StreamProvider` in this folder
 *   2. read its credentials from env.STREAM_API_KEY / env.STREAM_API_SECRET
 *   3. return it below when STREAM_PROVIDER=external
 * Nothing in the routes or the React app needs to change.
 */
export const streamProvider: StreamProvider = (() => {
  if (env.STREAM_PROVIDER === 'external') {
    throw new Error(
      'STREAM_PROVIDER=external but no external provider is implemented. ' +
        'Add one in server/src/services/streaming/ and return it here.',
    );
  }
  return new MockStreamProvider();
})();
