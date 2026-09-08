import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AccountQueries } from '@account/account.queries';
import { AuthService } from '@auth/auth.service';

describe('AuthService', () => {
  function createService(credentials: jest.Mock): AuthService {
    return new AuthService(
      { credentials } as unknown as AccountQueries,
      {} as JwtService,
    );
  }

  it('should be defined', () => {
    expect(createService(jest.fn())).toBeDefined();
  });

  it('rejects an unknown username without dereferencing a missing account', async () => {
    const service = createService(jest.fn().mockResolvedValue(null));

    await expect(service.validateUser('nobody', 'whatever')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
