import type { StreamProvider, StreamChannel } from './types';

/**
 * Default provider. It allocates ids and URLs so the whole live flow works
 * end to end, but it carries no video: `isLiveVideoAvailable` is false and the
 * client renders an explicit "no video source connected" studio panel rather
 * than pretending to stream.
 */
export class MockStreamProvider implements StreamProvider {
  readonly name = 'mock';

  async createChannel(params: { sessionId: string; title: string }): Promise<StreamChannel> {
    return {
      providerStreamId: `mock_${params.sessionId}`,
      ingestUrl: 'rtmp://localhost/live',
      ingestKey: `mock-key-${params.sessionId}`,
      playbackUrl: null,
      isLiveVideoAvailable: false,
    };
  }

  async endChannel(): Promise<void> {
    /* nothing to tear down */
  }

  async createViewerToken(): Promise<string | null> {
    return null;
  }
}
