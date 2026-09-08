import { Module } from '@nestjs/common';
import { AccountCommands } from '@account/account.commands';
import { AccountController } from '@account/account.controller';
import { AccountQueries } from '@account/account.queries';
import { AccountStore } from '@account/account.store';
import { PersistenceModule } from '@tournament-hub/persistence';
import { AdminGuard } from '@auth/guards/admin.guard';
import { CreatorOrAdminGuard } from '@auth/guards/owner-or-admin.guard';

@Module({
    imports: [PersistenceModule],
    providers: [AccountCommands, AccountQueries, AccountStore, AdminGuard, CreatorOrAdminGuard],
    controllers: [AccountController],
    exports: [AccountCommands, AccountQueries, AccountStore],
})
export class AccountModule {}
