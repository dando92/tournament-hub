import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from '@auth/auth.controller';
import { AccountModule } from '@account/account.module';
import { AuthService } from '@auth/auth.service';
import { LocalStrategy } from './strategies/local.strategy';

import { JwtStrategy } from './strategies/jwt.strategy';


@Module({
    imports: [
        AccountModule,
        PassportModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            global: true,
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '12h'},
            }),
        }),
    ],
    providers: [
        AuthService,
        LocalStrategy,
        JwtStrategy,
    ],
    controllers: [AuthController],
    exports: [AuthService]
})
export class AuthModule {}
