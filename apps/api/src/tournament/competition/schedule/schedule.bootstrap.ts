import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

import { ScheduleRunner } from "./schedule.runner";

@Injectable()
export class ScheduleBootstrap implements OnApplicationBootstrap {
    private readonly logger = new Logger(ScheduleBootstrap.name);

    constructor(private readonly runner: ScheduleRunner) {}

    async onApplicationBootstrap(): Promise<void> {
        try {
            await this.runner.reconcileRunning();
        } catch (error) {
            this.logger.error(`Schedule reconciliation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
