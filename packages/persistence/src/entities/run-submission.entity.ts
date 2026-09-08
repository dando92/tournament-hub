import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Tournament } from './tournament.entity';

@Entity()
@Index('UQ_run_submission_identity', ['tournament', 'submissionId'], { unique: true })
export class RunSubmission {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 200 })
    submissionId: string;

    @ManyToOne(() => Tournament, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'tournamentId', foreignKeyConstraintName: 'FK_run_submission_tournament' })
    tournament: Tournament;

    @CreateDateColumn({ type: 'timestamptz' })
    receivedAt: Date;

    @Column({ type: 'jsonb', nullable: true, default: null })
    outcome: unknown | null;
}
