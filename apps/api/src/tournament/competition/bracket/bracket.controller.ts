import { Controller, Get } from '@nestjs/common';
import type { BracketType } from '@tournament-hub/brackets';

import { BracketCommands } from '@bracket/bracket.commands';

@Controller('bracket')
export class BracketController {
    constructor(private readonly bracketSystems: BracketCommands) {}

    @Get('bracket-types')
    getBracketTypes(): BracketType[] {
        return this.bracketSystems.getAll();
    }
}
