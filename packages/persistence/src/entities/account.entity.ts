import { Entity,
        Column,
        PrimaryGeneratedColumn,
        OneToMany,
        OneToOne,
        JoinColumn } from 'typeorm';

import { Player } from './player.entity';
import { Participant } from './participant.entity';


@Entity()
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    username: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column({ default: "" })
    grooveStatsApi: string;

    @Column({ default: false })
    isAdmin: boolean;

    @Column({ default: false })
    isTournamentCreator: boolean;

    @Column({ type: 'text', default: "" })
    profilePicture: string;

    @OneToOne(() => Player)
    @JoinColumn()
    player: Player

    @OneToMany(() => Participant, (participant) => participant.account)
    participants: Participant[];
}
