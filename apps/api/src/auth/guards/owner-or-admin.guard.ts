import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class CreatorOrAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const user = context.switchToHttp().getRequest().user;
        return user?.isAdmin === true || user?.isTournamentCreator === true;
    }
}
