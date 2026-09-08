import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';

import { AuthService } from '@auth/auth.service';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { LocalAuthGuard } from '@auth/guards/local-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) {}

    @UseGuards(LocalAuthGuard)
    @Post('login')
    login(@Request() req) {
        return this.auth.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getMe(@Request() req) {
        return this.auth.getMe(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('permissions')
    getPermissions(@Request() req) {
        return this.auth.getPermissions(req.user.id);
    }
}
