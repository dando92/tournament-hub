import { EventEmitter } from 'node:events';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import type { HttpAdapterHost } from '@nestjs/core';
import { WebSocket, type WebSocketServer } from 'ws';
import {
  WebSocketBrowserEventBroadcaster,
} from '@realtime/browser/websocket-browser-event.broadcaster';
import type { RealtimeSnapshotReader } from '@realtime/snapshots/realtime-snapshot-reader';

describe('WebSocketBrowserEventBroadcaster', () => {
  it('owns upgrade validation, scoped clients, initial snapshots, broadcast, and shutdown', () => {
    const httpServer = new EventEmitter();
    const client = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      close: jest.fn(),
    } as unknown as WebSocket;
    const server = {
      clients: new Set<WebSocket>(),
      handleUpgrade: jest.fn((request, socket, head, callback) => {
        server.clients.add(client);
        callback(client);
      }),
      emit: jest.fn(),
      close: jest.fn(),
    };
    const snapshots: RealtimeSnapshotReader = {
      snapshot: jest.fn(() => ({
        sequence: 4,
        messages: [{ event: 'MatchUpdate', data: { matchId: 3 }, sequence: 4 }],
      })),
    };
    const broadcaster = new WebSocketBrowserEventBroadcaster(
      adapterHost(httpServer),
      snapshots,
      () => server as unknown as WebSocketServer,
    );
    broadcaster.onApplicationBootstrap();

    const socket = { destroy: jest.fn() } as unknown as Duplex;
    httpServer.emit(
      'upgrade',
      { url: '/uiupdatehub?tournamentId=7' } as IncomingMessage,
      socket,
      Buffer.alloc(0),
    );

    expect(server.handleUpgrade).toHaveBeenCalledTimes(1);
    expect(snapshots.snapshot).toHaveBeenCalledWith(7);
    expect(client.send).toHaveBeenNthCalledWith(1, JSON.stringify({
      event: 'RealtimeReady',
      data: {
        tournamentId: 7,
        messages: [{ event: 'MatchUpdate', data: { matchId: 3 }, sequence: 4 }],
      },
      sequence: 4,
    }));

    broadcaster.broadcast(7, { event: 'TournamentUpdate', data: { tournamentId: 7 }, sequence: 5 });
    broadcaster.broadcast(8, { event: 'TournamentUpdate', data: { tournamentId: 8 }, sequence: 1 });
    expect(client.send).toHaveBeenCalledTimes(2);

    broadcaster.onModuleDestroy();
    expect(client.close).toHaveBeenCalledWith(1001, 'Service shutting down');
    expect(server.close).toHaveBeenCalledTimes(1);

    const detachedSocket = { destroy: jest.fn() } as unknown as Duplex;
    httpServer.emit(
      'upgrade',
      { url: '/unknown?tournamentId=7' } as IncomingMessage,
      detachedSocket,
      Buffer.alloc(0),
    );
    expect(detachedSocket.destroy).not.toHaveBeenCalled();
  });

  it.each([
    '/unknown?tournamentId=7',
    '/uiupdatehub?tournamentId=0',
    '/uiupdatehub?tournamentId=invalid',
  ])('rejects invalid upgrade URL %s', (url) => {
    const httpServer = new EventEmitter();
    const server = {
      clients: new Set<WebSocket>(),
      handleUpgrade: jest.fn(),
      emit: jest.fn(),
      close: jest.fn(),
    };
    const broadcaster = new WebSocketBrowserEventBroadcaster(
      adapterHost(httpServer),
      { snapshot: jest.fn() },
      () => server as unknown as WebSocketServer,
    );
    broadcaster.onApplicationBootstrap();
    const socket = { destroy: jest.fn() } as unknown as Duplex;

    httpServer.emit('upgrade', { url } as IncomingMessage, socket, Buffer.alloc(0));

    expect(socket.destroy).toHaveBeenCalledTimes(1);
    expect(server.handleUpgrade).not.toHaveBeenCalled();
  });
});

function adapterHost(httpServer: EventEmitter): HttpAdapterHost {
  return {
    httpAdapter: { getHttpServer: () => httpServer },
  } as unknown as HttpAdapterHost;
}
