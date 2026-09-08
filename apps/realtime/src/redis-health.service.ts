import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'node:net';
import { resolveRedisEndpoint } from '@tournament-hub/live-messaging';

@Injectable()
export class RedisHealthService {
  constructor(private readonly config: ConfigService) {}

  ping(): Promise<void> {
    const { host, port } = resolveRedisEndpoint(this.config);
    return new Promise((resolve, reject) => {
      const socket = new Socket();
      const finish = (error?: Error) => {
        socket.removeAllListeners();
        socket.destroy();
        error ? reject(error) : resolve();
      };
      socket.setTimeout(1000);
      socket.once('error', finish);
      socket.once('timeout', () => finish(new Error('Redis health check timed out')));
      socket.on('data', (chunk) => {
        if (chunk.toString().startsWith('+PONG')) finish();
      });
      socket.connect(port, host, () => socket.write('*1\r\n$4\r\nPING\r\n'));
    });
  }
}
