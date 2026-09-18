/**
 * Streaming provider contract for BidTok Live.
 *
 * BidNova does not ship a video transport. The auction half of a live session
 * (bids, chat, viewer count, countdown) is fully implemented over Socket.IO;
 * the video half is behind this interface so you can drop in Mux, LiveKit,
 * Amazon IVS, Agora or an RTMP box without touching a component.
 */
export interface StreamChannel {
  /** Provider-side stream id, stored on LiveSession.providerStream. */
  providerStreamId: string;
  /** Where the seller points OBS / the mobile encoder. Host-only, never public. */
  ingestUrl: string;
  /** Stream key, host-only. */
  ingestKey: string;
  /** HLS/WebRTC URL the viewer's player opens. Safe to expose. */
  playbackUrl: string | null;
  /** False for the mock provider, so the UI can say "no video connected". */
  isLiveVideoAvailable: boolean;
}

export interface StreamProvider {
  readonly name: string;
  createChannel(params: { sessionId: string; title: string }): Promise<StreamChannel>;
  endChannel(providerStreamId: string): Promise<void>;
  /** Short-lived token for the player, when the provider needs one. */
  createViewerToken(providerStreamId: string): Promise<string | null>;
}
