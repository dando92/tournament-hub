import { Type } from 'class-transformer';
import { IsArray, IsInt, IsObject, IsOptional, ValidateNested } from 'class-validator';
import type { PlanBasis, PlanNode, PlanRoute, PlanSlot, PlanSource, StructurePlan } from '@tournament-hub/contracts';

export class ApplyStructurePlanDto implements StructurePlan {
    @IsInt()
    tournamentId: number;

    @IsObject()
    source: PlanSource;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Object)
    basedOn: PlanBasis[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Object)
    nodes: PlanNode[];

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Object)
    routes: PlanRoute[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Object)
    clearedSlots?: PlanSlot[];
}
