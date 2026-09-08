import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entities } from './entities';

@Module({
    imports: [
        TypeOrmModule.forFeature(Entities)
    ],
    exports: [TypeOrmModule]
})
export class PersistenceModule {}
