import type { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitToUser } from '../realtime/bus';

export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  auctionId?: string;
}): Promise<void> {
  const notification = await prisma.notification.create({ data: params });
  emitToUser(params.userId, 'notification:new', notification);
}

export async function notifyMany(
  items: Array<Parameters<typeof notify>[0]>,
): Promise<void> {
  await Promise.all(items.map((item) => notify(item)));
}
