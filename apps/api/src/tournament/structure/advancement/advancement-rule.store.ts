import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvancementCompetitionKind, AdvancementRule } from '@tournament-hub/persistence';
import { CreateAdvancementRuleDto, UpdateAdvancementRuleDto } from './advancement-rule.requests';

@Injectable()
export class AdvancementRuleStore {
  constructor(
    @InjectRepository(AdvancementRule)
    private readonly advancementRuleRepository: Repository<AdvancementRule>,
  ) {}

  async create(dto: CreateAdvancementRuleDto): Promise<AdvancementRule> {
    const rule = this.advancementRuleRepository.create(dto);
    return await this.advancementRuleRepository.save(rule);
  }

  async createAll(dtos: CreateAdvancementRuleDto[]): Promise<AdvancementRule[]> {
    if (dtos.length === 0) return [];

    return await this.advancementRuleRepository.save(this.advancementRuleRepository.create(dtos));
  }

  async createMatchToMatchRule(
    sourceId: number,
    sourcePlacement: number,
    targetId: number,
    targetSlot: number,
  ): Promise<AdvancementRule> {
    return await this.create({
      sourceKind: 'match',
      sourceId,
      sourcePlacement,
      targetKind: 'match',
      targetId,
      targetSlot,
    });
  }

  async findById(id: number): Promise<AdvancementRule | null> {
    return await this.advancementRuleRepository.findOneBy({ id });
  }

  async findBySource(sourceKind: AdvancementCompetitionKind, sourceId: number): Promise<AdvancementRule[]> {
    return await this.advancementRuleRepository.find({
      where: { sourceKind, sourceId },
      order: { sourcePlacement: 'ASC', targetSlot: 'ASC', id: 'ASC' },
    });
  }

  async findByTarget(targetKind: AdvancementCompetitionKind, targetId: number): Promise<AdvancementRule[]> {
    return await this.advancementRuleRepository.find({
      where: { targetKind, targetId },
      order: { targetSlot: 'ASC', sourcePlacement: 'ASC', id: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateAdvancementRuleDto): Promise<AdvancementRule> {
    const rule = await this.findById(id);
    if (!rule) throw new NotFoundException(`AdvancementRule with ID ${id} not found`);

    this.advancementRuleRepository.merge(rule, dto);
    return await this.advancementRuleRepository.save(rule);
  }

  async delete(id: number): Promise<void> {
    const rule = await this.findById(id);
    if (!rule) return;

    await this.advancementRuleRepository.remove(rule);
  }

  async deleteBySource(sourceKind: AdvancementCompetitionKind, sourceId: number): Promise<void> {
    await this.advancementRuleRepository.delete({ sourceKind, sourceId });
  }

  async deleteByTarget(targetKind: AdvancementCompetitionKind, targetId: number): Promise<void> {
    await this.advancementRuleRepository.delete({ targetKind, targetId });
  }

  async deleteInvolvingMatch(matchId: number): Promise<void> {
    await this.advancementRuleRepository.delete({ sourceKind: 'match', sourceId: matchId });
    await this.advancementRuleRepository.delete({ targetKind: 'match', targetId: matchId });
  }
}
