import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';

import { AccountPermissionsDto, AccountProfileDto } from '@tournament-hub/contracts';
import { AccountCredentials, AccountQueries } from '@account/account.queries';

@Injectable()
export class AuthService {
    constructor(
        private readonly accounts: AccountQueries,
        private readonly jwt: JwtService,
    ) {}

    async validateUser(username: string, password: string): Promise<AccountCredentials> {
        const account = await this.accounts.credentials(username);
        if (!account || !(await compare(password, account.password))) {
            throw new UnauthorizedException();
        }

        return account;
    }

    async login(account: AccountCredentials): Promise<{ access_token: string }> {
        const payload = {
            sub: account.id,
            username: account.username,
            isAdmin: account.isAdmin,
            isTournamentCreator: account.isTournamentCreator,
        };

        return { access_token: await this.jwt.signAsync(payload) };
    }

    getMe(accountId: string): Promise<AccountProfileDto> {
        return this.accounts.profile(accountId);
    }

    getPermissions(accountId: string): Promise<AccountPermissionsDto> {
        return this.accounts.permissions(accountId);
    }
}
