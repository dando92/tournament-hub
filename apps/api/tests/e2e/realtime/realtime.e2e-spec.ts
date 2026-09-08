import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { RedisLiveEventPublisher } from '@tournament-hub/live-messaging';
import type { EventEnvelope } from '@tournament-hub/live-messaging';
import { WebSocket } from 'ws';
import { RealtimeModule } from '../../../../realtime/src/realtime.module';

describe('realtime service extraction', () => {
  let replicas: INestApplication[] = [];
  let publisher: RedisLiveEventPublisher;
  const tournamentId = 910001;
  const otherTournamentId = 910002;

  beforeAll(async () => {
    process.env.LIVE_EVENT_CHANNEL = `test:realtime:${Date.now()}`;
    replicas = await Promise.all([startReplica(), startReplica()]);
    publisher = new RedisLiveEventPublisher(new ConfigService(process.env));
  });

  afterAll(async () => {
    await publisher?.onModuleDestroy();
    await Promise.all(replicas.map((app) => app.close()));
  });

  it('fans out the same scoped sequence through two replicas without tournament leakage', async () => {
    const first = await connect(replicas[0], tournamentId);
    const second = await connect(replicas[1], tournamentId);
    const unrelated = await connect(replicas[0], otherTournamentId);
    await delay(50);

    await publish({
      type: 'ui.tournament-changed',
      tournamentId,
      payload: { tournamentId },
    });
    const [firstUpdate, secondUpdate] = await Promise.all([nextMessage(first), nextMessage(second)]);
    expect(firstUpdate).toMatchObject({ event: 'TournamentUpdate', data: { tournamentId } });
    expect(secondUpdate).toMatchObject({ event: 'TournamentUpdate', sequence: firstUpdate.sequence });
    await expect(noMessage(unrelated)).resolves.toBe(true);

    first.close();
    second.close();
    unrelated.close();
  });

  it('hands a connecting client what it missed in a single ready frame', async () => {
    const observer = collect(replicas[0], tournamentId);
    await opened(observer.socket);
    await waitUntil(() => observer.messages.some((message) => message.event === 'RealtimeReady'));
    const before = observer.messages[0];

    await publish({
      type: 'ui.warning',
      tournamentId,
      payload: { message: 'Recover from the ready frame' },
    });
    await waitUntil(() => observer.messages.some((message) => message.event === 'UiWarning'));

    const arriving = collect(replicas[0], tournamentId);
    await opened(arriving.socket);
    await waitUntil(() => arriving.messages.length > 0);

    expect(arriving.messages).toEqual([
      expect.objectContaining({
        event: 'RealtimeReady',
        data: expect.objectContaining({
          tournamentId,
          messages: expect.arrayContaining([expect.objectContaining({ event: 'UiWarning' })]),
        }),
      }),
    ]);
    expect(arriving.messages[0].sequence).toBeGreaterThan(before.sequence);

    observer.socket.close();
    arriving.socket.close();
  });

  async function publish(event: EventEnvelope): Promise<void> {
    await publisher.publish(event);
  }
});

async function startReplica(): Promise<INestApplication> {
  const app = await NestFactory.create(RealtimeModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return app;
}

async function connect(app: INestApplication, tournamentId: number): Promise<WebSocket> {
  const address = app.getHttpServer().address() as { port: number };
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/uiupdatehub?tournamentId=${tournamentId}`);
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
  return socket;
}

function collect(app: INestApplication, tournamentId: number): { socket: WebSocket; messages: any[] } {
  const address = app.getHttpServer().address() as { port: number };
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/uiupdatehub?tournamentId=${tournamentId}`);
  const messages: any[] = [];
  socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
  return { socket, messages };
}

function opened(socket: WebSocket): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve());
    socket.once('error', reject);
  });
}

function nextMessage(socket: WebSocket): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for realtime message')), 3000);
    socket.once('message', (data) => {
      clearTimeout(timeout);
      resolve(JSON.parse(data.toString()));
    });
  });
}

function noMessage(socket: WebSocket): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.off('message', onMessage);
      resolve(true);
    }, 150);
    const onMessage = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    socket.once('message', onMessage);
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for realtime recovery');
    await delay(10);
  }
}
