import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

import { ExtractJwt, Strategy } from 'passport-jwt';


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
        id: payload.sub,
        username: payload.username,
        isAdmin: payload.isAdmin,
        isTournamentCreator: payload.isTournamentCreator,
    };
  }
}
